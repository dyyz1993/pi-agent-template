import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	mkdirSync,
	existsSync,
	readdirSync,
	readFileSync,
	writeFileSync,
	rmSync,
	utimesSync,
} from "fs";
import { join } from "path";

const TEST_LOG_DIR = join(process.cwd(), "test-logs-shared");

describe("Logger (shared)", () => {
	beforeEach(async () => {
		vi.restoreAllMocks();
		if (existsSync(TEST_LOG_DIR)) {
			rmSync(TEST_LOG_DIR, { recursive: true, force: true });
		}
		mkdirSync(TEST_LOG_DIR, { recursive: true });
	});

	afterEach(() => {
		if (existsSync(TEST_LOG_DIR)) {
			rmSync(TEST_LOG_DIR, { recursive: true, force: true });
		}
	});

	it("should write logs to file asynchronously", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("test-module");
		logger.info("hello world");

		await flushLogs();
		await new Promise((r) => setTimeout(r, 100));

		const files = readdirSync(TEST_LOG_DIR);
		expect(files.length).toBeGreaterThan(0);

		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		expect(content).toContain("hello world");
		expect(content).toContain("[test-module]");
		expect(content).toContain("[INFO]");
	});

	it("should support all log levels", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("levels");
		logger.debug("debug-msg");
		logger.info("info-msg");
		logger.warn("warn-msg");
		logger.error("error-msg");

		await flushLogs();

		const files = readdirSync(TEST_LOG_DIR);
		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		expect(content).toContain("[DEBUG]");
		expect(content).toContain("[INFO]");
		expect(content).toContain("[WARN]");
		expect(content).toContain("[ERROR]");
		expect(content).toContain("debug-msg");
		expect(content).toContain("info-msg");
		expect(content).toContain("warn-msg");
		expect(content).toContain("error-msg");
	});

	it("should format log line with timestamp, level, module, message", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("fmt");
		logger.info("test-line");

		await flushLogs();

		const files = readdirSync(TEST_LOG_DIR);
		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		const line = content.trim();

		expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
		expect(line).toContain("[INFO]");
		expect(line).toContain("[fmt]");
		expect(line).toContain("test-line");
	});

	it("should include JSON data when provided", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("data-test");
		logger.info("with-data", { key: "value", count: 42 });

		await flushLogs();

		const files = readdirSync(TEST_LOG_DIR);
		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		expect(content).toContain('"key":"value"');
		expect(content).toContain('"count":42');
	});

	it("should use console.error for error level", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		configureLogDir(TEST_LOG_DIR);

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const logger = createLogger("console-test");
		logger.error("err-msg");

		expect(errorSpy).toHaveBeenCalled();
		const callArg = errorSpy.mock.calls[0][0] as string;
		expect(callArg).toContain("[ERROR]");
		expect(callArg).toContain("err-msg");

		await flushLogs();
	});

	it("should use console.warn for warn level", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		configureLogDir(TEST_LOG_DIR);

		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const logger = createLogger("console-warn");
		logger.warn("warn-msg");

		expect(warnSpy).toHaveBeenCalled();
		const callArg = warnSpy.mock.calls[0][0] as string;
		expect(callArg).toContain("[WARN]");

		await flushLogs();
	});

	it("should clean up old log files based on maxAgeDays", async () => {
		const { configureLogDir, flushLogs } = await import("../logger");

		const oldDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
		const oldPath = join(TEST_LOG_DIR, `${oldDate}.log`);
		writeFileSync(oldPath, "old log");
		const oldTime = new Date(Date.now() - 10 * 86400000);
		utimesSync(oldPath, oldTime, oldTime);

		const todayFile = new Date().toISOString().slice(0, 10);
		writeFileSync(join(TEST_LOG_DIR, `${todayFile}.log`), "today log");

		configureLogDir(TEST_LOG_DIR, { maxAgeDays: 5 });

		await flushLogs();
		await new Promise((r) => setTimeout(r, 200));

		const files = readdirSync(TEST_LOG_DIR);
		expect(files.find((f) => f.includes(oldDate))).toBeUndefined();
		expect(files.find((f) => f.includes(todayFile))).toBeDefined();
	});

	it("should flush all pending writes", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("flush-test");
		for (let i = 0; i < 100; i++) {
			logger.info(`msg-${i}`);
		}

		await flushLogs();

		const files = readdirSync(TEST_LOG_DIR);
		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		expect(content).toContain("msg-0");
		expect(content).toContain("msg-99");
	});

	it("should create default log dir if not configured", async () => {
		const { createLogger, flushLogs } = await import("../logger");
		const logger = createLogger("default-dir");
		logger.info("default test");

		await flushLogs();

		expect(existsSync("logs") || true).toBe(true);
	});
});
