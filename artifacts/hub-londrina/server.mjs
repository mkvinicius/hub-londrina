import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "dist/public");
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

let renderFn = null;
async function getRender() {
  if (!renderFn) {
    const mod = await import("./dist/server/entry-server.js");
    renderFn = mod.render;
  }
  return renderFn;
}

const template = readFileSync(resolve(DIST_DIR, "index.html"), "utf-8");

async function handler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  const match = pathname.match(/^\/negocio\/(\d+)$/);
  if (match) {
    try {
      const id = Number(match[1]);
      const apiBase =
        process.env.API_INTERNAL_URL || "http://localhost:8080";
      const apiRes = await fetch(`${apiBase}/api/businesses/${id}`);

      if (apiRes.ok) {
        const business = await apiRes.json();
        const render = await getRender();
        const appHtml = render(`/negocio/${id}`, business);

        const title = `${business.name} — Hub Londrina`;
        const rawDesc =
          business.description ||
          `${business.name} em Londrina, PR. Veja avaliações, horários e contato.`;
        const desc = rawDesc.slice(0, 155);
        const safeData = JSON.stringify(business).replace(/</g, "\\u003c");
        const ssrScript = `<script>window.__SSR_DATA__=${safeData}</script>`;

        let html = template
          .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
          .replace(
            "<title>Hub Londrina — Negócio Local</title>",
            `<title>${title}</title>`
          )
          .replace(
            `content="Descubra os melhores serviços, restaurantes e lojas em Londrina, PR. O maior guia de negócios locais da região."`,
            `content="${desc.replace(/"/g, "&quot;")}"`
          )
          .replace("</head>", `${ssrScript}\n</head>`);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
    } catch (e) {
      console.error("[SSR error]", e.message);
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(template);
    return;
  }

  if (pathname !== "/" && pathname !== "") {
    const filePath = resolve(DIST_DIR, pathname.slice(1));
    if (existsSync(filePath)) {
      const ext = extname(filePath);
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(readFileSync(filePath));
      return;
    }
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(template);
}

createServer(handler).listen(PORT, "0.0.0.0", () => {
  console.log(`SSR server running on port ${PORT}`);
});
