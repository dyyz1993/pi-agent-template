import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatPanel } from "../../components/chat/ChatPanel";
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

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "chat.title": "Chat",
        "chat.empty": "No messages yet",
        "chat.placeholder": "Type a message...",
        "chat.send": "Send",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

describe("ChatPanel", () => {
  beforeEach(() => {
    act(() => {
      useChatStore.setState({ messages: [], inputText: "" });
    });
  });

  it("renders chat title", () => {
    render(<ChatPanel />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(<ChatPanel />);
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("renders input and send button", () => {
    render(<ChatPanel />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("updates input value on typing", () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(useChatStore.getState().inputText).toBe("hello");
  });

  it("displays messages when present", () => {
    act(() => {
      useChatStore.setState({
        messages: [
          { id: "1", role: "user", content: "Hi there", timestamp: Date.now() },
        ],
      });
    });
    render(<ChatPanel />);
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.queryByText("No messages yet")).not.toBeInTheDocument();
  });
});
