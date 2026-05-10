import { Heart, Clock, Check, X, AlertTriangle, MessageCircle, MapPin, Star } from "lucide-react";

export function PerfilHubModern() {
  const dias = [
    { l: "D", on: false },
    { l: "S", on: false },
    { l: "T", on: true },
    { l: "Q", on: true },
    { l: "Q", on: true },
    { l: "S", on: true },
    { l: "S", on: true },
  ];

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex justify-center font-['Inter']">
      <div className="w-full max-w-[420px] bg-white shadow-xl flex flex-col relative">
        <div className="bg-gradient-to-r from-[#6F4E37] to-[#3a2512] text-white px-4 py-3.5 flex items-center justify-between">
          <button className="text-white/80 text-lg">‹</button>
          <span className="font-['Playfair_Display'] font-bold text-[16px]">Café Londrinense</span>
          <button className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/90">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <div className="aspect-[16/10]">
            <img src="/__mockup/images/biz-coffee.png" alt="Café" className="w-full h-full object-cover" />
          </div>
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-black shadow-sm">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            4.8
          </div>
          <div className="absolute -bottom-12 left-5 z-10">
            <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center border-[3px] border-white">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6F4E37] to-[#3a2512] flex flex-col items-center justify-center text-white">
                <span className="font-['Playfair_Display'] text-[15px] font-bold leading-none">Café</span>
                <span className="text-[8px] font-semibold tracking-widest mt-0.5 opacity-80">LONDRINENSE</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 right-5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-100 shadow-sm">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Premium
            </span>
          </div>
        </div>

        <div className="pt-16 px-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-3">
            <span className="inline-block text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Cafeteria
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#FF9800]" />
              Centro
            </span>
          </div>

          <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FFE9C2] border border-[#FFD479] rounded-2xl p-4 mb-4 relative overflow-hidden">
            <span className="absolute top-2 right-3 text-[10px] font-bold text-[#9a6b00] tracking-widest">OFERTA</span>
            <p className="text-[15px] text-[#3a2512] leading-snug">
              Na compra de <strong className="font-extrabold">um cappuccino especial</strong> ganhe outro igual
            </p>
          </div>

          <div className="flex items-center gap-2.5 mb-5">
            <button className="flex-1 bg-[#4CAF50] hover:bg-[#3d8c40] text-white font-bold rounded-2xl py-3 text-sm tracking-wide transition-colors flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button className="bg-white border-2 border-[#FF9800] text-[#FF9800] hover:bg-[#FF9800] hover:text-white font-bold rounded-2xl px-4 py-3 text-sm transition-colors">
              Validar
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        <div className="px-5 py-4">
          <h4 className="font-['Playfair_Display'] font-bold text-[15px] text-[#3a2512] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF9800]" /> Horário de funcionamento
          </h4>
          <div className="flex items-center gap-2 text-gray-700 text-sm font-medium mb-3">
            <span className="bg-[#FBF7F2] px-3 py-1.5 rounded-lg font-bold text-[#3a2512]">07:00</span>
            <span className="text-gray-400">→</span>
            <span className="bg-[#FBF7F2] px-3 py-1.5 rounded-lg font-bold text-[#3a2512]">21:00</span>
          </div>
          <div className="flex items-center gap-1.5">
            {dias.map((d, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  d.on
                    ? "bg-[#4CAF50] text-white border-[#4CAF50]"
                    : "bg-white text-gray-300 border-gray-200"
                }`}
              >
                {d.l}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-3 text-[13px]">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
              <Check className="w-4 h-4" /> Feriados
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700 font-semibold">
              <X className="w-4 h-4" /> Datas comemorativas
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        <div className="px-5 py-4 flex gap-3">
          <div className="bg-[#FF9800]/10 p-2.5 rounded-xl flex items-start h-fit">
            <AlertTriangle className="w-5 h-5 text-[#FF9800]" />
          </div>
          <div className="flex-1">
            <h5 className="font-['Playfair_Display'] font-bold text-[15px] text-[#3a2512] mb-1">Regras do estabelecimento</h5>
            <p className="text-[13px] text-gray-600 leading-snug">Voucher exclusivo para consumo no local. Não cumulativo com outras promoções.</p>
          </div>
        </div>

        <div className="px-5 pt-2 pb-6 flex flex-wrap gap-2">
          {["Consumo no local", "Wi-Fi gratuito", "Opções veganas", "Pet friendly"].map((tag) => (
            <span key={tag} className="text-[12px] text-[#3a2512] font-medium px-3 py-1.5 rounded-full bg-[#FBF7F2] border border-[#E8DCC8]">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
