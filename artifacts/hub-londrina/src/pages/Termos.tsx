import { Link } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { LEGAL_CONFIG as L } from "@/lib/legal-config";

export default function Termos() {
  return (
    <div className="min-h-screen bg-[#FFFCF7]">
      <style>{`@media print { .no-print { display: none !important } body { background: white } main { max-width: 100% !important; padding: 0 !important } }`}</style>

      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#6F4E37] hover:text-[#d97706] font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors"
            data-testid="button-download-pdf-termos"
          >
            <Download className="w-4 h-4" /> Baixar em PDF
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-10 prose prose-sm md:prose-base">
        <h1 className="font-black text-3xl md:text-4xl text-[#3a2512] mb-2">Termos de Uso</h1>
        <p className="text-gray-500 text-sm mb-8">
          {L.PLATFORM_NAME} — Versão {L.TERMS_VERSION} — Última atualização: {L.LAST_UPDATED}
        </p>

        <section className="space-y-6 text-gray-800 leading-relaxed">
          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">1. Quem somos</h2>
            <p>
              Estes Termos regulam o uso da plataforma <strong>{L.PLATFORM_NAME}</strong> ({L.PLATFORM_URL}), operada por <strong>{L.COMPANY_NAME}</strong>, inscrita no CNPJ <strong>{L.COMPANY_CNPJ}</strong>, com sede em {L.COMPANY_ADDRESS}, doravante "Plataforma".
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">2. Aceitação</h2>
            <p>
              Ao se cadastrar, você ("Lojista") declara ter lido, compreendido e aceito integralmente estes Termos e a <Link href="/privacidade" className="text-[#d97706] underline">Política de Privacidade</Link>. O cadastro só é concluído após o aceite explícito (checkbox marcado), com registro da data, hora e versão dos documentos aceitos.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">3. O que a Plataforma é (e o que não é)</h2>
            <p>
              A Plataforma é um <strong>diretório de negócios locais</strong> de Londrina/PR. Ela apenas <em>conecta</em> consumidores e estabelecimentos. A Plataforma <strong>não é</strong> parte das transações comerciais entre consumidor e Lojista, não comercializa produtos ou serviços do Lojista, não emite notas fiscais em nome do Lojista, e não responde por qualidade, entrega, atendimento, garantia ou qualquer obrigação contratual do Lojista perante o consumidor.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">4. Cadastro e responsabilidades do Lojista</h2>
            <p>O Lojista declara, sob as penas da lei, que:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Todos os dados informados (razão social, CNPJ, endereço, telefone, fotos, descrições) são verdadeiros, atuais e de sua titularidade;</li>
              <li>Possui plenos poderes para representar o estabelecimento cadastrado;</li>
              <li>Mantém o cadastro atualizado e responde por danos causados por dados falsos ou desatualizados;</li>
              <li>Os documentos enviados (RG/CPF, Cartão CNPJ, Comprovante de Endereço) são autênticos;</li>
              <li>Não publicará conteúdo ilegal, discriminatório, enganoso, que infrinja direitos de terceiros (marca, imagem, autoral) ou que viole legislação de defesa do consumidor (CDC).</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">5. Planos, pagamentos e cancelamento</h2>
            <p>
              A Plataforma oferece um plano <strong>Gratuito</strong> e planos pagos (<strong>Destaque</strong> e <strong>Premium</strong>), cujos valores e benefícios estão descritos em /anuncie. Pagamentos são processados por <strong>Stripe</strong>, que é controlador independente dos dados de pagamento.
            </p>
            <p className="mt-2">
              <strong>Pagamento e aprovação de documentos são trilhas independentes.</strong> Pagar um plano ativa as funcionalidades pagas e publica o negócio no diretório, mas <strong>não substitui a análise dos documentos</strong> exigidos pela LGPD e por estes Termos (Documento Pessoal, Cartão CNPJ, Comprovante de Endereço). Os documentos são analisados individualmente pela equipe da Plataforma. O selo "Verificado" depende exclusivamente da aprovação dos 3 documentos.
            </p>
            <p className="mt-2">
              O Lojista pode cancelar a assinatura a qualquer momento via /lojista/plano. O cancelamento é imediato em planos mensais (sem reembolso da fração já paga) e ao final do ciclo em planos anuais. Reembolsos seguem o art. 49 do CDC para compras à distância (7 dias para arrependimento).
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">6. Conduta esperada e moderação</h2>
            <p>
              A Plataforma pode, a qualquer momento e sem aviso prévio, suspender ou remover cadastros, produtos, fotos ou avaliações que violem estes Termos, a legislação aplicável ou direitos de terceiros. Reincidência ou fraude grave (ex: documentos falsos, CNPJ inativo, denúncias procedentes de consumidores) acarreta exclusão definitiva sem reembolso.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">7. Avaliações</h2>
            <p>
              Avaliações públicas feitas por consumidores são de responsabilidade do autor. O Lojista pode responder publicamente a cada avaliação. A Plataforma reserva-se o direito de remover avaliações com discurso de ódio, ofensas pessoais ou conteúdo claramente fraudulento, mas <strong>não modera mérito</strong> de avaliações negativas legítimas.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">8. Propriedade intelectual</h2>
            <p>
              A marca {L.PLATFORM_NAME}, o layout, os textos editoriais e o software são propriedade exclusiva de {L.COMPANY_NAME}. As fotos, logos e textos enviados pelo Lojista permanecem de sua titularidade — ao publicá-los, o Lojista concede à Plataforma uma licença não-exclusiva, gratuita e válida pelo tempo do cadastro para exibi-los na Plataforma e em peças de divulgação relacionadas a ela.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">9. Limitação de responsabilidade</h2>
            <p>
              Na máxima extensão permitida pela legislação brasileira, a responsabilidade civil da Plataforma por qualquer dano direto ou indireto fica limitada ao valor efetivamente pago pelo Lojista nos 12 (doze) meses anteriores ao evento que deu causa. A Plataforma não responde por lucros cessantes, perda de clientela ou danos morais decorrentes de indisponibilidade temporária do serviço, falhas de provedores terceiros (Stripe, Google Cloud, Resend) ou decisões editoriais (suspensão por violação destes Termos).
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">10. Proteção de dados (LGPD)</h2>
            <p>
              O tratamento de dados pessoais é regido pela <Link href="/privacidade" className="text-[#d97706] underline">Política de Privacidade</Link>, que faz parte integrante destes Termos. Em caso de dúvidas, o Encarregado pelo Tratamento de Dados (DPO) pode ser contatado por <strong>{L.DPO_EMAIL}</strong>.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">11. Alterações destes Termos</h2>
            <p>
              A Plataforma pode atualizar estes Termos a qualquer momento. Mudanças materiais incrementam a versão (atual: {L.TERMS_VERSION}) e exigem novo aceite explícito do Lojista no próximo login. Continuar usando a Plataforma após o aceite implica concordância integral com a nova versão.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">12. Foro</h2>
            <p>
              Fica eleito o foro da Comarca de <strong>Londrina/PR</strong> para dirimir qualquer controvérsia oriunda destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </div>

          <hr className="my-8 border-gray-200" />
          <p className="text-xs text-gray-500">
            {L.COMPANY_NAME} — CNPJ {L.COMPANY_CNPJ} — {L.COMPANY_ADDRESS}<br />
            Contato: {L.CONTACT_EMAIL} · DPO: {L.DPO_EMAIL}
          </p>
        </section>
      </main>
    </div>
  );
}
