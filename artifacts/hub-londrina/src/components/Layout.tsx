import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLegalConfig } from "@/lib/legal-config";
import { BrandButton } from "@/components/BrandButton";

const ZONES = [
  { label: "Centro",     path: "/centro", color: "#dc2626" },
  { label: "Zona Norte", path: "/norte",  color: "#3d7a28" },
  { label: "Zona Sul",   path: "/sul",    color: "#2563eb" },
  { label: "Zona Leste", path: "/leste",  color: "#FF9800" },
  { label: "Zona Oeste", path: "/oeste",  color: "#7c3aed" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center cursor-pointer" style={{ gap: 0 }}>
      <img
        src="/logo.jpeg"
        alt="Hub Londrina"
        style={{ width: "76px", height: "76px", objectFit: "contain", flexShrink: 0, borderRadius: "6px" }}
      />
      <div className="flex flex-col leading-none" style={{ marginLeft: "-6px" }}>
        <div className="flex items-baseline" style={{ gap: "0.18em" }}>
          <span className="font-extrabold text-2xl text-[#3d7a28]" style={{ letterSpacing: "-0.01em" }}>Hub</span>
          <span className="font-extrabold text-2xl text-[#6F4E37]" style={{ letterSpacing: "-0.01em" }}>Londrina</span>
        </div>
        <span className="font-semibold text-[11px] tracking-[0.18em] text-[#d97706] uppercase">Negócio Local</span>
      </div>
    </Link>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [mobileZoneOpen, setMobileZoneOpen] = useState(false);
  const [location, navigate] = useLocation();
  const LEGAL_CONFIG = useLegalConfig();
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setZoneOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/busca", label: "Busca" },
    { href: "/anuncie", label: "Anuncie" },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-8">
          <Logo />

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors ${
                  location === link.href
                    ? "text-[#d97706]"
                    : "text-[#4a3020] hover:text-[#d97706]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Zonas dropdown */}
            <div ref={zoneRef} className="relative">
              <button
                type="button"
                onClick={() => setZoneOpen(!zoneOpen)}
                className={`text-sm font-semibold transition-colors flex items-center gap-1 ${
                  zoneOpen ? "text-[#d97706]" : "text-[#4a3020] hover:text-[#d97706]"
                }`}
              >
                Zonas
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${zoneOpen ? "rotate-180" : ""}`} />
              </button>
              {zoneOpen && (
                <div
                  className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl min-w-[160px] py-2 overflow-hidden"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 100 }}
                >
                  {ZONES.map((z) => (
                    <Link
                      key={z.path}
                      href={z.path}
                      onClick={() => setZoneOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-amber-50 hover:text-[#d97706] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                      {z.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/lojista/login" className="hidden md:flex">
              <button className="text-sm font-semibold text-[#6F4E37] hover:text-[#d97706] transition-colors px-3 py-2">
                Área do Lojista
              </button>
            </Link>
            <BrandButton onClick={() => navigate("/anuncie")} className="hidden md:flex">
              Anuncie Aqui
            </BrandButton>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-[#6F4E37]"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-background border-t border-border px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold py-2 transition-colors ${
                  location === link.href ? "text-[#d97706]" : "text-[#4a3020] hover:text-[#d97706]"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Zonas mobile expandable */}
            <div>
              <button
                type="button"
                onClick={() => setMobileZoneOpen(!mobileZoneOpen)}
                className="w-full flex items-center justify-between text-sm font-semibold py-2 text-[#4a3020] hover:text-[#d97706] transition-colors"
              >
                Zonas
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileZoneOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileZoneOpen && (
                <div className="pl-3 flex flex-col gap-0.5 mb-1">
                  {ZONES.map((z) => (
                    <Link
                      key={z.path}
                      href={z.path}
                      onClick={() => { setMenuOpen(false); setMobileZoneOpen(false); }}
                      className="flex items-center gap-2.5 py-2 text-sm font-medium text-gray-700 hover:text-[#d97706] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                      {z.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { navigate("/lojista/login"); setMenuOpen(false); }}
              className="w-full text-left text-sm font-semibold py-2 text-[#6F4E37] hover:text-[#d97706] transition-colors"
            >
              Área do Lojista
            </button>
            <BrandButton onClick={() => { navigate("/anuncie"); setMenuOpen(false); }} className="w-full mt-2">
              Anuncie Aqui
            </BrandButton>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="bg-[#1e1208] border-t text-[#f5e9dd] py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-10">
            <div className="flex flex-col gap-2 max-w-xs">
              <div className="flex items-center" style={{ gap: 0 }}>
                <img
                  src="/logo.jpeg"
                  alt="Hub Londrina"
                  style={{ width: "52px", height: "52px", objectFit: "contain", flexShrink: 0, borderRadius: "6px" }}
                />
                <div className="flex flex-col leading-none" style={{ marginLeft: "-4px" }}>
                  <div className="flex items-baseline" style={{ gap: "0.18em" }}>
                    <span className="font-extrabold text-lg text-[#5ab533]">Hub</span>
                    <span className="font-extrabold text-lg text-[#f5e9dd]">Londrina</span>
                  </div>
                  <span className="font-semibold text-[10px] tracking-[0.18em] text-[#d97706] uppercase">Negócio Local</span>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                O guia de negócios locais feito por quem é de Londrina.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/50">Descobrir</h4>
                <ul className="space-y-2">
                  <li><Link href="/categorias" className="text-white/70 hover:text-white transition-colors">Categorias</Link></li>
                  <li><Link href="/busca" className="text-white/70 hover:text-white transition-colors">Busca</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/50">Empresas</h4>
                <ul className="space-y-2">
                  <li><Link href="/anuncie" className="text-white/70 hover:text-white transition-colors">Anunciar</Link></li>
                  <li><Link href="/anuncie#planos" className="text-white/70 hover:text-white transition-colors">Planos</Link></li>
                  <li><Link href="/lojista/login" className="text-white/70 hover:text-white transition-colors">Área do Lojista</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/50">Ajuda</h4>
                <ul className="space-y-2">
                  <li><Link href="/contato" className="text-white/70 hover:text-white transition-colors" data-testid="link-footer-contato">Contato</Link></li>
                  <li><Link href="/faq" className="text-white/70 hover:text-white transition-colors" data-testid="link-footer-faq">FAQ</Link></li>
                  <li><Link href="/lojista/suporte" className="text-white/70 hover:text-white transition-colors">Suporte ao Lojista</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/50">Zonas</h4>
                <ul className="space-y-2">
                  <li><Link href="/centro" className="text-white/70 hover:text-white transition-colors">Centro</Link></li>
                  <li><Link href="/norte" className="text-white/70 hover:text-white transition-colors">Zona Norte</Link></li>
                  <li><Link href="/sul" className="text-white/70 hover:text-white transition-colors">Zona Sul</Link></li>
                  <li><Link href="/leste" className="text-white/70 hover:text-white transition-colors">Zona Leste</Link></li>
                  <li><Link href="/oeste" className="text-white/70 hover:text-white transition-colors">Zona Oeste</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/50">Legal</h4>
                <ul className="space-y-2">
                  <li><Link href="/termos" className="text-white/70 hover:text-white transition-colors" data-testid="link-footer-termos">Termos de Uso</Link></li>
                  <li><Link href="/privacidade" className="text-white/70 hover:text-white transition-colors" data-testid="link-footer-privacidade">Política de Privacidade</Link></li>
                  <li><Link href="/contato" className="text-white/70 hover:text-white transition-colors" data-testid="link-footer-legal-contato">Contato</Link></li>
                  <li>
                    <a href={`mailto:${LEGAL_CONFIG.DPO_EMAIL}`} className="text-white/70 hover:text-white transition-colors break-all" data-testid="link-footer-dpo">
                      Encarregado de Dados (DPO)
                    </a>
                    <p className="text-white/40 text-xs mt-1 break-all">{LEGAL_CONFIG.DPO_EMAIL}</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Hub Londrina. Todos os direitos reservados.
            </p>
            <Link href="/admin/login" className="text-white/20 hover:text-white/40 text-xs transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
