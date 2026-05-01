export type DemoMethod = "system.ping" | "system.hello" | "system.echo" | "chat.send";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};
