import { Link, useLocation } from "wouter";
import { LayoutDashboard, User, Image, ShoppingBag, BarChart3, Lock, CreditCard, Star, Zap, LogOut, Menu, X, FileText, AlertTriangle, Receipt } from "lucide-react";
import { clearToken, lojistaFetch } from "@/lib/lojista-api";
import { useEffect, useState } from "react";

const links = [
  { href: "/lojista", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lojista/perfil", label: "Perfil", icon: User },
  { href: "/lojista/fotos", label: "Fotos", icon: Image },
  { href: "/lojista/documentacao", label: "Documentação", icon: FileText },
  { href: "/lojista/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "/lojista/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/lojista/avaliacoes", label: "Avaliações", icon: Star },
  { href: "/lojista/boost", label: "Impulsionamento", icon: Zap },
  { href: "/lojista/assinaturas", label: "Assinaturas", icon: Receipt },
  { href: "/lojista/plano", label: "Plano", icon: CreditCard },
  { href: "/lojista/senha", label: "Senha", icon: Lock },
];

interface DocStatus {
  documentationStatus: string;
  documentationRemainingDays: number;
  documentationTimerPaused: boolean;
}

function DocumentationBanner() {
  const [status, setStatus] = useState<DocStatus | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    let mounted = true;
    lojistaFetch("/lojista/documents")
      .then((r: any) => {
        if (mounted) setStatus(r);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (!status || status.documentationStatus === "approved") return null;

  const days = status.documentationRemainingDays;
  const isExpired = status.documentationStatus === "expired";
  const isRejected = status.documentationStatus === "rejected";
  const isSubmitted = status.documentationStatus === "submitted" && status.documentationTimerPaused;

  let bg = "bg-amber-50 border-amber-200 text-amber-900";
  let icon = "📋";
  let message = "";
  let cta = "Enviar documentação →";

  if (isExpired) {
    bg = "bg-red-50 border-red-200 text-red-800";
    icon = "⚠️";
    message = "Sua loja está temporariamente offline. Regularize sua documentação para voltar a aparecer.";
    cta = "Regularizar agora →";
  } else if (isRejected) {
    bg = "bg-orange-50 border-orange-200 text-orange-900";
    icon = "⚠️";
    message = "Revise sua documentação — encontramos uma inconsistência.";
    cta = "Corrigir documentação →";
  } else if (isSubmitted) {
    bg = "bg-yellow-50 border-yellow-200 text-yellow-900";
    icon = "📋";
    message = "Documentação enviada! Aguardando análise da equipe Hub Londrina.";
  } else {
    message = `📋 Complete sua documentação para validar sua loja. ${days} dia${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}.`;
  }

  return (
    <div className={`border-b px-6 py-3 flex items-center justify-between gap-4 ${bg}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden>{icon}</span>
        <AlertTriangle className={`w-4 h-4 hidden sm:block ${isExpired ? "text-red-700" : isRejected ? "text-orange-700" : "text-amber-700"}`} />
        <span>{message}</span>
      </div>
      {!isSubmitted && (
        <button
          onClick={() => navigate("/lojista/documentacao")}
          className="text-sm font-semibold underline whitespace-nowrap hover:no-underline"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

export function LojistaLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearToken();
    navigate("/lojista/login");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#3a2512] text-white flex flex-col transition-transform lg:relative lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <span className="font-extrabold text-lg text-[#d97706]">Hub</span>
            <span className="font-extrabold text-lg text-white ml-1">Lojista</span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location === link.href || (link.href !== "/lojista" && location.startsWith(link.href));
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
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
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
          <span className="font-bold text-gray-800">Hub Lojista</span>
        </header>
        <DocumentationBanner />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
