
export const COLORS = {
  NAVY: '#001f3f',
  MUSTARD: '#b8860b',
  NAVY_LIGHT: '#003366',
  WHITE: '#ffffff'
};

// URL del Logo Corporativo WM / M&S - Enlace directo compatible
export const LOGO_URL = '/logo.png'; 

export const GUATEMALA_UNITS = [
  'Quetzal', 'm3', 'm2', 'ml', 'saco', 'libra', 'varilla', 'quintal', 'unidad', 'global', 'pie tabla', 'litro', 'viaje', 'hora'
];

export const CATEGORIES_EXPENSE = [
  'Materiales', 'Planilla', 'Equipo/Herramienta', 'Sub-contrato', 'Administrativo', 'Personales'
];

export const CATEGORIES_INCOME = [
  'Aporte (Cliente)', 'Agrimensura', 'Avaluó', 'Planificación', 'Ante Proyecto', 'Otros'
];

export const POSITIONS = [
  { title: 'Ingeniero Residente', pay: 12000, type: 'Mensual' },
  { title: 'Arquitecto Diseñador', pay: 10000, type: 'Mensual' },
  { title: 'Supervisor de Obra', pay: 8000, type: 'Mensual' },
  { title: 'Maestro de Obras', pay: 6500, type: 'Mensual' },
  { title: 'Albañil de Primera', pay: 4500, type: 'Mensual' },
  { title: 'Ayudante', pay: 3200, type: 'Mensual' },
  { title: 'Peón / Estudiante', pay: 2800, type: 'Mensual' },
  { title: 'Operador de Maquinaria', pay: 5500, type: 'Mensual' }
];

export const TIPOLOGIAS = ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'CIVIL', 'PUBLICA'];

export const CUBIERTAS = [
  'Losa Solida', 'Losa Prefabricada', 'Estructura Metálica', 'Pérgola de Madera', 'Pérgola de Metal', 'Otros'
];

export const TYPOLOGY_BUDGETS: Record<string, { name: string; unit: string; cat: string; price: number }[]> = {
  'RESIDENCIAL': [
    { name: 'Limpieza y Chapeo', unit: 'm2', cat: 'Preliminares', price: 15 },
    { name: 'Trazo y Estaqueo', unit: 'm2', cat: 'Preliminares', price: 25 },
    { name: 'Excavación Cimiento Corrido', unit: 'm3', cat: 'Cimentación', price: 85 },
    { name: 'Cimiento Corrido 0.40x0.20', unit: 'ml', cat: 'Cimentación', price: 350 },
    { name: 'Solera de Humedad', unit: 'ml', cat: 'Cimentación', price: 210 },
    { name: 'Levantado de Block 0.14 Poma', unit: 'm2', cat: 'Muros', price: 145 },
    { name: 'Losa Prefabricada', unit: 'm2', cat: 'Cubierta', price: 380 },
    { name: 'Piso Cerámico Nacional', unit: 'm2', cat: 'Acabados', price: 175 }
  ],
  'COMERCIAL': [
    { name: 'Demolición de Estructuras', unit: 'm3', cat: 'Demolición', price: 120 },
    { name: 'Columnas de Acero Estructural', unit: 'lb', cat: 'Estructura', price: 12 },
    { name: 'Losa de Entrepiso (Steel Deck)', unit: 'm2', cat: 'Entrepiso', price: 550 },
    { name: 'Fachada Vidrio Templado', unit: 'm2', cat: 'Fachada', price: 1400 }
  ],
  'INDUSTRIAL': [
    { name: 'Pavimento Concreto 4000 PSI', unit: 'm2', cat: 'Pisos', price: 450 },
    { name: 'Estructura Nave Industrial', unit: 'kg', cat: 'Estructura', price: 25 },
    { name: 'Lámina Aluzinc Prepintada', unit: 'm2', cat: 'Cubierta', price: 145 }
  ],
  'CIVIL': [
    { name: 'Base Granular Triturada', unit: 'm3', cat: 'Mov. Tierras', price: 280 },
    { name: 'Asfalto Caliente 3"', unit: 'm2', cat: 'Pavimento', price: 195 },
    { name: 'Bordillo de Concreto', unit: 'ml', cat: 'Drenaje', price: 145 }
  ],
  'PUBLICA': [
    { name: 'Cimentación Edificios Públicos', unit: 'm3', cat: 'Cimentación', price: 3200 },
    { name: 'Baterías de Baños Institucionales', unit: 'global', cat: 'Instalaciones', price: 45000 }
  ]
};

export const INDIRECT_COSTS_PERCENT = 0.15;
export const UTILITY_PERCENT = 0.10;
export const TAX_PERCENT = 0.12;
