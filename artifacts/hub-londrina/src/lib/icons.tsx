import type { SVGProps } from "react";
import { Building2, type LucideIcon } from "lucide-react";
import { imgSrc } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function IconRestaurantes({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M11 2a1 1 0 0 0-1 1v5.5A3.5 3.5 0 0 0 7.5 12v1H7a1 1 0 0 0 0 2h.5V21a1 1 0 0 0 2 0v-6H10a1 1 0 0 0 0-2h-.5V12a1.5 1.5 0 0 1 3 0v1H12a1 1 0 0 0 0 2h.5V21a1 1 0 0 0 2 0v-8.5A3.5 3.5 0 0 0 11 9V3a1 1 0 0 0-1-1zM17 2a1 1 0 0 0-1 1v8h-1a1 1 0 0 0 0 2h1v8a1 1 0 0 0 2 0V3a1 1 0 0 0-1-1z" />
    </svg>
  );
}

function IconSaloes({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M6.5 1.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zM4 8a2.5 2.5 0 0 0-2.5 2.5v1a1 1 0 0 0 1 1H4v8.5a1 1 0 0 0 2 0V12.5h1.5a1 1 0 0 0 1-1v-1A2.5 2.5 0 0 0 6 8H4zM15.707 3.293a1 1 0 0 0-1.414 0l-5 5a1 1 0 0 0 0 1.414l1 1a1 1 0 0 0 1.414 0L13 9.414l6.293 6.293a1 1 0 0 0 1.414-1.414l-3-3 1.586-1.586a1 1 0 0 0 0-1.414l-2.586-2.586zM14 14l-1.293 1.293a1 1 0 0 0 0 1.414l4 4a1 1 0 0 0 1.414-1.414L14 14z" />
    </svg>
  );
}

function IconAcademias({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M7.5 5.5A1.5 1.5 0 0 0 6 7v1H4.5A1.5 1.5 0 0 0 3 9.5v5A1.5 1.5 0 0 0 4.5 16H6v1a1.5 1.5 0 0 0 3 0V7a1.5 1.5 0 0 0-1.5-1.5zM16.5 5.5A1.5 1.5 0 0 0 15 7v10a1.5 1.5 0 0 0 3 0v-1h1.5A1.5 1.5 0 0 0 21 14.5v-5A1.5 1.5 0 0 0 19.5 8H18V7a1.5 1.5 0 0 0-1.5-1.5zM9 11.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
    </svg>
  );
}

function IconMercados({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M2.25 2a.75.75 0 0 0 0 1.5h1.31l2.11 8.873A2.25 2.25 0 0 0 7.62 14h9.76a2.25 2.25 0 0 0 2.179-1.686l1.14-4.786A1.5 1.5 0 0 0 19.24 5.5H5.85L5.38 3.5A1.5 1.5 0 0 0 3.91 2H2.25zM8.5 15.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM16.5 15.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
  );
}

function IconCafeterias({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M7 2a1 1 0 0 0-1 1c0 .88.26 1.58.57 2.14C6.85 5.7 7 6.15 7 6.5a1 1 0 0 0 2 0c0-.85-.27-1.58-.57-2.14C8.15 3.8 8 3.35 8 3a1 1 0 0 0-1-1zM11 2a1 1 0 0 0-1 1c0 .88.26 1.58.57 2.14.28.56.43 1.01.43 1.36a1 1 0 0 0 2 0c0-.85-.27-1.58-.57-2.14C12.15 3.8 12 3.35 12 3a1 1 0 0 0-1-1zM4 9a2 2 0 0 0-2 2v2a7 7 0 0 0 6 6.92V21h-.5a1 1 0 0 0 0 2h7a1 1 0 0 0 0-2H14v-1.08A7 7 0 0 0 20 13v-.5A1.5 1.5 0 0 0 18.5 11H17V9H4zm11 2h3.5v.5A5 5 0 0 1 15 16.9V11z" />
    </svg>
  );
}

function IconPetShops({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M8.35 3a2.35 2.35 0 1 0 0 4.7A2.35 2.35 0 0 0 8.35 3zM15.65 3a2.35 2.35 0 1 0 0 4.7 2.35 2.35 0 0 0 0-4.7zM3.5 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM20.5 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 9c-3.18 0-6 2.57-6 5.75 0 2.23 1.37 3.91 3.17 4.72.56.25 1.16.4 1.83.48V21a1 1 0 0 0 2 0v-1.05c.67-.08 1.27-.23 1.83-.48C16.63 18.66 18 17 18 14.75 18 11.57 15.18 9 12 9z" />
    </svg>
  );
}

function IconFarmacias({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 6a1 1 0 0 0-2 0v3H8a1 1 0 0 0 0 2h3v3a1 1 0 0 0 2 0v-3h3a1 1 0 0 0 0-2h-3V8z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

function IconServicos({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M4.34 15.66a7.01 7.01 0 0 0 9.9.1l.1-.1 5.3-5.3a7 7 0 0 0-9.9-9.9L6.6 3.6 9.5 6.5 8.08 7.92 5.18 5.02 3.76 6.44 6.66 9.34 5.24 10.76 2.34 7.86A7 7 0 0 0 4.34 15.66zm7.07-1.42a1 1 0 0 1-1.42-1.41l6-6a1 1 0 0 1 1.42 1.41l-6 6z" />
    </svg>
  );
}

function IconPadarias({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M18.06 3.5C16.26 2.1 13.74 2 12 2s-4.26.1-6.06 1.5C4.14 4.9 3 7.06 3 10c0 4.97 3.58 8.54 7.5 9.77V21a1 1 0 0 0 2 0v-1.23C16.42 18.54 20 14.97 20 10c0-2.94-1.14-5.1-1.94-6.5zM12 18c-3.31 0-7-2.91-7-8 0-2.33.73-4.02 1.56-5.06A8.52 8.52 0 0 1 12 4c2.02 0 4.11.42 5.44 1.06C18.27 6.09 19 7.72 19 10c0 5.09-3.69 8-7 8z" />
    </svg>
  );
}

function IconSaude({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z" />
    </svg>
  );
}

const customIconMap: Record<string, (props: IconProps) => JSX.Element> = {
  Utensils: IconRestaurantes,
  Scissors: IconSaloes,
  Dumbbell: IconAcademias,
  ShoppingCart: IconMercados,
  Coffee: IconCafeterias,
  Dog: IconPetShops,
  Pill: IconFarmacias,
  Wrench: IconServicos,
  Cake: IconPadarias,
  Heart: IconSaude,
};

export function getCategoryIcon(iconName: string): (props: IconProps) => JSX.Element {
  return customIconMap[iconName] ?? (({ className, ...props }: IconProps) => (
    <Building2 className={className} {...props} />
  ));
}

const CATEGORY_PHOTOS: Record<string, string> = {
  restaurantes: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=70",
  saloes: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=70",
  academias: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=70",
  mercados: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=70",
  cafeterias: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=70",
  servicos: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=70",
  educacao: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=70",
  farmacias: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=70",
  petshops: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=70",
  confeitarias: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=70",
};

export function getCategoryPhoto(category: { slug: string; photoUrl?: string | null }): string {
  if (category.photoUrl) return imgSrc(category.photoUrl);
  const key = Object.keys(CATEGORY_PHOTOS).find(
    (k) => category.slug.includes(k) || k.includes(category.slug)
  );
  return key ? CATEGORY_PHOTOS[key] : `https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=600&q=70`;
}

export function getCategoryColorClasses(hexColor: string): string {
  const colorMap: Record<string, string> = {
    "#E53E3E": "bg-red-100 text-red-600 border-red-200",
    "#D53F8C": "bg-pink-100 text-pink-600 border-pink-200",
    "#3182CE": "bg-blue-100 text-blue-600 border-blue-200",
    "#38A169": "bg-green-100 text-green-600 border-green-200",
    "#D69E2E": "bg-amber-100 text-amber-700 border-amber-200",
    "#DD6B20": "bg-orange-100 text-orange-600 border-orange-200",
    "#805AD5": "bg-purple-100 text-purple-600 border-purple-200",
    "#319795": "bg-teal-100 text-teal-600 border-teal-200",
    "#ECC94B": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "#FC8181": "bg-red-100 text-red-500 border-red-200",
  };
  return colorMap[hexColor] ?? "bg-gray-100 text-gray-600 border-gray-200";
}
