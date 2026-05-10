import { Heart, MapPin, Star, MessageCircle } from "lucide-react";

export function TourClassic() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-8">
      <div className="w-full max-w-[640px]">
        <h2 className="text-[26px] font-black text-[#1a1a1a] tracking-tight mb-3 px-1 flex items-center justify-between">
          <span>Café Londrinense</span>
          <button className="w-9 h-9 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </h2>

        <div className="bg-white rounded-3xl shadow-sm overflow-hidden flex relative">
          <div className="w-[45%] aspect-[4/5] relative flex-shrink-0">
            <img
              src="/__mockup/images/biz-coffee.png"
              alt="Café Londrinense"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-black shadow-sm">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              4.8
            </div>
          </div>

          <div className="absolute left-[45%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center border-[3px] border-white">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6F4E37] to-[#3a2512] flex flex-col items-center justify-center text-white">
                <span className="font-['Playfair_Display'] text-[15px] font-bold leading-none">Café</span>
                <span className="text-[8px] font-semibold tracking-widest mt-0.5 opacity-80">LONDRINENSE</span>
              </div>
            </div>
          </div>

          <div className="flex-1 pl-16 pr-6 py-6 flex flex-col justify-center">
            <p className="text-[15px] text-gray-800 leading-snug">
              Na compra de <strong className="font-extrabold">um cappuccino especial</strong> ganhe outro igual
            </p>

            <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Centro
              </span>
              <span className="text-gray-300">·</span>
              <span className="font-semibold text-emerald-700">Cafeteria</span>
            </div>

            <button className="mt-4 w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm transition-colors">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
