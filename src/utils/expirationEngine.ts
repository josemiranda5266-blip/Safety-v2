import {
  ExpirationAlertLevel,
  ProfessionalDocument,
  DocumentStatus,
} from '../types/documentManagement';

/**
 * Calculates the exact days remaining until expiration and assigns the standardized alert level.
 * @param expirationDate ISO 8601 date string (e.g. "2026-09-01" or "2026-09-01T00:00:00.000Z")
 * @param referenceDate Optional date to compare against (defaults to now)
 */
export function calculateExpirationMetrics(
  expirationDate?: string | null,
  referenceDate: Date = new Date()
): {
  daysUntilExpiration: number | null;
  alertLevel: ExpirationAlertLevel;
  suggestedStatus: DocumentStatus;
} {
  if (!expirationDate || expirationDate.trim() === '') {
    return {
      daysUntilExpiration: null,
      alertLevel: 'no_expiry',
      suggestedStatus: 'vigente',
    };
  }

  const exp = new Date(expirationDate);
  if (isNaN(exp.getTime())) {
    return {
      daysUntilExpiration: null,
      alertLevel: 'no_expiry',
      suggestedStatus: 'vigente',
    };
  }

  // Normalize to UTC midnight for clean calendar-day difference calculation
  const expDay = new Date(Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate())).getTime();
  const refDay = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate())
  ).getTime();

  const diffMs = expDay - refDay;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      daysUntilExpiration: days,
      alertLevel: 'expired',
      suggestedStatus: 'vencido',
    };
  } else if (days <= 7) {
    return {
      daysUntilExpiration: days,
      alertLevel: 'critical_7d',
      suggestedStatus: 'por_vencer',
    };
  } else if (days <= 15) {
    return {
      daysUntilExpiration: days,
      alertLevel: 'urgent_15d',
      suggestedStatus: 'por_vencer',
    };
  } else if (days <= 30) {
    return {
      daysUntilExpiration: days,
      alertLevel: 'warning_30d',
      suggestedStatus: 'por_vencer',
    };
  } else if (days <= 90) {
    return {
      daysUntilExpiration: days,
      alertLevel: 'notice_90d',
      suggestedStatus: 'por_vencer',
    };
  } else {
    return {
      daysUntilExpiration: days,
      alertLevel: 'valid',
      suggestedStatus: 'vigente',
    };
  }
}

/**
 * Enriches a professional document record with up-to-date computed expiration metrics.
 */
export function enrichDocumentWithExpiration(
  doc: ProfessionalDocument,
  referenceDate: Date = new Date()
): ProfessionalDocument {
  const metrics = calculateExpirationMetrics(doc.expirationDate, referenceDate);
  return {
    ...doc,
    daysUntilExpiration: metrics.daysUntilExpiration,
    expirationAlertLevel: metrics.alertLevel,
    status: doc.status === 'archivado' ? 'archivado' : metrics.suggestedStatus,
  };
}

/**
 * UI visual helper to get color schemes and labels for each alert level.
 */
export function getAlertLevelStyle(alertLevel?: ExpirationAlertLevel) {
  switch (alertLevel) {
    case 'expired':
      return {
        label: 'Vencido',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dotClass: 'bg-rose-500',
        borderClass: 'border-rose-500',
        textClass: 'text-rose-600 dark:text-rose-400',
        bgSubtle: 'bg-rose-50 dark:bg-rose-950/30',
        severity: 'danger',
      };
    case 'critical_7d':
      return {
        label: 'Vence en ≤ 7 días',
        badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 animate-pulse',
        dotClass: 'bg-orange-500',
        borderClass: 'border-orange-500',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgSubtle: 'bg-orange-50 dark:bg-orange-950/30',
        severity: 'critical',
      };
    case 'urgent_15d':
      return {
        label: 'Vence en ≤ 15 días',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-500',
        borderClass: 'border-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
        bgSubtle: 'bg-amber-50 dark:bg-amber-950/30',
        severity: 'urgent',
      };
    case 'warning_30d':
      return {
        label: 'Vence en ≤ 30 días',
        badgeClass: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
        dotClass: 'bg-yellow-500',
        borderClass: 'border-yellow-500',
        textClass: 'text-yellow-700 dark:text-yellow-400',
        bgSubtle: 'bg-yellow-50 dark:bg-yellow-950/30',
        severity: 'warning',
      };
    case 'notice_90d':
      return {
        label: 'Vence en ≤ 90 días',
        badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        dotClass: 'bg-sky-500',
        borderClass: 'border-sky-500',
        textClass: 'text-sky-600 dark:text-sky-400',
        bgSubtle: 'bg-sky-50 dark:bg-sky-950/30',
        severity: 'notice',
      };
    case 'valid':
      return {
        label: 'Vigente',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dotClass: 'bg-emerald-500',
        borderClass: 'border-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        bgSubtle: 'bg-emerald-50 dark:bg-emerald-950/30',
        severity: 'success',
      };
    case 'no_expiry':
    default:
      return {
        label: 'Permanente / Sin Vto.',
        badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        dotClass: 'bg-slate-400',
        borderClass: 'border-slate-400',
        textClass: 'text-slate-600 dark:text-slate-400',
        bgSubtle: 'bg-slate-50 dark:bg-slate-900/40',
        severity: 'neutral',
      };
  }
}
