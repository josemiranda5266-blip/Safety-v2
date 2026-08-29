import type { HygieneDocumentTemplate } from '../types/hygieneDocument';

export const LIGHTING_DOCUMENT_TEMPLATE: HygieneDocumentTemplate = {
  key: 'lighting_protocol',
  version: '1.0.0',
  title: 'Protocolo de Iluminación',
  sectionKeys: [
    'identification', 'context', 'technical', 'measurement_points',
    'indicators', 'instruments', 'normative', 'professional_review', 'traceability',
  ],
};

export const HYGIENE_DOCUMENT_TEMPLATES = {
  lighting_protocol: LIGHTING_DOCUMENT_TEMPLATE,
} as const;
