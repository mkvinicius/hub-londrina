export const zoneConfig = {
  norte: {
    label: 'Zona Norte',
    color: '#3d7a28',
    bgColor: '#f0fdf4',
    textColor: '#14532d',
    description: 'Negócios da Zona Norte de Londrina',
    slug: 'norte',
  },
  sul: {
    label: 'Zona Sul',
    color: '#2563eb',
    bgColor: '#eff6ff',
    textColor: '#1e3a8a',
    description: 'Negócios da Zona Sul de Londrina',
    slug: 'sul',
  },
  leste: {
    label: 'Zona Leste',
    color: '#d97706',
    bgColor: '#fffbeb',
    textColor: '#92400e',
    description: 'Negócios da Zona Leste de Londrina',
    slug: 'leste',
  },
  oeste: {
    label: 'Zona Oeste',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    textColor: '#4c1d95',
    description: 'Negócios da Zona Oeste de Londrina',
    slug: 'oeste',
  },
  centro: {
    label: 'Centro',
    color: '#dc2626',
    bgColor: '#fef2f2',
    textColor: '#7f1d1d',
    description: 'Negócios do Centro de Londrina',
    slug: 'centro',
  },
} as const;

export type ZoneSlug = keyof typeof zoneConfig;
