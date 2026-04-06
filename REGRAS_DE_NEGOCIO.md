# Hub Londrina — Regras de Negócio

> Versão 1.0 | Diretório de negócios locais de Londrina, PR

---

## 1. Visão Geral da Plataforma

O **Hub Londrina** é um diretório SaaS (Software as a Service) de negócios locais voltado para a cidade de Londrina, Paraná. A plataforma conecta consumidores a estabelecimentos e prestadores de serviço da cidade, permitindo descoberta, avaliação e contato direto. Os empreendedores locais pagam planos mensais ou anuais para anunciar seus negócios com diferentes níveis de visibilidade.

---

## 2. Entidades do Sistema

### 2.1 Negócio (Business)
Entidade central da plataforma, representa um estabelecimento ou prestador de serviço.

| Campo          | Tipo         | Obrigatório | Descrição                                      |
|----------------|--------------|-------------|------------------------------------------------|
| `id`           | inteiro      | Sim         | Identificador único                            |
| `name`         | texto        | Sim         | Nome do negócio (máx. visível nas buscas)      |
| `categorySlug` | texto        | Sim         | Categoria (referencia a tabela de categorias)  |
| `region`       | texto        | Sim         | Região de Londrina onde está localizado        |
| `description`  | texto        | Sim         | Descrição do negócio (usada na busca)          |
| `address`      | texto        | Sim         | Endereço completo                              |
| `phone`        | texto        | Não         | Telefone para ligação direta                   |
| `whatsapp`     | texto        | Não         | Número para contato via WhatsApp               |
| `rating`       | decimal      | Auto        | Média das avaliações (0.0 a 5.0)               |
| `reviewsCount` | inteiro      | Auto        | Total de avaliações recebidas                  |
| `planType`     | enum         | Sim         | Plano contratado: `free`, `destaque`, `premium`|
| `verified`     | booleano     | Auto        | Indicador de perfil verificado                 |
| `photoUrl`     | texto        | Não         | URL da foto principal do negócio               |
| `hours`        | texto        | Não         | Horário de funcionamento                       |
| `createdAt`    | timestamp    | Auto        | Data de cadastro                               |

### 2.2 Categoria (Category)
Classificação temática dos negócios. Atualmente são **10 categorias fixas**:

| Slug              | Nome             |
|-------------------|------------------|
| `restaurantes`    | Restaurantes     |
| `saloes-beleza`   | Salões de Beleza |
| `academias`       | Academias        |
| `mercados`        | Mercados         |
| `cafeterias`      | Cafeterias       |
| `pet-shops`       | Pet Shops        |
| `farmacias`       | Farmácias        |
| `servicos`        | Serviços         |
| `padarias`        | Padarias         |
| `saude`           | Saúde            |

### 2.3 Avaliação (Review)
Feedback público deixado por usuários sobre um negócio.

| Campo        | Tipo      | Obrigatório | Descrição                   |
|--------------|-----------|-------------|-----------------------------|
| `id`         | inteiro   | Sim         | Identificador único         |
| `businessId` | inteiro   | Sim         | Negócio avaliado            |
| `author`     | texto     | Sim         | Nome do avaliador           |
| `rating`     | inteiro   | Sim         | Nota de 1 a 5               |
| `text`       | texto     | Sim         | Comentário escrito           |
| `createdAt`  | timestamp | Auto        | Data da avaliação           |

### 2.4 Região (Region)
Subdivisões geográficas de Londrina disponíveis para filtro:

- Centro
- Gleba Palhano
- Zona Norte
- Zona Sul
- Jardim Quebec

---

## 3. Planos e Monetização

### 3.1 Tabela de Planos

| Recurso                          | Gratuito  | Destaque (R$ 49/mês) | Premium (R$ 89/mês) |
|----------------------------------|:---------:|:--------------------:|:-------------------:|
| Perfil básico                    | ✅        | ✅                   | ✅                  |
| Aparece nas buscas locais        | ✅        | ✅                   | ✅                  |
| Link para WhatsApp               | ✅        | ✅                   | ✅                  |
| 1 foto                           | ✅        | ✅                   | ✅                  |
| Perfil verificado (badge)        | ❌        | ✅                   | ✅                  |
| Até 10 fotos                     | ❌        | ✅                   | ✅                  |
| Prioridade na busca              | ❌        | ✅                   | ✅                  |
| Sistema de avaliações            | ❌        | ✅                   | ✅                  |
| Estatísticas de acesso           | ❌        | ✅                   | ✅                  |
| Badge "Destaque"                 | ❌        | ✅                   | ✅                  |
| Fotos ilimitadas                 | ❌        | ❌                   | ✅                  |
| Vídeo de apresentação            | ❌        | ❌                   | ✅                  |
| Banner na página inicial         | ❌        | ❌                   | ✅                  |
| Suporte VIP via WhatsApp         | ❌        | ❌                   | ✅                  |

### 3.2 Planos Anuais (Desconto de 20%)

| Plano     | Mensal    | Anual       |
|-----------|-----------|-------------|
| Destaque  | R$ 49/mês | R$ 399/ano  |
| Premium   | R$ 89/mês | R$ 699/ano  |

---

## 4. Regras de Visibilidade e Destaque

### 4.1 Ordem nos Resultados de Busca
A ordenação segue a seguinte lógica de prioridade:

1. **Negócios Premium** aparecem antes dos demais (prioridade máxima)
2. **Negócios Destaque** aparecem antes dos Gratuitos
3. **Negócios Gratuitos** aparecem por último

Dentro de cada grupo, a ordenação secundária pode ser por:
- Relevância (padrão) — baseada em rating
- Maior Avaliação — `rating` decrescente
- Mais Avaliados — `reviewsCount` decrescente

### 4.2 Badge de Verificado
- Negócios com plano `destaque` ou `premium` podem receber o badge "Verificado"
- A verificação é ativada pelo campo `verified = true` no banco de dados
- Negócios gratuitos nunca recebem o badge de verificado

### 4.3 Destaques da Semana (Landing Page)
- Exibe os negócios com **maior rating** e ao menos algumas avaliações
- Funciona como vitrine principal para novos visitantes
- Prioridade visual para planos `premium`

### 4.4 Banner na Página Inicial
- Exclusivo para plano **Premium**
- Posicionado em área de alta visibilidade na landing page

---

## 5. Regras de Busca e Filtros

### 5.1 Busca por Texto
- Pesquisa é feita nos campos `name` e `description` do negócio
- Busca case-insensitive (não diferencia maiúsculas/minúsculas)
- Utiliza correspondência parcial (`ILIKE %termo%`)

### 5.2 Filtro por Região
- Filtra pelo campo `region` da tabela de negócios
- Opções fixas: as 5 regiões cadastradas
- Pode ser combinado com busca por texto e filtro de categoria

### 5.3 Filtro por Categoria
- Filtra pelo campo `categorySlug`
- Podem ser combinados múltiplos filtros ao mesmo tempo

### 5.4 Paginação
- Resultados exibidos em grupos de **8 negócios por página**
- Paginação feita no lado do cliente

---

## 6. Regras de Avaliação

### 6.1 Quem pode avaliar
- Atualmente qualquer visitante pode deixar uma avaliação (sem autenticação)
- O campo `author` é preenchido livremente pelo avaliador

### 6.2 Escala de notas
- Nota mínima: **1 estrela**
- Nota máxima: **5 estrelas**
- Somente números inteiros são aceitos

### 6.3 Atualização do Rating
- O campo `rating` do negócio é a **média de todas as avaliações** recebidas
- O campo `reviewsCount` é incrementado a cada nova avaliação registrada

### 6.4 Exibição
- Negócios sem avaliações exibem rating 0 ou "Sem avaliações"
- A distribuição de estrelas (1★ a 5★) é mostrada no perfil do negócio

---

## 7. Contato e Conversão

### 7.1 WhatsApp
- Ao clicar no botão WhatsApp, o usuário é redirecionado para `wa.me/{número}`
- O número é armazenado sem formatação no banco
- Disponível para todos os planos

### 7.2 Ligação Telefônica
- Botão "Ligar" usa protocolo `tel:{número}`
- Funciona nativamente em dispositivos móveis

### 7.3 Rotas / Google Maps
- Botão "Rotas" abre o endereço do negócio no Google Maps
- URL gerada dinamicamente com base no campo `address`

### 7.4 Compartilhamento
- Botão "Compartilhar" usa a Web Share API nativa do dispositivo
- Fallback para cópia do link quando a API não está disponível

---

## 8. Fluxos Principais

### 8.1 Fluxo do Consumidor (B2C)
```
Landing Page
  → Digita busca ou clica em categoria
  → Página de Busca (com filtros)
  → Perfil do Negócio
  → Contato via WhatsApp / Ligação / Rotas
```

### 8.2 Fluxo do Anunciante (B2B)
```
Landing Page / Header
  → Clica em "Anuncie Aqui"
  → Página de Anúncio (planos e preços)
  → Escolhe plano → "Começar"
  → Cadastro / Onboarding (a implementar)
```

### 8.3 Fluxo de Avaliação
```
Perfil do Negócio
  → Aba "Avaliações"
  → Visualiza reviews existentes e distribuição de estrelas
  → (Futura implementação: envio de nova avaliação)
```

---

## 9. Restrições e Validações

| Regra                                               | Status     |
|-----------------------------------------------------|------------|
| Negócio deve ter nome, categoria, região e endereço | Obrigatório |
| Rating deve estar entre 0.0 e 5.0                   | Validado   |
| Nota de avaliação deve ser inteiro de 1 a 5         | Validado   |
| Plano deve ser `free`, `destaque` ou `premium`      | Enum fixo  |
| Categorias são fixas (não criadas pelo usuário)     | Fixo       |
| Regiões são fixas (as 5 regiões de Londrina)        | Fixo       |
| Badge verificado só para planos pagos               | Regra de negócio |
| Banner na home só para plano `premium`              | Regra de negócio |

---

## 10. Futuras Implementações Previstas

- [ ] Autenticação de donos de negócio (painel de gestão)
- [ ] Sistema de avaliação com login do usuário
- [ ] Painel analítico para anunciantes (visualizações, cliques, etc.)
- [ ] Integração de pagamento online (planos via Stripe ou similar)
- [ ] Upload de fotos pelo próprio dono do negócio
- [ ] Notificações de novas avaliações
- [ ] Cupons e promoções exclusivos por plano
- [ ] API pública para integrações externas

---

*Documento gerado automaticamente com base na implementação atual do Hub Londrina.*
