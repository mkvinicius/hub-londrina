# 02 · App do Cliente — telas, botões e regras

Legenda das fases: **F1** = MVP · **F2** = carteira/plano · **F3** = consumo · **F4** = fidelidade/lojas

Navegação: barra inferior fixa com 4 abas — **Início · Cardápio · Carteira · Perfil** — e um sino de notificações no topo.
Tudo em português, linguagem de cliente, sem jargão. Fonte grande (mínimo 16 px), alvo de toque ≥ 44 px, contraste AA — boa parte do público de restaurante por quilo tem 40+ anos e usa o celular no sol, em pé, na fila.

---

## T-01 · Splash / Abertura (F1)

Logo, nome do restaurante, verificação de sessão em segundo plano.
- Sessão válida → **T-03 Início**
- Sem sessão → **T-02 Login**
- Sem internet → tela de "sem conexão" com o **cardápio salvo em cache** (funciona offline)

---

## T-02 · Login (F1)

| Elemento | Tipo | Comportamento / regra |
|---|---|---|
| Campo **Celular** | input tel com máscara `(43) 99999-9999` | Login é o telefone. Aceita colar. Teclado numérico |
| Campo **Senha** | input password + ícone olho | Mínimo 6 caracteres |
| **Entrar** | Botão primário | Desabilitado até os 2 campos válidos. Mostra spinner. Erro genérico: "Celular ou senha incorretos" (nunca revela se o telefone existe) |
| **Esqueci minha senha** | Link | Abre **T-02b** |
| **Como faço para ter acesso?** | Link discreto | Abre modal: "O acesso é liberado pelo restaurante. Fale com a gente no caixa ou pelo WhatsApp" + botão **Falar no WhatsApp** (`wa.me` do restaurante) |
| **Instalar o aplicativo** | Banner (só no navegador) | Dispara o prompt de instalação do PWA. No iPhone, mostra instrução ilustrada "Compartilhar → Adicionar à Tela de Início" |

**Regras**: 5 tentativas por telefone a cada 15 min, depois bloqueio temporário de 15 min com mensagem clara (RN-06). Nunca informar se o telefone está cadastrado (RN-07).

### T-02b · Esqueci minha senha (F1)
Campo celular + botão **Pedir nova senha**. Não redefine sozinho: registra a solicitação, ela aparece no painel em **Clientes → pedidos de senha**, e a tela mostra "Pedido enviado. O restaurante vai te mandar uma nova senha no WhatsApp". Botão secundário **Chamar no WhatsApp** para agilizar.
> Na **F2**, com a Cloud API ativa, isso vira código de 6 dígitos automático por WhatsApp.

---

## T-03 · Primeiro acesso — troca de senha obrigatória (F1)

Aparece **sempre** que `must_change_password = true`. Não tem botão de fechar, não tem "pular", não tem rota de fuga.

| Elemento | Regra |
|---|---|
| Texto | "Bem-vindo! Para sua segurança, crie uma senha só sua." |
| **Nova senha** | Mín. 6 caracteres, indicador de força, não pode ser igual à temporária |
| **Confirmar nova senha** | Precisa bater |
| Checkbox **Li e aceito os Termos de Uso e a Política de Privacidade** | **Obrigatório**. Links abrem o texto completo |
| Checkbox **Quero receber promoções e novidades** | **Opcional** — é o opt-in de marketing (RN-08). Desmarcado por padrão |
| **Salvar e entrar** | Grava senha, limpa `must_change_password`, registra consentimentos com versão/data/IP, vai para **T-04 Complete seu perfil** |

---

## T-04 · Complete seu perfil (F1, pulável)

Pedido uma única vez após o primeiro acesso: **data de nascimento** (para o mimo de aniversário), **e-mail** (opcional) e **foto** (opcional).
Botões: **Salvar** · **Agora não** (fecha e não pergunta mais por 30 dias).

---

## T-05 · Início / Feed (F1)

A tela mais importante do app. Ordem dos blocos, de cima para baixo:

| Bloco | Conteúdo | Fase |
|---|---|---|
| **Cabeçalho** | "Olá, {primeiro nome}" + foto + sino de notificações com bolinha vermelha | F1 |
| **Cartão de saldo** | Saldo total, com "R$ X em créditos e R$ Y em bônus (vence em DD/MM)". Botão **Adicionar créditos** | F2 |
| **Cardápio de hoje** | Foto + 3 pratos de destaque + preço/kg + horário. Botão **Ver cardápio completo** | F1 |
| **Promoções para você** | Carrossel horizontal só com promoções que o cliente pode usar. Cada card tem botão **Quero participar** | F1 |
| **Meu consumo do mês** | Mini-resumo: visitas, total gasto, média por visita. Botão **Ver extrato** | F3 |
| **Meu plano** | Refeições usadas / incluídas no mês. Barra de progresso | F2 |
| **Notícias e avisos** | Lista dos 3 mais recentes. Botão **Ver todas** | F1 |
| **Rodapé** | Endereço, horário, botão **Como chegar** (abre mapa) e **Falar no WhatsApp** | F1 |

**Regras de exibição**:
- Nunca mostrar bloco vazio com placeholder — bloco sem conteúdo **não renderiza** (RN-11).
- Promoção que o cliente **não** pode usar (fora do segmento, fora do dia, esgotada) **não aparece** na lista dele. Mostrar promoção inalcançável gera frustração e reclamação no caixa (RN-35).
- Puxar para baixo atualiza (pull to refresh).

---

## T-06 · Cardápio (F1)

| Elemento | Comportamento |
|---|---|
| Seletor de dia | Hoje + próximos dias já publicados (setas ou chips) |
| Preço/kg em destaque | Mostra o preço do dia selecionado; fim de semana pode ter preço próprio (RN-14) |
| Lista por categoria | Saladas → Guarnições → Massas → Proteínas → Sobremesas |
| Etiquetas | 🌱 vegano · 🌾 sem glúten · 🥛 sem lactose |
| Item destacado | Selo "Destaque do dia" |
| **Compartilhar cardápio** | Gera imagem/texto para o cliente mandar no zap dos colegas — aquisição orgânica barata |
| **Avisar quando tiver {prato}** | ⭐ F4: cliente marca prato favorito e recebe push no dia em que ele entra na linha |

**Regra**: cardápio só aparece com `is_published = true`. Cardápio do dia seguinte só fica visível a partir das 18h do dia anterior (configurável), para não engessar a produção (RN-13).
**Offline**: o cardápio dos próximos 3 dias fica em cache — abre sem internet.

---

## T-07 · Promoções (F1)

**Lista**: cards com imagem, título, condição em 1 linha ("Terça, das 11h30 às 14h") e prazo ("Válida até 12/08").

**Detalhe da promoção**:
| Elemento | Regra |
|---|---|
| Como funciona | Texto em linguagem simples, obrigatório |
| Regras | Dias, horários, limite por cliente, "não acumula com outras promoções" |
| **Quero participar** | Botão primário. Gera o cupom → **T-07b** |
| Estado esgotada | Botão cinza desabilitado + aviso "As vagas desta promoção acabaram" |
| Estado já usada | Selo verde "Você já usou" + data |
| Estado fora do horário | Botão desabilitado + "Disponível terça e quarta, das 11h30 às 14h" |

> Espelha a regra R12 do marketplace: **nunca um botão clicável que não vai funcionar**. Botão bloqueado é cinza, desabilitado, com o motivo escrito ao lado.

### T-07b · Meu cupom (F1)
Código curto grande (ex.: `TER-8F3K`) + **QR Code** + contador de validade.
Botão **Mostrar no caixa** deixa a tela em brilho máximo. O operador valida no painel pelo código ou pela leitura do QR.
**Regra**: cupom tem validade própria (padrão: só o dia da emissão) e **um cupom aberto por promoção por cliente** — clicar de novo mostra o mesmo cupom, não emite outro (RN-36).

---

## T-08 · Carteira (F2)

| Elemento | Regra |
|---|---|
| **Saldo total** grande | Quebra visual: "Créditos R$ 300,00" + "Bônus R$ 30,00 · vence em 12/11" |
| **Adicionar créditos** | Botão primário → **T-08b** |
| **Extrato** | Lista cronológica: recarga (+), bônus (+), consumo (−), estorno, expiração. Cada linha com data, descrição e valor |
| Filtro | Últimos 30 dias / 90 dias / tudo |
| Aviso de vencimento | Faixa amarela quando houver bônus vencendo em ≤ 15 dias: "R$ 30,00 de bônus vencem em 12/11" |

**Regras exibidas ao cliente, em texto claro** (RN-21 a RN-24):
- O crédito que você comprou **não vence**.
- O bônus vence em 90 dias.
- O saldo é usado **primeiro o bônus** (o que vence antes), depois o crédito.
- O saldo vale só para consumo no restaurante, não é transferível e não é resgatável em dinheiro.

### T-08b · Adicionar créditos (F2)
Faixas em cards (RN-25):
| Você paga | Você recebe | Bônus |
|---|---|---|
| R$ 150 | R$ 160 | R$ 10 |
| R$ 300 | R$ 330 | **R$ 30** |
| R$ 500 | R$ 560 | R$ 60 |
| Outro valor | igual ao pago | sem bônus |

Botão **Pagar com Pix** → tela com QR Code copia-e-cola, expiração de 30 min e confirmação automática. Ao confirmar: crédito lançado, push de confirmação, extrato atualizado.
**Regra**: o crédito só entra na carteira quando o PSP confirma o pagamento — nunca por otimismo de tela (RN-26). O webhook é idempotente e o app faz *sync* de fallback ao voltar da tela de pagamento (mesma lição do R7 do marketplace).

---

## T-09 · Meu consumo (F3)

Aqui vive o que você descreveu: refeições, quilos, pesos, valores e datas.

| Elemento | Conteúdo |
|---|---|
| Seletor de período | Este mês · Mês passado · 90 dias · Personalizado |
| Cartões de resumo | **Visitas** · **Total gasto** · **Média por visita** · **Peso médio do prato** |
| Gráfico | Barras de gasto por semana (Recharts) |
| Lista de visitas | Cada linha: data e hora · peso (ex.: 480 g) · valor do buffet · extras · descontos · total · forma de pagamento |
| Detalhe da visita | Abre com a composição completa e o preço/kg vigente naquele dia |
| **Baixar extrato (PDF)** | Gera PDF do período — útil para quem presta conta na empresa |
| **Encontrei um erro** | Abre WhatsApp com data e valor já preenchidos. Nunca deixe o cliente sem caminho para contestar |

**Regras**:
- Só aparecem visitas **identificadas** (com `customer_id`). Venda anônima nunca é atribuída por aproximação (RN-51).
- Correção de lançamento sempre gera **estorno visível** no extrato, nunca sumiço silencioso (RN-53). Cliente que vê valor desaparecer perde a confiança no app inteiro.

---

## T-10 · Meu plano (F2)

Status da mensalidade: nome, valor, dia da cobrança, **refeições usadas / incluídas**, limite de gramas por refeição, dias e horários de validade.
Botões: **Ver regras do plano** · **Pausar plano** (se permitido) · **Cancelar plano** (abre confirmação com data de fim do período já pago).
Quem não tem plano vê o card de oferta com **Quero saber mais** → abre WhatsApp com o dono (contratação é assistida na F2, self-service na F4).

---

## T-11 · Notificações / Caixa de mensagens (F1)

Lista de mensagens recebidas (título, trecho, data, bolinha de não lida). Toque abre a mensagem completa, com botão de ação quando houver ("Ver promoção", "Ver cardápio").
Botões: **Marcar todas como lidas** · ícone de engrenagem → preferências de notificação.

---

## T-12 · Perfil (F1)

| Item | Ação |
|---|---|
| Foto, nome, celular | **Editar meus dados** → T-12a |
| **Trocar senha** | → T-12b |
| **Notificações** | → T-12c |
| **Privacidade e meus dados** | → T-12d |
| **Termos de uso** / **Política de privacidade** | Abre o texto |
| **Falar com o restaurante** | WhatsApp |
| **Sair** | Confirmação → limpa sessão |
| Rodapé | Versão do app (ajuda no suporte) |

### T-12a · Editar meus dados
Nome, data de nascimento, e-mail, foto. **Celular não é editável no app** — é o login e a chave de identidade; troca só pelo restaurante, com registro em auditoria (RN-09).

### T-12b · Trocar senha
Senha atual + nova + confirmar. Ao salvar, **encerra as outras sessões** e mostra "Senha alterada. Você continua conectado neste aparelho".

### T-12c · Preferências de notificação
Interruptores: **Promoções e novidades** · **Cardápio do dia** · **Meu consumo e carteira** (transacionais, não desligáveis).
Desligar "Promoções" grava revogação de consentimento de marketing (nova linha em `resto_consents`) e o cliente **passa a ser pulado** em campanhas de marketing — inclusive no WhatsApp (RN-63).

### T-12d · Privacidade e meus dados (LGPD)
- **Baixar meus dados** — gera JSON/PDF com cadastro, consumo, carteira e mensagens.
- **Excluir minha conta** — confirmação em 2 passos com aviso claro: perde acesso ao histórico e **saldo em bônus não é resgatável em dinheiro**; saldo pago é devolvido conforme a política. Executa anonimização (RN-64).

---

## T-13 · Meu QR de identificação (F3)

Acessível na Início e no Perfil. QR **rotativo** (token de curta duração) que identifica o cliente no caixa para atribuir a visita e debitar da carteira.
Alternativa sempre disponível: o operador digita o celular do cliente. QR é conveniência, nunca requisito.

---

## T-14 · Fidelidade (F4)

Cartão de selos ("a cada 10 almoços, 1 grátis"), progresso visual e histórico de resgates.
**Só entra depois** que a Fase 3 estiver medindo consumo de verdade — fidelidade sem dado de consumo é chute (RN-70).

---

## Estados que toda tela precisa ter

Um app quebra na experiência exatamente nesses quatro estados, então eles são requisito, não detalhe:

| Estado | Tratamento |
|---|---|
| **Carregando** | Esqueleto (skeleton), nunca tela branca |
| **Vazio** | Ilustração + frase útil + ação ("Nenhuma promoção agora. Avisamos você quando tiver!") |
| **Erro** | "Não conseguimos carregar. Tentar de novo" com botão que realmente tenta de novo |
| **Offline** | Faixa no topo "Você está sem internet — mostrando informações salvas" |
