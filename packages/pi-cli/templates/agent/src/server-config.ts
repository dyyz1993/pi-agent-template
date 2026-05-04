/**
 * Web server configuration — single source of truth.
 * Values are read from environment variables with sensible defaults.
 */

export function parseEnvInt(
  key: string,
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === "") return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    console.warn(
      `[config] Invalid ${key}: "${value}", using default: ${defaultValue}`,
    );
    return defaultValue;
  }
  return parsed;
}

export const config = {
  port: parseEnvInt("PORT", process.env.PORT, 3100, 1024, 65535),
  authToken: process.env.AUTH_TOKEN || "pi-agent-template-token",
  maxUploadSize: parseEnvInt(
    "MAX_UPLOAD_SIZE",
    process.env.MAX_UPLOAD_SIZE,
    50 * 1024 * 1024,
    0,
    1024 * 1024 * 1024,
  ),
  logDir: process.env.LOG_DIR || "logs",
  enableBash: process.env.ENABLE_BASH !== "false",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
} as const;

if (process.env.NODE_ENV === "production" && !process.env.AUTH_TOKEN) {
  console.warn(
    "[security] WARNING: Using default AUTH_TOKEN in production. Set AUTH_TOKEN environment variable.",
  );
}
