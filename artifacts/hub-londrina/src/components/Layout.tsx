import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 cursor-pointer">
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-md">
          <path d="M50 10 C30 10, 20 30, 20 50 C20 70, 50 90, 50 90 C50 90, 80 70, 80 50 C80 30, 70 10, 50 10 Z" fill="#FF9800" />
          <path d="M50 25 C40 25, 35 35, 35 45 C35 55, 50 65, 50 65 C50 65, 65 55, 65 45 C65 35, 60 25, 50 25 Z" fill="#6F4E37" />
          <path d="M45 35 Q50 45, 45 55" stroke="#F5F5DC" strokeWidth="2" fill="none" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-serif font-black text-2xl tracking-tight leading-none text-[#6F4E37]">HUB LONDRINA</span>
        <span className="text-[10px] tracking-[0.2em] font-bold text-[#4CAF50] mt-0.5">NEGÓCIO LOCAL</span>
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
    { href: "/anuncie", label: "Para Empresas" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5DC] font-sans text-[#6F4E37] selection:bg-[#FF9800] selection:text-white">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(#6F4E37 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      <header className="fixed top-0 inset-x-0 z-50 bg-[#F5F5DC]/90 backdrop-blur-md border-b border-[#6F4E37]/10">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-8 font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm uppercase tracking-wider font-bold transition-colors ${
                  location === link.href ? "text-[#FF9800]" : "hover:text-[#FF9800]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/anuncie">
              <Button className="hidden md:flex bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-full px-6 py-5 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Anuncie Seu Negócio
              </Button>
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

        {menuOpen && (
          <div className="md:hidden bg-[#F5F5DC] border-t border-[#6F4E37]/10 px-4 py-6 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm uppercase tracking-wider font-bold transition-colors ${
                  location === link.href ? "text-[#FF9800]" : "hover:text-[#FF9800]"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/anuncie" onClick={() => setMenuOpen(false)}>
              <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-full font-bold shadow-lg">
                Anuncie Seu Negócio
              </Button>
            </Link>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="bg-[#6F4E37] text-[#F5F5DC] py-12 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="font-serif font-black text-2xl tracking-tight">HUB LONDRINA</span>
              <span className="text-[10px] tracking-[0.2em] font-bold text-[#4CAF50]">NEGÓCIO LOCAL</span>
              <p className="text-white/60 text-sm mt-2 text-center md:text-left max-w-xs">
                O maior guia de negócios locais da região de Londrina, PR.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/60">Descobrir</h4>
                <ul className="space-y-2">
                  <li><Link href="/categorias" className="text-white/80 hover:text-white transition-colors">Categorias</Link></li>
                  <li><Link href="/busca" className="text-white/80 hover:text-white transition-colors">Busca</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/60">Empresas</h4>
                <ul className="space-y-2">
                  <li><Link href="/anuncie" className="text-white/80 hover:text-white transition-colors">Anunciar</Link></li>
                  <li><Link href="/anuncie#planos" className="text-white/80 hover:text-white transition-colors">Planos</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-xs mb-3 text-white/60">Regiões</h4>
                <ul className="space-y-2">
                  <li><Link href="/busca?regiao=centro" className="text-white/80 hover:text-white transition-colors">Centro</Link></li>
                  <li><Link href="/busca?regiao=Gleba+Palhano" className="text-white/80 hover:text-white transition-colors">Gleba Palhano</Link></li>
                  <li><Link href="/busca?regiao=Zona+Norte" className="text-white/80 hover:text-white transition-colors">Zona Norte</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} Hub Londrina. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
