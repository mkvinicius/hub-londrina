// Chaves determinísticas para pg_advisory_xact_lock — sem hashing de string.
// Layout int32: [ ns: 8 bits ][ slot: 24 bits ]. Ns separa namespaces para
// evitar colisão entre contextos (categoria/zona/home_search).

const ZONE_INDEX: Record<string, number> = {
  centro: 0,
  norte: 1,
  sul: 2,
  leste: 3,
  oeste: 4,
};

function pack(ns: number, slot: number): number {
  // Mantém positivo: limita ns a 0..127 e slot a 0..0xFFFFFF.
  const n = ns & 0x7f;
  const s = slot & 0xffffff;
  return (n << 24) | s;
}

export function categoryLockKey(position: number): number {
  return pack(1, position);
}

export function zoneLockKey(zone: string): number {
  const idx = ZONE_INDEX[zone];
  if (idx === undefined) {
    // Zona desconhecida — usa slot dedicado (0xFFFFFF) para isolamento.
    return pack(2, 0xffffff);
  }
  return pack(2, idx);
}

export function homeSearchLockKey(): number {
  return pack(3, 0);
}

// R11 — Vitrine de Produtos: 4 slots fixos globais (não por zona/categoria).
// Slot 0 reservado para alocação de slots; slot 1..N pode ser usado para
// outros locks no mesmo namespace se necessário no futuro.
export function vitrineSlotLockKey(): number {
  return pack(4, 0);
}
