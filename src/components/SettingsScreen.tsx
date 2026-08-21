import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Database, RefreshCw, Trash2, Cpu, Sparkles, Smartphone, Globe, CloudCheck, CheckCircle2, Zap, Shield, Award } from 'lucide-react';
import { db } from '../services/db';
import { UserProfile, UserPlan } from '../types/safety';

interface SettingsScreenProps {
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  onDataReset: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isDarkMode,
  setIsDarkMode,
  onDataReset,
}) => {
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const p = await db.getUserProfile();
      setProfile(p);
    } catch (e) {
      console.warn('Error cargando perfil:', e);
    }
  };

  const handlePlanChange = async (newPlan: UserPlan) => {
    setIsUpdatingPlan(true);
    try {
      const updated = await db.changeUserPlan(newPlan);
      setProfile(updated);
      setResetMessage(`Plan actualizado exitosamente a: ${newPlan.toUpperCase()}`);
      setTimeout(() => setResetMessage(null), 3000);
    } catch (err: any) {
      alert('Error cambiando de plan: ' + (err.message || 'Inténtelo más tarde'));
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleResetSeed = () => {
    if (confirm('¿Restablecer la biblioteca local con la legislación base de Higiene y Seguridad Laboral?')) {
      db.resetToDefaultSeed();
      onDataReset();
      setResetMessage('Biblioteca restablecida con las normas base de Seguridad.');
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

  const handleClearAll = () => {
    if (confirm('⚠️ ATENCIÓN: Se eliminarán todos los documentos subidos, chats y listas. ¿Continuar?')) {
      db.clearAllData();
      onDataReset();
      setResetMessage('Todos los datos fueron purgados.');
      setTimeout(() => setResetMessage(null), 3000);
    }
  };

  const docsCount = db.getDocuments().length;
  const chunksCount = db.getChunks().length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Settings className="w-4 h-4" />
          <span>Ajustes del Sistema</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Configuración
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Gestiona las preferencias visuales, suscripción Freemium, créditos de IA y base de datos.
        </p>
      </div>

      {resetMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
          {resetMessage}
        </div>
      )}

      {/* Freemium & Credit Usage Section */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Plan de Suscripción & Créditos de IA</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
            Plan {profile?.plan || 'Free'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <p className="text-xs text-slate-400">Créditos Disponibles</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {profile ? Math.max(0, profile.monthlyCredits - profile.creditsUsed) : 20}{' '}
              <span className="text-xs font-normal text-slate-400">/ {profile?.monthlyCredits || 20}</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <p className="text-xs text-slate-400">Consumo Este Ciclo</p>
            <p className="text-2xl font-extrabold text-orange-400 mt-1">
              {profile?.creditsUsed || 0} <span className="text-xs font-normal text-slate-400">créditos</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <p className="text-xs text-slate-400">Próxima Renovación</p>
            <p className="text-sm font-bold text-slate-200 mt-2">
              {profile?.billingPeriodEnd ? new Date(profile.billingPeriodEnd).toLocaleDateString('es-AR') : 'Mensual'}
            </p>
          </div>
        </div>

        {/* Change Plan Options */}
        <div className="pt-2">
          <p className="text-xs font-bold text-slate-300 mb-2">Planes para Profesionales de Higiene y Seguridad:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              disabled={isUpdatingPlan || profile?.plan === 'free'}
              onClick={() => handlePlanChange('free')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                profile?.plan === 'free'
                  ? 'border-orange-500 bg-orange-500/15 text-white'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">Plan Gratuito</span>
                <span className="text-[10px] text-slate-400">$0/mes</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">20 créditos/mes. Consultas RAG, OCR y síntesis básica.</p>
            </button>

            <button
              disabled={isUpdatingPlan || profile?.plan === 'pro'}
              onClick={() => handlePlanChange('pro')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                profile?.plan === 'pro'
                  ? 'border-orange-500 bg-orange-500/15 text-white'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-orange-400 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Profesional Pro
                </span>
                <span className="text-[10px] text-orange-300 font-bold">$19/mes</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">250 créditos/mes. Informes Inspector IA y diagnósticos sin límite diario.</p>
            </button>

            <button
              disabled={isUpdatingPlan || profile?.plan === 'pro_plus'}
              onClick={() => handlePlanChange('pro_plus')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                profile?.plan === 'pro_plus'
                  ? 'border-orange-500 bg-orange-500/15 text-white'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Estudio Pro+
                </span>
                <span className="text-[10px] text-amber-300 font-bold">$49/mes</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">1000 créditos/mes. Auditorías corporativas, multicontexto y máxima prioridad.</p>
            </button>
          </div>
        </div>
      </div>

      {/* Multiplatform Web & Android Sync Status */}
      <div className="p-6 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-500/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudCheck className="w-6 h-6 text-amber-300" />
            <h2 className="text-base font-extrabold text-white">
              Sincronización Multiplataforma (Web & Android)
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Sincronización Activa</span>
          </span>
        </div>

        <p className="text-xs text-blue-100 leading-relaxed">
          Tu cuenta comparte la misma base de datos en la nube (Firestore). Todos tus documentos, consultas con IA, favoritos, resúmenes y checklists se sincronizan automáticamente en tiempo real entre la versión Web y la App Android.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-white">Versión Web Responsive</p>
              <p className="text-[11px] text-blue-100">Accesible desde cualquier navegador de PC o tablet.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-white">Versión Android</p>
              <p className="text-[11px] text-blue-100">Instalable como PWA o APK nativa en dispositivos Android.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>Apariencia de la Interfaz</span>
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Modo Oscuro (Material Design 3 Slate)
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Optimizado para la vista en entornos laborales de baja iluminación.
            </p>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${
              isDarkMode ? 'bg-orange-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Local Database Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-orange-500" />
          <span>Estado de la Base de Datos Nube / Local</span>
        </h2>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">Documentos Indexados</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{docsCount}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">Fragmentos RAG Registrados</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{chunksCount}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleResetSeed}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-orange-500" />
            <span>Recargar Legislación Base</span>
          </button>

          <button
            onClick={handleClearAll}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Borrar Todo el Almacenamiento</span>
          </button>
        </div>
      </div>

      {/* Model & AI Engine Status */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center gap-2 text-orange-400 text-xs font-bold">
          <Cpu className="w-4 h-4" />
          <span>Motor IA y Resiliencia con Reintentos Automáticos</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>Safety IA</strong> opera con el SDK unificado <code className="text-orange-400">@google/genai</code> con recuperación automática ante errores de demanda 503 y 429 mediante reintentos exponenciales con jitter y fallback inteligente a <code className="text-orange-400">gemini-2.5-flash</code>.
        </p>
      </div>
    </div>
  );
};
