import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

const TEST_LOG_DIR = join(process.cwd(), "test-logs");

describe("Logger", () => {
	beforeEach(async () => {
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

	it("should write logs asynchronously", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		await configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("test");
		logger.info("test message");

		await flushLogs();
		await new Promise((r) => setTimeout(r, 100));

		const files = readdirSync(TEST_LOG_DIR);
		expect(files.length).toBeGreaterThan(0);

		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		expect(content).toContain("test message");
	});

	it("should support multiple log levels", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		await configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("test");
		logger.debug("debug msg");
		logger.info("info msg");
		logger.warn("warn msg");
		logger.error("error msg");

		await flushLogs();

		const files = readdirSync(TEST_LOG_DIR);
		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		expect(content).toContain("info msg");
		expect(content).toContain("warn msg");
		expect(content).toContain("error msg");
	});

	it("should clean up old log files based on maxAgeDays", async () => {
		const { configureLogDir } = await import("../logger");

		const oldDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
		const oldPath = join(TEST_LOG_DIR, `${oldDate}.log`);
		writeFileSync(oldPath, "old log");
		const oldTime = new Date(Date.now() - 10 * 86400000);
		utimesSync(oldPath, oldTime, oldTime);

		const todayFile = new Date().toISOString().slice(0, 10);
		writeFileSync(join(TEST_LOG_DIR, `${todayFile}.log`), "today log");

		await configureLogDir(TEST_LOG_DIR, { maxAgeDays: 5 });

		const files = readdirSync(TEST_LOG_DIR);
		expect(files.find((f) => f.includes(oldDate))).toBeUndefined();
		expect(files.find((f) => f.includes(todayFile))).toBeDefined();
	});

	it("should flush all pending writes", async () => {
		const { createLogger, configureLogDir, flushLogs } = await import("../logger");
		await configureLogDir(TEST_LOG_DIR);

		const logger = createLogger("test");
		for (let i = 0; i < 100; i++) {
			logger.info(`msg ${i}`);
		}

		await flushLogs();

		const files = readdirSync(TEST_LOG_DIR);
		const content = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
		expect(content).toContain("msg 0");
		expect(content).toContain("msg 99");
	});
});
