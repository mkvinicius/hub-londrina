import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { subscriptionsTable, businessesTable, businessUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_WEBHOOK_SECRET env var is required");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });

const PRICE_MAP: Record<string, { plan: "destaque" | "premium"; cycle: "monthly" | "annual" }> = {
  [process.env.STRIPE_BASE_PRICE_ID!]: { plan: "destaque", cycle: "monthly" },
  [process.env.STRIPE_BASE_ANNUAL_PRICE_ID!]: { plan: "destaque", cycle: "annual" },
  [process.env.STRIPE_PREMIUM_PRICE_ID!]: { plan: "premium", cycle: "monthly" },
  [process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID!]: { plan: "premium", cycle: "annual" },
};

function getLojistaFromToken(req: Request): { businessId: number; email: string } | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as any;
    if (payload.role !== "lojista") return null;
    return { businessId: payload.businessId, email: payload.email };
  } catch {
    return null;
  }
}

router.get("/stripe/config", (_req: Request, res: Response) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    prices: {
      base_monthly: process.env.STRIPE_BASE_PRICE_ID,
      base_annual: process.env.STRIPE_BASE_ANNUAL_PRICE_ID,
      premium_monthly: process.env.STRIPE_PREMIUM_PRICE_ID,
      premium_annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
    },
  });
});

router.post("/stripe/checkout", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const { priceId } = req.body as { priceId: string };
  if (!priceId || !PRICE_MAP[priceId]) {
    return res.status(400).json({ error: "Price ID inválido" });
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, lojista.businessId));

  if (!business) return res.status(404).json({ error: "Negócio não encontrado" });

  const [existingSub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  let customerId = existingSub?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: lojista.email,
      name: business.name,
      metadata: { businessId: String(lojista.businessId) },
    });
    customerId = customer.id;
  }

  const appUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/lojista/plano?success=1`,
    cancel_url: `${appUrl}/lojista/plano?cancelled=1`,
    metadata: { businessId: String(lojista.businessId) },
    subscription_data: {
      metadata: { businessId: String(lojista.businessId) },
    },
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

router.post("/stripe/portal", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  if (!sub?.stripeCustomerId) {
    return res.status(404).json({ error: "Nenhuma assinatura encontrada" });
  }

  const appUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl}/lojista/plano`,
  });

  res.json({ url: portal.url });
});

router.get("/stripe/subscription", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  if (!sub) return res.json(null);

  res.json({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    stripePriceId: sub.stripePriceId,
  });
});

router.post("/stripe/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: "Missing signature" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  async function syncSubscription(stripeSubId: string) {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
    const businessId = Number(stripeSub.metadata.businessId);
    if (!businessId) return;

    const priceId = stripeSub.items.data[0]?.price.id;
    const planInfo = PRICE_MAP[priceId];
    const planType = planInfo?.plan ?? "free";

    const statusMap: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      canceled: "cancelled",
      unpaid: "past_due",
      incomplete: "past_due",
      incomplete_expired: "cancelled",
      paused: "past_due",
    };
    const status = statusMap[stripeSub.status] ?? "cancelled";
    const isActive = status === "active" || status === "trialing";

    await db
      .insert(subscriptionsTable)
      .values({
        businessId,
        stripeCustomerId: String(stripeSub.customer),
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        plan: planType,
        status,
        currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      })
      .onConflictDoUpdate({
        target: subscriptionsTable.businessId,
        set: {
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: priceId,
          plan: planType,
          status,
          currentPeriodStart: new Date((stripeSub as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          updatedAt: new Date(),
        },
      });

    await db
      .update(businessesTable)
      .set({ planType: isActive ? planType : "free" })
      .where(eq(businessesTable.id, businessId));
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          await syncSubscription(String(session.subscription));
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as any).subscription) {
          await syncSubscription(String((invoice as any).subscription));
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string;
        if (subId) {
          await db
            .update(subscriptionsTable)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(subscriptionsTable.stripeSubscriptionId, subId));
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub.id);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.json({ received: true });
});

export default router;
