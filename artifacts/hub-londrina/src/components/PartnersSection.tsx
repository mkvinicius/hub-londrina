import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { imgSrc } from "@/lib/utils";

interface Partner {
  id: number;
  name: string;
  tier: "master" | "apoiador";
  logoUrl: string;
  businessId: number | null;
  sortOrder: number;
}

interface PartnersResponse {
  master: Partner[];
  apoiador: Partner[];
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export function PartnersSection() {
  const [data, setData] = useState<PartnersResponse | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`${API_BASE}/api/partners`)
      .then((r) => (r.ok ? r.json() : { master: [], apoiador: [] }))
      .then((d: PartnersResponse) => setData(d))
      .catch(() => setData({ master: [], apoiador: [] }));
  }, []);

  if (!data) return null;
  const hasMaster = data.master.length > 0;
  const hasApoiador = data.apoiador.length > 0;
  if (!hasMaster && !hasApoiador) return null;

  const goToBusiness = (p: Partner) => {
    if (p.businessId) navigate(`/negocio/${p.businessId}`);
  };

  return (
    <section className="py-16" style={{ backgroundColor: "#FAF7F2" }} data-testid="section-partners">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {hasMaster && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-[#d97706] mb-2">Patrocinadores Master</p>
              <h2 className="font-black text-2xl md:text-3xl text-[#3a2512]">
                Quem acredita no comércio de Londrina
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {data.master.map((p) => {
                const clickable = !!p.businessId;
                return (
                  <div
                    key={p.id}
                    data-testid={`card-partner-master-${p.id}`}
                    onClick={() => goToBusiness(p)}
                    onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToBusiness(p); } } : undefined}
                    role={clickable ? "link" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable ? `Ver perfil de ${p.name}` : p.name}
                    className={`bg-white rounded-2xl border border-[#6F4E37]/10 shadow-sm h-20 md:h-24 flex items-center justify-center px-4 transition-all ${
                      clickable ? "cursor-pointer hover:shadow-md hover:border-[#d97706]/40 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:ring-offset-2" : ""
                    }`}
                    title={p.name}
                  >
                    <img
                      src={imgSrc(p.logoUrl)}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasApoiador && (
          <div>
            <div className="text-center mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6F4E37]/70 mb-1">Apoiadores</p>
              <h3 className="font-bold text-base md:text-lg text-[#3a2512]/80">
                Negócios locais que somam com a gente
              </h3>
            </div>
            <div className="partners-marquee" data-testid="carousel-partners-apoiador">
              <div className="partners-marquee-track">
                {[...data.apoiador, ...data.apoiador].map((p, i) => {
                  const clickable = !!p.businessId;
                  return (
                    <div
                      key={`${p.id}-${i}`}
                      data-testid={i < data.apoiador.length ? `card-partner-apoiador-${p.id}` : undefined}
                      onClick={() => goToBusiness(p)}
                      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToBusiness(p); } } : undefined}
                      role={clickable ? "link" : undefined}
                      tabIndex={clickable && i < data.apoiador.length ? 0 : -1}
                      aria-hidden={i >= data.apoiador.length || undefined}
                      aria-label={clickable ? `Ver perfil de ${p.name}` : p.name}
                      className={`partners-marquee-item h-12 md:h-14 flex items-center justify-center px-6 ${
                        clickable ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#d97706] rounded-lg" : ""
                      }`}
                      title={p.name}
                    >
                      <img
                        src={imgSrc(p.logoUrl)}
                        alt={p.name}
                        className="max-h-full max-w-[140px] object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .partners-marquee {
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        }
        .partners-marquee-track {
          display: flex;
          gap: 1.5rem;
          width: max-content;
          animation: partners-scroll 35s linear infinite;
        }
        .partners-marquee:hover .partners-marquee-track {
          animation-play-state: paused;
        }
        .partners-marquee-item { flex-shrink: 0; }
        @keyframes partners-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .partners-marquee-track { animation: none; }
        }
      `}</style>
    </section>
  );
}
