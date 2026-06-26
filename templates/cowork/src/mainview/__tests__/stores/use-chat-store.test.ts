import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "../../stores/use-chat-store";
import { act } from "@testing-library/react";

describe("useChatStore", () => {
  beforeEach(() => {
    act(() => {
      useChatStore.setState({
        messages: [],
        _onEventCallback: null,
      });
    });
  });

  it("initial state", () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
  });

  it("addUserMessage appends a user message", () => {
    act(() => {
      useChatStore.getState().addUserMessage("hello");
    });
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("user");
    expect((msgs[0] as { text: string }).text).toBe("hello");
  });

  it("addAgentPlaceholder appends an agent message", () => {
    act(() => {
      useChatStore.getState().addAgentPlaceholder("agent-1");
    });
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("agent");
    expect(msgs[0].id).toBe("agent-1");
  });

  it("setMessages replaces all messages", () => {
    const msgs = [
      { id: "1", role: "user" as const, text: "a", at: 1000 },
      { id: "2", role: "agent" as const, text: "b", turns: [], thinking: "", at: 2000 },
    ];
    act(() => {
      useChatStore.getState().setMessages(msgs);
    });
    expect(useChatStore.getState().messages).toHaveLength(2);
  });

  it("addUserMessage then addAgentPlaceholder preserves order", () => {
    act(() => {
      useChatStore.getState().addUserMessage("question");
      useChatStore.getState().addAgentPlaceholder("agent-1");
    });
    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].role).toBe("agent");
  });

  it("patchLastAgent updates the last agent message", () => {
    act(() => {
      useChatStore.getState().addAgentPlaceholder("agent-1");
    });
    act(() => {
      useChatStore.getState().patchLastAgent({ thinking: "reasoning..." });
    });
    const msgs = useChatStore.getState().messages;
    const agentMsg = msgs[0] as { thinking: string };
    expect(agentMsg.thinking).toBe("reasoning...");
  });
});
