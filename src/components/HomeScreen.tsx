import React from 'react';
import { 
  FileText, 
  Bot, 
  BookOpen, 
  Star, 
  FileCheck, 
  CheckSquare, 
  Camera, 
  Settings, 
  Sparkles,
  ShieldCheck,
  Search,
  ArrowRight,
  History
} from 'lucide-react';
import { TabType } from './Navigation';

interface HomeScreenProps {
  setActiveTab: (tab: TabType) => void;
  docsCount: number;
  favoritesCount: number;
  onQuickQuery: (query: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  setActiveTab,
  docsCount,
  favoritesCount,
  onQuickQuery,
}) => {
  const quickPrompts = [
    {
      title: '¿Qué dice la Ley 19.587 sobre escaleras?',
      desc: 'Inclinación, jaula de protección y arnés en altura',
      icon: '🪜',
    },
    {
      title: '¿Qué EPP corresponde para soldadura?',
      desc: 'Protección facial, respiratoria y guantes descarne',
      icon: '🥽',
    },
    {
      title: '¿Qué establece el Decreto 351 respecto a iluminación?',
      desc: 'Luxes mínimos según el tipo de tarea laboral',
      icon: '💡',
    },
    {
      title: '¿Cuál es el límite permitido de ruido en 8h?',
      desc: 'Nivel Sonoro Continuo Equivalente 85 dB(A)',
      icon: '🔊',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Sleek Blue AI Insight Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Biblioteca RAG Especializada en CySAT</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            Asistente Inteligente de <br className="hidden sm:inline" />
            <span className="text-amber-300">Higiene y Seguridad Laboral</span>
          </h1>

          <p className="text-sm sm:text-base text-blue-100 leading-relaxed max-w-2xl">
            Consulta normas, decretos, resoluciones SRT y manuales técnicos en segundos. Respuestas fundamentadas <strong className="text-white underline decoration-amber-400">exclusivamente con citas exactas</strong> de tus documentos.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('chat')}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-lg shadow-slate-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Bot className="w-4 h-4 text-orange-400" />
              <span>Hacer Consulta con IA</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>Cargar Documentos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: 6 Sleek Action Cards */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span>Módulos de Trabajo</span>
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {docsCount} normas activas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* 0. Inspector IA (Visión Artificial & Informes) */}
          <button
            onClick={() => setActiveTab('inspector_ia')}
            className="group relative p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900 border border-orange-500/50 hover:border-orange-400 shadow-xl shadow-orange-950/40 transition-all text-left flex flex-col justify-between col-span-2 sm:col-span-2 hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 text-slate-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform font-black shadow-lg shadow-orange-500/30">
                <Camera className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                🔍 Inspección en Campo
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg group-hover:text-orange-400 transition-colors flex items-center gap-2">
                Inspector IA — Visión Artificial & Generador de Informes
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Toma fotos en campo. La IA identifica riesgos (EPP, altura, eléctrico, orden/limpieza), cita la normativa de tu biblioteca y genera informes técnicos con firma digital y exportación a PDF y Word.
              </p>
            </div>
          </button>

          {/* 1. Centro Normativo Inteligente */}
          <button
            onClick={() => setActiveTab('normative_center')}
            className="group relative p-6 rounded-3xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/10 transition-all text-left flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px]">
                  NUEVO
                </span>
              </div>
              <h3 className="font-extrabold text-white text-base group-hover:text-amber-400 transition-colors">
                🏛️ Centro Normativo
              </h3>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                Categorización automática, versionado, control de duplicados y respaldos.
              </p>
            </div>
          </button>

          {/* 2. Cargar Documentos */}
          <button
            onClick={() => setActiveTab('upload')}
            className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/60 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all text-left flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-orange-500 transition-colors">
                📄 Cargar Docs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                PDF, Word, Excel, PPT, TXT e imágenes escaneadas con OCR.
              </p>
            </div>
          </button>

          {/* 2. Consultar a la IA */}
          <button
            onClick={() => setActiveTab('chat')}
            className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-500 transition-colors">
                🤖 Consultar IA
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Consultas normativas con citas exactas de ley, artículo y página.
              </p>
            </div>
          </button>

          {/* 3. Biblioteca */}
          <button
            onClick={() => setActiveTab('library')}
            className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all text-left flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-amber-500 transition-colors">
                📚 Biblioteca
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Base local de leyes, decretos y resoluciones indexadas.
              </p>
            </div>
          </button>

          {/* 4. Favoritos */}
          <button
            onClick={() => setActiveTab('favorites')}
            className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/60 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all text-left flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-purple-500 transition-colors">
                ⭐ Favoritos ({favoritesCount})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Guardados de consultas, artículos y respuestas relevantes.
              </p>
            </div>
          </button>

          {/* 5. Resúmenes */}
          <button
            onClick={() => setActiveTab('summaries')}
            className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-500 transition-colors">
                📝 Resúmenes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Resúmenes ejecutivos, artículos clave y obligaciones legales.
              </p>
            </div>
          </button>

          {/* 6. Checklists de Inspección */}
          <button
            onClick={() => setActiveTab('checklists')}
            className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/60 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 transition-all text-left flex flex-col justify-between"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-teal-500 transition-colors">
                📋 Checklists
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Listas de inspección en 10 áreas de riesgo exportables a PDF.
              </p>
            </div>
          </button>
        </div>

        {/* Secondary Sleek Modules */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <button
            onClick={() => setActiveTab('image_analysis')}
            className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 transition-all flex items-center gap-4 text-left shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-rose-500 transition-colors">
                📷 Análisis de Fotografías
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detección visual de riesgos e incumplimientos.
              </p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all flex items-center gap-4 text-left shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-cyan-500 transition-colors">
                📜 Historial de Consultas
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registro persistente de preguntas e hilos.
              </p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-500/50 transition-all flex items-center gap-4 text-left shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-orange-500 transition-colors">
                ⚙️ Configuración
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Modelos de IA, base vectorial y preferencias.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Sleek Frequent Questions Launcher */}
      <div className="space-y-3 pt-2">
        <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2 px-1">
          <Search className="w-4 h-4 text-orange-500" />
          <span>Consultas Frecuentes de la Biblioteca</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onQuickQuery(p.title)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left flex items-start gap-3 group shadow-sm"
            >
              <span className="text-xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-500 transition-colors truncate">
                  {p.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {p.desc}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
