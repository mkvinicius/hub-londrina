import { useLocation } from "wouter";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="w-20 h-20 bg-[#d97706]/10 rounded-full flex items-center justify-center mb-6">
          <MapPin className="h-10 w-10 text-[#d97706]" />
        </div>
        <h1 className="font-black text-5xl text-[#3a2512] mb-3">404</h1>
        <h2 className="font-black text-2xl text-[#3a2512] mb-3">Página não encontrada</h2>
        <p className="text-gray-500 text-base max-w-md mb-8 leading-relaxed">
          A página que você está procurando não existe ou foi removida. Que tal buscar negócios em Londrina?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/")}
            className="bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl px-6 font-bold shadow-none"
          >
            Ir para o Início
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/busca")}
            className="border-gray-200 text-[#3a2512] hover:bg-gray-50 rounded-xl px-6 font-bold shadow-none flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Buscar Negócios
          </Button>
        </div>
      </div>
    </Layout>
  );
}
