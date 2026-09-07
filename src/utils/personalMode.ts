/**
 * Safety IA runs as a personal/local-first application by default.
 * Set VITE_SAFETY_PERSONAL_MODE=false only when explicitly re-enabling
 * the multi-tenant/cloud authentication flow.
 */
export const isPersonalMode = (): boolean => {
  return import.meta.env.VITE_SAFETY_PERSONAL_MODE !== 'false';
};
