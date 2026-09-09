import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
  apiClient: { call: vi.fn() },
}));

vi.mock("../use-log-store", () => ({
  useLogStore: { getState: () => ({ addLog: vi.fn() }) },
}));

describe("useTodoStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have correct initial state", async () => {
    const { useTodoStore } = await import("../use-todo-store");
    expect(useTodoStore.getState().items).toEqual([]);
  });

  it("should fetch items", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useTodoStore } = await import("../use-todo-store");
    const items = [
      { id: "t1", content: "task 1", status: "pending", createdAt: Date.now() },
    ];
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ items });

    await useTodoStore.getState().fetchItems();
    expect(useTodoStore.getState().items).toHaveLength(1);
    expect(useTodoStore.getState().items[0].content).toBe("task 1");
  });

  it("should add an item", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useTodoStore } = await import("../use-todo-store");
    const newItem = { id: "t2", content: "new task", status: "pending" as const, createdAt: Date.now() };
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ item: newItem });

    await useTodoStore.getState().addItem("new task");
    expect(useTodoStore.getState().items).toHaveLength(1);
    expect(useTodoStore.getState().items[0].id).toBe("t2");
    expect(apiClient.call).toHaveBeenCalledWith("todo.add", { content: "new task" });
  });

  it("should update an item status", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useTodoStore } = await import("../use-todo-store");
    useTodoStore.setState({
      items: [{ id: "t1", content: "task", status: "pending", createdAt: Date.now() }],
    });
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      item: { id: "t1", content: "task", status: "completed", createdAt: Date.now() },
    });

    await useTodoStore.getState().updateItem("t1", "completed");
    expect(useTodoStore.getState().items[0].status).toBe("completed");
  });

  it("should remove an item", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useTodoStore } = await import("../use-todo-store");
    useTodoStore.setState({
      items: [
        { id: "t1", content: "a", status: "pending", createdAt: Date.now() },
        { id: "t2", content: "b", status: "completed", createdAt: Date.now() },
      ],
    });
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    await useTodoStore.getState().removeItem("t1");
    expect(useTodoStore.getState().items).toHaveLength(1);
    expect(useTodoStore.getState().items[0].id).toBe("t2");
  });
});
