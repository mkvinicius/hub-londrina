import { Heart, Moon, Check, X, AlertTriangle, Home, Ticket, Compass } from "lucide-react";

export function PerfilTourClassic() {
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
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[420px] bg-white shadow-xl flex flex-col relative">
        <div className="bg-[#1f3a8a] text-white text-center py-3.5 font-bold text-[15px]">
          Café Londrinense
        </div>

        <div className="relative">
          <div className="aspect-[16/10]">
            <img src="/__mockup/images/biz-coffee.png" alt="Café" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-12 left-5 z-10">
            <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center border-[3px] border-white">
              <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
                <span className="font-['Playfair_Display'] text-[15px] font-bold leading-none text-[#3a2512]">Café</span>
                <span className="text-[8px] font-semibold tracking-widest mt-0.5 text-[#3a2512]/70">LONDRINENSE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-6 px-6 text-center">
          <p className="text-[15px] text-gray-800 leading-snug">
            Na compra de <strong className="font-extrabold">um cappuccino especial</strong>
            <br />
            ganhe outro igual
          </p>
        </div>

        <div className="px-5 pb-5 flex items-center gap-3">
          <button className="flex-1 bg-[#1f3a8a] hover:bg-[#1e3578] text-white font-bold rounded-full py-3.5 text-sm tracking-wide transition-colors">
            VALIDAR EXPERIÊNCIA
          </button>
          <button className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors flex-shrink-0">
            <Heart className="w-5 h-5" />
          </button>
        </div>

        <div className="border-t border-gray-200" />

        <div className="px-5 py-5 text-center">
          <h4 className="font-bold text-[13px] text-[#1a1a1a] tracking-wide mb-3">DIAS E HORÁRIOS DE UTILIZAÇÃO</h4>
          <div className="flex items-center justify-center gap-2 text-gray-700 text-sm font-medium mb-3">
            <Moon className="w-4 h-4" /> 07:00
            <span className="text-gray-400">-</span>
            <Moon className="w-4 h-4" /> 21:00
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {dias.map((d, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  d.on
                    ? "bg-[#15803d] text-white border-[#15803d]"
                    : "bg-white text-gray-400 border-gray-300"
                }`}
              >
                {d.l}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-5 mt-4 text-[13px]">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
              <Check className="w-4 h-4" /> Feriados
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700 font-semibold">
              <X className="w-4 h-4" /> Datas comemorativas
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        <div className="px-5 py-4 flex gap-3">
          <div className="bg-[#1f3a8a]/10 p-2.5 rounded-md flex items-start">
            <AlertTriangle className="w-5 h-5 text-[#1f3a8a]" />
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-[13px] text-[#1f3a8a] tracking-wide mb-1">REGRAS DO ESTABELECIMENTO</h5>
            <p className="text-[13px] text-gray-600">Voucher exclusivo para consumo no local.</p>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-wrap gap-2 justify-center">
          {["Consumo no local", "Wi-Fi gratuito", "Opções veganas"].map((tag) => (
            <span key={tag} className="text-[12px] text-gray-600 px-3 py-1.5 rounded-full border border-gray-300">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto border-t border-gray-200 bg-gray-50 px-2 py-2 grid grid-cols-3 gap-1">
          {[
            { Icon: Home, label: "Home", active: false },
            { Icon: Ticket, label: "Vouchers", active: true },
            { Icon: Compass, label: "Meu Tour", active: false },
          ].map(({ Icon, label, active }) => (
            <button
              key={label}
              className={`flex flex-col items-center gap-1 py-1.5 ${active ? "text-[#1f3a8a]" : "text-gray-400"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
