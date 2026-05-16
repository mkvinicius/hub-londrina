import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useLegalConfig } from "@/lib/legal-config";
import { submitContactMessage } from "@/lib/public-api";
import { Mail, Phone, MapPin, Clock, MessageCircle, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function Contato() {
  const cfg = useLegalConfig();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whatsapp = cfg.WHATSAPP_CONTATO || "5543999990000";
  const horario = cfg.ATENDIMENTO_HORARIO || "Seg–Sex, 9h às 18h";
  const mapUrl = cfg.MAP_EMBED_URL || "https://www.google.com/maps?q=Londrina,PR&output=embed";
  const contactEmail = cfg.CONTACT_EMAIL;
  const dpoEmail = cfg.DPO_EMAIL;
  const address = cfg.COMPANY_ADDRESS;
  const whatsappDigits = whatsapp.replace(/\D/g, "");
  const whatsappDisplay = whatsapp.startsWith("+") ? whatsapp : `+${whatsappDigits}`;
  const whatsappLink = `https://wa.me/${whatsappDigits}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Email inválido.");
    if (form.subject.trim().length < 3) return setError("Informe o assunto.");
    if (form.message.trim().length < 10) return setError("Mensagem muito curta (mínimo 10 caracteres).");
    setSubmitting(true);
    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSuccess(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <section className="bg-gradient-to-b from-[#fff8f0] to-white py-12 md:py-16 border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
          <h1 className="font-black text-3xl md:text-5xl text-[#3a2512] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Entre em contato
          </h1>
          <p className="text-[#6F4E37] max-w-2xl mx-auto">
            Dúvidas, sugestões ou parcerias? Fale com a equipe do Hub Londrina.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid md:grid-cols-3 gap-6">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#25D366] hover:shadow-md transition-all group"
          data-testid="link-whatsapp"
        >
          <div className="w-11 h-11 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#3a2512]">WhatsApp</h3>
          <p className="text-sm text-[#6F4E37] mt-1">{whatsappDisplay}</p>
          <p className="text-xs text-gray-400 mt-2">Atendimento rápido</p>
        </a>

        <a
          href={`mailto:${contactEmail}`}
          className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#d97706] hover:shadow-md transition-all group"
          data-testid="link-email"
        >
          <div className="w-11 h-11 rounded-xl bg-[#d97706]/10 text-[#d97706] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#3a2512]">Comercial</h3>
          <p className="text-sm text-[#6F4E37] mt-1 break-all">{contactEmail}</p>
          <p className="text-xs text-gray-400 mt-2">Anúncios, planos e parcerias</p>
        </a>

        <a
          href={`mailto:${dpoEmail}`}
          className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#3d7a28] hover:shadow-md transition-all group"
          data-testid="link-dpo"
        >
          <div className="w-11 h-11 rounded-xl bg-[#3d7a28]/10 text-[#3d7a28] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#3a2512]">Privacidade (DPO)</h3>
          <p className="text-sm text-[#6F4E37] mt-1 break-all">{dpoEmail}</p>
          <p className="text-xs text-gray-400 mt-2">LGPD e dados pessoais</p>
        </a>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-12 grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8">
            <h2 className="font-bold text-2xl text-[#3a2512] mb-2">Envie uma mensagem</h2>
            <p className="text-sm text-[#6F4E37] mb-6">Respondemos em até 2 dias úteis.</p>

            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <h3 className="font-bold text-green-800">Mensagem enviada!</h3>
                <p className="text-sm text-green-700 mt-1">Recebemos sua mensagem e responderemos em breve.</p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-4 text-sm font-semibold text-[#d97706] hover:underline"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-contato">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      maxLength={160}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Telefone (opcional)</label>
                    <input
                      type="tel"
                      maxLength={40}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
                      data-testid="input-phone"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Assunto *</label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
                      data-testid="input-subject"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mensagem *</label>
                  <textarea
                    required
                    rows={6}
                    maxLength={4000}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none resize-y"
                    data-testid="input-message"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">{form.message.length}/4000</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <p className="text-[11px] text-gray-400">
                  Ao enviar, você concorda com nossa <a href="/privacidade" className="underline">Política de Privacidade</a>.
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-sm px-6 py-3 rounded-xl disabled:opacity-50"
                  data-testid="button-submit"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Enviando..." : "Enviar mensagem"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="font-bold text-[#3a2512] mb-3">Informações</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#d97706] mt-0.5 flex-shrink-0" />
                <span className="text-[#6F4E37]">{address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#d97706] mt-0.5 flex-shrink-0" />
                <span className="text-[#6F4E37]">{horario}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#d97706] mt-0.5 flex-shrink-0" />
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-[#6F4E37] hover:text-[#d97706]">
                  {whatsappDisplay}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#d97706] mt-0.5 flex-shrink-0" />
                <a href={`mailto:${contactEmail}`} className="text-[#6F4E37] hover:text-[#d97706] break-all">
                  {contactEmail}
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <iframe
              src={mapUrl}
              width="100%"
              height="260"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa Hub Londrina"
            />
          </div>
        </div>
      </section>
    </Layout>
  );
}
