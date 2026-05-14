import { useLocation } from "wouter";
import { useListPartners, getListPartnersQueryKey } from "@workspace/api-client-react";
import { imgSrc } from "@/lib/utils";

interface PartnerLite {
  id: number;
  name: string;
  tier: string;
  logoUrl: string;
  businessId?: number | null;
  sortOrder: number;
}

export function PartnersSection() {
  const { data } = useListPartners({
    query: { queryKey: getListPartnersQueryKey(), staleTime: 60_000 },
  });
  const [, navigate] = useLocation();

  if (!data) return null;
  const master = (data.master ?? []) as PartnerLite[];
  const apoiador = (data.apoiador ?? []) as PartnerLite[];
  const hasMaster = master.length > 0;
  const hasApoiador = apoiador.length > 0;
  if (!hasMaster && !hasApoiador) return null;

  const goToBusiness = (p: PartnerLite) => {
    if (p.businessId) navigate(`/negocio/${p.businessId}`);
  };

  return (
    <section className="py-16" style={{ backgroundColor: "#FAF7F2" }} data-testid="section-partners">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <h2 className="font-black text-3xl md:text-4xl text-[#3a2512] mb-2">Quem apoia o Hub Londrina</h2>
          <p className="text-sm md:text-base text-[#6F4E37]/70">Marcas que acreditam no comércio local</p>
        </div>

        {hasMaster && (
          <div className="mb-12">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-[#d97706] mb-5">
              Patrocinadores Master
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {master.map((p) => {
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
            <p className="text-center text-xs font-bold uppercase tracking-widest text-[#6F4E37]/70 mb-4">
              Apoiadores
            </p>
            <div className="partners-marquee" data-testid="carousel-partners-apoiador">
              <div className="partners-marquee-track">
                {[...apoiador, ...apoiador].map((p, i) => {
                  const clickable = !!p.businessId;
                  const isClone = i >= apoiador.length;
                  return (
                    <div
                      key={`${p.id}-${i}`}
                      data-testid={!isClone ? `card-partner-apoiador-${p.id}` : undefined}
                      onClick={() => goToBusiness(p)}
                      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToBusiness(p); } } : undefined}
                      role={clickable ? "link" : undefined}
                      tabIndex={clickable && !isClone ? 0 : -1}
                      aria-hidden={isClone || undefined}
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
