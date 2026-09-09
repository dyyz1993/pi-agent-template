import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../../components/chat/MessageBubble";
import type { ChatMessage } from "../../types";

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "1",
    role: "user",
    content: "Hello world",
    timestamp: new Date("2025-01-15T10:30:00").getTime(),
    ...overrides,
  };
}

describe("MessageBubble", () => {
  it("renders user message content", () => {
    render(<MessageBubble message={makeMessage({ role: "user", content: "Hi" })} />);
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });

  it("renders assistant message with markdown", () => {
    render(<MessageBubble message={makeMessage({ role: "assistant", content: "Hello **bold**" })} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows timestamp when provided", () => {
    const ts = new Date("2025-06-15T14:05:00").getTime();
    render(<MessageBubble message={makeMessage({ timestamp: ts })} />);
    expect(screen.getByText("14:05")).toBeInTheDocument();
  });

  it("shows bot icon for assistant messages", () => {
    const { container } = render(
      <MessageBubble message={makeMessage({ role: "assistant" })} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("does not show bot icon for user messages", () => {
    const { container } = render(
      <MessageBubble message={makeMessage({ role: "user" })} />
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(0);
  });
});
