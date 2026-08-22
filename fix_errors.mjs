import fs from 'fs';

// Fix ReportsScreen.tsx
let reportsCode = fs.readFileSync('src/components/Console/Reports/ReportsScreen.tsx', 'utf8');
reportsCode = reportsCode.replace(
  "positionId: 'Operario de Producción'",
  "positionId: 'Operario de Producción',\n      active: true,\n      createdAt: new Date().toISOString()"
);
fs.writeFileSync('src/components/Console/Reports/ReportsScreen.tsx', reportsCode);

// Fix pdfExporter.ts
let pdfCode = fs.readFileSync('src/services/pdfExporter.ts', 'utf8');
pdfCode = pdfCode.replace(
  "    minCellHeight: 12",
  "    styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], minCellHeight: 12 }"
);
// wait, we already had a styles object there. Let's do it safely:
pdfCode = pdfCode.replace(
  "styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0] },",
  "styles: { fontSize: 9, cellPadding: 4, textColor: [0, 0, 0], minCellHeight: 14 },"
);
pdfCode = pdfCode.replace(/,\s*minCellHeight: 12/g, '');

fs.writeFileSync('src/services/pdfExporter.ts', pdfCode);
