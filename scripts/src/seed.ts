import { db } from "@workspace/db";
import {
  categoriesTable,
  businessesTable,
  reviewsTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Iniciando seed do Hub Londrina...");

  await db.delete(reviewsTable);
  await db.delete(businessesTable);
  await db.delete(categoriesTable);

  console.log("Tabelas limpas. Inserindo categorias...");

  const categories = await db
    .insert(categoriesTable)
    .values([
      {
        slug: "restaurantes",
        name: "Restaurantes",
        icon: "Utensils",
        color: "#E53E3E",
        photoUrl: null,
      },
      {
        slug: "saloes",
        name: "Salões de Beleza",
        icon: "Scissors",
        color: "#D53F8C",
        photoUrl: null,
      },
      {
        slug: "academias",
        name: "Academias",
        icon: "Dumbbell",
        color: "#3182CE",
        photoUrl: null,
      },
      {
        slug: "mercados",
        name: "Mercados",
        icon: "ShoppingCart",
        color: "#38A169",
        photoUrl: null,
      },
      {
        slug: "cafeterias",
        name: "Cafeterias",
        icon: "Coffee",
        color: "#D69E2E",
        photoUrl: null,
      },
      {
        slug: "pet-shops",
        name: "Pet Shops",
        icon: "Dog",
        color: "#805AD5",
        photoUrl: null,
      },
      {
        slug: "farmácias",
        name: "Farmácias",
        icon: "Pill",
        color: "#319795",
        photoUrl: null,
      },
      {
        slug: "servicos",
        name: "Serviços",
        icon: "Wrench",
        color: "#DD6B20",
        photoUrl: null,
      },
      {
        slug: "padarias",
        name: "Padarias",
        icon: "Cake",
        color: "#ECC94B",
        photoUrl: null,
      },
      {
        slug: "saude",
        name: "Saúde",
        icon: "Heart",
        color: "#FC8181",
        photoUrl: null,
      },
    ])
    .returning();

  console.log(`${categories.length} categorias inseridas.`);

  const businesses = await db
    .insert(businessesTable)
    .values([
      {
        name: "Restaurante Sabor do Sul",
        categorySlug: "restaurantes",
        region: "Centro",
        description:
          "Gastronomia gaúcha autêntica com rodízio de carnes e buffet caprichado. Ambiente familiar e aconchegante no coração de Londrina.",
        address: "Rua Sergipe, 240 - Centro, Londrina",
        phone: "(43) 3322-1100",
        whatsapp: "5543991112233",
        rating: 4.7,
        reviewsCount: 134,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
        hours: "Seg-Dom: 11h30–15h | 19h–23h",
      },
      {
        name: "Churrascaria Pantanal",
        categorySlug: "restaurantes",
        region: "Gleba Palhano",
        description:
          "Tradição de 20 anos em churrasco de qualidade. Cortes nobres, espeto corrido e ambiente sofisticado na Gleba Palhano.",
        address: "Av. Ayrton Senna, 1840 - Gleba Palhano, Londrina",
        phone: "(43) 3344-5566",
        whatsapp: "5543998887766",
        rating: 4.8,
        reviewsCount: 289,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
        hours: "Seg-Dom: 12h–15h | 19h–23h30",
      },
      {
        name: "Cantina da Nona",
        categorySlug: "restaurantes",
        region: "Zona Norte",
        description:
          "Massas artesanais e pizzas napolitanas feitas com ingredientes frescos. Receitas da família desde 1985.",
        address: "Rua Pará, 820 - Zona Norte, Londrina",
        phone: "(43) 3355-7788",
        whatsapp: "5543992221133",
        rating: 4.5,
        reviewsCount: 97,
        planType: "destaque",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800",
        hours: "Ter-Dom: 18h–23h",
      },
      {
        name: "Salão Studio Glamour",
        categorySlug: "saloes",
        region: "Gleba Palhano",
        description:
          "Especialistas em coloração, cortes modernos, tratamentos capilares e nail art. Profissionais certificados e atendimento premium.",
        address: "Av. Madre Leônia Milito, 500 - Gleba Palhano, Londrina",
        phone: "(43) 3366-9900",
        whatsapp: "5543997776655",
        rating: 4.9,
        reviewsCount: 201,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800",
        hours: "Seg-Sáb: 9h–20h",
      },
      {
        name: "Bela Imagem Cabelereiro",
        categorySlug: "saloes",
        region: "Centro",
        description:
          "Cortes masculinos e femininos, escova progressiva e hidratação capilar. Localizado no centro de Londrina com fácil estacionamento.",
        address: "Rua Minas Gerais, 156 - Centro, Londrina",
        phone: "(43) 3311-4433",
        whatsapp: "5543993334455",
        rating: 4.3,
        reviewsCount: 88,
        planType: "destaque",
        verified: false,
        photoUrl:
          "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800",
        hours: "Seg-Sex: 9h–19h | Sáb: 9h–17h",
      },
      {
        name: "Academia Força Total",
        categorySlug: "academias",
        region: "Zona Sul",
        description:
          "Musculação, crossfit, aulas coletivas e personal trainer. Equipamentos de última geração e instrutores qualificados.",
        address: "Rua Hugo Cabral, 390 - Zona Sul, Londrina",
        phone: "(43) 3377-2200",
        whatsapp: "5543996665544",
        rating: 4.6,
        reviewsCount: 145,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
        hours: "Seg-Sex: 5h–23h | Sáb: 7h–18h | Dom: 8h–14h",
      },
      {
        name: "FitLife Academia",
        categorySlug: "academias",
        region: "Jardim Quebec",
        description:
          "Academia moderna com spinning, pilates, zumba e musculação. Planos acessíveis para toda a família no Jardim Quebec.",
        address: "Rua Prefeito Hugo Cabral, 1120 - Jardim Quebec, Londrina",
        phone: "(43) 3388-1144",
        whatsapp: "5543991234567",
        rating: 4.4,
        reviewsCount: 76,
        planType: "destaque",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800",
        hours: "Seg-Sex: 6h–22h | Sáb: 7h–17h | Dom: 8h–13h",
      },
      {
        name: "Supermercado Bom Preço",
        categorySlug: "mercados",
        region: "Zona Norte",
        description:
          "Supermercado completo com açougue próprio, padaria, hortifruti e seção de vinhos. Entrega em toda Londrina.",
        address: "Av. Saul Elkind, 2300 - Zona Norte, Londrina",
        phone: "(43) 3399-5500",
        whatsapp: "5543995556677",
        rating: 4.2,
        reviewsCount: 312,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=800",
        hours: "Seg-Sáb: 7h–22h | Dom: 8h–20h",
      },
      {
        name: "Mini Mercado Família",
        categorySlug: "mercados",
        region: "Jardim Quebec",
        description:
          "Mercado de bairro com produtos frescos, padaria artesanal e atendimento personalizado. Tradição de 15 anos no Jardim Quebec.",
        address: "Rua Ângelo Moreira da Fonseca, 88 - Jardim Quebec, Londrina",
        phone: "(43) 3300-7766",
        whatsapp: "5543994443322",
        rating: 4.1,
        reviewsCount: 52,
        planType: "free",
        verified: false,
        photoUrl:
          "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800",
        hours: "Seg-Sáb: 7h–21h | Dom: 8h–18h",
      },
      {
        name: "Café Aroma & Arte",
        categorySlug: "cafeterias",
        region: "Centro",
        description:
          "Cafeteria especialidade com grãos selecionados de origem única, métodos alternativos e ambiente acolhedor para trabalho e estudo.",
        address: "Rua Belo Horizonte, 73 - Centro, Londrina",
        phone: "(43) 3322-8800",
        whatsapp: "5543999887766",
        rating: 4.8,
        reviewsCount: 178,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
        hours: "Seg-Sex: 7h–20h | Sáb: 8h–19h | Dom: 9h–17h",
      },
      {
        name: "Grão Especial Café",
        categorySlug: "cafeterias",
        region: "Gleba Palhano",
        description:
          "Café da manhã completo, almoço executivo e cafés especiais. O point favorito da Gleba Palhano para reuniões.",
        address: "Av. Ayrton Senna, 560 - Gleba Palhano, Londrina",
        phone: "(43) 3344-9988",
        whatsapp: "5543992233445",
        rating: 4.6,
        reviewsCount: 93,
        planType: "destaque",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
        hours: "Seg-Sex: 7h–19h | Sáb-Dom: 8h–18h",
      },
      {
        name: "Pet Shop Patinhas Felizes",
        categorySlug: "pet-shops",
        region: "Zona Sul",
        description:
          "Banho e tosa, veterinária, produtos premium para pets e acessórios. Cuidando do seu melhor amigo com amor e profissionalismo.",
        address: "Rua Monteiro Lobato, 450 - Zona Sul, Londrina",
        phone: "(43) 3355-6677",
        whatsapp: "5543998001122",
        rating: 4.7,
        reviewsCount: 116,
        planType: "destaque",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
        hours: "Seg-Sáb: 8h–19h",
      },
      {
        name: "VetCare Clínica Veterinária",
        categorySlug: "pet-shops",
        region: "Centro",
        description:
          "Clínica veterinária completa com consultas, cirurgias, vacinação, exames e internação. Plantão 24h para emergências.",
        address: "Rua Tocantins, 310 - Centro, Londrina",
        phone: "(43) 3311-5500",
        whatsapp: "5543997770011",
        rating: 4.9,
        reviewsCount: 204,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800",
        hours: "Seg-Sex: 8h–20h | Sáb: 8h–17h | Plantão 24h",
      },
      {
        name: "Farmácia Saúde Londrina",
        categorySlug: "farmácias",
        region: "Centro",
        description:
          "Farmácia completa com manipulação própria, dermocosméticos, vitaminas e entrega rápida. Farmacêutico sempre disponível.",
        address: "Rua Paranaguá, 120 - Centro, Londrina",
        phone: "(43) 3322-3300",
        whatsapp: "5543996660099",
        rating: 4.4,
        reviewsCount: 67,
        planType: "destaque",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800",
        hours: "Seg-Sáb: 7h–22h | Dom: 8h–20h",
      },
      {
        name: "Drogaria Popular",
        categorySlug: "farmácias",
        region: "Zona Norte",
        description:
          "Medicamentos com os melhores preços, genéricos e similares. Atendimento rápido e estoque completo no bairro.",
        address: "Av. Saul Elkind, 890 - Zona Norte, Londrina",
        phone: "(43) 3399-1122",
        whatsapp: "5543993003300",
        rating: 4.0,
        reviewsCount: 41,
        planType: "free",
        verified: false,
        photoUrl:
          "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800",
        hours: "Seg-Sáb: 7h–22h | Dom: 9h–18h",
      },
      {
        name: "Padaria Arte do Pão",
        categorySlug: "padarias",
        region: "Jardim Quebec",
        description:
          "Pães artesanais, bolos caseiros, salgados frescos e café colonial. Feito com amor toda manhã no Jardim Quebec.",
        address: "Rua dos Pioneiros, 560 - Jardim Quebec, Londrina",
        phone: "(43) 3366-4400",
        whatsapp: "5543991001100",
        rating: 4.7,
        reviewsCount: 155,
        planType: "destaque",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
        hours: "Seg-Dom: 5h30–20h",
      },
      {
        name: "Elétrica Londrina Serviços",
        categorySlug: "servicos",
        region: "Zona Sul",
        description:
          "Instalações elétricas residenciais e comerciais, manutenção, CFTV e automação residencial. Equipe licenciada e segurada.",
        address: "Rua Gustavo Adolpho Freund, 210 - Zona Sul, Londrina",
        phone: "(43) 3377-8899",
        whatsapp: "5543995009900",
        rating: 4.5,
        reviewsCount: 73,
        planType: "free",
        verified: false,
        photoUrl:
          "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800",
        hours: "Seg-Sex: 8h–18h | Sáb: 8h–13h",
      },
      {
        name: "Clínica Bem Estar",
        categorySlug: "saude",
        region: "Gleba Palhano",
        description:
          "Clínica multidisciplinar com psicologia, nutrição, fisioterapia e medicina estética. Cuidado integral para toda a família.",
        address: "Al. Júlio Cesar Gomes da Rocha, 650 - Gleba Palhano, Londrina",
        phone: "(43) 3344-7711",
        whatsapp: "5543994004400",
        rating: 4.8,
        reviewsCount: 188,
        planType: "premium",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800",
        hours: "Seg-Sex: 8h–20h | Sáb: 8h–14h",
      },
      {
        name: "OdontoLondrina",
        categorySlug: "saude",
        region: "Centro",
        description:
          "Clínica odontológica completa com implantes, ortodontia, clareamento e próteses. Tecnologia de ponta e equipe especializada.",
        address: "Rua Quintino Bocaiúva, 490 - Centro, Londrina",
        phone: "(43) 3311-9988",
        whatsapp: "5543997007700",
        rating: 4.6,
        reviewsCount: 122,
        planType: "destaque",
        verified: true,
        photoUrl:
          "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800",
        hours: "Seg-Sex: 8h–19h | Sáb: 8h–13h",
      },
      {
        name: "Auto Mecânica Confiança",
        categorySlug: "servicos",
        region: "Zona Norte",
        description:
          "Mecânica geral, funilaria, pintura, elétrica automotiva e troca de óleo. 25 anos de experiência em Londrina.",
        address: "Av. Benjamin Constant, 1340 - Zona Norte, Londrina",
        phone: "(43) 3355-3300",
        whatsapp: "5543998008800",
        rating: 4.3,
        reviewsCount: 58,
        planType: "free",
        verified: false,
        photoUrl:
          "https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800",
        hours: "Seg-Sex: 7h30–18h | Sáb: 7h30–13h",
      },
    ])
    .returning();

  console.log(`${businesses.length} negócios inseridos.`);

  const reviewsData = [
    {
      businessId: businesses[0].id,
      author: "Maria Silva",
      rating: 5,
      text: "Ótimo ambiente, comida deliciosa e preço justo. Voltarei com certeza!",
    },
    {
      businessId: businesses[0].id,
      author: "João Pereira",
      rating: 4,
      text: "Excelente buffet, variedade incrível. O atendimento poderia ser mais rápido.",
    },
    {
      businessId: businesses[1].id,
      author: "Ana Costa",
      rating: 5,
      text: "A melhor churrascaria de Londrina, sem dúvida. Os cortes são incríveis!",
    },
    {
      businessId: businesses[1].id,
      author: "Carlos Oliveira",
      rating: 5,
      text: "Perfeito para comemorar datas especiais. Ambiente sofisticado e carne de primeira.",
    },
    {
      businessId: businesses[3].id,
      author: "Fernanda Lima",
      rating: 5,
      text: "Profissionais maravilhosos! Saí com o cabelo perfeito. Super recomendo!",
    },
    {
      businessId: businesses[3].id,
      author: "Beatriz Souza",
      rating: 5,
      text: "Atendimento impecável, ambiente super clean. Já sou cliente fiel há 2 anos.",
    },
    {
      businessId: businesses[5].id,
      author: "Rafael Santos",
      rating: 5,
      text: "Academia completa, equipamentos novos e professores dedicados. Melhor da região!",
    },
    {
      businessId: businesses[9].id,
      author: "Larissa Mendes",
      rating: 5,
      text: "O melhor café de Londrina. Barista conhece muito e o ambiente é lindo.",
    },
    {
      businessId: businesses[9].id,
      author: "Thiago Alves",
      rating: 5,
      text: "Venho toda semana para trabalhar. Café incrível e wi-fi perfeito.",
    },
    {
      businessId: businesses[12].id,
      author: "Cristina Ferreira",
      rating: 5,
      text: "Atendimento veterinário de excelência. Cuida dos meus dois gatinhos com muito carinho.",
    },
  ];

  const reviews = await db.insert(reviewsTable).values(reviewsData).returning();
  console.log(`${reviews.length} avaliações inseridas.`);

  console.log("Seed concluído com sucesso!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
