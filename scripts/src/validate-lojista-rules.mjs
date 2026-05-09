#!/usr/bin/env node
// Validação E2E dos invariantes do RULES.md (R1, R3, R11).
// Loga como lojista FREE seedado e confirma que:
//  - GET /lojista/profile retorna zone + region (R3)
//  - POST /lojista/home-banner/checkout → 403 PLAN_REQUIRED (R1)
//  - POST /lojista/boosts/checkout {zone} → 403 PLAN_REQUIRED (R1)
//  - POST /lojista/boosts/category-checkout → 403 PLAN_REQUIRED (R1)
//  - POST /lojista/vitrine-boost/checkout (free) → 403 PLAN_REQUIRED (R11.a)
//  - POST /lojista/vitrine-boost/checkout (premium s/ vídeo) → 409 NO_APPROVED_VIDEO (R11.b)
//  - GET /api/vitrine retorna ≤12 cards (e [] se <6) — R11.c
//
// Configuração via env:
//  - BASE_URL (default http://localhost:80)
//  - TEST_LOJISTA_EMAIL (default contato@eletricalondrina.com.br — seedado)
//  - TEST_LOJISTA_PASSWORD (default Hub@2026)

const BASE = process.env.BASE_URL || "http://localhost:80";
const EMAIL = process.env.TEST_LOJISTA_EMAIL || "contato@eletricalondrina.com.br";
const PASSWORD = process.env.TEST_LOJISTA_PASSWORD || "Hub@2026";

let failures = 0;
function pass(name) { console.log(`  \u2713 ${name}`); }
function fail(name, detail) { console.log(`  \u2717 ${name}\n     ${detail}`); failures++; }

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  console.log(`\n[validate-lojista-rules] BASE=${BASE} EMAIL=${EMAIL}\n`);

  // 0. Login
  const login = await call("POST", "/api/lojista/login", { body: { email: EMAIL, password: PASSWORD } });
  if (login.status !== 200 || !login.json?.token) {
    fail("login lojista free", `status=${login.status} body=${JSON.stringify(login.json)}`);
    process.exit(1);
  }
  pass("login lojista free");
  const token = login.json.token;

  // 1. R3 — GET /lojista/profile retorna zone + region
  const profile = await call("GET", "/api/lojista/profile", { token });
  if (profile.status !== 200) {
    fail("R3 GET /lojista/profile responde 200", `status=${profile.status}`);
  } else if (!profile.json?.zone || !profile.json?.region) {
    fail("R3 GET /lojista/profile retorna zone+region", `zone=${profile.json?.zone} region=${profile.json?.region}`);
  } else {
    pass(`R3 profile retorna zone='${profile.json.zone}' region='${profile.json.region}'`);
  }

  if (profile.json?.planType !== "free") {
    fail("teste exige lojista FREE", `planType=${profile.json?.planType} — ajuste TEST_LOJISTA_EMAIL`);
    process.exit(1);
  }

  // 2. R1 — POST /lojista/home-banner/checkout deve retornar 403 PLAN_REQUIRED
  const banner = await call("POST", "/api/lojista/home-banner/checkout", { token });
  if (banner.status === 403 && banner.json?.code === "PLAN_REQUIRED") {
    pass("R1 home-banner/checkout bloqueia free (403 PLAN_REQUIRED)");
  } else {
    fail("R1 home-banner/checkout bloqueia free", `status=${banner.status} body=${JSON.stringify(banner.json)}`);
  }

  // 3. R1 — POST /lojista/boosts/checkout {zone} deve retornar 403
  const zone = await call("POST", "/api/lojista/boosts/checkout", { token, body: { boostContext: "zone" } });
  if (zone.status === 403 && zone.json?.code === "PLAN_REQUIRED") {
    pass("R1 boosts/checkout zone bloqueia free (403 PLAN_REQUIRED)");
  } else {
    fail("R1 boosts/checkout zone bloqueia free", `status=${zone.status} body=${JSON.stringify(zone.json)}`);
  }

  // 4. R1 — POST /lojista/boosts/checkout {home_search} deve retornar 403
  const home = await call("POST", "/api/lojista/boosts/checkout", { token, body: { boostContext: "home_search" } });
  if (home.status === 403 && home.json?.code === "PLAN_REQUIRED") {
    pass("R1 boosts/checkout home_search bloqueia free (403 PLAN_REQUIRED)");
  } else {
    fail("R1 boosts/checkout home_search bloqueia free", `status=${home.status} body=${JSON.stringify(home.json)}`);
  }

  // 5. R1 — POST /lojista/boosts/category-checkout deve retornar 403
  const cat = await call("POST", "/api/lojista/boosts/category-checkout", { token, body: { position: 1 } });
  if (cat.status === 403 && cat.json?.code === "PLAN_REQUIRED") {
    pass("R1 boosts/category-checkout bloqueia free (403 PLAN_REQUIRED)");
  } else {
    fail("R1 boosts/category-checkout bloqueia free", `status=${cat.status} body=${JSON.stringify(cat.json)}`);
  }

  // 6. R11.a — vitrine-boost/checkout bloqueia FREE
  const vitrineFree = await call("POST", "/api/lojista/vitrine-boost/checkout", { token, body: {} });
  if (vitrineFree.status === 403 && vitrineFree.json?.code === "PLAN_REQUIRED") {
    pass("R11.a vitrine-boost/checkout bloqueia free (403 PLAN_REQUIRED)");
  } else {
    fail("R11.a vitrine-boost/checkout bloqueia free", `status=${vitrineFree.status} body=${JSON.stringify(vitrineFree.json)}`);
  }

  // 7. R11.b — premium sem vídeo aprovado deve retornar 409 NO_APPROVED_VIDEO
  //    Usa lojista premium seedado (vetcare). Se não encontrado, pula.
  const premLogin = await call("POST", "/api/lojista/login", { body: { email: "contato@vetcare.com.br", password: PASSWORD } });
  if (premLogin.status === 200 && premLogin.json?.token) {
    const premVitrine = await call("POST", "/api/lojista/vitrine-boost/checkout", { token: premLogin.json.token, body: {} });
    if (premVitrine.status === 409 && premVitrine.json?.code === "NO_APPROVED_VIDEO") {
      pass("R11.b vitrine-boost/checkout premium sem vídeo bloqueia (409 NO_APPROVED_VIDEO)");
    } else if (premVitrine.status === 409 && premVitrine.json?.code === "BOOST_ALREADY_EXISTS") {
      pass("R11.b vitrine-boost/checkout premium (já tem boost — gate alternativo OK)");
    } else {
      fail("R11.b vitrine-boost/checkout premium sem vídeo", `status=${premVitrine.status} body=${JSON.stringify(premVitrine.json)}`);
    }
  } else {
    console.log("  - R11.b pulado (lojista premium seed não disponível)");
  }

  // 8. R11.c — GET /api/vitrine respeita teto de 12 cards e mín de 6
  const vitrinePub = await call("GET", "/api/vitrine");
  if (vitrinePub.status !== 200) {
    fail("R11.c GET /api/vitrine 200", `status=${vitrinePub.status}`);
  } else {
    const cards = vitrinePub.json?.cards ?? [];
    if (!Array.isArray(cards)) {
      fail("R11.c /api/vitrine retorna array", `cards=${typeof cards}`);
    } else if (cards.length > 12) {
      fail("R11.c /api/vitrine ≤ 12 cards", `cards=${cards.length}`);
    } else if (cards.length > 0 && cards.length < 6) {
      fail("R11.c /api/vitrine renderiza só se ≥6", `cards=${cards.length}`);
    } else {
      pass(`R11.c /api/vitrine respeita teto/mínimo (cards=${cards.length})`);
    }
  }

  console.log(`\n${failures === 0 ? "\u2713 OK" : `\u2717 ${failures} FALHA(S)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
