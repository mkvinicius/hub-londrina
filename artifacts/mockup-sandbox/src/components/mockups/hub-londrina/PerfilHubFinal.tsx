import {
  Heart, Clock, Check, X, AlertTriangle, MessageCircle, MapPin, Star,
  Phone, Instagram, Navigation, ShoppingBag, Info, ImageIcon, MessageSquare, ChevronRight,
} from "lucide-react";

const PHOTOS = [
  "/__mockup/images/biz-coffee.png",
  "/__mockup/images/biz-coffee-detail.png",
  "/__mockup/images/biz-restaurant.png",
  "/__mockup/images/biz-salon.png",
  "/__mockup/images/biz-grocery.png",
  "/__mockup/images/biz-gym.png",
];

const PRODUTOS = [
  { nome: "Cappuccino Especial", preco: "R$ 14,90", img: "/__mockup/images/biz-coffee-detail.png" },
  { nome: "Bolo de Cenoura", preco: "R$ 9,90", img: "/__mockup/images/biz-coffee.png" },
  { nome: "Sanduíche Natural", preco: "R$ 18,00", img: "/__mockup/images/biz-restaurant.png" },
];

export function PerfilHubFinal() {
  const dias = [
    { l: "D", on: false },
    { l: "S", on: false },
    { l: "T", on: true },
    { l: "Q", on: true },
    { l: "Q", on: true },
    { l: "S", on: true },
    { l: "S", on: true },
  ];
  const tabs = [
    { id: "fotos", label: "Fotos", Icon: ImageIcon, active: false },
    { id: "vitrine", label: "Vitrine", Icon: ShoppingBag, active: true },
    { id: "sobre", label: "Sobre", Icon: Info, active: false },
    { id: "aval", label: "Avaliações", Icon: MessageSquare, active: false },
    { id: "info", label: "Informações", Icon: MapPin, active: false },
  ];

  return (
    <div className="min-h-screen bg-[#FBF7F2] flex justify-center font-['Inter']">
      <div className="w-full max-w-[420px] bg-white shadow-xl flex flex-col relative">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#6F4E37] to-[#3a2512] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <button className="text-white/80 text-lg w-8 h-8 flex items-center justify-center">‹</button>
          <span className="font-['Playfair_Display'] font-bold text-[16px]">Café Londrinense</span>
          <button className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/90">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* BANNER + LOGO */}
        <div className="relative">
          <div className="aspect-[16/10]">
            <img src="/__mockup/images/biz-coffee.png" alt="Café" className="w-full h-full object-cover" />
          </div>
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-black shadow-sm">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> 4.8
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

        {/* IDENT + PILLS */}
        <div className="pt-16 px-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-3 flex-wrap">
            <span className="text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Cafeteria</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#FF9800]" /> Centro</span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="w-3 h-3" /> Verificado</span>
          </div>

          {/* OFERTA */}
          <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FFE9C2] border border-[#FFD479] rounded-2xl p-4 mb-4 relative">
            <span className="absolute top-2 right-3 text-[10px] font-bold text-[#9a6b00] tracking-widest">OFERTA</span>
            <p className="text-[15px] text-[#3a2512] leading-snug">
              Na compra de <strong className="font-extrabold">um cappuccino especial</strong> ganhe outro igual
            </p>
          </div>

          {/* CTAs principais */}
          <div className="flex items-center gap-2.5 mb-4">
            <a className="flex-1 bg-[#4CAF50] hover:bg-[#3d8c40] text-white font-bold rounded-2xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a className="bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] to-[#d62976] text-white font-bold rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
              <Instagram className="w-4 h-4" />
            </a>
            <a className="bg-white border-2 border-[#3a2512] text-[#3a2512] font-bold rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* TABS sticky */}
        <div className="sticky top-[52px] z-20 bg-white border-y border-gray-200">
          <div className="flex overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`flex-shrink-0 px-4 py-3 text-[13px] font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                  t.active
                    ? "text-[#6F4E37] border-[#FF9800]"
                    : "text-gray-400 border-transparent hover:text-gray-700"
                }`}
              >
                <t.Icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* VITRINE (aba ativa) */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-['Playfair_Display'] font-bold text-[17px] text-[#3a2512]">Vitrine</h4>
            <button className="text-xs font-semibold text-[#FF9800] flex items-center">Ver tudo <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {PRODUTOS.map((p) => (
              <div key={p.nome} className="rounded-xl overflow-hidden border border-gray-100 bg-white">
                <div className="aspect-square">
                  <img src={p.img} alt={p.nome} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-semibold text-[#3a2512] leading-tight line-clamp-2">{p.nome}</p>
                  <p className="text-[12px] font-black text-[#4CAF50] mt-1">{p.preco}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* FOTOS / INSTAGRAM */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-['Playfair_Display'] font-bold text-[17px] text-[#3a2512] flex items-center gap-2">
              <Instagram className="w-5 h-5 text-[#d62976]" /> Fotos do Instagram
            </h4>
            <span className="text-[10px] font-bold text-[#d62976] bg-pink-50 px-2 py-0.5 rounded-full">@cafelondrinense</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {PHOTOS.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-md relative">
                <img src={src} alt="" className="w-full h-full object-cover" />
                {i === 5 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-bold text-sm">
                    +12
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* SOBRE */}
        <div className="px-5 py-5">
          <h4 className="font-['Playfair_Display'] font-bold text-[17px] text-[#3a2512] mb-2">Sobre</h4>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            Cafeteria especial no coração de Londrina. Grãos selecionados da região,
            ambiente acolhedor para trabalhar ou bater papo, doces artesanais frescos
            todos os dias e opções veganas.
          </p>
        </div>

        <div className="border-t border-gray-100" />

        {/* HORÁRIO */}
        <div className="px-5 py-5">
          <h4 className="font-['Playfair_Display'] font-bold text-[17px] text-[#3a2512] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF9800]" /> Horário de funcionamento
          </h4>
          <div className="flex items-center gap-2 text-gray-700 text-sm font-medium mb-3">
            <span className="bg-[#FBF7F2] px-3 py-1.5 rounded-lg font-bold text-[#3a2512]">07:00</span>
            <span className="text-gray-400">→</span>
            <span className="bg-[#FBF7F2] px-3 py-1.5 rounded-lg font-bold text-[#3a2512]">21:00</span>
            <span className="ml-auto text-[11px] text-emerald-700 font-bold">Aberto agora</span>
          </div>
          <div className="flex items-center gap-1.5">
            {dias.map((d, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  d.on ? "bg-[#4CAF50] text-white border-[#4CAF50]" : "bg-white text-gray-300 border-gray-200"
                }`}
              >
                {d.l}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* INFORMAÇÕES + MAPA */}
        <div className="px-5 py-5">
          <h4 className="font-['Playfair_Display'] font-bold text-[17px] text-[#3a2512] mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#FF9800]" /> Informações de contato
          </h4>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-[#FF9800]/10 p-2 rounded-lg"><MapPin className="w-4 h-4 text-[#FF9800]" /></div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Endereço</p>
                <p className="text-[13px] text-[#3a2512] font-medium">Rua Sergipe, 1430 — Centro<br />Londrina/PR · 86010-440</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#4CAF50]/10 p-2 rounded-lg"><Phone className="w-4 h-4 text-[#4CAF50]" /></div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Telefone</p>
                <p className="text-[13px] text-[#3a2512] font-medium">(43) 3324-5678</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-pink-50 p-2 rounded-lg"><Instagram className="w-4 h-4 text-[#d62976]" /></div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Instagram</p>
                <p className="text-[13px] text-[#3a2512] font-medium">@cafelondrinense</p>
              </div>
            </div>
          </div>

          {/* MAPA */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 relative mb-3 bg-[#e8efe2]">
            <div className="aspect-[16/10] relative">
              {/* mapa estilizado fake — em prod vira <iframe src="google.com/maps/embed..." /> */}
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(rgba(180,200,170,.4) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(180,200,170,.4) 1px, transparent 1px),
                  linear-gradient(rgba(110,140,100,.5) 2px, transparent 2px),
                  linear-gradient(90deg, rgba(110,140,100,.5) 2px, transparent 2px)`,
                backgroundSize: "20px 20px, 20px 20px, 100px 100px, 100px 100px",
              }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[#FF9800] border-[3px] border-white shadow-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="mt-1 bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-[#3a2512] shadow">
                  Café Londrinense
                </div>
              </div>
            </div>
          </div>

          <button className="w-full bg-white border-2 border-[#FF9800] text-[#FF9800] hover:bg-[#FF9800] hover:text-white font-bold rounded-2xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            <Navigation className="w-4 h-4" /> Como chegar
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* REGRAS */}
        <div className="px-5 py-4 flex gap-3">
          <div className="bg-[#FF9800]/10 p-2.5 rounded-xl flex items-start h-fit">
            <AlertTriangle className="w-5 h-5 text-[#FF9800]" />
          </div>
          <div className="flex-1">
            <h5 className="font-['Playfair_Display'] font-bold text-[15px] text-[#3a2512] mb-1">Regras do estabelecimento</h5>
            <p className="text-[13px] text-gray-600 leading-snug">Voucher exclusivo para consumo no local. Não cumulativo com outras promoções.</p>
          </div>
        </div>

        {/* TAGS */}
        <div className="px-5 pt-2 pb-6 flex flex-wrap gap-2">
          {["Consumo no local", "Wi-Fi gratuito", "Opções veganas", "Pet friendly", "Aceita cartão"].map((tag) => (
            <span key={tag} className="text-[12px] text-[#3a2512] font-medium px-3 py-1.5 rounded-full bg-[#FBF7F2] border border-[#E8DCC8]">
              {tag}
            </span>
          ))}
        </div>

        {/* CTA fixo bottom (sticky) */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 px-5 py-3 flex gap-2 z-30">
          <a className="flex-1 bg-[#4CAF50] hover:bg-[#3d8c40] text-white font-bold rounded-2xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            <MessageCircle className="w-4 h-4" /> Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

const _hide = `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`;
if (typeof document !== "undefined" && !document.getElementById("no-scrollbar-style")) {
  const s = document.createElement("style");
  s.id = "no-scrollbar-style";
  s.innerHTML = _hide;
  document.head.appendChild(s);
}
