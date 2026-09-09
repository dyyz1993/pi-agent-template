import { describe, test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parseArgs } from "../commands/create";
import { validateWorkspaceName } from "../commands/workspace";
import { copyAndReplace, expandTilde } from "../lib/copy";
import { homedir } from "os";

describe("create parseArgs", () => {
	test("parses --type and --dir with separate values", () => {
		const result = parseArgs(["my-app", "--type", "chat", "--dir", "/tmp/x"]);
		expect(result.error).toBeUndefined();
		expect(result.positional).toEqual(["my-app"]);
		expect(result.options.type).toBe("chat");
		expect(result.options.dir).toBe("/tmp/x");
	});

	test("supports --key=value syntax", () => {
		const result = parseArgs(["my-app", "--type=chat"]);
		expect(result.error).toBeUndefined();
		expect(result.options.type).toBe("chat");
	});

	test("unknown flag returns an error instead of silently ignoring", () => {
		const result = parseArgs(["my-app", "--typo", "chat"]);
		expect(result.error).toContain("Unknown option: --typo");
	});

	test("missing --type value returns an error instead of falling back to general", () => {
		const result = parseArgs(["my-app", "--type"]);
		expect(result.error).toContain("--type requires a value");
	});

	test("--type followed by another flag returns an error", () => {
		const result = parseArgs(["my-app", "--type", "--dir", "/tmp"]);
		expect(result.error).toContain("--type requires a value");
	});

	test("-- separates remaining args as positional", () => {
		const result = parseArgs(["my-app", "--", "not-a-flag"]);
		expect(result.error).toBeUndefined();
		expect(result.positional).toEqual(["my-app", "not-a-flag"]);
	});
});

describe("expandTilde", () => {
	test("~ expands to home dir", () => {
		expect(expandTilde("~")).toBe(homedir());
	});

	test("~/x expands under home dir", () => {
		expect(expandTilde("~/projects/app")).toBe(join(homedir(), "projects/app"));
	});

	test("other paths untouched", () => {
		expect(expandTilde("/tmp/x")).toBe("/tmp/x");
		expect(expandTilde("~bin/x")).toBe("~bin/x");
	});
});

describe("validateWorkspaceName", () => {
	test("accepts word chars, dots and dashes", () => {
		expect(validateWorkspaceName("feature-chat-ui")).toBeNull();
		expect(validateWorkspaceName("fix_1.2")).toBeNull();
	});

	test("rejects spaces, slashes, shell metacharacters and empty names", () => {
		expect(validateWorkspaceName("my workspace")).not.toBeNull();
		expect(validateWorkspaceName("a/b")).not.toBeNull();
		expect(validateWorkspaceName("x`cmd`")).not.toBeNull();
		expect(validateWorkspaceName("..")).not.toBeNull();
		expect(validateWorkspaceName("")).not.toBeNull();
	});
});

describe("copyAndReplace binary safety", () => {
	test("binary files are copied byte-for-byte, not utf-8 re-encoded", () => {
		const src = mkdtempSync(join(tmpdir(), "pi-bin-src-"));
		const dest = mkdtempSync(join(tmpdir(), "pi-bin-dest-"));
		try {
			// PNG magic bytes + NUL bytes that utf-8 round-trip would corrupt
			const binary = Buffer.from([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0x01,
			]);
			writeFileSync(join(src, "icon.png"), binary);
			writeFileSync(join(src, "data.bin"), Buffer.from([0x00, 0x01, 0x02, 0x03]));

			copyAndReplace(src, dest, "my-app");

			expect(readFileSync(join(dest, "icon.png")).equals(binary)).toBe(true);
			expect(
				readFileSync(join(dest, "data.bin")).equals(Buffer.from([0x00, 0x01, 0x02, 0x03]))
			).toBe(true);
		} finally {
			rmSync(src, { recursive: true, force: true });
			rmSync(dest, { recursive: true, force: true });
		}
	});

	test("text files still get placeholder replacement", () => {
		const src = mkdtempSync(join(tmpdir(), "pi-txt-src-"));
		const dest = mkdtempSync(join(tmpdir(), "pi-txt-dest-"));
		try {
			writeFileSync(join(src, "notes.md"), "project pi-agent-template rocks");
			copyAndReplace(src, dest, "my-app");
			expect(readFileSync(join(dest, "notes.md"), "utf-8")).toBe("project my-app rocks");
		} finally {
			rmSync(src, { recursive: true, force: true });
			rmSync(dest, { recursive: true, force: true });
		}
	});
});
