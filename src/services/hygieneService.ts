import { HygieneMeasurement, HygieneInstrument } from '../types/safety';
import { auth } from './firebase';

type ApiInstrument = Omit<HygieneInstrument, 'id'> & { id: string; category: string; instrumentType: string; status: string; active: boolean; notes?: string | null };
type ApiMeasurement = { id: string; context: { companyId: string; establishmentId: string; sectorId?: string; positionId?: string; employeeId?: string }; protocolType: string; measurementDate: string; instrumentIds: string[]; notes?: string | null; rawData?: Record<string, unknown>; status: string };

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}/api/v2/hygiene${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Hygiene API request failed');
  return payload as T;
}

function toLegacyInstrument(item: ApiInstrument): HygieneInstrument {
  return {
    id: item.id,
    brand: item.brand,
    model: item.model,
    serialNumber: item.serialNumber,
    calibrationDate: item.calibrationDate || '',
    calibrationExpiry: item.calibrationExpiry || '',
    certificateUrl: item.certificateUrl || '',
  };
}

function toLegacyMeasurement(item: ApiMeasurement): HygieneMeasurement {
  const raw = item.rawData || {};
  return {
    id: item.id,
    companyId: item.context.companyId,
    establishmentId: item.context.establishmentId,
    sectorId: item.context.sectorId || '',
    jobPositionId: item.context.positionId || '',
    agent: item.protocolType,
    instrumentId: item.instrumentIds[0] || '',
    date: item.measurementDate,
    value: typeof raw.value === 'number' ? raw.value : 0,
    unit: typeof raw.unit === 'string' ? raw.unit : '',
    applicableLimit: typeof raw.applicableLimit === 'number' ? raw.applicableLimit : 0,
    result: raw.result === 'No Aceptable' ? 'No Aceptable' : 'Aceptable',
    professionalName: typeof raw.professionalName === 'string' ? raw.professionalName : '',
    reportUrl: typeof raw.reportUrl === 'string' ? raw.reportUrl : undefined,
    certificateUrl: typeof raw.certificateUrl === 'string' ? raw.certificateUrl : undefined,
  };
}

export const hygieneService = {
  async getMeasurements(companyId?: string): Promise<HygieneMeasurement[]> {
    const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    const { measurements } = await request<{ measurements: ApiMeasurement[] }>(`/measurements${query}`);
    return measurements.map(toLegacyMeasurement);
  },

  async addMeasurement(measurement: Omit<HygieneMeasurement, 'id'>, companyId: string): Promise<string> {
    const { measurement: created } = await request<{ measurement: ApiMeasurement }>('/measurements', {
      method: 'POST',
      body: JSON.stringify({
        context: {
          companyId,
          establishmentId: measurement.establishmentId,
          sectorId: measurement.sectorId || undefined,
          positionId: measurement.jobPositionId || undefined,
        },
        protocolType: measurement.agent,
        measurementDate: measurement.date,
        instrumentIds: [measurement.instrumentId],
        rawData: {
          value: measurement.value,
          unit: measurement.unit,
          applicableLimit: measurement.applicableLimit,
          result: measurement.result,
          professionalName: measurement.professionalName,
          reportUrl: measurement.reportUrl,
          certificateUrl: measurement.certificateUrl,
        },
      }),
    });
    return created.id;
  },

  async getInstruments(): Promise<HygieneInstrument[]> {
    const { instruments } = await request<{ instruments: ApiInstrument[] }>('/instruments');
    return instruments.map(toLegacyInstrument);
  },

  async addInstrument(instrument: Omit<HygieneInstrument, 'id'>): Promise<string> {
    const { instrument: created } = await request<{ instrument: ApiInstrument }>('/instruments', {
      method: 'POST',
      body: JSON.stringify({
        category: 'other',
        instrumentType: 'general',
        brand: instrument.brand,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        calibrationDate: instrument.calibrationDate || undefined,
        calibrationExpiry: instrument.calibrationExpiry || undefined,
        certificateUrl: instrument.certificateUrl || undefined,
        status: 'active',
      }),
    });
    return created.id;
  },
};