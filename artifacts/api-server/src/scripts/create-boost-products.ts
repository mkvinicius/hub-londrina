import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" });

async function main() {
  const zoneProduct = await stripe.products.create({
    name: "Destaque de Zona",
    description: "Apareça em destaque na página da sua zona por 30 dias",
  });
  const zonePrice = await stripe.prices.create({
    product: zoneProduct.id,
    unit_amount: 7900,
    currency: "brl",
  });

  const homeProduct = await stripe.products.create({
    name: "Destaque Home + Busca",
    description: "Apareça em destaque na home e na busca geral por 30 dias",
  });
  const homePrice = await stripe.prices.create({
    product: homeProduct.id,
    unit_amount: 14900,
    currency: "brl",
  });

  console.log("STRIPE_ZONE_BOOST_PRICE_ID=" + zonePrice.id);
  console.log("STRIPE_HOME_BOOST_PRICE_ID=" + homePrice.id);
}

main().catch(e => { console.error(e); process.exit(1); });
