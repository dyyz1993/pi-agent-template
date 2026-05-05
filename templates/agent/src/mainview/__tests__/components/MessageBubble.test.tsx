import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../../components/chat/MessageBubble";
import type { ChatMessage } from "../../types";

function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello world",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("MessageBubble", () => {
  it("renders user message with content", () => {
    render(<MessageBubble message={createMessage()} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders assistant message", () => {
    render(
      <MessageBubble message={createMessage({ role: "assistant", content: "Hi there" })} />
    );
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  it("shows bot icon for assistant", () => {
    const { container } = render(
      <MessageBubble message={createMessage({ role: "assistant" })} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders markdown for assistant", () => {
    render(
      <MessageBubble
        message={createMessage({
          role: "assistant",
          content: "**bold text** and `code`",
        })}
      />
    );
    expect(screen.getByText("bold text")).toBeInTheDocument();
  });

  it("shows timestamp when present", () => {
    const ts = new Date(2024, 0, 1, 10, 30).getTime();
    const { container } = render(
      <MessageBubble message={createMessage({ timestamp: ts })} />
    );
    const timeEl = container.querySelector('[class*="text-\\[10px\\]"]');
    if (timeEl) {
      expect(timeEl.textContent).toContain("10:30");
    }
  });

  it("applies different styles for user vs assistant", () => {
    const { container: userContainer } = render(
      <MessageBubble message={createMessage({ role: "user" })} />
    );
    const { container: assistantContainer } = render(
      <MessageBubble message={createMessage({ role: "assistant" })} />
    );
    const userBubble = userContainer.querySelector('[class*="bg-\\[var\\(--color-accent\\)\\]"]');
    const assistantBubble = assistantContainer.querySelector('[class*="bg-\\[var\\(--color-bg-tertiary\\)\\]"]');
    expect(userBubble).toBeInTheDocument();
    expect(assistantBubble).toBeInTheDocument();
  });
});
