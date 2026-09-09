import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("useNotificationStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should have correct initial state", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.panelOpen).toBe(false);
  });

  it("should push a notification", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().push({ message: "hello", level: "info" });
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].message).toBe("hello");
    expect(state.notifications[0].level).toBe("info");
    expect(state.notifications[0].read).toBe(false);
    expect(state.notifications[0].id).toMatch(/^notif-/);
  });

  it("should auto-dismiss info notifications after 5s", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().push({ message: "temp", level: "info" });
    expect(useNotificationStore.getState().notifications).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("should not auto-dismiss warning/error notifications", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().push({ message: "warn", level: "warning" });
    useNotificationStore.getState().push({ message: "err", level: "error" });

    vi.advanceTimersByTime(10000);
    expect(useNotificationStore.getState().notifications).toHaveLength(2);
  });

  it("should mark a notification as read", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().push({ message: "test", level: "warning" });
    const id = useNotificationStore.getState().notifications[0].id;

    useNotificationStore.getState().markRead(id);
    expect(useNotificationStore.getState().notifications[0].read).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().push({ message: "a", level: "warning" });
    useNotificationStore.getState().push({ message: "b", level: "error" });

    useNotificationStore.getState().markAllRead();
    const state = useNotificationStore.getState();
    expect(state.notifications.every((n) => n.read)).toBe(true);
  });

  it("should dismiss a notification", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().push({ message: "bye", level: "warning" });
    const id = useNotificationStore.getState().notifications[0].id;

    useNotificationStore.getState().dismiss(id);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("should clear all notifications", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().push({ message: "a", level: "error" });
    useNotificationStore.getState().push({ message: "b", level: "error" });

    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("should toggle panel", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    expect(useNotificationStore.getState().panelOpen).toBe(false);
    useNotificationStore.getState().togglePanel();
    expect(useNotificationStore.getState().panelOpen).toBe(true);
    useNotificationStore.getState().togglePanel();
    expect(useNotificationStore.getState().panelOpen).toBe(false);
  });

  it("should set panel open explicitly", async () => {
    const { useNotificationStore } = await import("../../stores/use-notification-store");
    useNotificationStore.getState().setPanelOpen(true);
    expect(useNotificationStore.getState().panelOpen).toBe(true);
    useNotificationStore.getState().setPanelOpen(false);
    expect(useNotificationStore.getState().panelOpen).toBe(false);
  });
});
