import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { fetchPublicFaqs, type PublicFaq } from "@/lib/public-api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, MessageCircle } from "lucide-react";

const TABS = [
  { value: "consumidor", label: "Para você" },
  { value: "lojista", label: "Para lojistas" },
  { value: "lgpd", label: "Privacidade (LGPD)" },
] as const;

export default function FaqPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("consumidor");
  const [faqs, setFaqs] = useState<PublicFaq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublicFaqs()
      .then((data) => {
        if (!cancelled) setFaqs(data);
      })
      .catch(() => {
        if (!cancelled) setFaqs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = useMemo(() => {
    const map: Record<string, PublicFaq[]> = { consumidor: [], lojista: [], lgpd: [] };
    for (const f of faqs) {
      if (map[f.category]) map[f.category].push(f);
    }
    return map;
  }, [faqs]);

  return (
    <Layout>
      <section className="bg-gradient-to-b from-[#fff8f0] to-white py-12 md:py-16 border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#d97706]/10 text-[#d97706] mb-4">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h1 className="font-black text-3xl md:text-5xl text-[#3a2512] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Perguntas frequentes
          </h1>
          <p className="text-[#6F4E37] max-w-2xl mx-auto">
            Respostas rápidas para as dúvidas mais comuns sobre o Hub Londrina.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid grid-cols-3 w-full mb-6">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} data-testid={`tab-${t.value}`}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => {
            const items = byCategory[t.value] ?? [];
            return (
              <TabsContent key={t.value} value={t.value}>
                {loading ? (
                  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
                    Carregando…
                  </div>
                ) : items.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                    <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhuma pergunta cadastrada nesta categoria ainda.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-2xl px-2 sm:px-4">
                    <Accordion type="single" collapsible className="w-full">
                      {items.map((f) => (
                        <AccordionItem key={f.id} value={`faq-${f.id}`} data-testid={`faq-${f.id}`}>
                          <AccordionTrigger className="text-left font-semibold text-[#3a2512] hover:text-[#d97706]">
                            {f.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-[#6F4E37] whitespace-pre-wrap leading-relaxed">
                            {f.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="mt-10 bg-gradient-to-br from-[#d97706] to-[#b45309] text-white rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-xl">Não encontrou sua dúvida?</h3>
            <p className="text-white/80 text-sm mt-1">Fale com a equipe — respondemos em até 2 dias úteis.</p>
          </div>
          <Link
            href="/contato"
            className="inline-flex items-center gap-2 bg-white text-[#b45309] hover:bg-amber-50 font-bold text-sm px-5 py-3 rounded-xl transition-colors"
            data-testid="link-contato-faq"
          >
            <MessageCircle className="w-4 h-4" />
            Entrar em contato
          </Link>
        </div>
      </section>
    </Layout>
  );
}
