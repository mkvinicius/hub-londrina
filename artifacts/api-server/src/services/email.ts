import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Hub Londrina <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[Email] Erro ao enviar:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Falha no envio:", err);
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
        <p>Seu plano <strong>${plano}</strong> está ativo. Cobrança de <strong>${valor}/mês</strong>.</p>
        <p><a href="https://www.hublondrina.com.br/lojista/plano" style="background:#d97706;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin:10px 0">Ver meu plano</a></p>
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
