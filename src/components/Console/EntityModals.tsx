import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Layers, Briefcase, AlertCircle } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Company, Establishment, Sector, Position } from '../../types/tenant';

// --- MODAL: CREATE / EDIT COMPANY ---
interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Company | null;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({ isOpen, onClose, initialData }) => {
  const { createCompany, updateCompany } = useTenant();
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cuit, setCuit] = useState('');
  const [ciiuCode, setCiiuCode] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [artInsuranceName, setArtInsuranceName] = useState('');
  const [artPolicyNumber, setArtPolicyNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setLegalName(initialData.legalName || '');
      setTradeName(initialData.tradeName || '');
      setCuit(initialData.cuit || '');
      setCiiuCode(initialData.ciiuCode || '');
      setActivityDescription(initialData.activityDescription || '');
      setArtInsuranceName(initialData.artInsuranceName || '');
      setArtPolicyNumber(initialData.artPolicyNumber || '');
    } else {
      setLegalName('');
      setTradeName('');
      setCuit('');
      setCiiuCode('');
      setActivityDescription('');
      setArtInsuranceName('');
      setArtPolicyNumber('');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (initialData) {
        await updateCompany(initialData.id, {
          legalName,
          tradeName: tradeName || undefined,
          cuit,
          ciiuCode: ciiuCode || undefined,
          activityDescription: activityDescription || undefined,
          artInsuranceName: artInsuranceName || undefined,
          artPolicyNumber: artPolicyNumber || undefined,
        });
      } else {
        await createCompany({
          legalName,
          tradeName: tradeName || undefined,
          cuit,
          ciiuCode: ciiuCode || undefined,
          activityDescription: activityDescription || undefined,
          artInsuranceName: artInsuranceName || undefined,
          artPolicyNumber: artPolicyNumber || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {initialData ? 'Editar Empresa' : 'Nueva Empresa Cliente'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Razón Social *
            </label>
            <input
              type="text"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Ej: Industrias Metalúrgicas del Sur S.A."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                CUIT *
              </label>
              <input
                type="text"
                required
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="30-12345678-9"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre Fantasía
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Ej: MetalSur"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Aseguradora ART
              </label>
              <input
                type="text"
                value={artInsuranceName}
                onChange={(e) => setArtInsuranceName(e.target.value)}
                placeholder="Ej: Prevención ART / La Segunda"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Póliza ART Nº
              </label>
              <input
                type="text"
                value={artPolicyNumber}
                onChange={(e) => setArtPolicyNumber(e.target.value)}
                placeholder="Ej: 98765432"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Actividad Principal / CIIU
            </label>
            <input
              type="text"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              placeholder="Ej: Fabricación de estructuras metálicas y calderería"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- MODAL: CREATE / EDIT ESTABLISHMENT ---
interface EstablishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Establishment | null;
}

export const EstablishmentModal: React.FC<EstablishmentModalProps> = ({ isOpen, onClose, initialData }) => {
  const { companies, activeCompanyId, createEstablishment, updateEstablishment } = useTenant();
  const [companyId, setCompanyId] = useState(activeCompanyId || (companies[0]?.id || ''));
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Buenos Aires');
  const [postalCode, setPostalCode] = useState('');
  const [totalWorkers, setTotalWorkers] = useState<number | undefined>(undefined);
  const [surfaceM2, setSurfaceM2] = useState<number | undefined>(undefined);
  const [isConstructionSite, setIsConstructionSite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCompanyId(initialData.companyId);
      setName(initialData.name || '');
      setAddress(initialData.address || '');
      setCity(initialData.city || '');
      setProvince(initialData.province || 'Buenos Aires');
      setPostalCode(initialData.postalCode || '');
      setTotalWorkers(initialData.totalWorkers);
      setSurfaceM2(initialData.surfaceM2);
      setIsConstructionSite(!!initialData.isConstructionSite);
    } else {
      setCompanyId(activeCompanyId || (companies[0]?.id || ''));
      setName('');
      setAddress('');
      setCity('');
      setProvince('Buenos Aires');
      setPostalCode('');
      setTotalWorkers(undefined);
      setSurfaceM2(undefined);
      setIsConstructionSite(false);
    }
    setError(null);
  }, [initialData, isOpen, activeCompanyId, companies]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      setError('Debes seleccionar una empresa');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (initialData) {
        await updateEstablishment(initialData.id, {
          companyId,
          name,
          address,
          city,
          province,
          postalCode: postalCode || undefined,
          totalWorkers: totalWorkers ? Number(totalWorkers) : undefined,
          surfaceM2: surfaceM2 ? Number(surfaceM2) : undefined,
          isConstructionSite,
        });
      } else {
        await createEstablishment({
          companyId,
          name,
          address,
          city,
          province,
          postalCode: postalCode || undefined,
          totalWorkers: totalWorkers ? Number(totalWorkers) : undefined,
          surfaceM2: surfaceM2 ? Number(surfaceM2) : undefined,
          isConstructionSite,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar establecimiento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {initialData ? 'Editar Establecimiento' : 'Nuevo Establecimiento / Planta'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Empresa Titular *
            </label>
            <select
              required
              disabled={!!initialData}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName} (CUIT: {c.cuit})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nombre de la Planta o Sede *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Planta Industrial Munro / Depósito Central"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Dirección *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. Mitre 2450"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Localidad *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Vicente López"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Provincia *
              </label>
              <input
                type="text"
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Ej: Buenos Aires / CABA / Córdoba"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Total Operarios
              </label>
              <input
                type="number"
                value={totalWorkers || ''}
                onChange={(e) => setTotalWorkers(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ej: 35"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Superficie (m²)
              </label>
              <input
                type="number"
                value={surfaceM2 || ''}
                onChange={(e) => setSurfaceM2(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ej: 1200"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isConstructionSite"
              checked={isConstructionSite}
              onChange={(e) => setIsConstructionSite(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="isConstructionSite" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Es Obra en Construcción (Aplica Dec. 911/96)
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Establecimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- MODAL: CREATE / EDIT SECTOR ---
interface SectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Sector | null;
}

export const SectorModal: React.FC<SectorModalProps> = ({ isOpen, onClose, initialData }) => {
  const { companies, establishments, activeCompanyId, createSector, updateSector } = useTenant();
  const [companyId, setCompanyId] = useState(activeCompanyId || (companies[0]?.id || ''));
  const [establishmentId, setEstablishmentId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [noiseLevelEstimatedDBA, setNoiseLevelEstimatedDBA] = useState<number | undefined>(undefined);
  const [requiresSpecificPPE, setRequiresSpecificPPE] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableEsts = establishments.filter((e) => e.companyId === companyId);

  useEffect(() => {
    if (initialData) {
      setCompanyId(initialData.companyId);
      setEstablishmentId(initialData.establishmentId);
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setResponsibleName(initialData.responsibleName || '');
      setNoiseLevelEstimatedDBA(initialData.noiseLevelEstimatedDBA);
      setRequiresSpecificPPE(!!initialData.requiresSpecificPPE);
    } else {
      const initCompId = activeCompanyId || (companies[0]?.id || '');
      setCompanyId(initCompId);
      const firstEst = establishments.find((e) => e.companyId === initCompId);
      setEstablishmentId(firstEst?.id || '');
      setName('');
      setDescription('');
      setResponsibleName('');
      setNoiseLevelEstimatedDBA(undefined);
      setRequiresSpecificPPE(false);
    }
    setError(null);
  }, [initialData, isOpen, activeCompanyId, companies, establishments]);

  // Update establishmentId if company changes
  const handleCompanyChange = (cId: string) => {
    setCompanyId(cId);
    const ests = establishments.filter((e) => e.companyId === cId);
    setEstablishmentId(ests[0]?.id || '');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!establishmentId) {
      setError('Debes seleccionar un establecimiento para el sector');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (initialData) {
        await updateSector(initialData.id, {
          companyId,
          establishmentId,
          name,
          description: description || undefined,
          responsibleName: responsibleName || undefined,
          noiseLevelEstimatedDBA: noiseLevelEstimatedDBA ? Number(noiseLevelEstimatedDBA) : undefined,
          requiresSpecificPPE,
        });
      } else {
        await createSector({
          companyId,
          establishmentId,
          name,
          description: description || undefined,
          responsibleName: responsibleName || undefined,
          noiseLevelEstimatedDBA: noiseLevelEstimatedDBA ? Number(noiseLevelEstimatedDBA) : undefined,
          requiresSpecificPPE,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar sector');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {initialData ? 'Editar Sector' : 'Nuevo Sector Operativo'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Empresa *
              </label>
              <select
                required
                disabled={!!initialData}
                value={companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legalName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Establecimiento *
              </label>
              <select
                required
                value={establishmentId}
                onChange={(e) => setEstablishmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {availableEsts.length === 0 ? (
                  <option value="">No hay establecimientos</option>
                ) : (
                  availableEsts.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nombre del Sector *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Taller de Soldadura / Muelle de Carga"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Responsable de Área
              </label>
              <input
                type="text"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Ej: Ing. Carlos Pérez"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nivel Sonoro Est. (dBA)
              </label>
              <input
                type="number"
                value={noiseLevelEstimatedDBA || ''}
                onChange={(e) => setNoiseLevelEstimatedDBA(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ej: 85"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="requiresSpecificPPE"
              checked={requiresSpecificPPE}
              onChange={(e) => setRequiresSpecificPPE(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="requiresSpecificPPE" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Requiere EPP específico obligatorio en el área
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Sector'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- MODAL: CREATE / EDIT POSITION ---
interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Position | null;
}

export const PositionModal: React.FC<PositionModalProps> = ({ isOpen, onClose, initialData }) => {
  const { companies, establishments, sectors, activeCompanyId, createPosition, updatePosition } = useTenant();
  const [companyId, setCompanyId] = useState(activeCompanyId || (companies[0]?.id || ''));
  const [establishmentId, setEstablishmentId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiresAnnualAudiometry, setRequiresAnnualAudiometry] = useState(false);
  const [requiresRespiratoryProtection, setRequiresRespiratoryProtection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableEsts = establishments.filter((e) => e.companyId === companyId);
  const availableSecs = sectors.filter((s) => s.companyId === companyId && s.establishmentId === establishmentId);

  useEffect(() => {
    if (initialData) {
      setCompanyId(initialData.companyId);
      setEstablishmentId(initialData.establishmentId);
      setSectorId(initialData.sectorId);
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setRequiresAnnualAudiometry(!!initialData.requiresAnnualAudiometry);
      setRequiresRespiratoryProtection(!!initialData.requiresRespiratoryProtection);
    } else {
      const initCompId = activeCompanyId || (companies[0]?.id || '');
      setCompanyId(initCompId);
      const firstEst = establishments.find((e) => e.companyId === initCompId);
      const initEstId = firstEst?.id || '';
      setEstablishmentId(initEstId);
      const firstSec = sectors.find((s) => s.companyId === initCompId && s.establishmentId === initEstId);
      setSectorId(firstSec?.id || '');
      setTitle('');
      setDescription('');
      setRequiresAnnualAudiometry(false);
      setRequiresRespiratoryProtection(false);
    }
    setError(null);
  }, [initialData, isOpen, activeCompanyId, companies, establishments, sectors]);

  const handleCompanyChange = (cId: string) => {
    setCompanyId(cId);
    const ests = establishments.filter((e) => e.companyId === cId);
    const newEstId = ests[0]?.id || '';
    setEstablishmentId(newEstId);
    const secs = sectors.filter((s) => s.companyId === cId && s.establishmentId === newEstId);
    setSectorId(secs[0]?.id || '');
  };

  const handleEstablishmentChange = (eId: string) => {
    setEstablishmentId(eId);
    const secs = sectors.filter((s) => s.companyId === companyId && s.establishmentId === eId);
    setSectorId(secs[0]?.id || '');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!establishmentId || !sectorId) {
      setError('Debes seleccionar un establecimiento y un sector');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (initialData) {
        await updatePosition(initialData.id, {
          companyId,
          establishmentId,
          sectorId,
          title,
          description: description || undefined,
          requiresAnnualAudiometry,
          requiresRespiratoryProtection,
        });
      } else {
        await createPosition({
          companyId,
          establishmentId,
          sectorId,
          title,
          description: description || undefined,
          requiresAnnualAudiometry,
          requiresRespiratoryProtection,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar puesto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {initialData ? 'Editar Puesto' : 'Nuevo Puesto de Trabajo'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Establecimiento *
              </label>
              <select
                required
                value={establishmentId}
                onChange={(e) => handleEstablishmentChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {availableEsts.length === 0 ? (
                  <option value="">Sin establecimientos</option>
                ) : (
                  availableEsts.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Sector *
              </label>
              <select
                required
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                {availableSecs.length === 0 ? (
                  <option value="">Sin sectores</option>
                ) : (
                  availableSecs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Denominación del Puesto *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Soldador TIG / Operador de Autoelevador"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Descripción de Tareas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle de actividades, maquinaria utilizada y agentes de riesgo..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresAnnualAudiometry"
                checked={requiresAnnualAudiometry}
                onChange={(e) => setRequiresAnnualAudiometry(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="requiresAnnualAudiometry" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Exposición a Ruido (Requiere Audiometría Periódica Res. 37/10)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresRespiratoryProtection"
                checked={requiresRespiratoryProtection}
                onChange={(e) => setRequiresRespiratoryProtection(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="requiresRespiratoryProtection" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Exposición a Partículas/Gases (Protección Respiratoria)
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Puesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
