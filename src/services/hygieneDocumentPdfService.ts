import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { HygieneDocumentRepresentation } from '../types/hygieneDocument';

const PAGE_MARGIN = 18;

function scalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function label(key: string): string {
  const labels: Record<string, string> = {
    measurementId: 'Identificador de medición', protocolType: 'Protocolo', measurementDate: 'Fecha de medición',
    averageLux: 'Iluminancia promedio (lux)', minimumLux: 'Iluminancia mínima (lux)', maximumLux: 'Iluminancia máxima (lux)',
    uniformityRatio: 'Relación mín/máx', calculationVersion: 'Versión del cálculo', calculatedAt: 'Calculado el',
    sourceType: 'Tipo de iluminación', lightingSystem: 'Sistema de iluminación', taskDescription: 'Descripción de tarea',
    documentId: 'Documento', generatedAt: 'Fecha de generación', generatedBy: 'Generado por', templateKey: 'Plantilla', templateVersion: 'Versión de plantilla',
  };
  return labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 260) { doc.addPage(); y = PAGE_MARGIN; }
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(title, PAGE_MARGIN, y); return y + 7;
}

export function exportLightingDocumentPdf(representation: HygieneDocumentRepresentation): void {
  if (representation.templateKey !== 'lighting_protocol') throw new Error('UNSUPPORTED_DOCUMENT_TEMPLATE');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Protocolo de Iluminación', PAGE_MARGIN, y);
  y += 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Plantilla ${representation.templateVersion} · Documento ${representation.documentId}`, PAGE_MARGIN, y); y += 10;

  for (const section of representation.sections) {
    y = sectionTitle(doc, section.title, y);
    if (section.key === 'measurement_points') {
      const points = Array.isArray(section.data.points) ? section.data.points as Array<Record<string, unknown>> : [];
      autoTable(doc, { startY: y, head: [['Punto', 'Tipo', 'Ubicación', 'Iluminancia', 'Observaciones']], body: points.map((p, i) => [scalar(p.name ?? `Punto ${i + 1}`), scalar(p.pointType), scalar(p.locationDescription), `${scalar(p.lux)} lux`, scalar(p.observations)]), margin: { left: PAGE_MARGIN, right: PAGE_MARGIN }, styles: { fontSize: 8, cellPadding: 2 } });
      y = (doc as any).lastAutoTable.finalY + 8;
      continue;
    }
    const rows: string[][] = [];
    for (const [key, value] of Object.entries(section.data)) {
      if (key === 'instruments' && Array.isArray(value)) {
        const instruments = value as Array<Record<string, unknown>>;
        for (const instrument of instruments) rows.push(['Instrumento', [instrument.type, instrument.brand, instrument.model, instrument.serialNumber, instrument.calibrationDate, instrument.calibrationExpiry].filter(Boolean).map(scalar).join(' · ') || scalar(instrument.id)]);
      } else if (key !== 'instrumentIds') rows.push([label(key), scalar(value)]);
    }
    if (rows.length) { autoTable(doc, { startY: y, body: rows, margin: { left: PAGE_MARGIN, right: PAGE_MARGIN }, styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 } } }); y = (doc as any).lastAutoTable.finalY + 8; }
  }
  if (y > 265) { doc.addPage(); y = PAGE_MARGIN; }
  doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.text(doc.splitTextToSize(representation.disclaimer, 174), PAGE_MARGIN, y);
  doc.save(`protocolo-iluminacion-${representation.documentId}.pdf`);
}
