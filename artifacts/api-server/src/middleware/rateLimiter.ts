import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Muitas tentativas. Tente novamente em 15 minutos.",
    code: "TOO_MANY_REQUESTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Pentest fix — proteção contra abuso do endpoint de CSRF token.
// É chamado em cada navegação SPA antes de POSTs com cookie, então
// 60/min/IP cobre uso legítimo com folga.
export const csrfTokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    error: "Muitas requisições. Tente novamente em breve.",
    code: "TOO_MANY_REQUESTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: "Muitos cadastros deste IP. Tente novamente em 1 hora.",
    code: "TOO_MANY_REQUESTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: "Muitas avaliações enviadas. Tente novamente em 1 hora.",
    code: "TOO_MANY_REQUESTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const businessViewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    error: "Muitas requisições. Tente novamente em breve.",
    code: "TOO_MANY_REQUESTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const cnpjLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: "Muitas consultas de CNPJ. Tente novamente em 1 hora.",
    code: "TOO_MANY_REQUESTS",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
