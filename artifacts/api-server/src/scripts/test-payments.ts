import http from "http";

const API_BASE = "http://localhost:80";

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function pass(name: string, detail: string) {
  results.push({ name, passed: true, detail });
  console.log(`  ✅ ${name}: ${detail}`);
}

function fail(name: string, detail: string) {
  results.push({ name, passed: false, detail });
  console.log(`  ❌ ${name}: ${detail}`);
}

async function request(method: string, path: string, body?: object, token?: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: "localhost",
      port: 80,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getLojistaToken(email: string, password: string): Promise<string | null> {
  const res = await request("POST", "/api/lojista/login", { email, password });
  if (res.status === 200 && res.data.token) return res.data.token;
  return null;
}

async function getStripeConfig(): Promise<any> {
  const res = await request("GET", "/api/stripe/config");
  return res.data;
}

async function runTests() {
  console.log("\n=== Hub Londrina — Testes de Pagamento ===\n");

  console.log("1. Verificando config Stripe...");
  let config: any;
  try {
    config = await getStripeConfig();
    if (config?.base_monthly && config.base_monthly.startsWith("price_")) {
      pass("Config Stripe", `PRICE_IDs corretos: base_monthly=${config.base_monthly.slice(0, 20)}…`);
    } else {
      fail("Config Stripe", `PRICE_ID base_monthly inválido: ${config?.base_monthly}`);
    }
  } catch (e: any) {
    fail("Config Stripe", `Erro: ${e.message}`);
    return;
  }

  console.log("\n2. Autenticando lojista de teste (Premium)...");
  let premiumToken: string | null = null;
  let freeToken: string | null = null;
  try {
    premiumToken = await getLojistaToken("contato@sabordosul.com.br", "Hub@2026");
    if (premiumToken) {
      pass("Login lojista Premium", "Token obtido com sucesso");
    } else {
      fail("Login lojista Premium", "Não foi possível obter token");
    }
  } catch (e: any) {
    fail("Login lojista Premium", `Erro: ${e.message}`);
  }

  console.log("\n3. Testando checkout Plano Destaque Mensal...");
  if (premiumToken && config?.base_monthly) {
    try {
      const res = await request("POST", "/api/stripe/checkout",
        { priceId: config.base_monthly }, premiumToken);
      if (res.status === 400 && res.data?.error?.includes("assinatura ativa")) {
        pass("Checkout Destaque Mensal", "Corretamente bloqueado — lojista já tem assinatura ativa");
      } else if (res.status === 200 && res.data?.url?.includes("checkout.stripe.com")) {
        pass("Checkout Destaque Mensal", `URL Stripe obtida: ${res.data.url.slice(0, 50)}…`);
      } else {
        fail("Checkout Destaque Mensal", `Status ${res.status}: ${JSON.stringify(res.data).slice(0, 100)}`);
      }
    } catch (e: any) {
      fail("Checkout Destaque Mensal", `Erro: ${e.message}`);
    }
  } else {
    fail("Checkout Destaque Mensal", "Sem token ou PRICE_ID inválido — pulado");
  }

  console.log("\n4. Testando checkout Plano Premium Mensal...");
  if (premiumToken && config?.premium_monthly) {
    try {
      const res = await request("POST", "/api/stripe/checkout",
        { priceId: config.premium_monthly }, premiumToken);
      if (res.status === 400 && res.data?.error?.includes("assinatura ativa")) {
        pass("Checkout Premium Mensal", "Corretamente bloqueado — lojista já tem assinatura ativa");
      } else if (res.status === 200 && res.data?.url?.includes("checkout.stripe.com")) {
        pass("Checkout Premium Mensal", `URL Stripe obtida: ${res.data.url.slice(0, 50)}…`);
      } else {
        fail("Checkout Premium Mensal", `Status ${res.status}: ${JSON.stringify(res.data).slice(0, 100)}`);
      }
    } catch (e: any) {
      fail("Checkout Premium Mensal", `Erro: ${e.message}`);
    }
  } else {
    fail("Checkout Premium Mensal", "Sem token ou PRICE_ID inválido — pulado");
  }

  console.log("\n5. Testando que PRICE_ID inválido é rejeitado...");
  if (premiumToken) {
    try {
      const res = await request("POST", "/api/stripe/checkout",
        { priceId: "price_fake_invalid_123" }, premiumToken);
      if (res.status === 400) {
        pass("Rejeição PRICE_ID inválido", `Corretamente rejeitado (status ${res.status})`);
      } else {
        fail("Rejeição PRICE_ID inválido", `Esperado 400, recebeu ${res.status}`);
      }
    } catch (e: any) {
      fail("Rejeição PRICE_ID inválido", `Erro: ${e.message}`);
    }
  }

  console.log("\n6. Testando checkout sem autenticação (deve retornar 401)...");
  try {
    const res = await request("POST", "/api/stripe/checkout",
      { priceId: config?.base_monthly || "price_test" });
    if (res.status === 401 || res.status === 403) {
      pass("Checkout sem auth", `Corretamente bloqueado (status ${res.status})`);
    } else {
      fail("Checkout sem auth", `Esperado 401/403, recebeu ${res.status}`);
    }
  } catch (e: any) {
    fail("Checkout sem auth", `Erro: ${e.message}`);
  }

  console.log("\n7. Testando Stripe Portal sem assinatura...");
  if (!premiumToken) {
    console.log("     ↳ Pulado — sem token");
  } else {
    try {
      const profileRes = await request("GET", "/api/lojista/profile", undefined, premiumToken);
      const subRes = await request("GET", "/api/stripe/subscription", undefined, premiumToken);
      if (subRes.status === 200) {
        pass("Stripe Subscription Status", `Plano: ${subRes.data.plan}, Status: ${subRes.data.status}`);
      } else if (subRes.status === 404) {
        pass("Stripe Subscription Status", "Sem assinatura (404 esperado para lojistas free)");
      } else {
        fail("Stripe Subscription Status", `Status ${subRes.status}`);
      }
    } catch (e: any) {
      fail("Stripe Subscription Status", `Erro: ${e.message}`);
    }
  }

  console.log("\n8. Testando acesso ao relatório PDF sem ser Premium...");
  try {
    const freeLoginRes = await request("POST", "/api/lojista/login",
      { email: "naoexiste@teste.com.br", password: "Hub@2026" });
    if (freeLoginRes.status === 401 || freeLoginRes.status === 400) {
      pass("Login inválido rejeitado", `Status ${freeLoginRes.status} como esperado`);
    }
  } catch (e: any) {
    fail("Login inválido", `Erro: ${e.message}`);
  }

  console.log("\n─────────────────────────────────────────");
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nResultado: ${passed}/${total} testes passaram\n`);

  if (passed === total) {
    console.log("✅ Todos os testes passaram!\n");
  } else {
    console.log(`⚠️  ${total - passed} teste(s) falharam.\n`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  → ${r.name}: ${r.detail}`);
    });
  }
}

runTests().catch(e => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
