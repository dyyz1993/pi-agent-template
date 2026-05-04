import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../../stores/use-app-store";
import { act } from "@testing-library/react";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    call: vi.fn().mockResolvedValue({ pong: true, timestamp: Date.now(), platform: "web" }),
  },
}));

vi.mock("../../stores/use-log-store", () => ({
  useLogStore: {
    getState: () => ({ addLog: vi.fn() }),
  },
}));

describe("useAppStore", () => {
  beforeEach(() => {
    act(() => {
      useAppStore.setState({
        method: "system.ping",
        result: null,
      });
    });
  });

  it("initial state", () => {
    const state = useAppStore.getState();
    expect(state.method).toBe("system.ping");
    expect(state.result).toBeNull();
  });

  it("setMethod", () => {
    act(() => {
      useAppStore.getState().setMethod("system.hello");
    });
    expect(useAppStore.getState().method).toBe("system.hello");
  });

  it("callRPC should set result on success", async () => {
    await act(async () => {
      await useAppStore.getState().callRPC("");
    });
    expect(useAppStore.getState().result).not.toBeNull();
  });
});
