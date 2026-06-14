import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { BrandButton } from "@/components/BrandButton";
import { useSeo } from "@/lib/seo";
import {
  Heart, Shield, TrendingUp, Award, MapPin, Users, Zap, Star,
  ArrowRight, CheckCircle2, Building2, Target, Sparkles,
} from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || "";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart, Shield, TrendingUp, Award, MapPin, Users, Zap, Star,
  CheckCircle2, Building2, Target, Sparkles, ArrowRight,
};

function getIcon(name: string) {
  return ICON_MAP[name] ?? Sparkles;
}

interface ValueItem { icon: string; title: string; text: string }
interface BenefitItem { icon: string; title: string; text: string }

const ZONE_COLORS: Record<string, string> = {
  Centro: "#dc2626",
  Norte: "#3d7a28",
  Sul: "#2563eb",
  Leste: "#FF9800",
  Oeste: "#7c3aed",
};

const ZONES = ["Centro", "Norte", "Sul", "Leste", "Oeste"];

export default function SobreNos() {
  useSeo({
    title: "Sobre Nós — Hub Londrina",
    description: "Conheça a história do Hub Londrina, a plataforma que conecta londrinenses ao melhor do comércio local da cidade.",
    canonicalPath: "/sobre",
  });

  const [, navigate] = useLocation();
  const [content, setContent] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/about-page`)
      .then(r => r.json())
      .then(d => { setContent(d.data || {}); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  function parse<T>(key: string, fallback: T): T {
    try { return JSON.parse(content[key] || "") as T; } catch { return fallback; }
  }

  const heroTitle = content.HERO_TITLE || "O hub do comércio local de Londrina";
  const heroSubtitle = content.HERO_SUBTITLE || "";
  const storyTitle = content.STORY_TITLE || "Nossa História";
  const storyText = content.STORY_TEXT || "";
  const missionTitle = content.MISSION_TITLE || "Nossa Missão";
  const missionText = content.MISSION_TEXT || "";
  const valuesTitle = content.VALUES_TITLE || "Os valores que nos guiam";
  const valuesItems = parse<ValueItem[]>("VALUES_ITEMS", []);
  const bizTitle = content.BENEFITS_BIZ_TITLE || "Para quem tem negócio em Londrina";
  const bizItems = parse<BenefitItem[]>("BENEFITS_BIZ_ITEMS", []);
  const conTitle = content.BENEFITS_CON_TITLE || "Para quem mora e vive em Londrina";
  const conItems = parse<BenefitItem[]>("BENEFITS_CON_ITEMS", []);
  const ctaTitle = content.CTA_TITLE || "Faça parte do Hub Londrina";
  const ctaText = content.CTA_TEXT || "";

  if (!loaded) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#d97706] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-[#1e1208]" style={{ minHeight: "420px" }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "url(/hero-empreendedores.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 35%",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1208]/90 via-[#3d2010]/70 to-[#d97706]/30" />

        {/* decorative circles */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #d97706, transparent)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #FF9800, transparent)" }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 font-semibold mb-8">
            <Heart className="w-3.5 h-3.5 text-[#d97706]" />
            Feito por londrinense, para londrinense
          </div>
          <h1
            className="font-black text-white leading-tight mb-6"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}
          >
            {heroTitle}
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium">
            {heroSubtitle}
          </p>

          {/* zone pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {ZONES.map(z => (
              <span
                key={z}
                className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 backdrop-blur-sm text-white/80 text-xs font-bold px-3 py-1.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ZONE_COLORS[z] }} />
                Zona {z === "Centro" ? "" : ""}{z}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d97706] mb-3 block">A nossa origem</span>
              <h2 className="font-black text-[#1e1208] mb-6" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                {storyTitle}
              </h2>
              <div className="space-y-4">
                {storyText.split("\n\n").filter(Boolean).map((para, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed text-base">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* visual accent */}
            <div className="relative">
              <div
                className="rounded-3xl overflow-hidden aspect-[4/3]"
                style={{ boxShadow: "0 32px 64px rgba(0,0,0,0.12)" }}
              >
                <img
                  src="/hero-empreendedores.jpg"
                  alt="Empreendedores londrinenses"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "center 30%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1208]/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white font-black text-xl">Londrina em cada detalhe</p>
                  <p className="text-white/70 text-sm mt-1">Negócios reais, pessoas reais, conexões reais.</p>
                </div>
              </div>

              {/* floating stat cards */}
              <div
                className="absolute -top-5 -left-5 bg-white rounded-2xl p-4 flex items-center gap-3"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#d97706]" />
                </div>
                <div>
                  <p className="font-black text-[#1e1208] text-lg leading-none">+20</p>
                  <p className="text-xs text-gray-500 mt-0.5">negócios cadastrados</p>
                </div>
              </div>
              <div
                className="absolute -bottom-5 -right-5 bg-white rounded-2xl p-4 flex items-center gap-3"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-black text-[#1e1208] text-lg leading-none">5 zonas</p>
                  <p className="text-xs text-gray-500 mt-0.5">cobrindo toda Londrina</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="py-20 bg-amber-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d97706] mb-3 block">Por que existimos</span>
          <h2 className="font-black text-[#1e1208] mb-8" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
            {missionTitle}
          </h2>
          <div
            className="bg-white rounded-3xl p-8 md:p-12 relative overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.08)" }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: "linear-gradient(90deg, #6F4E37, #d97706, #FF9800)" }} />
            <Target className="w-12 h-12 text-[#d97706] mx-auto mb-6" />
            <p
              className="text-[#1e1208] font-bold leading-relaxed"
              style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)" }}
            >
              "{missionText}"
            </p>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      {valuesItems.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d97706] mb-3 block">O que acreditamos</span>
              <h2 className="font-black text-[#1e1208]" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                {valuesTitle}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {valuesItems.map((v, i) => {
                const Icon = getIcon(v.icon);
                const colors = [
                  { bg: "bg-amber-100", icon: "text-[#d97706]" },
                  { bg: "bg-blue-100",  icon: "text-blue-600" },
                  { bg: "bg-green-100", icon: "text-green-600" },
                  { bg: "bg-purple-100", icon: "text-purple-600" },
                ];
                const c = colors[i % colors.length];
                return (
                  <div
                    key={i}
                    className="bg-white border border-gray-100 rounded-3xl p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow"
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${c.icon}`} />
                    </div>
                    <div>
                      <h3 className="font-black text-[#1e1208] text-lg mb-2">{v.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{v.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── BENEFITS — BUSINESSES ── */}
      {bizItems.length > 0 && (
        <section className="py-20" style={{ background: "linear-gradient(135deg, #1e1208 0%, #3d2010 50%, #5a3018 100%)" }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d97706] mb-3 block">Para comerciantes</span>
              <h2 className="font-black text-white" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                {bizTitle}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bizItems.map((b, i) => {
                const Icon = getIcon(b.icon);
                return (
                  <div
                    key={i}
                    className="bg-white/8 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 hover:bg-white/12 transition-colors backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#d97706]/20 border border-[#d97706]/30 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-[#d97706]" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base mb-2">{b.title}</h3>
                      <p className="text-white/60 text-sm leading-relaxed">{b.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <BrandButton onClick={() => navigate("/anuncie")} size="lg" className="gap-2">
                Quero anunciar meu negócio
                <ArrowRight className="w-4 h-4" />
              </BrandButton>
            </div>
          </div>
        </section>
      )}

      {/* ── BENEFITS — CONSUMERS ── */}
      {conItems.length > 0 && (
        <section className="py-20 bg-amber-50">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d97706] mb-3 block">Para a comunidade</span>
              <h2 className="font-black text-[#1e1208]" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                {conTitle}
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-8">
              {conItems.map((c, i) => {
                const Icon = getIcon(c.icon);
                const accent = ["#d97706", "#3d7a28", "#2563eb"][i % 3];
                return (
                  <div
                    key={i}
                    className="bg-white rounded-3xl p-8 text-center flex flex-col items-center gap-5"
                    style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${accent}18`, border: `2px solid ${accent}30`, color: accent }}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#1e1208] text-lg mb-2">{c.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── ZONES MAP ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d97706] mb-3 block">Cobertura geográfica</span>
            <h2 className="font-black text-[#1e1208]" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
              Toda Londrina, zona a zona
            </h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
              Organizamos os negócios pelas 5 zonas da cidade para que você encontre o que precisa perto de onde está.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { zone: "Centro",    slug: "centro", color: "#dc2626", desc: "Coração comercial da cidade" },
              { zone: "Zona Norte",slug: "norte",  color: "#3d7a28", desc: "Expansão residencial e comércio" },
              { zone: "Zona Sul",  slug: "sul",    color: "#2563eb", desc: "Bairros tradicionais do sul" },
              { zone: "Zona Leste",slug: "leste",  color: "#FF9800", desc: "Crescimento e oportunidades" },
              { zone: "Zona Oeste",slug: "oeste",  color: "#7c3aed", desc: "Serviços e gastronomia" },
            ].map(z => (
              <button
                key={z.slug}
                type="button"
                onClick={() => navigate(`/${z.slug}`)}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-transparent hover:border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all text-center"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${z.color}18` }}
                >
                  <MapPin className="w-6 h-6" style={{ color: z.color }} />
                </div>
                <div>
                  <p className="font-black text-sm text-[#1e1208] group-hover:text-[#d97706] transition-colors">{z.zone}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{z.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-[#d97706] relative overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.3) 35px, rgba(255,255,255,.3) 70px)",
        }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <Sparkles className="w-12 h-12 text-white/80 mx-auto mb-6" />
          <h2 className="font-black text-white mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
            {ctaTitle}
          </h2>
          <p className="text-white/85 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            {ctaText}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => navigate("/anuncie")}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#d97706] font-black px-8 py-4 rounded-2xl text-base hover:bg-amber-50 transition-colors shadow-lg"
            >
              <Building2 className="w-5 h-5" />
              Anunciar meu negócio
            </button>
            <button
              type="button"
              onClick={() => navigate("/busca")}
              className="inline-flex items-center justify-center gap-2 bg-white/15 border-2 border-white/40 text-white font-black px-8 py-4 rounded-2xl text-base hover:bg-white/25 transition-colors backdrop-blur-sm"
            >
              <MapPin className="w-5 h-5" />
              Explorar negócios
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
