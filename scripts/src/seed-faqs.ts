import { db } from "@workspace/db";
import { faqsTable } from "@workspace/db/schema";

const seeds: Array<{ category: "consumidor" | "lojista" | "lgpd"; sortOrder: number; question: string; answer: string }> = [
  { category: "consumidor", sortOrder: 1, question: "O que é o Hub Londrina?", answer: "O Hub Londrina é um guia digital de negócios locais da cidade de Londrina/PR. Reunimos lojas, prestadores de serviços, restaurantes e profissionais em um único lugar, organizados por categoria e zona, para você encontrar facilmente o que precisa perto de você." },
  { category: "consumidor", sortOrder: 2, question: "É gratuito para quem busca?", answer: "Sim. Buscar, navegar, ver negócios, ler avaliações e entrar em contato com os anunciantes é 100% gratuito para o público." },
  { category: "consumidor", sortOrder: 3, question: "Como deixo uma avaliação?", answer: "Acesse a página do negócio e clique em \"Avaliar\". Você pode dar uma nota de 1 a 5 estrelas e escrever um comentário. Avaliações ajudam outros consumidores e o próprio lojista." },
  { category: "consumidor", sortOrder: 4, question: "Como entro em contato com um negócio?", answer: "Na página de cada negócio você encontra telefone, WhatsApp, endereço e site (quando informados). Clique no botão de WhatsApp para conversar diretamente com o lojista." },
  { category: "lojista", sortOrder: 1, question: "Como anuncio meu negócio?", answer: "Acesse /anuncie e escolha um plano. Após o cadastro e a verificação, seu negócio aparecerá nas buscas. Temos um plano Gratuito (R$0) e planos pagos com mais visibilidade e recursos." },
  { category: "lojista", sortOrder: 2, question: "Quanto custa anunciar?", answer: "Plano Gratuito: R$0. Plano Destaque: R$59,90/mês (ou R$598,80/ano = R$49,90/mês). Plano Premium: R$89,90/mês (ou R$958,80/ano = R$79,90/mês). Veja a comparação completa em /anuncie." },
  { category: "lojista", sortOrder: 3, question: "Posso impulsionar meu anúncio?", answer: "Sim. Lojistas Destaque e Premium podem comprar boosts mensais para aparecer no topo da categoria, da zona, da home ou da busca. Acesse o painel /lojista/boost para ver as vagas disponíveis." },
  { category: "lojista", sortOrder: 4, question: "Como cancelo minha assinatura?", answer: "Acesse /lojista/plano e clique em \"Gerenciar assinatura\". Você será redirecionado para o portal do Stripe, onde pode cancelar a qualquer momento. O acesso permanece ativo até o fim do período já pago." },
  { category: "lgpd", sortOrder: 1, question: "Como meus dados são tratados?", answer: "Tratamos seus dados pessoais em conformidade com a LGPD (Lei 13.709/2018). Coletamos apenas o necessário para prestar o serviço (cadastro, comunicação e pagamento). Detalhes completos na nossa Política de Privacidade em /privacidade." },
  { category: "lgpd", sortOrder: 2, question: "Quais dados são públicos?", answer: "Para negócios cadastrados, são públicos: nome, descrição, categoria, zona, endereço comercial, telefone, WhatsApp, redes sociais, fotos e avaliações. Email do dono, CNPJ e dados internos NÃO são exibidos publicamente." },
  { category: "lgpd", sortOrder: 3, question: "Como exerço meus direitos LGPD?", answer: "Envie um email ao Encarregado de Dados (DPO) com sua solicitação (acesso, correção, exclusão, portabilidade ou anonimização). O endereço fica no rodapé do site e respondemos em até 15 dias." },
  { category: "lgpd", sortOrder: 4, question: "Por quanto tempo guardam meus dados?", answer: "Dados de cadastro são mantidos enquanto sua conta estiver ativa. Após exclusão, retemos por mais 12 meses por obrigação legal (fiscal/contratual). Logs e métricas anonimizadas podem ser mantidos por mais tempo." },
];

const existing = await db.select().from(faqsTable);
if (existing.length > 0) {
  console.log(`Já existem ${existing.length} FAQs no banco. Skip.`);
  process.exit(0);
}
await db.insert(faqsTable).values(seeds);
console.log(`Inseridos ${seeds.length} FAQs.`);
process.exit(0);
