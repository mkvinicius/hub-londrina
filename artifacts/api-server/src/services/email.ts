import { Resend } from "resend";
import { logger } from "../lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Hub Londrina <noreply@hublondrina.com.br>";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn({ to, subject }, "[Email] RESEND_API_KEY não configurado — email não enviado");
    return false;
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      logger.error({ to, subject, error }, "[Email] Erro ao enviar");
      return false;
    }
    logger.info({ to, subject, id: data?.id }, "[Email] Enviado com sucesso");
    return true;
  } catch (err) {
    logger.error({ to, subject, err }, "[Email] Falha no envio");
    return false;
  }
}

export const emails = {
  boasVindas: (nome: string, negocio: string) => ({
    subject: `Bem-vindo ao Hub Londrina, ${nome}!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Seu negócio está no Hub Londrina!</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>O cadastro de <strong>${negocio}</strong> foi recebido com sucesso.</p>
        <p>Nossa equipe vai analisar em até 24h. Você receberá outro email quando seu perfil for aprovado.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  cadastroAprovado: (nome: string, negocio: string) => ({
    subject: `Seu negócio foi aprovado no Hub Londrina!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Perfil aprovado!</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p><strong>${negocio}</strong> já está visível no Hub Londrina.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/login" style="background:#d97706;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Acessar meu painel</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  cadastroRejeitado: (nome: string, negocio: string, motivo: string) => ({
    subject: `Atualização sobre seu cadastro no Hub Londrina`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#dc2626">Cadastro não aprovado</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Infelizmente o cadastro de <strong>${negocio}</strong> não foi aprovado.</p>
        <p><strong>Motivo:</strong> ${motivo}</p>
        <p>Se tiver dúvidas, entre em contato pelo WhatsApp.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  pagamentoConfirmado: (nome: string, plano: string, valor: string) => ({
    subject: `Pagamento confirmado — Plano ${plano}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Pagamento confirmado!</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu plano <strong>${plano}</strong> está ativo. Cobrança de <strong>${valor}/mês</strong>. Sua loja já está publicada e com todos os benefícios do plano liberados.</p>
        <p style="background:#fffbeb;border-left:4px solid #d97706;padding:12px;border-radius:6px;margin:14px 0">
          <strong>📄 Sobre sua documentação:</strong> a análise dos seus documentos é feita à parte pela nossa equipe e <strong>não depende do pagamento</strong>. Se você ainda não enviou os 3 documentos (documento pessoal, cartão CNPJ e comprovante de endereço), tem até <strong>10 dias</strong> para enviá-los — só com a documentação aprovada você recebe o selo "Verificado" no perfil.
        </p>
        <p><a href="https://www.hublondrina.com.br/lojista/plano" style="background:#d97706;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Ver meu plano</a> &nbsp; <a href="https://www.hublondrina.com.br/lojista/documentacao" style="background:#3d7a28;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Enviar documentação</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  pagamentoFalhou: (nome: string, plano: string) => ({
    subject: `Problema no pagamento — Ação necessária`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#dc2626">Pagamento não processado</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Não conseguimos processar o pagamento do seu plano <strong>${plano}</strong>.</p>
        <p>Seu perfil foi temporariamente rebaixado para o plano gratuito.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/plano" style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Atualizar forma de pagamento</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  novaAvaliacao: (nomeNegocio: string, autor: string, nota: number, texto: string) => ({
    subject: `Nova avaliação recebida — ${nota} estrelas`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Você recebeu uma nova avaliação!</h2>
        <p><strong>${autor}</strong> avaliou <strong>${nomeNegocio}</strong>:</p>
        <p style="font-size:24px">${"⭐".repeat(nota)}</p>
        ${texto ? `<p style="background:#f9f9f9;padding:12px;border-radius:6px;font-style:italic">"${texto}"</p>` : ""}
        <p><a href="https://www.hublondrina.com.br/lojista/avaliacoes" style="background:#d97706;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Ver e responder</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  documentacaoPendente: (nome: string, diasRestantes: number) => ({
    subject: `⚠️ Faltam ${diasRestantes} dias para validar sua documentação — Hub Londrina`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#d97706">Você ainda não enviou sua documentação</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Para manter sua loja ativa no Hub Londrina, precisamos validar 3 documentos: documento pessoal, cartão CNPJ e comprovante de endereço.</p>
        <p style="font-size:18px"><strong>Faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}</strong> para o prazo expirar.</p>
        <p>Após o prazo sua loja ficará offline até a regularização.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/documentacao" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Enviar documentação</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  upgradePlano: (nome: string, planoAnterior: string, planoNovo: string, valor: string) => ({
    subject: `🚀 Upgrade confirmado — bem-vindo ao plano ${planoNovo}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#FF9800">Upgrade confirmado!</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu plano foi atualizado de <strong>${planoAnterior}</strong> para <strong>${planoNovo}</strong> (${valor}/mês). Os benefícios extras já estão liberados na sua conta de lojista.</p>
        <p style="background:#FFF3E0;border-left:4px solid #FF9800;padding:12px;border-radius:6px;margin:16px 0">
          <strong>Lembrete importante:</strong> a análise da sua documentação é uma trilha <em>independente</em> do pagamento. Mudar de plano não altera o status dos seus documentos — eles continuam sendo avaliados individualmente pela nossa equipe. Acompanhe em <a href="https://www.hublondrina.com.br/lojista/documentacao" style="color:#FF9800">Documentação</a>.
        </p>
        <p><a href="https://www.hublondrina.com.br/lojista" style="background:#FF9800;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Acessar painel</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  documentacaoExpirada: (nome: string, planoPago: boolean = false) => ({
    subject: planoPago
      ? `⚠️ Prazo da documentação venceu — envie para conseguir o selo Verificado`
      : `🔴 Sua loja está offline — regularize a documentação`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:${planoPago ? "#d97706" : "#dc2626"}">Prazo da documentação encerrado</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        ${
          planoPago
            ? `<p>Os 10 dias para envio da documentação acabaram. <strong>Como você tem plano pago, sua loja segue publicada normalmente</strong> — todos os benefícios do plano continuam ativos. Mas, sem documentação aprovada, você não recebe o <strong>selo "Verificado"</strong> no perfil público (que aumenta a confiança dos clientes).</p>`
            : `<p>O prazo para envio da documentação expirou e sua loja do plano gratuito foi temporariamente removida da listagem pública do Hub Londrina.</p>
               <p>Para reativar, envie os 3 documentos solicitados. Assim que aprovados pela nossa equipe, sua loja volta ao ar.</p>`
        }
        <p><a href="https://www.hublondrina.com.br/lojista/documentacao" style="background:${planoPago ? "#d97706" : "#dc2626"};color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">${planoPago ? "Enviar documentação" : "Regularizar agora"}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  documentacaoAprovada: (nome: string) => ({
    subject: `✅ Documentação aprovada! Sua loja está ativa`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Documentação aprovada!</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Todos os seus documentos foram validados pela equipe Hub Londrina. Sua loja está oficialmente ativa e visível para os consumidores.</p>
        <p><a href="https://www.hublondrina.com.br/lojista" style="background:#3d7a28;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Acessar meu painel</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  documentacaoRejeitada: (
    nome: string,
    rejeitados: Array<{ tipo: string; motivo: string }>,
  ) => {
    const TIPO_LABEL: Record<string, string> = {
      personal_id: "Documento pessoal (RG/CNH)",
      cnpj_card: "Cartão CNPJ",
      address_proof: "Comprovante de endereço",
    };
    const itens = rejeitados
      .map(
        (r) =>
          `<li style="margin-bottom:10px"><strong>${TIPO_LABEL[r.tipo] || r.tipo}:</strong> ${r.motivo}</li>`,
      )
      .join("");
    const total = rejeitados.length;
    return {
      subject:
        total === 1
          ? `❌ 1 documento foi rejeitado — corrija e reenvie`
          : `❌ ${total} documentos foram rejeitados — corrija e reenvie`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#dc2626">${total === 1 ? "Um documento foi rejeitado" : `${total} documentos foram rejeitados`}</h2>
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Nossa equipe analisou sua documentação e encontrou problemas nos itens abaixo:</p>
          <ul style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 14px 14px 32px;border-radius:6px;list-style-type:disc">
            ${itens}
          </ul>
          <p>Reenvie apenas os documentos rejeitados. Os demais (já aprovados ou em análise) continuam válidos. <strong>O pagamento do plano não é afetado</strong> — sua loja segue publicada normalmente.</p>
          <p><a href="https://www.hublondrina.com.br/lojista/documentacao" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Corrigir documentação</a></p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
        </div>
      `,
    };
  },

  planoGratuitoExpirando: (nome: string) => ({
    subject: `Seu período gratuito está acabando — assine o plano Base`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#d97706">Período gratuito expirou</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu período gratuito de 30 dias no Hub Londrina chegou ao fim. Para manter sua loja ativa e visível para os consumidores de Londrina, assine o plano Base.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/plano" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Assinar plano Base</a></p>
        <p style="color:#666;font-size:13px">Seu cadastro e dados continuam preservados. Basta assinar e sua loja volta a aparecer.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  boostAtivado: (nome: string, contexto: string, expiresAt: Date) => {
    const ctxLabel = contexto === "zone" ? "Destaque de Zona" : "Destaque Home + Busca";
    const dataExp = expiresAt.toLocaleDateString("pt-BR");
    return {
      subject: `🚀 Seu ${ctxLabel} está ativo!`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Destaque ativado!</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu <strong>${ctxLabel}</strong> está ativo e seu negócio já está aparecendo em destaque para milhares de londrinenses.</p>
        <p style="background:#f9f9f9;padding:12px;border-radius:6px"><strong>Validade:</strong> até ${dataExp}</p>
        <p><a href="https://www.hublondrina.com.br/lojista/impulsionamento" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Ver meus destaques</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
    };
  },

  boostWaitlist: (nome: string, contexto: string) => {
    const ctxLabel = contexto === "zone" ? "Destaque de Zona" : "Destaque Home + Busca";
    return {
      subject: `📋 Você entrou na fila do ${ctxLabel}`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#d97706">Fila de espera</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Recebemos seu pagamento, mas as 6 vagas do <strong>${ctxLabel}</strong> estão atualmente ocupadas.</p>
        <p>Você foi adicionado à <strong>fila de espera</strong>. Assim que uma vaga for liberada, ativaremos seu destaque automaticamente por 30 dias e você receberá um email de confirmação.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/impulsionamento" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Acompanhar status</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
    };
  },

  produtosDesativadosPorDowngrade: (nome: string, quantidade: number, plano: string, limite: number) => {
    const planoLabel = plano === "premium" ? "Premium" : plano === "destaque" ? "Base" : "Gratuito";
    return {
      subject: `${quantidade} produto${quantidade === 1 ? "" : "s"} desativado${quantidade === 1 ? "" : "s"} após mudança de plano`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#d97706">Alguns produtos foram desativados</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu plano agora é <strong>${planoLabel}</strong>, que permite até <strong>${limite} produto${limite === 1 ? "" : "s"} ativo${limite === 1 ? "" : "s"}</strong> na sua vitrine.</p>
        <p>Para respeitar esse limite, desativamos automaticamente os <strong>${quantidade} produto${quantidade === 1 ? "" : "s"} mais recente${quantidade === 1 ? "" : "s"}</strong>. Eles continuam salvos no seu painel — apenas não aparecem mais no perfil público.</p>
        <p>Você pode escolher quais produtos quer manter ativos no seu painel. Se voltar para o plano Premium, basta reativar manualmente os que quiser exibir.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/produtos" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Gerenciar produtos</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
      `,
    };
  },

  fotosOcultadasPorDowngrade: (nome: string, quantidade: number, plano: string, limite: number) => {
    const planoLabel = plano === "premium" ? "Premium" : plano === "destaque" ? "Base" : "Gratuito";
    return {
      subject: `${quantidade} foto${quantidade === 1 ? "" : "s"} ocultada${quantidade === 1 ? "" : "s"} após mudança de plano`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#d97706">Algumas fotos foram ocultadas</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu plano agora é <strong>${planoLabel}</strong>, que permite até <strong>${limite} foto${limite === 1 ? "" : "s"}</strong> na galeria do seu negócio.</p>
        <p>Para respeitar esse limite, ocultamos automaticamente as <strong>${quantidade} foto${quantidade === 1 ? "" : "s"} mais recente${quantidade === 1 ? "" : "s"}</strong>. Os arquivos continuam guardados — apenas não aparecem mais no perfil público.</p>
        <p>Se voltar para o plano Premium, basta restaurar as que quiser exibir no painel.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/produtos" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Gerenciar fotos</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
      `,
    };
  },

  downgradeAssinatura: (nome: string) => ({
    subject: `Sua assinatura foi cancelada — Hub Londrina`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#dc2626">Assinatura cancelada por falta de pagamento</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu plano voltou para o <strong>Gratuito</strong> após 7 dias com pagamento pendente.</p>
        <p>Seus dados e perfil continuam salvos. Reative quando quiser para voltar ao topo das buscas.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/plano" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Reativar meu plano</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  assinaturaExpirando: (nome: string, produto: string, diasRestantes: number, url: string) => ({
    subject: `⏰ ${produto} vence em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"} — renove para manter seu destaque`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#d97706">Seu ${produto} está perto de vencer</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu <strong>${produto}</strong> vence em <strong>${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}</strong>.</p>
        <p>Para continuar aparecendo em destaque para os consumidores de Londrina, renove antes que expire.</p>
        <p><a href="${url}" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Renovar agora</a></p>
        <p style="color:#666;font-size:13px">Acesse seu painel a qualquer momento para acompanhar todas as suas assinaturas.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  assinaturaCancelada: (businessName: string) => ({
    subject: "Sua assinatura foi cancelada — Hub Londrina",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Hub Londrina</h2>
        <p>Olá,</p>
        <p>A assinatura de <strong>${businessName}</strong> foi cancelada e o perfil voltou para o plano Gratuito.</p>
        <p>Seu perfil continua ativo na plataforma, mas os recursos pagos foram desativados.</p>
        <p>Quando quiser reativar, acesse sua conta e escolha um novo plano:</p>
        <a href="https://www.hublondrina.com.br/lojista/plano"
           style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 16px 0;">
          Reativar assinatura
        </a>
        <p style="color: #666; font-size: 14px;">Sentimos sua falta. Qualquer dúvida, estamos aqui.</p>
        <p style="color: #666; font-size: 14px;">— Equipe Hub Londrina</p>
      </div>
    `,
  }),

  suporteRespondido: (nome: string, assunto: string, resposta: string) => ({
    subject: `💬 Resposta do suporte — ${assunto}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Sua dúvida foi respondida</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>A equipe Hub Londrina respondeu seu ticket:</p>
        <p style="background:#f9f9f9;padding:12px;border-radius:6px"><strong>Assunto:</strong> ${assunto}</p>
        <p style="background:#eef9ee;border-left:4px solid #3d7a28;padding:12px;border-radius:6px;white-space:pre-wrap">${resposta}</p>
        <p><a href="https://www.hublondrina.com.br/lojista/suporte" style="background:#d97706;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Abrir painel de suporte</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),

  recuperacaoSenha: (nome: string, token: string) => ({
    subject: `Redefinir sua senha — Hub Londrina`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#3d7a28">Redefinir senha</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/nova-senha?token=${token}" style="background:#d97706;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Criar nova senha</a></p>
        <p style="color:#888;font-size:12px">Se você não solicitou isso, ignore este email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#888;font-size:12px">Hub Londrina — O guia de negócios locais feito por quem é de Londrina.</p>
      </div>
    `,
  }),
};

export async function sendAssinaturaCancelada(email: string, businessName: string): Promise<void> {
  const tpl = emails.assinaturaCancelada(businessName);
  await sendEmail(email, tpl.subject, tpl.html);
}
