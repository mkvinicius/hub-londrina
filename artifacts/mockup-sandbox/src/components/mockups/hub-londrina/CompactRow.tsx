import { Heart, MapPin, Star, MessageCircle, Crown } from "lucide-react";

export function CompactRow() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-8">
      <div className="w-full max-w-[640px]">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex relative">
          <div className="w-[38%] relative flex-shrink-0">
            <img
              src="/__mockup/images/biz-coffee.png"
              alt="Café Londrinense"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute left-[38%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center border-[3px] border-white">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6F4E37] to-[#3a2512] flex flex-col items-center justify-center text-white">
                <span className="font-['Playfair_Display'] text-[10px] font-bold leading-none">Café</span>
                <span className="text-[5px] font-semibold tracking-widest mt-0.5 opacity-80">LONDRINENSE</span>
              </div>
            </div>
          </div>

          <div className="flex-1 pl-12 pr-4 py-4 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="text-[17px] font-black text-[#1a1a1a] tracking-tight leading-tight">
                Café Londrinense
              </h3>
              <button className="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors flex-shrink-0">
                <Heart className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="inline-block text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Cafeteria
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5" /> Premium
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3a2512] bg-amber-50 px-1.5 py-0.5 rounded-full ml-auto">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                4.8
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-snug line-clamp-2 mb-2">
              Cafés especiais da região, ambiente acolhedor e doces artesanais frescos todos os dias.
            </p>

            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mb-3">
              <MapPin className="w-3 h-3 text-amber-600" />
              Centro · 1,2 km de você
            </div>

            <button className="mt-auto w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white font-bold rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
