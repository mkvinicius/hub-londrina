import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { captureException } from "./lib/sentry";

const app: Express = express();

app.set("trust proxy", 1);
// Pentest fix — não expor "X-Powered-By: Express" (stack fingerprinting).
app.disable("x-powered-by");

// Pentest fix — security headers em todas as respostas.
// CSP libera Stripe (js + frames + api) e Google Maps (api), inline scripts
// para os <script> de SSR/JSON-LD/hydration injetados pelo server.mjs.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.instagram.com https://platform.instagram.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.stripe.com https://maps.googleapis.com https://viacep.com.br https://brasilapi.com.br https://www.instagram.com https://graph.instagram.com",
      "frame-src https://js.stripe.com https://www.instagram.com",
      "object-src 'none'",
    ].join("; "),
  );
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Pentest fix — CORS com allowlist em vez de reflexão de Origin.
// `origin: true` espelhava QUALQUER origin junto com credentials:true,
// permitindo CSRF cross-site. Allowlist explícita + domínios Replit
// (REPLIT_DOMAINS, vírgula-separados) para ambientes de dev/preview.
const STATIC_ALLOWED_ORIGINS = [
  "https://www.hublondrina.com.br",
  "https://hublondrina.com.br",
  "http://localhost:5173",
  "http://localhost:3000",
];
const REPLIT_ORIGINS = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .flatMap((d) => [`https://${d}`, `http://${d}`]);
const ALLOWED_ORIGINS = new Set([...STATIC_ALLOWED_ORIGINS, ...REPLIT_ORIGINS]);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Same-origin/server-to-server (sem header Origin) é permitido.
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        callback(null, true);
      } else {
        // Não jogar Error (vira 500). Apenas omite ACAO — o browser
        // bloqueia o request, e mis-config aparece como CORS error
        // no client em vez de 500 no server.
        callback(null, false);
      }
    },
  }),
);
app.use(cookieParser());
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/uploads", express.static(path.resolve(process.cwd(), "public/uploads"), {
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
}));

app.use("/api", router);

// Sprint 4.1 — Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Multer: arquivo maior que o limite configurado
  const anyErr = err as any;
  if (anyErr?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Arquivo muito grande. O limite por imagem é de 15MB." });
  }
  if (anyErr?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Campo de arquivo inválido. Use o formulário oficial." });
  }
  req.log.error({ err, path: req.path, method: req.method }, "Unhandled error");
  captureException(err, { path: req.path, method: req.method });
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Erro interno do servidor. Tente novamente." });
});

export default app;
