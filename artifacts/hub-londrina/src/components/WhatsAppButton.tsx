import { useState } from "react";
import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function WhatsAppButton({ phoneNumber, message, children, className = "", onClick }: WhatsAppButtonProps) {
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (!cleaned) return null;

  const normalized = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  const body = message
    ? encodeURIComponent(message)
    : encodeURIComponent("Olá! Vi seu negócio no Hub Londrina e tenho interesse!");
  const waUrl = `https://wa.me/${normalized}?text=${body}`;

  const [hovered, setHovered] = useState(false);

  const shadow = hovered ? "var(--shadow-whatsapp-hover)" : "var(--shadow-whatsapp)";

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden flex items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white ring-1 ring-inset ring-white/25 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 ${className}`}
      style={{
        background: "var(--gradient-whatsapp)",
        boxShadow: shadow,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-700 group-hover:translate-x-full"
      />
      <MessageCircle className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative" />
      <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
        {children || "WhatsApp"}
      </span>
    </a>
  );
}
