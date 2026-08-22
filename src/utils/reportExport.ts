import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  ShadingType,
  Footer,
  PageNumber,
} from 'docx';
import { InspectionReport } from '../types/safety';

/**
 * Safely parse a base64 data URL into a Uint8Array for docx ImageRun
 */
function parseBase64Image(dataUrl: string): { data: Uint8Array; extension: 'png' | 'jpg' } | null {
  try {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return null;
    }
    const isPng = dataUrl.startsWith('data:image/png');
    const cleanStr = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(cleanStr);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { data: bytes, extension: isPng ? 'png' : 'jpg' };
  } catch (e) {
    console.warn('Could not parse image for Word export:', e);
    return null;
  }
}

/**
 * Export Inspection Report as a genuine, fully compatible Microsoft Word (.docx) File
 */
export async function exportReportToWord(report: InspectionReport): Promise<void> {
  const tableBorderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const tableBorderLight = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
  };

  // Header Title
  const titleParagraph = new Paragraph({
    text: 'SAFETY IA — INFORME TÉCNICO DE INSPECCIÓN VISUAL',
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { after: 120 },
  });

  const subtitleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: report.title,
        bold: true,
        size: 28,
        color: 'EA580C',
      }),
    ],
    spacing: { after: 240 },
  });

  // Metadata Table
  const metadataRows = [
    ['Empresa / Cliente:', report.companyName],
    ['Ubicación / Obra:', report.siteLocation],
    ['Inspector Responsable:', `${report.inspectorName} (${report.inspectorRegistration || 'Sin registro'})`],
    ['Fecha de Inspección:', report.date],
    ['Coordenadas GPS:', report.gpsLocation || 'No capturadas'],
    ['Estado del Informe:', report.status],
  ].map(
    ([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
          }),
        ],
      })
  );

  const metadataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorderLight,
    rows: metadataRows,
  });

  // Section 1: Activity Description & Critical Elements (if provided)
  const activitySecElements: (Paragraph | Table)[] = [];
  if (report.activityDescription) {
    activitySecElements.push(
      new Paragraph({
        text: '1. Contexto Operativo y Elementos Críticos Inspeccionados',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          left: { style: BorderStyle.SINGLE, size: 24, color: 'EA580C' },
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: report.activityDescription,
                        size: 21,
                        color: '1E293B',
                      }),
                    ],
                  }),
                ],
                shading: { fill: 'FFF7ED', type: ShadingType.CLEAR },
              }),
            ],
          }),
        ],
      })
    );
  }

  // Section 2: Executive Summary
  const sec1Heading = new Paragraph({
    text: report.activityDescription ? '2. Resumen Ejecutivo' : '1. Resumen Ejecutivo',
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
  });

  const execSummaryBox = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: { style: BorderStyle.SINGLE, size: 24, color: '0284C7' },
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: report.executiveSummary,
                    size: 21,
                    color: '1E293B',
                  }),
                ],
              }),
            ],
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          }),
        ],
      }),
    ],
  });

  // Section 2: Normative
  const sec2Heading = new Paragraph({
    text: '2. Normativa Aplicada y Marco Regulatorio',
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
  });

  const normParagraphs = report.appliedNorms.map(
    (norm) =>
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: norm, size: 20, color: '334155' })],
        spacing: { after: 60 },
      })
  );

  // Section 3: Findings
  const sec3Heading = new Paragraph({
    text: '3. Registro de Hallazgos y Análisis de Riesgo',
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
  });

  const findingsElements: (Paragraph | Table)[] = [];

  report.findings.forEach((f, i) => {
    const riskColor =
      f.riskLevel === 'Crítico'
        ? 'DC2626'
        : f.riskLevel === 'Alto'
        ? 'EA580C'
        : f.riskLevel === 'Medio'
        ? 'D97706'
        : '16A34A';

    findingsElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Hallazgo #${i + 1}: ${f.hazardTitle}`,
            bold: true,
            size: 22,
            color: '0F172A',
          }),
        ],
        spacing: { before: 240, after: 60 },
      })
    );

    findingsElements.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Categoría: ', bold: true, size: 20 }),
          new TextRun({ text: `${f.hazardCategory} | `, size: 20 }),
          new TextRun({ text: 'Riesgo: ', bold: true, size: 20 }),
          new TextRun({ text: `${f.riskLevel} | `, bold: true, color: riskColor, size: 20 }),
          new TextRun({ text: 'Estado: ', bold: true, size: 20 }),
          new TextRun({ text: f.status, size: 20 }),
        ],
        spacing: { after: 60 },
      })
    );

    findingsElements.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Descripción: ', bold: true, size: 20 }),
          new TextRun({ text: f.description, size: 20 }),
        ],
        spacing: { after: 60 },
      })
    );

    findingsElements.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Medida Correctiva Recomendada: ', bold: true, size: 20 }),
          new TextRun({ text: f.suggestedAction, size: 20 }),
        ],
        spacing: { after: 100 },
      })
    );

    // RAG Citation Box
    const isVerifiedNorm = f.normativeCitation.verificationStatus === 'verified' || f.normativeCitation.hasLibraryBackup;
    const ragBoxText = isVerifiedNorm
      ? `Respaldo Normativo Verificado (Biblioteca): ${f.normativeCitation.docTitle} (Pág. ${f.normativeCitation.pageNumber || '1'}, ${f.normativeCitation.articleOrSection || 'General'})`
      : 'Sin respaldo documental verificado en la biblioteca';

    const ragChildren: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: ragBoxText,
            bold: true,
            size: 19,
            color: 'C2410C',
          }),
        ],
      }),
    ];

    if (f.normativeCitation.quotedText) {
      ragChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `"${f.normativeCitation.quotedText}"`,
              italics: true,
              size: 18,
              color: '475569',
            }),
          ],
          spacing: { before: 40 },
        })
      );
    }

    findingsElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          left: { style: BorderStyle.SINGLE, size: 18, color: 'F97316' },
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: ragChildren,
                shading: { fill: 'FFF7ED', type: ShadingType.CLEAR },
              }),
            ],
          }),
        ],
      })
    );

    // Photo if present
    if (f.photoUrl) {
      const parsedImage = parseBase64Image(f.photoUrl);
      if (parsedImage) {
        findingsElements.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: parsedImage.data,
                transformation: { width: 320, height: 200 },
                type: parsedImage.extension,
              }),
            ],
            spacing: { before: 120, after: 180 },
          })
        );
      }
    }
  });

  // Section 4: General Recommendations
  const sec4Heading = new Paragraph({
    text: '4. Recomendaciones Generales',
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
  });

  const recParagraphs = report.generalRecommendations.map(
    (rec) =>
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: rec, size: 20, color: '334155' })],
        spacing: { after: 60 },
      })
  );

  // Section 5: Action Plan Table
  const sec5Heading = new Paragraph({
    text: '5. Plan de Acción y Medidas Correctivas',
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
  });

  const actionHeaderRow = new TableRow({
    children: ['#', 'Tarea Correctiva', 'Responsable', 'Plazo Límite', 'Riesgo', 'Estado'].map(
      (headerText, index) =>
        new TableCell({
          width: {
            size: index === 0 ? 5 : index === 1 ? 35 : 15,
            type: WidthType.PERCENTAGE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: headerText,
                  bold: true,
                  color: 'FFFFFF',
                  size: 19,
                }),
              ],
            }),
          ],
          shading: { fill: '0F172A', type: ShadingType.CLEAR },
        })
    ),
  });

  const actionDataRows = report.actionPlan.map(
    (a, i) =>
      new TableRow({
        children: [
          `${i + 1}`,
          a.task,
          a.responsible,
          a.deadline,
          a.riskLevel,
          a.status,
        ].map(
          (val, index) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: val,
                      size: 19,
                      bold: index === 4,
                      color:
                        index === 4
                          ? val === 'Crítico'
                            ? 'DC2626'
                            : 'EA580C'
                          : '1E293B',
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  const actionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorderLight,
    rows: [actionHeaderRow, ...actionDataRows],
  });

  // Section 6: Digital Signature & Certification
  const sec6Heading = new Paragraph({
    text: '6. Certificación y Firma Digital',
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
  });

  const signatureElements: Paragraph[] = [];

  if (report.inspectorSignatureUrl) {
    const parsedSig = parseBase64Image(report.inspectorSignatureUrl);
    if (parsedSig) {
      signatureElements.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: parsedSig.data,
              transformation: { width: 220, height: 80 },
              type: parsedSig.extension,
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  signatureElements.push(
    new Paragraph({
      children: [
        new TextRun({ text: report.inspectorName, bold: true, size: 21, color: '0F172A' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: report.inspectorRegistration || 'Especialista en Higiene y Seguridad Laboral',
          size: 19,
          color: '64748B',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Documento certificado por motor RAG Safety IA',
          italics: true,
          size: 18,
          color: '16A34A',
        }),
      ],
      spacing: { before: 40, after: 120 },
    })
  );

  // Footer for pages
  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Safety IA — Página ', size: 18, color: '94A3B8' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '94A3B8' }),
        ],
      }),
    ],
  });

  // Document Instance
  const doc = new Document({
    sections: [
      {
        footers: { default: docFooter },
        children: [
          titleParagraph,
          subtitleParagraph,
          metadataTable,
          ...activitySecElements,
          sec1Heading,
          execSummaryBox,
          sec2Heading,
          ...normParagraphs,
          sec3Heading,
          ...findingsElements,
          sec4Heading,
          ...recParagraphs,
          sec5Heading,
          actionTable,
          sec6Heading,
          ...signatureElements,
        ],
      },
    ],
  });

  // Generate binary docx Blob and trigger browser download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Informe_InspectorIA_${report.id}_${report.companyName.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger Print view for Exporting to PDF
 */
export function exportReportToPDF(report: InspectionReport): void {
  window.print();
}

