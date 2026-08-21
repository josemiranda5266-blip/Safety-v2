import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Citation, ChecklistInspection, HazardAnalysisResult, SummaryResult, EPPAssignment, TrainingActivity, Inspection, Incident, EmergencyPlan } from '../types/safety';

export function exportManagementReportPDF(type: 'mensual' | 'anual' | 'empresa', data: any): void {
  const doc = new jsPDF();
  doc.text(`Informe ${type.toUpperCase()}`, 14, 20);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30);
  // Add data representation logic here
  doc.save(`Informe_${type}_${new Date().toISOString()}.pdf`);
}

export function exportIncidentReportPDF(incident: Incident): void {
  const doc = new jsPDF();
  doc.text(`Informe de Incidente/Accidente: ${incident.type}`, 14, 20);
  doc.text(`Fecha: ${incident.date} ${incident.time}`, 14, 30);
  doc.text(`Trabajador: ${incident.workerName}`, 14, 40);
  doc.text(`Descripción: ${incident.description}`, 14, 50, { maxWidth: 180 });
  
  if (incident.investigation) {
    doc.text('Investigación:', 14, 70);
    doc.text(`Causas inmediatas: ${incident.investigation.immediateCauses.join(', ')}`, 14, 80);
    doc.text(`Acciones correctivas: ${incident.investigation.correctiveActions.join(', ')}`, 14, 90);
  }

  doc.save(`Incidente_${incident.workerName.replace(/\s+/g, '_')}_${incident.date}.pdf`);
}

export function exportInspectionReportPDF(inspection: Inspection): void {
  const doc = new jsPDF();
  doc.text(`Informe de Inspección: ${inspection.type}`, 14, 20);
  doc.text(`Fecha: ${inspection.date}`, 14, 30);
  doc.text(`Estado: ${inspection.status}`, 14, 40);
  
  const tableData = inspection.findings.map(f => [f.description, f.hazard, f.severity, f.status]);
  autoTable(doc, {
    head: [['Descripción', 'Peligro', 'Gravedad', 'Estado']],
    body: tableData,
    startY: 50
  });

  doc.save(`Inspeccion_${inspection.date}.pdf`);
}

export function exportChatAnswerPDF(
  question: string,
  answer: string,
  citations?: Citation[]
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SAFETY IA - Informe de Consulta Técnica', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, pageWidth - 14, 18, { align: 'right' });

  // Question Block
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Pregunta Consultada:', 14, 38);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const splitQuestion = doc.splitTextToSize(`"${question}"`, pageWidth - 28);
  doc.text(splitQuestion, 14, 45);

  let currentY = 45 + splitQuestion.length * 6 + 6;

  // Answer Block
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Respuesta de la IA (Basada en Biblioteca):', 14, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  // Clean Markdown headers for PDF printing
  const cleanAnswer = answer
    .replace(/\*\*/g, '')
    .replace(/###/g, '')
    .replace(/##/g, '')
    .replace(/#/g, '');

  const splitAnswer = doc.splitTextToSize(cleanAnswer, pageWidth - 28);
  
  if (currentY + splitAnswer.length * 5 > 260) {
    doc.text(splitAnswer, 14, currentY);
  } else {
    doc.text(splitAnswer, 14, currentY);
    currentY += splitAnswer.length * 5 + 10;
  }

  // Citations Table if available
  if (citations && citations.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Fuentes y Citas Bibliográficas Utilizadas:', 14, currentY);
    currentY += 6;

    const tableData = citations.map((c, i) => [
      `${i + 1}`,
      c.docTitle,
      `Pág. ${c.pageNumber}`,
      c.quotedText.slice(0, 120) + '...',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Documento', 'Página', 'Fragmento Citado']],
      body: tableData,
      headStyles: { fillColor: [16, 185, 129] }, // emerald-600
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 'auto' },
      },
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento generado automáticamente por Safety IA - Asistente de Higiene y Seguridad Laboral.',
      14,
      288
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, 288, { align: 'right' });
  }

  doc.save(`SafetyIA_Consulta_${Date.now()}.pdf`);
}

export function exportChecklistPDF(inspection: ChecklistInspection): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CHECKLIST DE INSPECCIÓN DE SEGURIDAD', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Categoría: ${inspection.category}`, 14, 24);
  doc.text(`Fecha: ${inspection.date}`, pageWidth - 14, 24, { align: 'right' });

  // Inspection Metadata Table
  let currentY = 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  doc.text(`Título: ${inspection.title}`, 14, currentY);
  currentY += 6;
  doc.text(`Auditor / Inspector: ${inspection.inspectorName || 'No especificado'}`, 14, currentY);
  currentY += 6;
  doc.text(`Ubicación / Planta: ${inspection.location || 'No especificada'}`, 14, currentY);
  currentY += 10;

  // Checklist Items Table
  const tableData = inspection.items.map((item, idx) => {
    let statusText = 'Pendiente';
    if (item.status === 'cumple') statusText = 'CUMPLE';
    if (item.status === 'no_cumple') statusText = 'NO CUMPLE';
    if (item.status === 'no_aplica') statusText = 'N/A';

    return [
      `${idx + 1}`,
      item.aspect,
      item.normativeRef,
      statusText,
      item.notes || '-',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Aspecto a Inspeccionar', 'Normativa Aplicable', 'Estado', 'Observaciones']],
    body: tableData,
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 45 },
      3: { cellWidth: 25, fontStyle: 'bold' },
      4: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'CUMPLE') data.cell.styles.textColor = [16, 185, 129];
        if (data.cell.raw === 'NO CUMPLE') data.cell.styles.textColor = [239, 68, 68];
        if (data.cell.raw === 'N/A') data.cell.styles.textColor = [100, 116, 139];
      }
    },
  });

  // Final Y Position
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  if (inspection.overallObservations) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Observaciones Generales de la Auditoría:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitObs = doc.splitTextToSize(inspection.overallObservations, pageWidth - 28);
    doc.text(splitObs, 14, finalY + 6);
  }

  // Signatures
  const sigY = Math.min(260, finalY + 35);
  doc.setLineWidth(0.5);
  doc.setDrawColor(148, 163, 184);

  // Inspector Signature
  doc.line(20, sigY, 90, sigY);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Firma y Aclaración Auditor SySAT', 55, sigY + 5, { align: 'center' });

  // Responsable Firma
  doc.line( pageWidth - 90, sigY, pageWidth - 20, sigY);
  doc.text('Firma Responsable de Planta/Área', pageWidth - 55, sigY + 5, { align: 'center' });

  doc.save(`SafetyIA_Checklist_${inspection.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function exportHazardAnalysisPDF(analysis: HazardAnalysisResult): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Banner
  doc.setFillColor(185, 28, 28); // red-700
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INFORME DE ANÁLISIS DE RIESGOS VISUALES', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${analysis.date}`, pageWidth - 14, 18, { align: 'right' });

  let currentY = 36;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Nivel de Riesgo Global: ${analysis.riskLevel.toUpperCase()}`, 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const splitAss = doc.splitTextToSize(`Evaluación General: ${analysis.overallAssessment}`, pageWidth - 28);
  doc.text(splitAss, 14, currentY);

  currentY += splitAss.length * 5 + 8;

  // Hazards Table
  const tableData = analysis.hazards.map((h, i) => [
    `${i + 1}`,
    h.hazardName,
    h.severity,
    h.description,
    h.applicableNorm,
    h.preventiveAction,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Riesgo Detectado', 'Severidad', 'Descripción Subestándar', 'Normativa Aplicable', 'Medida Preventiva']],
    body: tableData,
    headStyles: { fillColor: [185, 28, 28] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20, fontStyle: 'bold' },
      3: { cellWidth: 45 },
      4: { cellWidth: 35 },
      5: { cellWidth: 'auto' },
    },
  });

  doc.save(`SafetyIA_Analisis_Riesgos_${Date.now()}.pdf`);
}

export function exportSummaryPDF(summary: SummaryResult): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Banner
  doc.setFillColor(30, 58, 138); // blue-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RESUMEN TÉCNICO NORMATIVO - SAFETY IA', 14, 18);

  doc.setFontSize(9);
  doc.text(`Fecha: ${summary.date}`, pageWidth - 14, 18, { align: 'right' });

  let currentY = 36;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Documento: ${summary.docTitle}`, 14, currentY);

  currentY += 8;
  doc.setFontSize(10);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, pageWidth - 28, 20, 'F');
  doc.text('Resumen Ejecutivo:', 18, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const splitShort = doc.splitTextToSize(summary.shortSummary, pageWidth - 36);
  doc.text(splitShort, 18, currentY + 12);

  currentY += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Puntos Clave:', 14, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  summary.keyPoints.forEach((kp) => {
    doc.text(`• ${kp}`, 18, currentY);
    currentY += 5;
  });

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Obligaciones Legales Detectadas:', 14, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  summary.legalObligations.forEach((lo) => {
    doc.text(`• ${lo}`, 18, currentY);
    currentY += 5;
  });

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Recomendaciones del Especialista:', 14, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  summary.recommendations.forEach((rec) => {
    doc.text(`• ${rec}`, 18, currentY);
    currentY += 5;
  });

  doc.save(`SafetyIA_Resumen_${summary.docTitle.replace(/\s+/g, '_')}.pdf`);
}

export function exportEPPDeliveryReceiptPDF(assignment: EPPAssignment): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CONSTANCIA DE ENTREGA DE EPP', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${assignment.date}`, pageWidth - 14, 18, { align: 'right' });

  let y = 40;
  doc.setTextColor(0, 0, 0);
  doc.text(`Trabajador: ${assignment.workerName}`, 14, y);
  y += 10;
  doc.text(`Elemento: ${assignment.itemName}`, 14, y);
  y += 10;
  doc.text(`Cantidad: ${assignment.quantity}`, 14, y);
  y += 10;
  doc.text(`Observaciones: ${assignment.observations || 'Sin observaciones'}`, 14, y);

  y += 40;
  doc.line(20, y, 90, y);
  doc.text('Firma Trabajador', 55, y + 5, { align: 'center' });

  doc.save(`EPP_${assignment.workerName.replace(/\s+/g, '_')}_${assignment.itemName.replace(/\s+/g, '_')}.pdf`);
}

export function exportTrainingCertificatePDF(activity: TrainingActivity, workerId: string): void {
  const worker = activity.attendees.find(a => a.workerId === workerId);
  if (!worker) return;

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('CERTIFICADO DE CAPACITACIÓN', doc.internal.pageSize.width / 2, 50, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(worker.workerName, doc.internal.pageSize.width / 2, 80, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Por haber completado el curso: ${activity.topic}`, doc.internal.pageSize.width / 2, 100, { align: 'center' });
  
  doc.save(`Certificado_${activity.topic.replace(/\s+/g, '_')}_${worker.workerName.replace(/\s+/g, '_')}.pdf`);
}
