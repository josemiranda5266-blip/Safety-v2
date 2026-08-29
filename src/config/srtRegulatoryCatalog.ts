export type RegulatoryStatus = 'active_reference' | 'requires_review';

export interface SrtRegulatoryReference {
  id: string;
  authority: 'SRT';
  resolution: string;
  year: number;
  title: string;
  protocolType: string;
  status: RegulatoryStatus;
  sourceUrl: string;
  notes?: string;
}

/**
 * Canonical references used by document templates.
 * This catalog identifies the governing reference; it intentionally does not
 * hard-code occupational exposure limits or other legal thresholds here.
 */
export const SRT_REGULATORY_CATALOG: readonly SrtRegulatoryReference[] = [
  { id: 'srt-84-2012', authority: 'SRT', resolution: '84/2012', year: 2012, title: 'Protocolo para la Medición de la Iluminación en el Ambiente Laboral', protocolType: 'lighting', status: 'active_reference', sourceUrl: 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos/iluminacion' },
  { id: 'srt-85-2012', authority: 'SRT', resolution: '85/2012', year: 2012, title: 'Protocolo para la Medición del nivel de Ruido en el Ambiente Laboral', protocolType: 'noise', status: 'active_reference', sourceUrl: 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos/medicion-del-nivel-de-ruido-en-el-ambiente-laboral' },
  { id: 'srt-861-2015', authority: 'SRT', resolution: '861/2015', year: 2015, title: 'Protocolo para Medición de Contaminantes Químicos en el Aire de un Ambiente de Trabajo', protocolType: 'chemical', status: 'active_reference', sourceUrl: 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos/medicion-de-contaminantes-quimicos', notes: 'La SRT informa además la rectificación de datos mediante Res. 739/2017.' },
  { id: 'srt-886-2015', authority: 'SRT', resolution: '886/2015', year: 2015, title: 'Protocolo de Ergonomía', protocolType: 'ergonomics', status: 'active_reference', sourceUrl: 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos' },
  { id: 'srt-900-2015', authority: 'SRT', resolution: '900/2015', year: 2015, title: 'Protocolo para la Medición del valor de puesta a tierra y la verificación de la continuidad de las masas en el Ambiente Laboral', protocolType: 'grounding', status: 'active_reference', sourceUrl: 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos/medicion-valor-puesta-a-tierra' },
  { id: 'srt-30-2023', authority: 'SRT', resolution: '30/2023', year: 2023, title: 'Especificaciones técnicas sobre carga térmica - estrés por calor', protocolType: 'thermal_stress', status: 'active_reference', sourceUrl: 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos' },
];

export function getSrtReference(protocolType: string): SrtRegulatoryReference | undefined {
  return SRT_REGULATORY_CATALOG.find((item) => item.protocolType === protocolType);
}
