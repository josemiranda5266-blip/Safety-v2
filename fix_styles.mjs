import fs from 'fs';

let pdfCode = fs.readFileSync('src/services/pdfExporter.ts', 'utf8');

// There are multiple styles blocks in that object.
// We can just find the autoTable arguments for Res 299 and fix it.
pdfCode = pdfCode.replace(
  /styles: \{ fontSize: 9, cellPadding: 4, textColor: \[0, 0, 0\], minCellHeight: 14 \},[\s\S]*?styles: \{ fontSize: 9, cellPadding: 3, textColor: \[0, 0, 0\] \}/,
  "styles: { fontSize: 9, cellPadding: 4, textColor: [0, 0, 0], minCellHeight: 14 }"
);

fs.writeFileSync('src/services/pdfExporter.ts', pdfCode);
