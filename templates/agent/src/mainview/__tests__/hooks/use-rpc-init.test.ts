import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockInitializeConnection = vi.fn();
const mockAddLog = vi.fn();
const mockListRootDir = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockCall = vi.fn();

const mockChatAddMessage = vi.fn();
const mockChatSetMessages = vi.fn();

let mockAppState: Record<string, any>;

function resetMockAppState(overrides?: Partial<Record<string, any>>) {
  mockAppState = {
    ready: false,
    mode: "web",
    initializeConnection: mockInitializeConnection,
    addLog: mockAddLog,
    ...overrides,
  };
}

vi.mock("../../stores/use-app-store", () => {
  return {
    useAppStore: Object.assign(
      (selector: (s: any) => any) => selector(mockAppState),
      {
        getState: () => mockAppState,
        setState: (partial: any) => {
          const next = typeof partial === "function" ? partial(mockAppState) : partial;
          mockAppState = { ...mockAppState, ...next };
        },
      }
    ),
  };
});

vi.mock("../../stores/use-explorer-store", () => ({
  useExplorerStore: Object.assign(
    (selector: (s: any) => any) =>
      selector({ listRootDir: mockListRootDir }),
    { getState: () => ({ listRootDir: mockListRootDir }) }
  ),
}));

vi.mock("../../stores/use-chat-store", () => ({
  useChatStore: Object.assign(
    (selector: (s: any) => any) =>
      selector({ addMessage: mockChatAddMessage, setMessages: mockChatSetMessages }),
    {
      getState: () => ({
        addMessage: mockChatAddMessage,
        setMessages: mockChatSetMessages,
      }),
    }
  ),
}));

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    call: mockCall,
  },
}));

describe("useRpcInit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockResolvedValue("sub-1");
    mockCall.mockResolvedValue({ messages: [] });
  });

  it("should call initializeConnection on mount", async () => {
    resetMockAppState({ ready: false });
    const { useRpcInit } = await import("../../hooks/use-rpc-init");
    renderHook(() => useRpcInit());
    expect(mockInitializeConnection).toHaveBeenCalledTimes(1);
  });

  it("should not subscribe when not ready", async () => {
    resetMockAppState({ ready: false });
    const { useRpcInit } = await import("../../hooks/use-rpc-init");
    renderHook(() => useRpcInit());
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockListRootDir).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("should subscribe, load history and init explorer when ready", async () => {
    resetMockAppState({ ready: true });
    const { useRpcInit } = await import("../../hooks/use-rpc-init");
    renderHook(() => useRpcInit());

    await waitFor(() => {
      expect(mockListRootDir).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith(
        "chat.message",
        expect.any(Function),
        {}
      );
    });

    await waitFor(() => {
      expect(mockCall).toHaveBeenCalledWith("chat.list", { limit: 100 });
    });
  });

  it("should load history messages into chat store", async () => {
    const messages = [
      { id: "1", role: "user" as const, content: "hello", timestamp: 1000 },
      { id: "2", role: "assistant" as const, content: "world", timestamp: 2000 },
    ];
    mockCall.mockResolvedValue({ messages });

    resetMockAppState({ ready: true });
    const { useRpcInit } = await import("../../hooks/use-rpc-init");
    renderHook(() => useRpcInit());

    await waitFor(() => {
      expect(mockChatSetMessages).toHaveBeenCalledWith(
        messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      );
    });

    expect(mockAddLog).toHaveBeenCalledWith("Loaded 2 history messages");
  });

  it("should unsubscribe on cleanup when ready", async () => {
    resetMockAppState({ ready: true });
    const { useRpcInit } = await import("../../hooks/use-rpc-init");
    const { unmount } = renderHook(() => useRpcInit());

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledWith("sub-1");
  });

  it("should handle history load failure gracefully", async () => {
    mockCall.mockRejectedValue(new Error("Network error"));
    resetMockAppState({ ready: true });
    const { useRpcInit } = await import("../../hooks/use-rpc-init");
    renderHook(() => useRpcInit());

    await waitFor(() => {
      expect(mockAddLog).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load history")
      );
    });
  });

  it("should forward chat.message payloads to chat store", async () => {
    let subscriptionHandler: ((payload: any) => void) | undefined;
    mockSubscribe.mockImplementation(async (_event: string, handler: (p: any) => void) => {
      subscriptionHandler = handler;
      return "sub-1";
    });

    resetMockAppState({ ready: true });
    const { useRpcInit } = await import("../../hooks/use-rpc-init");
    renderHook(() => useRpcInit());

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    subscriptionHandler!({
      id: "msg-1",
      role: "user",
      content: "test message",
      timestamp: 12345,
    });

    expect(mockChatAddMessage).toHaveBeenCalledWith({
      id: "msg-1",
      role: "user",
      content: "test message",
      timestamp: 12345,
    });
  });
});
