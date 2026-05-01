export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  createdAt: number;
}

export interface TodoMethods {
  "todo.list": {
    params: {};
    result: { items: TodoItem[] };
  };
  "todo.add": {
    params: { content: string };
    result: { item: TodoItem };
  };
  "todo.update": {
    params: { id: string; status: TodoStatus };
    result: { item: TodoItem };
  };
  "todo.remove": {
    params: { id: string };
    result: { success: boolean };
  };
}
