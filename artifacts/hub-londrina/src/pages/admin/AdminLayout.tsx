import { Link, useLocation } from "wouter";
import { LayoutDashboard, Store, Tag, Users, Zap, ImageIcon, ClipboardList, LogOut, Menu, X, CreditCard, Info, MapPin, FileText, Star, ScrollText, MessageSquare } from "lucide-react";
import { clearToken } from "@/lib/admin-api";
import { useState } from "react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/negocios", label: "Negócios", icon: Store },
  { href: "/admin/lojistas", label: "Lojistas", icon: Users },
  { href: "/admin/cadastros", label: "Cadastros Pendentes", icon: ClipboardList, hasBadge: true },
  { href: "/admin/documentacao", label: "Documentação", icon: FileText },
  { href: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/impulsionamento", label: "Impulsionamento", icon: Zap },
  { href: "/admin/zonas", label: "Destaque por Zona", icon: MapPin },
  { href: "/admin/home-banners", label: "Banners Home", icon: ImageIcon },
  { href: "/admin/categorias", label: "Categorias", icon: Tag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/suporte", label: "Suporte", icon: MessageSquare },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  pendingCadastros?: number;
}

export function AdminLayout({ children, pendingCadastros }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearToken();
    navigate("/admin/login");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform lg:relative lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <span className="font-extrabold text-lg text-[#d97706]">Hub</span>
            <span className="font-extrabold text-lg text-white ml-1">Admin</span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location === link.href || (link.href !== "/admin" && location.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-[#d97706] text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
                {link.hasBadge && pendingCadastros !== undefined && pendingCadastros > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {pendingCadastros}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex items-start gap-2 bg-white/5 rounded-xl px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/50 leading-snug">
              <span className="font-semibold text-white/70">Uploads armazenados localmente.</span> Fotos, logos e banners ficam salvos no servidor e podem ser perdidos ao reiniciar o container. Configure object storage externo (S3 ou Cloudflare R2) para garantir persistência permanente em produção.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-800">Hub Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
