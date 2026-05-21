import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockCallRPC = vi.fn();
const mockHandleSubscribe = vi.fn();
const mockHandleUnsubscribe = vi.fn();
const mockClearDebug = vi.fn();
const mockSetMethod = vi.fn();

vi.mock("../../../stores/use-app-store", () => ({
	useAppStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({
			method: "system.ping",
			result: { pong: true },
			tickEvents: ["tick-1", "tick-2"],
			tickCount: 2,
			subscriptionId: null,
			timerRunning: false,
			setMethod: mockSetMethod,
			callRPC: mockCallRPC,
			handleSubscribe: mockHandleSubscribe,
			handleUnsubscribe: mockHandleUnsubscribe,
			clearDebug: mockClearDebug,
		}),
}));

vi.mock("../../../stores/use-log-store", () => ({
	useLogStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({ logs: ["Connected", "Error: timeout"] }),
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (k: string) => k }),
}));

const localStorageStore: Record<string, string> = {};
vi.stubGlobal("localStorage", {
	getItem: (key: string) => localStorageStore[key] ?? null,
	setItem: (key: string, value: string) => {
		localStorageStore[key] = String(value);
	},
	removeItem: (key: string) => {
		delete localStorageStore[key];
	},
	clear: () => {
		Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
	},
	get length() {
		return Object.keys(localStorageStore).length;
	},
	key: (i: number) => Object.keys(localStorageStore)[i] ?? null,
});

describe("DebugPanel", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("should render debug panel title", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("tabs.debug")).toBeDefined();
	});

	it("should render RPC calls section", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("debug.rpcCalls")).toBeDefined();
	});

	it("should call clearDebug when clear button is clicked", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		fireEvent.click(screen.getByText("debug.clear"));
		expect(mockClearDebug).toHaveBeenCalledOnce();
	});

	it("should collapse panel when collapse button is clicked", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		const collapseBtn = screen.getByTitle("debug.collapsePanel");
		fireEvent.click(collapseBtn);
		expect(screen.getByTitle("debug.expandPanel")).toBeDefined();
		expect(screen.queryByText("debug.rpcCalls")).toBeNull();
	});

	it("should expand panel when expand button is clicked", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		fireEvent.click(screen.getByTitle("debug.collapsePanel"));
		expect(screen.getByTitle("debug.expandPanel")).toBeDefined();
		fireEvent.click(screen.getByTitle("debug.expandPanel"));
		expect(screen.getByTitle("debug.collapsePanel")).toBeDefined();
		expect(screen.getByText("debug.rpcCalls")).toBeDefined();
	});

	it("should persist collapsed state in localStorage", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		fireEvent.click(screen.getByTitle("debug.collapsePanel"));
		expect(localStorage.getItem("debug-panel-collapsed")).toBe("true");
	});

	it("should restore collapsed state from localStorage", async () => {
		localStorage.setItem("debug-panel-collapsed", "true");
		vi.resetModules();
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByTitle("debug.expandPanel")).toBeDefined();
		expect(screen.queryByText("debug.rpcCalls")).toBeNull();
	});

	it("should render subscriptions section", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("debug.subscriptions")).toBeDefined();
	});

	it("should render logs section", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("debug.logs")).toBeDefined();
	});

	it("should display method select", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("system.ping")).toBeDefined();
	});

	it("should call callRPC on call button click", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		fireEvent.click(screen.getByText("debug.call"));
		expect(mockCallRPC).toHaveBeenCalledWith("");
	});

	it("should display result JSON", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText(/pong/)).toBeDefined();
	});

	it("should display log entries", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("Connected")).toBeDefined();
		expect(screen.getByText("Error: timeout")).toBeDefined();
	});

	it("should show subscribe button when not subscribed", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("debug.subscribe")).toBeDefined();
	});

	it("should display tick events", async () => {
		const { DebugPanel } = await import("../DebugPanel");
		render(<DebugPanel />);
		expect(screen.getByText("tick-1")).toBeDefined();
		expect(screen.getByText("tick-2")).toBeDefined();
	});
});
