#!/usr/bin/env tsx
// Task #77 — Teste automatizado do invariante R2 (documentação expirada).
//
// Garante DEFESA EM PROFUNDIDADE: uma loja com `documentationStatus='expired'`
// NUNCA pode reaparecer no site público nem ser religada manualmente pelo admin,
// MESMO quando `businesses.isVisible=true` (estado-bug que o filtro deve cobrir).
//
// O teste cria dois negócios descartáveis na mesma zona, ambos com isVisible=true:
//   - EXPIRED  → documentationStatus='expired'  → DEVE sumir das listagens públicas
//   - CONTROL  → documentationStatus='approved' → DEVE aparecer (filtro não derruba todos)
// E confirma que PATCH /admin/businesses/:id {isVisible:true} na loja expirada
// retorna 409 DOCUMENTATION_EXPIRED. Ao final, remove os dois negócios.
//
// Config via env:
//  - BASE_URL (default http://localhost:80)
//  - ADMIN_PASSWORD (obrigatório p/ checar o guard do admin; sem ele, pula esse passo)

import { db } from "@workspace/db";
import { businessesTable, businessUsersTable, categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const BASE = process.env.BASE_URL || "http://localhost:80";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ZONE = "sul";
const REGION = "Zona Sul";

let failures = 0;
function pass(name: string) { console.log(`  \u2713 ${name}`); }
function fail(name: string, detail: string) { console.log(`  \u2717 ${name}\n     ${detail}`); failures++; }

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* corpo vazio/não-json */ }
  return { status: res.status, json };
}

function containsId(payload: any, id: number): boolean {
  // Os endpoints retornam { businesses: [...] } ou { results: [...] } ou array direto.
  const lists = [payload, payload?.businesses, payload?.results, payload?.data].filter(Array.isArray);
  for (const list of lists) {
    if (list.some((b: any) => b?.id === id)) return true;
  }
  return false;
}

async function main() {
  console.log(`\n[validate-doc-expired-invariant] BASE=${BASE} zone=${ZONE}\n`);

  const [cat] = await db.select({ slug: categoriesTable.slug }).from(categoriesTable).limit(1);
  if (!cat?.slug) {
    fail("pré-requisito: existe ao menos 1 categoria seedada", "nenhuma categoria encontrada");
    process.exit(1);
  }

  const stamp = Date.now();
  const expiredName = `ZZTESTEXPIRED${stamp}`;
  const controlName = `ZZTESTCONTROL${stamp}`;
  let expiredId: number | null = null;
  let controlId: number | null = null;

  try {
    // --- Setup: dois negócios visíveis (isVisible=true) na mesma zona ---
    const [expired] = await db.insert(businessesTable).values({
      name: expiredName, categorySlug: cat.slug, region: REGION, zone: ZONE,
      description: "negócio de teste do invariante R2 (expired)", address: "Rua Teste, 100",
      isVisible: true, status: "active", planType: "premium",
    }).returning({ id: businessesTable.id });
    expiredId = expired.id;
    await db.insert(businessUsersTable).values({
      businessId: expiredId, email: `__inv_expired_${stamp}@test.local`, passwordHash: "x",
      documentationStatus: "expired", documentationRemainingDays: 0, documentationTimerPaused: false,
    });

    const [control] = await db.insert(businessesTable).values({
      name: controlName, categorySlug: cat.slug, region: REGION, zone: ZONE,
      description: "negócio de teste do invariante R2 (control)", address: "Rua Teste, 200",
      isVisible: true, status: "active", planType: "premium",
    }).returning({ id: businessesTable.id });
    controlId = control.id;
    await db.insert(businessUsersTable).values({
      businessId: controlId, email: `__inv_control_${stamp}@test.local`, passwordHash: "x",
      documentationStatus: "approved", documentationRemainingDays: 10, documentationTimerPaused: true,
    });

    pass(`setup: negócios criados (expired=#${expiredId}, control=#${controlId}, isVisible=true)`);

    // --- 1. GET /api/businesses?zone=sul — expired ausente, control presente ---
    const list = await call("GET", `/api/businesses?zone=${ZONE}`);
    if (list.status !== 200) {
      fail("GET /api/businesses 200", `status=${list.status}`);
    } else {
      if (containsId(list.json, expiredId!)) {
        fail("R2 /api/businesses NÃO lista loja expirada", `id=${expiredId} apareceu (isVisible=true)`);
      } else {
        pass("R2 /api/businesses oculta loja expirada mesmo com isVisible=true");
      }
      if (containsId(list.json, controlId!)) {
        pass("controle: /api/businesses lista loja approved (filtro não derruba todos)");
      } else {
        fail("controle: /api/businesses deveria listar loja approved", `id=${controlId} ausente`);
      }
    }

    // --- 2. GET /api/search?q=<nome único> — expired ausente ---
    const search = await call("GET", `/api/search?q=${encodeURIComponent(expiredName)}`);
    if (search.status !== 200) {
      fail("GET /api/search 200", `status=${search.status}`);
    } else if (containsId(search.json, expiredId!)) {
      fail("R2 /api/search NÃO retorna loja expirada", `id=${expiredId} apareceu na busca`);
    } else {
      pass("R2 /api/search oculta loja expirada");
    }

    // --- 2b. GET /api/autocomplete?q=<nome único> — expired ausente ---
    const ac = await call("GET", `/api/autocomplete?q=${encodeURIComponent(expiredName)}`);
    if (ac.status !== 200) {
      fail("GET /api/autocomplete 200", `status=${ac.status}`);
    } else {
      const acIds = [
        ...(Array.isArray(ac.json?.sponsored) ? ac.json.sponsored : []),
        ...(Array.isArray(ac.json?.suggestions) ? ac.json.suggestions : []),
      ].map((b: any) => b?.id);
      if (acIds.includes(expiredId)) {
        fail("R2 /api/autocomplete NÃO sugere loja expirada", `id=${expiredId} apareceu no autocomplete`);
      } else {
        pass("R2 /api/autocomplete oculta loja expirada");
      }
    }

    // --- 3. GET /api/zones/sul/businesses — expired ausente, control presente ---
    const zoneList = await call("GET", `/api/zones/${ZONE}/businesses`);
    if (zoneList.status !== 200) {
      fail("GET /api/zones/:zone/businesses 200", `status=${zoneList.status}`);
    } else {
      if (containsId(zoneList.json, expiredId!)) {
        fail("R2 /api/zones/:zone/businesses NÃO lista expirada", `id=${expiredId} apareceu`);
      } else {
        pass("R2 /api/zones/:zone/businesses oculta loja expirada");
      }
      if (containsId(zoneList.json, controlId!)) {
        pass("controle: /api/zones/:zone/businesses lista loja approved");
      } else {
        fail("controle: /api/zones/:zone/businesses deveria listar approved", `id=${controlId} ausente`);
      }
    }

    // --- 4. Guard admin: PATCH {isVisible:true} em loja expirada → 409 ---
    if (!ADMIN_PASSWORD) {
      console.log("  - guard admin pulado (ADMIN_PASSWORD ausente no ambiente)");
    } else {
      const login = await call("POST", "/api/admin/login", { body: { password: ADMIN_PASSWORD } });
      if (login.status !== 200 || !login.json?.token) {
        fail("login admin", `status=${login.status}`);
      } else {
        const patch = await call("PATCH", `/api/admin/businesses/${expiredId}`, {
          token: login.json.token, body: { isVisible: true },
        });
        if (patch.status === 409 && patch.json?.code === "DOCUMENTATION_EXPIRED") {
          pass("R2 admin NÃO republica loja expirada (409 DOCUMENTATION_EXPIRED)");
        } else {
          fail("R2 admin PATCH isVisible=true em expirada → 409", `status=${patch.status} body=${JSON.stringify(patch.json)}`);
        }
      }
    }
  } finally {
    // --- Cleanup: remove os negócios de teste (business_users cai por cascade) ---
    if (expiredId) await db.delete(businessesTable).where(eq(businessesTable.id, expiredId));
    if (controlId) await db.delete(businessesTable).where(eq(businessesTable.id, controlId));
  }

  console.log(`\n${failures === 0 ? "\u2713 OK" : `\u2717 ${failures} FALHA(S)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
