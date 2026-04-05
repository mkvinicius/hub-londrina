import {
  Utensils, Scissors, Dumbbell, ShoppingCart, Coffee, Wrench,
  GraduationCap, Pill, Dog, Heart, Cake, MapPin, Star,
  Building2, type LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingCart,
  Coffee,
  Wrench,
  GraduationCap,
  Pill,
  Dog,
  Heart,
  Cake,
  MapPin,
  Star,
  Building2,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return iconMap[iconName] ?? Building2;
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
