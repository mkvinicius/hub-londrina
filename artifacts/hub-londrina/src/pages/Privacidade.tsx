import { Link } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { useLegalConfig } from "@/lib/legal-config";

export default function Privacidade() {
  const L = useLegalConfig();
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
            data-testid="button-download-pdf-privacidade"
          >
            <Download className="w-4 h-4" /> Baixar em PDF
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-10 prose prose-sm md:prose-base">
        <h1 className="font-black text-3xl md:text-4xl text-[#3a2512] mb-2">Política de Privacidade</h1>
        <p className="text-gray-500 text-sm mb-8">
          {L.PLATFORM_NAME} — Em conformidade com a Lei 13.709/2018 (LGPD) — Versão {L.TERMS_VERSION} — Última atualização: {L.LAST_UPDATED}
        </p>

        <section className="space-y-6 text-gray-800 leading-relaxed">
          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">1. Controlador dos dados</h2>
            <p>
              <strong>{L.COMPANY_NAME}</strong>, inscrita no CNPJ <strong>{L.COMPANY_CNPJ}</strong>, com sede em {L.COMPANY_ADDRESS}, é a Controladora dos dados pessoais tratados pela Plataforma {L.PLATFORM_NAME}, nos termos do art. 5º, VI da LGPD.
            </p>
            <p className="mt-2">
              <strong>Encarregado pelo Tratamento de Dados (DPO):</strong> {L.DPO_EMAIL} — todas as solicitações relacionadas aos seus direitos como titular devem ser enviadas para este endereço.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">2. Quais dados coletamos</h2>

            <p className="font-semibold mt-3">2.1. Dados de visitantes (consumidores)</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP, tipo de navegador e idioma (logs técnicos);</li>
              <li>Buscas realizadas na Plataforma (para métricas agregadas);</li>
              <li>Avaliações públicas (nota e texto, opcionalmente nome) — somente se o usuário escolher publicar.</li>
            </ul>

            <p className="font-semibold mt-3">2.2. Dados de Lojistas (cadastrados)</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Identificação:</strong> nome do responsável, email, telefone;</li>
              <li><strong>Empresa:</strong> razão social, nome fantasia, CNPJ, endereço, categoria, fotos, descrição;</li>
              <li><strong>Documentos:</strong> RG ou CNH, Cartão CNPJ, comprovante de endereço (armazenados em bucket privado, criptografados em trânsito e acessíveis apenas via URL assinada temporária);</li>
              <li><strong>Acesso:</strong> data do primeiro login, último login, IP de cadastro;</li>
              <li><strong>Pagamento:</strong> apenas o ID do cliente Stripe — <em>não armazenamos número, validade ou CVV de cartão</em>. Pagamentos são processados diretamente pela Stripe Inc., controladora independente.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">3. Para quê usamos seus dados (finalidades)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Execução de contrato (LGPD art. 7º, V):</strong> manter seu cadastro ativo, processar pagamentos, exibir seu negócio no diretório, enviar avaliações;</li>
              <li><strong>Cumprimento de obrigação legal (art. 7º, II):</strong> guardar registros fiscais e de aceite de termos, atender requisições judiciais, prevenção a fraudes;</li>
              <li><strong>Legítimo interesse (art. 7º, IX):</strong> métricas internas anonimizadas, segurança da Plataforma (anti-spam, rate-limit), envio de comunicados operacionais sobre o serviço;</li>
              <li><strong>Consentimento (art. 7º, I):</strong> envio de novidades comerciais, comunicações de marketing — sempre com opção de descadastro.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">4. Com quem compartilhamos</h2>
            <p>Nunca vendemos seus dados. Compartilhamos apenas com operadores estritamente necessários:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Stripe Inc.</strong> — processamento de pagamentos (controlador independente);</li>
              <li><strong>Google Cloud Storage</strong> — armazenamento privado de documentos e fotos;</li>
              <li><strong>Resend</strong> — envio de emails transacionais;</li>
              <li><strong>Receita Federal (ReceitaWS) e ViaCEP</strong> — validação pública de CNPJ e CEP, somente leitura;</li>
              <li><strong>Autoridades públicas</strong> — quando obrigatório por lei, ordem judicial ou pedido de autoridade competente.</li>
            </ul>
            <p className="mt-2">
              Dados públicos (nome do negócio, endereço, telefone, foto, categoria) são exibidos a qualquer visitante da Plataforma — esta é a finalidade do diretório. <strong>Dados privados</strong> (CPF, email do dono, documentos) <strong>jamais</strong> aparecem em endpoints públicos.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">5. Por quanto tempo guardamos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cadastro ativo:</strong> enquanto durar a relação de uso da Plataforma;</li>
              <li><strong>Após o cancelamento da conta:</strong> dados de identificação e documentos são automaticamente excluídos após <strong>{L.RETENTION_MONTHS} meses</strong> (cobre obrigações fiscais e auditoria);</li>
              <li><strong>Dados anonimizados</strong> (métricas, contagens) podem ser mantidos indefinidamente, pois não permitem identificar pessoas;</li>
              <li><strong>Logs de auditoria</strong> de ações administrativas: 5 anos (proteção contra fraude e prestação de contas).</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">6. Seus direitos como titular (LGPD art. 18)</h2>
            <p>Você pode, gratuitamente e a qualquer momento:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Confirmar</strong> se tratamos seus dados e <strong>acessá-los</strong>;</li>
              <li><strong>Corrigir</strong> dados incompletos, inexatos ou desatualizados (via /lojista/perfil);</li>
              <li><strong>Solicitar a eliminação</strong> dos dados pessoais tratados com seu consentimento (botão "Excluir minha conta" em /lojista/perfil ou pedido por email);</li>
              <li><strong>Portar</strong> seus dados em formato estruturado (JSON) — botão "Exportar meus dados" em /lojista/perfil;</li>
              <li><strong>Revogar o consentimento</strong> a qualquer momento, ciente de que isso pode encerrar funcionalidades que dependem dele;</li>
              <li><strong>Saber com quem</strong> compartilhamos seus dados (já listado na seção 4);</li>
              <li><strong>Reclamar</strong> à Autoridade Nacional de Proteção de Dados — <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-[#d97706] underline">www.gov.br/anpd</a>.</li>
            </ul>
            <p className="mt-2">
              Pedidos não atendidos diretamente na Plataforma podem ser encaminhados para <strong>{L.DPO_EMAIL}</strong> — respondemos em até 15 dias úteis.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">7. Segurança</h2>
            <p>Adotamos medidas técnicas e organizacionais razoáveis para proteger seus dados:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Criptografia HTTPS/TLS em todas as conexões;</li>
              <li>Senhas armazenadas com hash bcrypt (nunca em texto claro);</li>
              <li>Documentos pessoais em bucket privado, acessíveis apenas via URL assinada de curta duração;</li>
              <li>Controle de acesso por papel (admin, lojista) com sessão JWT;</li>
              <li>Logs de auditoria de toda ação administrativa sobre dados pessoais;</li>
              <li>Rate limiting em endpoints sensíveis (login, cadastro, busca).</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">8. Notificação de incidentes</h2>
            <p>
              Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, comunicaremos a ANPD e os titulares afetados em prazo razoável, conforme art. 48 da LGPD.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">9. Cookies</h2>
            <p>
              Usamos apenas cookies estritamente necessários ao funcionamento (sessão, CSRF, preferências). Não usamos cookies de publicidade comportamental nem rastreamento de terceiros para fins de marketing.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">10. Crianças e adolescentes</h2>
            <p>
              A Plataforma destina-se a maiores de 18 anos com capacidade jurídica para exercer atividade empresarial. Não coletamos intencionalmente dados de menores.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-xl text-[#3a2512] mt-6 mb-2">11. Alterações desta Política</h2>
            <p>
              Esta Política pode ser atualizada. Mudanças materiais incrementam a versão e podem exigir novo aceite. A versão e a data atualizadas constam no topo deste documento.
            </p>
          </div>

          <hr className="my-8 border-gray-200" />
          <p className="text-xs text-gray-500">
            {L.COMPANY_NAME} — CNPJ {L.COMPANY_CNPJ} — {L.COMPANY_ADDRESS}<br />
            Contato geral: {L.CONTACT_EMAIL} · Encarregado de Dados (DPO): <strong>{L.DPO_EMAIL}</strong>
          </p>
        </section>
      </main>
    </div>
  );
}
