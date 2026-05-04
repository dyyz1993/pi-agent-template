import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { useChatStore } from "../../stores/use-chat-store";
import { act } from "@testing-library/react";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    call: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

vi.mock("../../stores/use-app-store", () => ({
  useAppStore: {
    getState: () => ({ addLog: vi.fn() }),
  },
}));

describe("ChatPanel", () => {
  beforeEach(() => {
    act(() => {
      useChatStore.setState({ messages: [], inputText: "" });
    });
  });

  it("renders empty state", () => {
    render(<ChatPanel />);
    expect(screen.getByText("Start a conversation...")).toBeInTheDocument();
  });

  it("renders messages header", () => {
    render(<ChatPanel />);
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("shows message count badge", () => {
    act(() => {
      useChatStore.setState({
        messages: [
          { id: "1", role: "user", content: "hi", timestamp: 1000 },
        ],
      });
    });
    render(<ChatPanel />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders message list", () => {
    act(() => {
      useChatStore.setState({
        messages: [
          { id: "1", role: "user", content: "Hello", timestamp: 1000 },
          { id: "2", role: "assistant", content: "World", timestamp: 2000 },
        ],
      });
    });
    render(<ChatPanel />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("has input field", () => {
    render(<ChatPanel />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
  });

  it("has send button", () => {
    render(<ChatPanel />);
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("typing updates input", async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Type a message...");
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");
  });
});
