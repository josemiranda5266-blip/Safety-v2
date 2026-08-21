export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: any;
}

const SENSITIVE_KEYS = [
  "authorization",
  "auth",
  "token",
  "bearer",
  "apikey",
  "api_key",
  "key",
  "password",
  "secret",
  "base64",
  "imagebase64",
  "content",
  "contents",
  "privatekey",
  "private_key",
  "gemini_api_key",
  "firebase_private_key",
];

export function sanitizeLogMetadata(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== "object") return {};
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = "[REDACTED]";
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = sanitizeLogMetadata(val);
    } else if (typeof val === "string" && val.length > 500) {
      sanitized[key] = val.substring(0, 100) + "...[TRUNCATED]";
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

export function logStructured(
  level: "info" | "warn" | "error",
  event: string,
  metadata: Record<string, any> = {}
): LogEntry {
  const sanitized = sanitizeLogMetadata(metadata);
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitized,
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }

  return entry;
}
