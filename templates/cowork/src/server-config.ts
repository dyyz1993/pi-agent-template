/**
 * Web server configuration — single source of truth.
 * Values are read from environment variables with sensible defaults.
 */

import { randomUUID } from 'crypto';

if (process.env.NODE_ENV === 'production' && !process.env.AUTH_TOKEN) {
	throw new Error(
		'[FATAL] AUTH_TOKEN environment variable must be set in production mode. ' +
			'Example: AUTH_TOKEN=$(openssl rand -hex 32) bun src/server.ts',
	);
}

export function parseEnvInt(
	key: string,
	value: string | undefined,
	defaultValue: number,
	min: number,
	max: number,
): number {
	if (value === undefined || value === '') return defaultValue;
	const parsed = parseInt(value, 10);
	if (isNaN(parsed) || parsed < min || parsed > max) {
		process.stderr.write(`[config] Invalid ${key}: "${value}", using default: ${defaultValue}\n`);
		return defaultValue;
	}
	return parsed;
}

export const config = {
	port: parseEnvInt('PORT', process.env.PORT, 5300, 1024, 65535),
	authToken: process.env.AUTH_TOKEN || `dev-${randomUUID()}`,
	maxUploadSize: parseEnvInt(
		'MAX_UPLOAD_SIZE',
		process.env.MAX_UPLOAD_SIZE,
		50 * 1024 * 1024,
		0,
		1024 * 1024 * 1024,
	),
	logDir: process.env.LOG_DIR || 'logs',
	enableWebService: process.env.ENABLE_WEB_SERVICE === 'true',
	corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:7300',
} as const;
