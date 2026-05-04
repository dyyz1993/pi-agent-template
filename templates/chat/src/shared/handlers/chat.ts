import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { createLogger } from "../lib/logger";

const log = createLogger("chat");

function getStoragePath(): string {
  const dir = join(homedir(), ".pi-agent");
  return join(dir, "chat-history.json");
}

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; timestamp: number };

async function loadMessages(): Promise<ChatMessage[]> {
  const filePath = getStoragePath();
  try {
    if (!existsSync(filePath)) {
      log.info(`No history file at ${filePath}`);
      return [];
    }
    const raw = await readFile(filePath, "utf-8");
    const msgs = JSON.parse(raw) as ChatMessage[];
    log.info(`Loaded ${msgs.length} messages from ${filePath}`);
    return msgs;
  } catch (err) {
    log.error("Failed to load history", { error: err });
    return [];
  }
}

async function saveMessages(messages: ChatMessage[]): Promise<void> {
  const filePath = getStoragePath();
  const dir = dirname(filePath);
  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filePath, JSON.stringify(messages, null, 2), "utf-8");
    log.info(`Saved ${messages.length} messages to ${filePath}`);
  } catch (err) {
    log.error("Failed to save history", { error: err });
  }
}

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function generateReply(input: string): string {
  const lower = input.toLowerCase().trim();

  if (/^(hi|hello|hey|howdy|hola|yo|sup)\b/i.test(lower)) {
    const greetings = [
      "Hey there! How can I help you today?",
      "Hello! Great to see you. What would you like to know?",
      "Hi! I'm your desktop assistant. Ask me anything!",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (/what('?s| is) the (time|date|day)|current (time|date)|what time|today'?s date/i.test(lower)) {
    const now = new Date();
    const date = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `It's currently **${time}** on **${date}**.`;
  }

  const mathMatch = lower.match(
    /(?:what(?:'s| is)\s+)?(\d+(?:\.\d+)?)\s*([+\-*/x×÷^])\s*(\d+(?:\.\d+)?)/,
  );
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let result: number;
    switch (op) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "*": case "x": case "×": result = a * b; break;
      case "/": case "÷": result = b !== 0 ? a / b : NaN; break;
      case "^": result = Math.pow(a, b); break;
      default: result = NaN;
    }
    if (isNaN(result)) {
      return "Hmm, I couldn't calculate that. Did you try dividing by zero?";
    }
    const niceResult = Number.isInteger(result) ? result.toString() : result.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return `That would be **${niceResult}**! Need help with anything else?`;
  }

  if (/file|files|browse|explorer|directory|folder|open file/i.test(lower)) {
    return (
      "I can help you explore files! While I can't directly browse files in this demo, " +
      "here's what you can do:\n\n" +
      "- Use the **Explorer** panel to browse your project files\n" +
      "- Click any file to preview its contents\n" +
      "- Use the search feature to find specific files\n\n" +
      "Try asking about **time** or **math** for a live demo!"
    );
  }

  if (/git|commit|branch|status|diff|push|pull/i.test(lower)) {
    return (
      "Git is a powerful version control system! Here's what I know:\n\n" +
      "- **git status** - Check your current changes\n" +
      "- **git branch** - See or switch branches\n" +
      "- **git log** - View commit history\n" +
      "- **git diff** - See what changed\n\n" +
      "Check out the **Source Control** panel for a visual Git interface! " +
      "Or try asking me about **time** or **math**."
    );
  }

  if (/^(help|commands|what can you|what do you|capabilities|features)/i.test(lower)) {
    return (
      "Here's what I can help with:\n\n" +
      "- **Greetings** - Say hi and I'll say hi back!\n" +
      "- **Time & Date** - Ask \"what time is it?\" or \"what's today's date?\"\n" +
      "- **Math** - Give me an expression like \"12 * 8\" or \"what is 100 / 4\"\n" +
      "- **Files** - Ask about file browsing and the explorer\n" +
      "- **Git** - Ask about version control commands\n" +
      "- **Help** - Show this message anytime!\n\n" +
      "This is a demo assistant - try different things to see what sticks!"
    );
  }

  const defaults = [
    "That's an interesting question! I'm a demo assistant, so my knowledge is limited - but try asking about **time**, **math**, **files**, or **git**.",
    "I wish I could help with that! For now I can answer questions about time, math, files, and git. Type **help** to see what I can do.",
    "Hmm, I'm not sure about that one. But I *can* do math, tell you the time, and talk about files and git. Give it a shot!",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("chat.list", async (params) => {
    const all = await loadMessages();
    const limit = params.limit ?? 50;
    const messages = all.slice(-limit);
    return {
      messages,
      hasMore: all.length > limit,
    };
  });

  r("chat.send", async (params) => {
    const all = await loadMessages();

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: params.content,
      timestamp: Date.now(),
    };
    all.push(userMsg);

    server.emitEvent("chat.message", userMsg, { role: userMsg.role });

    const thinkDelay = 200 + Math.floor(Math.random() * 300);
    await new Promise((r) => setTimeout(r, thinkDelay));

    const reply: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: generateReply(params.content),
      timestamp: Date.now(),
    };
    all.push(reply);

    server.emitEvent("chat.message", reply, { role: reply.role });

    await saveMessages(all);

    return { ok: true };
  });
}
