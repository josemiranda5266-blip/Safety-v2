import fs from 'fs';

let code = fs.readFileSync('src/services/pdfExporter.ts', 'utf8');

// Update Management Report PDF
const mgmtReplacement = `export function exportManagementReportPDF(type: 'mensual' | 'anual' | 'empresa', data: any): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(\`INFORME DE GESTIÓN \${type.toUpperCase()}\`, 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(\`Fecha: \${new Date().toLocaleDateString()}\`, pageWidth - 14, 18, { align: 'right' });
  
  let y = 40;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(\`Contexto: \${data.companyName || 'Organización Global'}\`, 14, y);
  y += 15;
  
  // KPI Dashboard Table
  const kpiData = [
    ['Accidentes (YTD)', data.accidents?.toString() || '0'],
    ['Casi Accidentes / Incidentes', data.nearMisses?.toString() || '0'],
    ['Desvíos Abiertos', data.openCapas?.toString() || '0'],
    ['Desvíos Cerrados', data.closedCapas?.toString() || '0'],
    ['Auditorías Realizadas', data.inspections?.toString() || '0'],
    ['Mediciones Higiénicas', data.measurements?.toString() || '0'],
    ['Capacitaciones', data.trainings?.toString() || '0'],
    ['Cumplimiento Legal General', \`\${data.compliance || 0}%\`]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Indicador / KPI', 'Valor']],
    body: kpiData,
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  // Footer text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Documento generado automáticamente por Safety IA - Módulo de Inteligencia de Gestión', 14, finalY);
  
  doc.save(\`Informe_Gestion_\${type}_\${new Date().getTime()}.pdf\`);
}`;

code = code.replace(
  /export function exportManagementReportPDF\([\s\S]*?\}\n/,
  mgmtReplacement + "\n"
);

// Add Res 299/11 PDF
const res299Replacement = `
import { Company, Employee, EmployeePpeDelivery } from '../types/tenant';

export function exportRes299PDF(company: Company, employee: Employee, deliveries: EmployeePpeDelivery[]): void {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;
  
  // Res 299 Header Form
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CONSTANCIA DE ENTREGA DE ROPA DE TRABAJO Y ELEMENTOS DE PROTECCIÓN PERSONAL', pageWidth/2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Resolución SRT N° 299/11', pageWidth/2, 21, { align: 'center' });
  
  // Company Data box
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.rect(14, 28, pageWidth - 28, 14);
  
  doc.setFontSize(9);
  doc.text(\`Razón Social: \${company.legalName}\`, 16, 33);
  doc.text(\`CUIT: \${company.cuit}\`, pageWidth/2, 33);
  doc.text(\`Dirección: \${company.tradeName || '-'}\`, 16, 39); 
  
  // Employee Data box
  doc.rect(14, 44, pageWidth - 28, 14);
  doc.text(\`Nombre y Apellido: \${employee.lastName}, \${employee.firstName}\`, 16, 49);
  doc.text(\`D.N.I.: \${employee.dni || '-'}\`, pageWidth/2, 49);
  doc.text(\`Puesto de Trabajo: \${employee.positionId || '-'}\`, 16, 55); 
  doc.text(\`Fecha de Ingreso: \${employee.cuil}\`, pageWidth/2, 55); // Using cuil as placeholder if no start date

  // Table
  const tableData = deliveries.map(d => [
    d.itemType,
    d.brandModel || '-',
    d.standardOrCertification || '-',
    new Date(d.deliveryDate).toLocaleDateString(),
    '', // Firma worker
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['Producto (Descripción)', 'Tipo/Modelo/Marca', 'Certificado SRT / Sello IRAM', 'Fecha de Entrega', 'Firma Trabajador']],
    body: tableData,
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1, lineColor: [0, 0, 0] },
    bodyStyles: { lineWidth: 0.1, lineColor: [0, 0, 0] },
    styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40 },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 70 },
    },
    minCellHeight: 12
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.text('El trabajador declara haber recibido la información y capacitación sobre el correcto uso y mantenimiento de los elementos detallados.', 14, finalY);
  
  doc.save(\`Res299_11_\${employee.lastName.replace(/\\s+/g, '_')}.pdf\`);
}
`;

code = code.replace(
  "import { Incident, Inspection, ChecklistInspection, HazardAnalysisResult, SummaryResult, EPPAssignment, TrainingActivity } from '../types/safety';",
  "import { Incident, Inspection, ChecklistInspection, HazardAnalysisResult, SummaryResult, EPPAssignment, TrainingActivity } from '../types/safety';\n" +
  "import { Company, Employee, EmployeePpeDelivery } from '../types/tenant';"
);

code = code.replace(
  /export function exportManagementReportPDF\([\s\S]*?\}\n/,
  mgmtReplacement + "\n"
);

code = code + "\n" + res299Replacement;

fs.writeFileSync('src/services/pdfExporter.ts', code);
