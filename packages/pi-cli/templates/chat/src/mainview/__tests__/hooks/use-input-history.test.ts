import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInputHistory } from "../../hooks/use-input-history";

describe("useInputHistory", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("saveToHistory stores entry", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			result.current.saveToHistory("hello");
		});
		expect(result.current.hasPrev).toBe(true);
	});

	it("saveToHistory ignores empty", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			result.current.saveToHistory("  ");
		});
		expect(result.current.hasPrev).toBe(false);
	});

	it("navigatePrev returns items", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			result.current.saveToHistory("first");
			result.current.saveToHistory("second");
		});
		let value: string | null = null;
		act(() => {
			value = result.current.navigatePrev();
		});
		expect(value).toBe("second");

		act(() => {
			value = result.current.navigatePrev();
		});
		expect(value).toBe("first");
	});

	it("navigateNext returns empty string at end", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			result.current.saveToHistory("hello");
		});
		act(() => {
			result.current.navigatePrev();
		});
		let value: string | null = null;
		act(() => {
			value = result.current.navigateNext();
		});
		expect(value).toBe("");
	});

	it("clearHistory removes all", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			result.current.saveToHistory("a");
			result.current.saveToHistory("b");
		});
		act(() => {
			result.current.clearHistory();
		});
		expect(result.current.hasPrev).toBe(false);
	});

	it("deduplicates entries", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			result.current.saveToHistory("hello");
			result.current.saveToHistory("hello");
		});
		let count = 0;
		while (result.current.hasPrev) {
			act(() => {
				result.current.navigatePrev();
			});
			count++;
			if (count > 20) break;
		}
		expect(count).toBe(1);
	});

	it("respects max 10 items", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			for (let i = 0; i < 15; i++) {
				result.current.saveToHistory(`item-${i}`);
			}
		});
		let count = 0;
		while (result.current.hasPrev) {
			act(() => {
				result.current.navigatePrev();
			});
			count++;
			if (count > 20) break;
		}
		expect(count).toBe(10);
	});

	it("resetIndex goes back to -1", () => {
		const { result } = renderHook(() => useInputHistory("test-session"));
		act(() => {
			result.current.saveToHistory("first");
			result.current.saveToHistory("second");
			result.current.saveToHistory("third");
		});
		act(() => {
			result.current.navigatePrev();
		});
		act(() => {
			result.current.navigatePrev();
		});
		expect(result.current.hasNext).toBe(true);
		act(() => {
			result.current.resetIndex();
		});
		expect(result.current.hasNext).toBe(false);
	});
});
