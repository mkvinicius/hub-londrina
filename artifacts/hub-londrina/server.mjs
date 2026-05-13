import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, createReadStream } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "dist/public");
const PORT = Number(process.env.PORT || 3000);

// Pentest fix — security headers no SSR (espelha o middleware do api-server).
// Aplica em todas as respostas antes de qualquer writeHead/end. CSP libera
// Stripe, Google Fonts/Maps e ViaCEP/BrasilAPI usados pelo cadastro.
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.instagram.com https://platform.instagram.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://maps.googleapis.com https://viacep.com.br https://brasilapi.com.br https://www.instagram.com https://graph.instagram.com",
    "frame-src https://js.stripe.com https://www.instagram.com",
    "object-src 'none'",
  ].join("; "),
};

function applySecurityHeaders(res) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(k, v);
  }
  res.removeHeader("X-Powered-By");
}

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
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
};

function serveStaticFile(req, res, filePath, mime) {
  const stat = statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = req.headers["range"];

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": mime,
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Accept-Ranges": "bytes",
      "Content-Type": mime,
    });
    createReadStream(filePath).pipe(res);
  }
}

let renderFn = null;
async function getRender() {
  if (!renderFn) {
    const mod = await import("./dist/server/entry-server.js");
    renderFn = mod.render;
  }
  return renderFn;
}

const template = readFileSync(resolve(DIST_DIR, "index.html"), "utf-8");

const API_BASE = process.env.API_INTERNAL_URL || "http://localhost:8080";

async function safeFetch(url) {
  try {
    const r = await fetch(url);
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function handler(req, res) {
  applySecurityHeaders(res);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── robots.txt ────────────────────────────────────────────────
  if (pathname === "/robots.txt") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /lojista
Disallow: /api

Sitemap: https://www.hublondrina.com.br/sitemap.xml`);
    return;
  }

  // ── sitemap.xml ───────────────────────────────────────────────
  if (pathname === "/sitemap.xml") {
    try {
      const businesses = await safeFetch(`${API_BASE}/api/businesses?limit=1000`);
      const baseUrl = "https://www.hublondrina.com.br";
      const today = new Date().toISOString().split("T")[0];

      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/categorias", priority: "0.8", changefreq: "weekly" },
        { url: "/busca", priority: "0.8", changefreq: "daily" },
        { url: "/anuncie", priority: "0.7", changefreq: "monthly" },
        { url: "/cadastro", priority: "0.6", changefreq: "monthly" },
        { url: "/norte", priority: "0.8", changefreq: "weekly" },
        { url: "/sul", priority: "0.8", changefreq: "weekly" },
        { url: "/leste", priority: "0.8", changefreq: "weekly" },
        { url: "/oeste", priority: "0.8", changefreq: "weekly" },
        { url: "/centro", priority: "0.8", changefreq: "weekly" },
      ];

      const staticUrls = staticPages.map(p => `
  <url>
    <loc>${baseUrl}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("");

      const bizUrls = (businesses?.data || []).map(b => `
  <url>
    <loc>${baseUrl}/negocio/${b.id}</loc>
    <lastmod>${b.createdAt ? b.createdAt.split("T")[0] : today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${bizUrls}
</urlset>`;

      res.writeHead(200, { "Content-Type": "application/xml" });
      res.end(xml);
    } catch (e) {
      console.error("Sitemap error:", e);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Sitemap generation failed");
    }
    return;
  }

  // ── Static assets ─────────────────────────────────────────────
  if (pathname !== "/" && pathname !== "") {
    const filePath = resolve(DIST_DIR, pathname.slice(1));
    if (existsSync(filePath)) {
      const ext = extname(filePath);
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      serveStaticFile(req, res, filePath, mime);
      return;
    }
  }

  // ── SSR: /negocio/:id ──────────────────────────────────────────
  const negocioMatch = pathname.match(/^\/negocio\/(\d+)$/);
  if (negocioMatch) {
    try {
      const id = Number(negocioMatch[1]);
      const business = await safeFetch(`${API_BASE}/api/businesses/${id}`);
      if (business) {
        const render = await getRender();
        const appHtml = render(`/negocio/${id}`, business);
        const title = `${business.name} — Hub Londrina`;
        const rawDesc = business.description ||
          `${business.name} em Londrina, PR. Veja avaliações, horários e contato.`;
        const desc = rawDesc.slice(0, 155);
        const safeData = JSON.stringify(business).replace(/</g, "\\u003c");
        const ssrScript = `<script>window.__SSR_DATA__=${safeData}</script>`;

        const jsonLd = {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": business.name,
          "description": business.description || "",
          "telephone": business.phone || "",
          "url": `https://www.hublondrina.com.br/negocio/${business.id}`,
          "image": business.photoUrl || business.logoUrl || "",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": business.address || "",
            "addressLocality": "Londrina",
            "addressRegion": "PR",
            "addressCountry": "BR",
            "postalCode": business.cep || "",
          },
          ...(business.lat && business.lng ? {
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": business.lat,
              "longitude": business.lng,
            },
          } : {}),
          ...(business.rating && business.reviewsCount > 0 ? {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": business.rating,
              "reviewCount": business.reviewsCount,
              "bestRating": 5,
              "worstRating": 1,
            },
          } : {}),
          ...(business.hours ? { "openingHours": business.hours } : {}),
        };
        const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

        // B1: og:image + canonical
        const canonicalUrl = `https://www.hublondrina.com.br/negocio/${business.id}`;
        const ogImage = business.photoUrl || business.bannerUrl || business.logoUrl ||
          "https://www.hublondrina.com.br/logo.jpeg";
        const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
        const safeTitle = escAttr(title);
        const safeDesc = escAttr(desc);
        const metaInject = [
          `<link rel="canonical" href="${escAttr(canonicalUrl)}" />`,
          `<meta property="og:type" content="business.business" />`,
          `<meta property="og:url" content="${escAttr(canonicalUrl)}" />`,
          `<meta property="og:image" content="${escAttr(ogImage)}" />`,
          `<meta property="og:image:alt" content="${safeTitle}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${safeTitle}" />`,
          `<meta name="twitter:description" content="${safeDesc}" />`,
          `<meta name="twitter:image" content="${escAttr(ogImage)}" />`,
        ].join("\n");

        let html = template
          .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
          .replace("<title>Hub Londrina — Negócio Local</title>", `<title>${title}</title>`)
          .replace(
            `content="Feito por londrinense, para londrinense. Encontre restaurantes, salões, clínicas e serviços locais em Londrina, PR."`,
            `content="${desc.replace(/"/g, "&quot;")}"`
          )
          .replace(
            `<meta property="og:title" content="Hub Londrina — Negócio Local" />`,
            `<meta property="og:title" content="${safeTitle}" />`
          )
          .replace(
            `<meta property="og:description" content="Feito por londrinense, para londrinense. Encontre negócios locais em Londrina, PR." />`,
            `<meta property="og:description" content="${safeDesc}" />`
          )
          .replace("</head>", `${metaInject}\n${ssrScript}\n${jsonLdScript}\n</head>`);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
    } catch (e) {
      console.error("[SSR /negocio error]", e.message);
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(template);
    return;
  }

  // ── SSR: zone pages /norte, /sul, /leste, /oeste, /centro ─────
  const ZONES = ["norte", "sul", "leste", "oeste", "centro"];
  const ZONE_LABELS = { norte: "Zona Norte", sul: "Zona Sul", leste: "Zona Leste", oeste: "Zona Oeste", centro: "Centro" };
  const zoneMatch = ZONES.find(z => pathname === `/${z}`);
  if (zoneMatch) {
    try {
      const render = await getRender();
      const [stats, businesses] = await Promise.all([
        safeFetch(`${API_BASE}/api/zones/${zoneMatch}/stats`),
        safeFetch(`${API_BASE}/api/zones/${zoneMatch}/businesses?limit=12`),
      ]);
      const extraQueries = [];
      if (stats) extraQueries.push({ key: [`/api/zones/${zoneMatch}/stats`], data: stats });
      if (businesses) extraQueries.push({ key: [`/api/zones/${zoneMatch}/businesses`, null, 1], data: businesses });
      const appHtml = render(pathname, undefined, extraQueries);
      const zoneLabel = ZONE_LABELS[zoneMatch];
      const hydrationScript = `<script>window.__SSR_QUERIES__=${JSON.stringify(extraQueries).replace(/</g, "\\u003c")}</script>`;
      const html = template
        .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
        .replace("<title>Hub Londrina — Negócio Local</title>", `<title>${zoneLabel} Londrina — Negócios Locais | Hub Londrina</title>`)
        .replace(
          `content="Feito por londrinense, para londrinense. Encontre restaurantes, salões, clínicas e serviços locais em Londrina, PR."`,
          `content="Encontre os melhores negócios da ${zoneLabel} de Londrina. Restaurantes, salões, academias e muito mais perto de você."`
        )
        .replace("</head>", `${hydrationScript}\n</head>`);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    } catch (e) {
      console.error(`[SSR /${zoneMatch} error]`, e.message);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(template);
      return;
    }
  }

  // ── SPA-only routes (no SSR data fetch) ───────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/lojista")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(template);
    return;
  }

  // ── SSR: home page and other app routes ────────────────────────
  try {
    const render = await getRender();
    const [categories, businesses, stats] = await Promise.all([
      safeFetch(`${API_BASE}/api/categories`),
      safeFetch(`${API_BASE}/api/businesses?sort=rating`),
      safeFetch(`${API_BASE}/api/stats`),
    ]);

    const extraQueries = [];
    if (categories) extraQueries.push({ key: ["/api/categories"], data: categories });
    if (businesses) extraQueries.push({ key: ["/api/businesses", { sort: "rating" }], data: businesses });
    if (stats) extraQueries.push({ key: ["/api/stats"], data: stats });

    const appHtml = render(pathname || "/", undefined, extraQueries);

    const homeLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Hub Londrina",
      "url": "https://www.hublondrina.com.br",
      "description": "O guia de negócios locais feito por quem é de Londrina.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.hublondrina.com.br/busca?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    };
    const homeLdScript = `<script type="application/ld+json">${JSON.stringify(homeLd)}</script>`;

    const hydrationScript = `<script>window.__SSR_QUERIES__=${
      JSON.stringify(extraQueries).replace(/</g, "\\u003c")
    }</script>`;

    const html = template
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
      .replace("</head>", `${homeLdScript}\n${hydrationScript}\n</head>`);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  } catch (e) {
    console.error("[SSR home error]", e.message);
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(template);
}

createServer(handler).listen(PORT, "0.0.0.0", () => {
  console.log(`SSR server running on port ${PORT}`);
});
