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
app.use(cors({ credentials: true, origin: true }));
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
