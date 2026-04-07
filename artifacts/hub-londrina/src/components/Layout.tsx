import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/categorias", label: "Categorias" },
    { href: "/busca", label: "Busca" },
    { href: "/anuncie", label: "Contato" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-[#3a2512]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
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
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/anuncie" className="hidden md:flex">
              <button
                className="flex items-center justify-center text-white font-bold text-sm px-6 py-2.5 transition-all duration-200 active:scale-[0.97] active:translate-y-0.5"
                style={{
                  borderRadius: "999px",
                  background: "linear-gradient(170deg, #f5a623 0%, #d97706 45%, #a04d06 100%)",
                  boxShadow: "0 6px 20px rgba(160,77,6,0.55), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,220,120,0.35), inset 0 -2px 0 rgba(0,0,0,0.2)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  transform: "translateY(-1px)",
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = "linear-gradient(170deg, #f7bc45 0%, #e8940a 45%, #b45309 100%)";
                  btn.style.boxShadow = "0 10px 28px rgba(160,77,6,0.6), 0 4px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,220,120,0.4), inset 0 -2px 0 rgba(0,0,0,0.2)";
                  btn.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = "linear-gradient(170deg, #f5a623 0%, #d97706 45%, #a04d06 100%)";
                  btn.style.boxShadow = "0 6px 20px rgba(160,77,6,0.55), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,220,120,0.35), inset 0 -2px 0 rgba(0,0,0,0.2)";
                  btn.style.transform = "translateY(-1px)";
                }}
              >
                Anuncie Aqui
              </button>
            </Link>
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
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold py-2 transition-colors ${
                  location === link.href ? "text-[#d97706]" : "text-[#4a3020]"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/anuncie" onClick={() => setMenuOpen(false)}>
              <Button className="w-full bg-[#d97706] hover:bg-[#b45309] text-white rounded-full font-bold text-sm">
                Anuncie Aqui
              </Button>
            </Link>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="bg-[#1e1208] border-t text-[#f5e9dd] py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-10">
            <div className="flex flex-col gap-2 max-w-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7">
                  <svg viewBox="0 0 100 120">
                    <path d="M50 10 C25 10, 12 30, 12 48 C12 70, 50 110, 50 110 C50 110, 88 70, 88 48 C88 30, 75 10, 50 10 Z" fill="#d97706" />
                    <ellipse cx="50" cy="48" rx="18" ry="18" fill="#1e1208" />
                  </svg>
                </div>
                <span className="font-black text-lg text-white">HUB LONDRINA</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                O maior guia de negócios locais de Londrina, PR.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
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
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/50">Regiões</h4>
                <ul className="space-y-2">
                  <li><Link href="/busca?regiao=Centro" className="text-white/70 hover:text-white transition-colors">Centro</Link></li>
                  <li><Link href="/busca?regiao=Gleba+Palhano" className="text-white/70 hover:text-white transition-colors">Gleba Palhano</Link></li>
                  <li><Link href="/busca?regiao=Zona+Norte" className="text-white/70 hover:text-white transition-colors">Zona Norte</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Hub Londrina. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
