import React, { useState } from 'react';
import { useTenant } from '../../../context/TenantContext';
import { BarChart3, FileText, Download, AlertTriangle, ShieldCheck, Microscope, HardHat, Calendar } from 'lucide-react';
import { exportManagementReportPDF, exportRes299PDF } from '../../../services/pdfExporter';
import { Employee, EmployeePpeDelivery } from '../../../types/tenant';
import { dashboardService } from '../../../services/dashboardService';

export const ReportsScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async (type: 'mensual' | 'anual' | 'empresa') => {
    setGenerating(true);
    try {
      // En un entorno real, obtendríamos los datos completos para el reporte.
      // Aquí usamos el dashboardService para obtener KPIs como ejemplo.
      const data = await dashboardService.getDashboardData(activeCompany?.id);
      exportManagementReportPDF(type, { ...data, companyName: activeCompany?.legalName || 'Organización Completa' });
    } catch (error) {
      console.error("Error al generar el reporte:", error);
    } finally {
      setGenerating(false);
    }
  };

  
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
      positionId: 'Operario de Producción',
      active: true,
      createdAt: new Date().toISOString()
    };
    
    const mockDeliveries: EmployeePpeDelivery[] = [
      { id: '1', itemType: 'Calzado de Seguridad con Puntera', brandModel: 'Ombu / Cripton', standardOrCertification: 'Sello IRAM 3610', deliveryDate: new Date().toISOString(), quantity: 1, receiptSigned: false, status: 'active' },
      { id: '2', itemType: 'Protección Auditiva de Copa', brandModel: '3M / Peltor', standardOrCertification: 'Cert SRT', deliveryDate: new Date().toISOString(), quantity: 1, receiptSigned: false, status: 'active' },
      { id: '3', itemType: 'Gafas de Seguridad (Transparentes)', brandModel: 'Libus / Ecoline', standardOrCertification: 'Sello IRAM', deliveryDate: new Date().toISOString(), quantity: 1, receiptSigned: false, status: 'active' }
    ];
    
    exportRes299PDF(activeCompany, mockEmployee, mockDeliveries);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-500" />
            <span>Informes y Reportes</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generación de informes de gestión y constancias oficiales en PDF.
          </p>
        </div>
      </div>

      {!activeCompany && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Estás viendo los informes globales de la organización. Para informes específicos, selecciona una empresa.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Informes de Gestión */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Informes de Gestión</h3>
              <p className="text-xs text-slate-500">Resumen de KPIs y métricas clave.</p>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            <button 
              onClick={() => handleGenerateReport('mensual')}
              disabled={generating}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400" />
                Resumen Mensual
              </div>
              <Download className="w-4 h-4 text-indigo-500" />
            </button>
            <button 
              onClick={() => handleGenerateReport('anual')}
              disabled={generating}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                Balance Anual
              </div>
              <Download className="w-4 h-4 text-indigo-500" />
            </button>
          </div>
        </div>

        {/* Constancias EPP */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col h-full ">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Constancias EPP</h3>
              <p className="text-xs text-slate-500">Formularios Res. 299/11 SRT.</p>
            </div>
          </div>
          <div className="space-y-3 flex-1">
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
          </div>
        </div>

        {/* Matrices IPER */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col h-full ">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Matrices de Riesgo</h3>
              <p className="text-xs text-slate-500">Exportación de IPERs consolidadas.</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4">
             <span className="text-sm font-bold text-slate-400">Próximamente</span>
          </div>
        </div>

      </div>
    </div>
  );
};
