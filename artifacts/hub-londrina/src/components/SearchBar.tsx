import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Zap, Loader2, X, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandButton } from "@/components/BrandButton";
import { getCategoryIcon } from "@/lib/icons";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

export interface AcItem {
  id: number;
  name: string;
  categorySlug: string;
}

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: () => void;
  /** Chamado quando o usuário clica numa sugestão genérica (não patrocinada).
   *  O patrocinado sempre navega para /negocio/:id diretamente. */
  onSelectSuggestion?: (name: string) => void;
  showRegionFilter?: boolean;
  region?: string;
  onRegionChange?: (val: string) => void;
  dynamicRegions?: string[];
  /** 'hero' = sem borda, z-40 (para hero do home); 'page' = com borda (para /busca) */
  variant?: "hero" | "page";
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  onSelectSuggestion,
  showRegionFilter = false,
  region = "",
  onRegionChange,
  dynamicRegions = ["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste"],
  variant = "page",
  placeholder = "Restaurante, salão, mecânica...",
}: SearchBarProps) {
  const [, navigate] = useLocation();
  const [acSponsored, setAcSponsored] = useState<AcItem[]>([]);
  const [acSuggestions, setAcSuggestions] = useState<AcItem[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acLoading, setAcLoading] = useState(false);
  const acRef = useRef<HTMLDivElement>(null);
  const acTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAutocomplete = useCallback((q: string) => {
    if (q.length < 2) {
      setAcSponsored([]);
      setAcSuggestions([]);
      setAcOpen(false);
      return;
    }
    if (acTimer.current) clearTimeout(acTimer.current);
    acTimer.current = setTimeout(async () => {
      setAcLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setAcSponsored(data.sponsored || []);
        setAcSuggestions(data.suggestions || []);
        setAcOpen((data.sponsored?.length || data.suggestions?.length) > 0);
      } catch {
        setAcOpen(false);
      } finally {
        setAcLoading(false);
      }
    }, 250);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (acRef.current && !acRef.current.contains(e.target as Node)) setAcOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { setAcOpen(false); onSearch(); }
    if (e.key === "Escape") setAcOpen(false);
  }

  function handleInput(val: string) {
    onChange(val);
    fetchAutocomplete(val);
  }

  function handleSponsoredClick(item: AcItem) {
    setAcOpen(false);
    // Patrocinado: vai direto para o perfil do negócio
    navigate(`/negocio/${item.id}`);
  }

  function handleSuggestionClick(item: AcItem) {
    setAcOpen(false);
    onChange(item.name);
    if (onSelectSuggestion) {
      onSelectSuggestion(item.name);
    } else {
      navigate(`/busca?${new URLSearchParams({ q: item.name }).toString()}`);
    }
  }

  const wrapperClass = variant === "hero"
    ? "flex flex-col sm:flex-row overflow-visible relative z-40 rounded-2xl p-1.5 gap-1.5 bg-white/97"
    : "flex flex-col sm:flex-row overflow-visible relative rounded-2xl p-1.5 gap-1.5 bg-white/97 border border-black/6";

  const dropdownPositionClass = variant === "hero"
    ? "absolute left-1.5 right-1.5 top-full mt-2 bg-white rounded-2xl border border-gray-100 overflow-hidden text-left"
    : "absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-gray-100 overflow-hidden";

  return (
    <div ref={acRef} className="relative">
      <div
        className={wrapperClass}
        style={{ boxShadow: "var(--shadow-dropdown)" }}
      >
        {/* Campo de texto */}
        <div className="flex flex-1 items-center px-4 py-3 gap-3 rounded-xl bg-gray-50/80">
          <Search className="h-5 w-5 text-[#d97706] flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (value.length >= 2 && (acSponsored.length || acSuggestions.length)) setAcOpen(true);
            }}
            placeholder={placeholder}
            className="flex-1 text-base text-gray-700 placeholder:text-gray-400 outline-none bg-transparent font-medium"
            autoComplete="off"
          />
          {acLoading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin flex-shrink-0" />}
          {value && !acLoading && (
            <button
              type="button"
              onClick={() => { onChange(""); setAcOpen(false); }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtro de região (opcional) */}
        {showRegionFilter && onRegionChange && (
          <div className="relative flex-shrink-0">
            <Select value={region} onValueChange={onRegionChange}>
              <SelectTrigger className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap w-full sm:w-auto rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors h-full border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Selecione a Região" />
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-0 shadow-xl" style={{ boxShadow: "var(--shadow-dropdown)" }}>
                <SelectItem value="todas">Todas as regiões</SelectItem>
                {dynamicRegions.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <BrandButton
          onClick={() => { setAcOpen(false); onSearch(); }}
          size="lg"
          className="flex-shrink-0 gap-2 w-full sm:w-auto"
        >
          <Search className="h-4 w-4" />
          Buscar
        </BrandButton>
      </div>

      {/* Dropdown de autocomplete */}
      {acOpen && (acSponsored.length > 0 || acSuggestions.length > 0) && (
        <div
          className={dropdownPositionClass}
          style={{ boxShadow: "var(--shadow-dropdown)", zIndex: 50 }}
        >
          {acSponsored.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Patrocinados</span>
              </div>
              {acSponsored.map(item => {
                const Icon = getCategoryIcon(item.categorySlug);
                return (
                  <button
                    key={`sp-${item.id}`}
                    type="button"
                    onMouseDown={() => handleSponsoredClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 flex-1">{item.name}</span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Patrocinado
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {acSponsored.length > 0 && acSuggestions.length > 0 && (
            <div className="mx-4 border-t border-gray-100" />
          )}

          {acSuggestions.length > 0 && (
            <>
              {acSponsored.length > 0 && (
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sugestões</span>
                </div>
              )}
              {acSuggestions.map(item => {
                const Icon = getCategoryIcon(item.categorySlug);
                return (
                  <button
                    key={`sg-${item.id}`}
                    type="button"
                    onMouseDown={() => handleSuggestionClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                    <Icon className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </>
          )}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
