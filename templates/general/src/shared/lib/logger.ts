import {
	appendFile,
	mkdir as mkdirAsync,
	readdir as readdirAsync,
	unlink as unlinkAsync,
	stat as statAsync,
} from "fs/promises";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

export type LogModule =
	| "server"
	| "gateway"
	| "system"
	| "chat"
	| "file"
	| "timer"
	| "git"
	| "feed"
	| "web-server";
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	module: LogModule;
	message: string;
	data?: Record<string, unknown>;
}

let _logDir: string | null = null;
let _maxAgeDays = 30;

export async function configureLogDir(
	dir: string,
	options?: { maxAgeDays?: number }
): Promise<void> {
	_logDir = dir;
	if (options?.maxAgeDays !== undefined) {
		_maxAgeDays = options.maxAgeDays;
	}
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	await cleanOldLogs(dir, _maxAgeDays);
}

function getLogDir(): string {
	if (!_logDir) {
		_logDir = "logs";
		if (!existsSync(_logDir)) {
			mkdirSync(_logDir, { recursive: true });
		}
	}
	return _logDir;
}

async function cleanOldLogs(dir: string, maxAgeDays: number): Promise<void> {
	try {
		if (!existsSync(dir)) return;
		const files = await readdirAsync(dir);
		const cutoff = Date.now() - maxAgeDays * 86400000;
		for (const f of files) {
			if (!f.endsWith(".log")) continue;
			const filePath = join(dir, f);
			const s = await statAsync(filePath);
			if (s.mtimeMs < cutoff) {
				await unlinkAsync(filePath);
			}
		}
	} catch {
		/* ignore */
	}
}

function formatLine(entry: LogEntry): string {
	const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
	return entry.data ? `${base} ${JSON.stringify(entry.data)}` : base;
}

let writeQueue: Promise<void> = Promise.resolve();

function writeToFile(line: string): void {
	writeQueue = writeQueue.then(async () => {
		try {
			const date = new Date().toISOString().slice(0, 10);
			const dir = getLogDir();
			if (!existsSync(dir)) {
				await mkdirAsync(dir, { recursive: true });
			}
			await appendFile(join(dir, `${date}.log`), `${line}\n`);
		} catch {
			/* ignore */
		}
	});
}

export function flushLogs(): Promise<void> {
	return writeQueue;
}

export class Logger {
	private readonly module: LogModule;

	constructor(module: LogModule) {
		this.module = module;
	}

	debug(message: string, data?: Record<string, unknown>): void {
		this.write("debug", message, data);
	}

	info(message: string, data?: Record<string, unknown>): void {
		this.write("info", message, data);
	}

	warn(message: string, data?: Record<string, unknown>): void {
		this.write("warn", message, data);
	}

	error(message: string, data?: Record<string, unknown>): void {
		this.write("error", message, data);
	}

	private write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			module: this.module,
			message,
			...(data ? { data } : {}),
		};

		const line = formatLine(entry);

		if (level === "error") {
			console.error(line);
		} else if (level === "warn") {
			console.warn(line);
		} else {
			console.log(line);
		}

		if (process.env.NODE_ENV !== "production" || level !== "debug") {
			writeToFile(line);
		}
	}
}

export function createLogger(module: LogModule): Logger {
	return new Logger(module);
}
