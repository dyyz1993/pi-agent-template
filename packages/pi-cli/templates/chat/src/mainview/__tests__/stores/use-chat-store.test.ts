import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "../../stores/use-chat-store";
import { act } from "@testing-library/react";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    call: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

vi.mock("../../stores/use-log-store", () => ({
  useLogStore: {
    getState: () => ({ addLog: vi.fn() }),
  },
}));

describe("useChatStore", () => {
  beforeEach(() => {
    act(() => {
      useChatStore.setState({
        messages: [],
        inputText: "",
      });
    });
  });

  it("initial state", () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.inputText).toBe("");
  });

  it("setInputText", () => {
    act(() => {
      useChatStore.getState().setInputText("hello");
    });
    expect(useChatStore.getState().inputText).toBe("hello");
  });

  it("addMessage", () => {
    const msg = {
      id: "1",
      role: "user" as const,
      content: "hi",
      timestamp: Date.now(),
    };
    act(() => {
      useChatStore.getState().addMessage(msg);
    });
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe("hi");
  });

  it("setMessages", () => {
    const msgs = [
      { id: "1", role: "user" as const, content: "a", timestamp: 1000 },
      { id: "2", role: "assistant" as const, content: "b", timestamp: 2000 },
    ];
    act(() => {
      useChatStore.getState().setMessages(msgs);
    });
    expect(useChatStore.getState().messages).toHaveLength(2);
  });

  it("addMessage appends to existing", () => {
    act(() => {
      useChatStore.getState().setMessages([
        { id: "1", role: "user", content: "a", timestamp: 1000 },
      ]);
    });
    act(() => {
      useChatStore.getState().addMessage({
        id: "2",
        role: "assistant",
        content: "b",
        timestamp: 2000,
      });
    });
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[1].content).toBe("b");
  });

  it("sendMessage clears inputText after sending", async () => {
    act(() => {
      useChatStore.getState().setInputText("hello world");
    });
    await act(async () => {
      await useChatStore.getState().sendMessage();
    });
    expect(useChatStore.getState().inputText).toBe("");
  });

  it("sendMessage does nothing with empty input", async () => {
    act(() => {
      useChatStore.getState().setInputText("   ");
    });
    const { apiClient } = await import("../../lib/api-client");
    const callSpy = vi.mocked(apiClient.call);
    callSpy.mockClear();
    await useChatStore.getState().sendMessage();
    expect(callSpy).not.toHaveBeenCalled();
  });
});
