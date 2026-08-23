export function getApiBaseUrl(): string {
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) || '';
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  
  if (!trimmed) {
    return '/api';
  }

  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

export function buildApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    return `${base.replace(/\/api$/, '')}${cleanEndpoint}`;
  }
  if (base.endsWith('/api') && cleanEndpoint === '/api') {
    return base;
  }
  
  return `${base}${cleanEndpoint}`;
}

export interface ApiHealthResult {
  ok: boolean;
  url: string;
  status: number;
  contentType: string;
  preview: string;
  error?: string;
}

export async function checkApiHealth(): Promise<ApiHealthResult> {
  const url = buildApiUrl('/health/liveness');
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text().catch(() => '');
    const preview = rawText.slice(0, 200);

    let data: any = null;
    let isJson = false;
    try {
      if (rawText && rawText.trim().length > 0) {
        data = JSON.parse(rawText);
        isJson = true;
      }
    } catch (_e) {
      isJson = false;
    }

    if (!res.ok) {
      return {
        ok: false,
        url,
        status: res.status,
        contentType,
        preview,
        error: `El servidor respondió HTTP ${res.status}.`
      };
    }

    if (!isJson || contentType.toLowerCase().includes('text/html')) {
      return {
        ok: false,
        url,
        status: res.status,
        contentType,
        preview,
        error: `El frontend está apuntando a un servidor que no está exponiendo el API de Safety IA (recibió HTML o no-JSON). URL: ${url} [Status: ${res.status}] [ContentType: ${contentType}] [Preview: ${preview}]`
      };
    }

    if (data && data.status === 'ok') {
      return {
        ok: true,
        url,
        status: res.status,
        contentType,
        preview
      };
    }

    return {
      ok: false,
      url,
      status: res.status,
      contentType,
      preview,
      error: `Respuesta de liveness inválida: ${preview}`
    };
  } catch (err: any) {
    return {
      ok: false,
      url,
      status: 0,
      contentType: '',
      preview: '',
      error: `Error de red al consultar ${url}: ${err.message || err}`
    };
  }
}
