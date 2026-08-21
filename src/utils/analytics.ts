/**
 * Decoupled, Privacy-Preserving Product Analytics Engine for Safety IA
 */

export type AnalyticsEventName =
  | 'user_signup'
  | 'onboarding_completed'
  | 'document_uploaded'
  | 'first_document_uploaded'
  | 'ai_query_submitted'
  | 'ai_query_success'
  | 'credit_exhausted'
  | 'upgrade_button_clicked';

export interface AnalyticsEventProps {
  category?: string;
  fileType?: string;
  queryCategory?: string;
  plan?: string;
  source?: string;
  [key: string]: any;
}

// Sanitization block list to prevent accidental leaks of JWTs, keys, or passwords
const SENSITIVE_KEYS = new Set([
  'token',
  'jwt',
  'authorization',
  'apiKey',
  'password',
  'secret',
  'content',
  'imageBase64',
  'fileBase64',
]);

function sanitizeProperties(props?: AnalyticsEventProps): Record<string, any> {
  if (!props) return {};

  const cleanProps: Record<string, any> = {};

  for (const [key, val] of Object.entries(props)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue; // Drop sensitive properties
    }
    if (typeof val === 'string' && val.length > 200) {
      cleanProps[key] = val.substring(0, 200) + '...[truncated]';
    } else {
      cleanProps[key] = val;
    }
  }

  return cleanProps;
}

/**
 * Tracks a product analytics event cleanly and safely.
 */
export function trackEvent(eventName: AnalyticsEventName, properties?: AnalyticsEventProps): void {
  const cleanProps = sanitizeProperties(properties);
  const payload = {
    event: eventName,
    properties: cleanProps,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics Event]', payload);
  }

  // Hook point for external vendor adapters (GA4, PostHog, Mixpanel, etc.) if configured
  try {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, cleanProps);
    }
  } catch (e) {
    // Fail silently to never impact core UX
  }
}
