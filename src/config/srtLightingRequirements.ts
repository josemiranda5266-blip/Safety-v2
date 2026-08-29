import { getSrtReference } from './srtRegulatoryCatalog';

export type LightingRequirementSource = 'table_2' | 'table_1_visual_task';

export interface LightingRequirement {
  id: string;
  source: LightingRequirementSource;
  category: string;
  locationOrTask: string;
  requiredLux: number;
  maximumLux?: number;
  unit: 'lux';
  regulationKey: 'srt-84-2012';
  regulationVersion: '84/2012';
  legalSource: string;
  notes?: string;
}

const source = getSrtReference('lighting');
const legalSource = source?.sourceUrl ?? 'https://www.argentina.gob.ar/normativa/recurso/32030/dto351-1979-anexo4/htm';

/**
 * Structured requirements transcribed from Decreto 351/79, Anexo IV, Table 1/2.
 * This is intentionally a curated first tranche, not a claim of exhaustive coverage.
 * Unmatched cases must remain unresolved and require professional classification.
 */
export const SRT_LIGHTING_REQUIREMENTS: readonly LightingRequirement[] = [
  { id: 'table2-office-general', source: 'table_2', category: 'Oficinas', locationOrTask: 'trabajo general de oficinas', requiredLux: 500, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-office-special', source: 'table_2', category: 'Oficinas', locationOrTask: 'sistema de computacion de datos', requiredLux: 750, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-office-circulation', source: 'table_2', category: 'Oficinas', locationOrTask: 'circulacion', requiredLux: 200, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-office-conference', source: 'table_2', category: 'Oficinas', locationOrTask: 'sala de conferencias', requiredLux: 300, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-hotel-circulation', source: 'table_2', category: 'Hoteles', locationOrTask: 'pasillos palier ascensor', requiredLux: 100, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-hotel-hall', source: 'table_2', category: 'Hoteles', locationOrTask: 'hall de entrada', requiredLux: 300, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-hotel-stairs', source: 'table_2', category: 'Hoteles', locationOrTask: 'escalera', requiredLux: 100, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-garage-general', source: 'table_2', category: 'Garajes y Estaciones de Servicio', locationOrTask: 'iluminacion general', requiredLux: 100, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-garage-tire', source: 'table_2', category: 'Garajes y Estaciones de Servicio', locationOrTask: 'gomeria', requiredLux: 200, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-welding', source: 'table_2', category: 'Metales', locationOrTask: 'soldadura', requiredLux: 300, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-machines-general', source: 'table_2', category: 'Maquinas, herramientas y bancos de trabajo', locationOrTask: 'iluminacion general', requiredLux: 300, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-machines-delicate', source: 'table_2', category: 'Maquinas, herramientas y bancos de trabajo', locationOrTask: 'trabajos delicados en banco o maquina', requiredLux: 1000, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-paint-preparation', source: 'table_2', category: 'Pintura', locationOrTask: 'preparacion de los elementos', requiredLux: 400, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-paint-mixing', source: 'table_2', category: 'Pintura', locationOrTask: 'preparacion dosaje y mezcla de colores', requiredLux: 1000, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-safety-office-reading', source: 'table_2', category: 'Oficinas', locationOrTask: 'lectura escritura y archivo', requiredLux: 500, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-warehouse', source: 'table_2', category: 'Depositos', locationOrTask: 'depositos', requiredLux: 100, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-food-stock', source: 'table_2', category: 'Industrias Alimenticias', locationOrTask: 'deposito de piezas sueltas y productos terminados iluminacion general', requiredLux: 100, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-textile-light', source: 'table_2', category: 'Textil', locationOrTask: 'tejidos telas claras y medianas', requiredLux: 400, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-textile-dark', source: 'table_2', category: 'Textil', locationOrTask: 'tejidos telas oscuras', requiredLux: 700, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table2-inspection', source: 'table_2', category: 'Inspeccion', locationOrTask: 'inspeccion', requiredLux: 1000, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource },
  { id: 'table1-occasional', source: 'table_1_visual_task', category: 'Clase de tarea visual', locationOrTask: 'vision ocasional solamente', requiredLux: 100, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource, notes: 'Fallback de Tabla 1 cuando la tarea no está incluida en Tabla 2.' },
  { id: 'table1-intermittent', source: 'table_1_visual_task', category: 'Clase de tarea visual', locationOrTask: 'tareas intermitentes ordinarias y faciles', requiredLux: 100, maximumLux: 300, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource, notes: 'Rango normativo 100–300 lux; la selección profesional de la clase debe conservarse.' },
  { id: 'table1-moderate', source: 'table_1_visual_task', category: 'Clase de tarea visual', locationOrTask: 'tarea moderadamente critica y prolongada con detalles medianos', requiredLux: 300, maximumLux: 750, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource, notes: 'Rango normativo 300–750 lux; la selección profesional de la clase debe conservarse.' },
  { id: 'table1-severe', source: 'table_1_visual_task', category: 'Clase de tarea visual', locationOrTask: 'tareas severas y prolongadas y de poco contraste', requiredLux: 750, maximumLux: 1500, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource, notes: 'Rango normativo 750–1500 lux; la selección profesional de la clase debe conservarse.' },
  { id: 'table1-very-severe', source: 'table_1_visual_task', category: 'Clase de tarea visual', locationOrTask: 'tareas muy severas y prolongadas con detalles minuciosos', requiredLux: 1500, maximumLux: 3000, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource, notes: 'Rango normativo 1500–3000 lux; la selección profesional de la clase debe conservarse.' },
  { id: 'table1-exceptional', source: 'table_1_visual_task', category: 'Clase de tarea visual', locationOrTask: 'tareas excepcionales dificiles o importantes', requiredLux: 5000, maximumLux: 10000, unit: 'lux', regulationKey: 'srt-84-2012', regulationVersion: '84/2012', legalSource, notes: 'Rango normativo 5000–10000 lux; la selección profesional de la clase debe conservarse.' },
];

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface ResolveLightingRequirementInput {
  category?: string;
  task?: string;
  location?: string;
  professionalRequirementId?: string;
}

export function resolveLightingRequirement(input: ResolveLightingRequirementInput): LightingRequirement | undefined {
  if (input.professionalRequirementId) {
    const exact = SRT_LIGHTING_REQUIREMENTS.find((item) => item.id === input.professionalRequirementId);
    if (exact) return exact;
  }

  const category = normalize(input.category ?? '');
  const task = normalize(input.task ?? '');
  const location = normalize(input.location ?? '');
  const haystack = `${category} ${task} ${location}`.trim();
  if (!haystack) return undefined;

  const candidates = SRT_LIGHTING_REQUIREMENTS.filter((item) => {
    const itemCategory = normalize(item.category);
    const itemTask = normalize(item.locationOrTask);
    return haystack.includes(itemTask) || (category && itemCategory === category && task && itemTask.includes(task));
  });

  return candidates.length === 1 ? candidates[0] : undefined;
}
