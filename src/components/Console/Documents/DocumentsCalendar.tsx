import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  FileText, 
  Building2, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { DocumentCalendarEvent, ProfessionalDocument } from '../../../types/documentManagement';
import { getAlertLevelStyle } from '../../../utils/expirationEngine';

interface DocumentsCalendarProps {
  events: DocumentCalendarEvent[];
  documents: ProfessionalDocument[];
  isLoading: boolean;
  onSelectDocument: (doc: ProfessionalDocument) => void;
}

export const DocumentsCalendar: React.FC<DocumentsCalendarProps> = ({
  events,
  documents,
  isLoading,
  onSelectDocument,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month & total days
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDayStr(today.toISOString().split('T')[0]);
  };

  // Group events by YYYY-MM-DD
  const eventsByDay = events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {} as Record<string, DocumentCalendarEvent[]>);

  // Events for selected day
  const selectedDayEvents = eventsByDay[selectedDayStr] || [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {monthNames[month]} {year}
            </h3>
            <p className="text-xs text-slate-500">
              Cronograma integral de vencimientos normativos y renovaciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Hoy
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Matrix */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider mb-2">
            <div>Dom</div>
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank padding cells before day 1 */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-20 sm:h-24 p-1 rounded-xl bg-slate-50/40 dark:bg-slate-900/20 border border-transparent" />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = eventsByDay[formattedDate] || [];
              const isSelected = selectedDayStr === formattedDate;
              const isToday = new Date().toISOString().split('T')[0] === formattedDate;

              return (
                <div
                  key={formattedDate}
                  onClick={() => setSelectedDayStr(formattedDate)}
                  className={`h-20 sm:h-24 p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20'
                      : isToday
                      ? 'border-orange-300 dark:border-orange-700 bg-slate-50 dark:bg-slate-800/60'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isToday 
                        ? 'text-orange-600 dark:text-orange-400 font-black' 
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-orange-500 text-white font-bold text-[9px] flex items-center justify-center">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Micro event pills inside day cell */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const alertStyle = getAlertLevelStyle(ev.alertLevel);
                      return (
                        <div
                          key={ev.id}
                          className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate border ${alertStyle.badgeClass}`}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-400 block text-right">
                        +{dayEvents.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Detail Panel */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Agenda: {selectedDayStr}
              </h4>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {selectedDayEvents.length} eventos
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 space-y-2">
                  <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p>No hay vencimientos ni emisiones programadas para este día.</p>
                </div>
              ) : (
                selectedDayEvents.map((ev) => {
                  const alertStyle = getAlertLevelStyle(ev.alertLevel);
                  const fullDoc = documents.find((d) => d.id === ev.documentId);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => fullDoc && onSelectDocument(fullDoc)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${alertStyle.bgSubtle} ${alertStyle.borderClass}/40`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${alertStyle.badgeClass}`}>
                          {ev.eventType === 'expiration' ? 'Vencimiento' : 'Emisión'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{ev.category}</span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {ev.title}
                      </h5>

                      <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                        {ev.companyName && <p>• Empresa: {ev.companyName}</p>}
                        {ev.establishmentName && <p>• Establecimiento: {ev.establishmentName}</p>}
                        {ev.employeeName && <p>• Trabajador: {ev.employeeName}</p>}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-end text-[10px] font-bold text-orange-600 dark:text-orange-400">
                        <span>Ver Documento</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
