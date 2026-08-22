import fs from 'fs';

let code = fs.readFileSync('src/components/Console/Reports/ReportsScreen.tsx', 'utf8');

code = code.replace(
  "import { exportManagementReportPDF } from '../../../services/pdfExporter';",
  "import { exportManagementReportPDF, exportRes299PDF } from '../../../services/pdfExporter';\nimport { Employee, EmployeePpeDelivery } from '../../../types/tenant';"
);

const handleRes299 = `
  const handleGenerateRes299 = () => {
    if (!activeCompany) return;
    
    // Mock data for demonstration purposes
    const mockEmployee: Employee = {
      id: 'mock-1',
      companyId: activeCompany.id,
      establishmentId: 'est-1',
      orgId: 'org-1',
      cuil: '20-12345678-9',
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Pérez',
      positionId: 'Operario de Producción'
    };
    
    const mockDeliveries: EmployeePpeDelivery[] = [
      { id: '1', itemType: 'Calzado de Seguridad con Puntera', brandModel: 'Ombu / Cripton', standardOrCertification: 'Sello IRAM 3610', deliveryDate: new Date().toISOString(), quantity: 1, receiptSigned: false, status: 'active' },
      { id: '2', itemType: 'Protección Auditiva de Copa', brandModel: '3M / Peltor', standardOrCertification: 'Cert SRT', deliveryDate: new Date().toISOString(), quantity: 1, receiptSigned: false, status: 'active' },
      { id: '3', itemType: 'Gafas de Seguridad (Transparentes)', brandModel: 'Libus / Ecoline', standardOrCertification: 'Sello IRAM', deliveryDate: new Date().toISOString(), quantity: 1, receiptSigned: false, status: 'active' }
    ];
    
    exportRes299PDF(activeCompany, mockEmployee, mockDeliveries);
  };
`;

code = code.replace(
  "return (",
  handleRes299 + "\n  return ("
);

code = code.replace(
  /<div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4">\s*<span className="text-sm font-bold text-slate-400">Próximamente<\/span>\s*<\/div>/,
  `<div className="space-y-3 flex-1">
            <p className="text-xs text-slate-500 mb-2">Genera el formulario legal oficial con la nómina de elementos asignados por trabajador.</p>
            <button 
              onClick={handleGenerateRes299}
              disabled={!activeCompany}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <HardHat className="w-4 h-4 text-slate-400" />
                Ejemplo (Juan Pérez)
              </div>
              <Download className="w-4 h-4 text-orange-500" />
            </button>
          </div>`
);

code = code.replace(/opacity-60 grayscale/g, '');

fs.writeFileSync('src/components/Console/Reports/ReportsScreen.tsx', code);
