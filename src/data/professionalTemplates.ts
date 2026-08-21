import { InspectionStatus } from '../types/safety';

export interface ProfessionalTemplateItem {
  id: string;
  code: string;
  aspect: string;
  normativeRef: string;
  guidance: string;
  defaultStatus?: InspectionStatus;
}

export interface ProfessionalTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  normativeBasis: string;
  icon: string;
  items: ProfessionalTemplateItem[];
}

export const PROFESSIONAL_TEMPLATES: ProfessionalTemplate[] = [
  {
    id: 'tpl_extintores',
    title: 'Inspección de Extintores y Protección Contra Incendios',
    category: 'Extintores',
    description: 'Verificación integral de equipos portátiles de extinción, señalización y operatividad.',
    normativeBasis: 'Decreto 351/79 Cap. 18 - Norma IRAM 3517-2',
    icon: '🧯',
    items: [
      {
        id: 'ext_01',
        code: 'EXT-01',
        aspect: 'Ubicación y Accesibilidad',
        normativeRef: 'Dec. 351/79 Art. 175',
        guidance: 'El extintor debe estar señalizado, visible y libre de obstáculos a una altura máxima de 1.20m al soporte superior.',
      },
      {
        id: 'ext_02',
        code: 'EXT-02',
        aspect: 'Presión de Carga (Manómetro)',
        normativeRef: 'IRAM 3517-2 Art. 5.2',
        guidance: 'La aguja del manómetro debe encontrarse en la zona verde (operativa). En CO2 verificar pesaje.',
      },
      {
        id: 'ext_03',
        code: 'EXT-03',
        aspect: 'Precinto y Pasador de Seguridad',
        normativeRef: 'IRAM 3517-2 Art. 5.4',
        guidance: 'El pasador metálico de seguridad debe estar firme con su precinto plástico indeleble intacto.',
      },
      {
        id: 'ext_04',
        code: 'EXT-04',
        aspect: 'Estado de Manga y Tobera',
        normativeRef: 'IRAM 3517-2 Art. 5.5',
        guidance: 'Manga flexible sin grietas, deformaciones ni fisuras; tobera limpia sin abolladuras.',
      },
      {
        id: 'ext_05',
        code: 'EXT-05',
        aspect: 'Chapa de Mantenimiento y Marbete de Carga',
        normativeRef: 'Dec. 351/79 Art. 176',
        guidance: 'Vencimiento anual de carga vigente y marbete plástico en el cuello con el color correspondiente al año.',
      },
    ],
  },
  {
    id: 'tpl_epp',
    title: 'Inspección de Equipos de Protección Personal (EPP)',
    category: 'EPP',
    description: 'Control de dotación, certificación IRAM/Sello S y estado de conservación de EPP.',
    normativeBasis: 'Ley 19.587 Cap. 8 - Res. SRT 896/99',
    icon: '🥽',
    items: [
      {
        id: 'epp_01',
        code: 'EPP-01',
        aspect: 'Casco de Seguridad Dialéctrico',
        normativeRef: 'IRAM 3620 - Res. 896/99',
        guidance: 'Arnés/casquete sin fisuras, impacto ni modificaciones. Sello S/IRAM visible.',
      },
      {
        id: 'epp_02',
        code: 'EPP-02',
        aspect: 'Protección Ocular y Facial',
        normativeRef: 'IRAM 3630',
        guidance: 'Lentes antiimpacto sin rayaduras graves. En soldadura/amolado usar antiparras o mascarilla facial integrada.',
      },
      {
        id: 'epp_03',
        code: 'EPP-03',
        aspect: 'Calzado de Seguridad con Puntera',
        normativeRef: 'IRAM 3610',
        guidance: 'Calzado ergonómico con puntera de acero/composite y suela antideslizante sin desprendimientos.',
      },
      {
        id: 'epp_04',
        code: 'EPP-04',
        aspect: 'Protección Auditiva (Copas / Endoaurales)',
        normativeRef: 'IRAM 4126 - Dec. 351/79 Art. 85',
        guidance: 'Almohadillas sin endurecimiento ni roturas. Nivel de atenuación NRR adecuado a la medición acústica.',
      },
      {
        id: 'epp_05',
        code: 'EPP-05',
        aspect: 'Guantes de Protección Específica',
        normativeRef: 'IRAM 3601',
        guidance: 'Selección según riesgo (mecánico, químico, dieléctrico o térmico). Sin perforaciones ni desgaste excesivo.',
      },
    ],
  },
  {
    id: 'tpl_altura',
    title: 'Inspección de Trabajo en Altura y Andamios',
    category: 'Trabajo en altura',
    description: 'Verificación del sistema anticaídas, puntos de anclaje de 22kN y estabilidad de andamios.',
    normativeBasis: 'Decreto 911/96 Art. 54 al 58 - Res. SRT 550/11',
    icon: '🦺',
    items: [
      {
        id: 'alt_01',
        code: 'ALT-01',
        aspect: 'Arnés de Seguridad Anti-caídas Completo',
        normativeRef: 'Dec. 911/96 Art. 54 - IRAM 3622-1',
        guidance: 'Arnés arácnido de cuerpo entero con argolla dorsal. Cintas sin desgaste, quemaduras ni costuras saltadas.',
      },
      {
        id: 'alt_02',
        code: 'ALT-02',
        aspect: 'Cabo de Vida con Absorbedor de Impacto',
        normativeRef: 'IRAM 3622-2',
        guidance: 'Doble cabo de vida tipo "Y" con amortiguador de caídas. Mosquetones de doble traba automática.',
      },
      {
        id: 'alt_03',
        code: 'ALT-03',
        aspect: 'Punto de Anclaje Homologado (22 kN / 2200 kg)',
        normativeRef: 'Dec. 911/96 Art. 55',
        guidance: 'Estructura rígida probada e independiente de la plataforma de trabajo, capaz de resistir 2200 kgf.',
      },
      {
        id: 'alt_04',
        code: 'ALT-04',
        aspect: 'Plataforma y Tablonado de Andamios',
        normativeRef: 'Dec. 911/96 Art. 58',
        guidance: 'Mínimo 60cm de ancho. Tablones trabados, metálicos o de madera dura de 2" sin nudos ni rajaduras.',
      },
      {
        id: 'alt_05',
        code: 'ALT-05',
        aspect: 'Rodapié y Barandas Perimetrales',
        normativeRef: 'Dec. 911/96 Art. 56',
        guidance: 'Barandilla superior a 1m, barandilla intermedia a 0.50m y rodapié de 15cm de altura en todo el contorno.',
      },
    ],
  },
];
