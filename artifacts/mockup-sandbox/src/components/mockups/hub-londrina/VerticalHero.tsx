import { Heart, MapPin, Star, MessageCircle, Crown } from "lucide-react";

export function VerticalHero() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-8">
      <div className="w-full max-w-[380px]">
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden relative">
          <div className="relative aspect-[16/10]">
            <img
              src="/__mockup/images/biz-coffee.png"
              alt="Café Londrinense"
              className="w-full h-full object-cover"
            />
            <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors shadow-sm">
              <Heart className="w-4 h-4" />
            </button>
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-black shadow-sm">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              4.8
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
              <div className="w-[88px] h-[88px] rounded-full bg-white shadow-md flex items-center justify-center border-[3px] border-white">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6F4E37] to-[#3a2512] flex flex-col items-center justify-center text-white">
                  <span className="font-['Playfair_Display'] text-[14px] font-bold leading-none">Café</span>
                  <span className="text-[7px] font-semibold tracking-widest mt-0.5 opacity-80">LONDRINENSE</span>
                </div>
              </div>
            </div>

            <div className="pt-14 px-6 pb-6 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="inline-block text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Cafeteria
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Crown className="w-2.5 h-2.5" /> Premium
                </span>
              </div>

              <h3 className="text-xl font-black text-[#1a1a1a] tracking-tight">
                Café Londrinense
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-snug">
                Cafés especiais da região, ambiente acolhedor e doces artesanais.
              </p>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Centro
              </div>

              <button className="mt-4 w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
