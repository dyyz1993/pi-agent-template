import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
  apiClient: { call: vi.fn() },
}));

vi.mock("../use-log-store", () => ({
  useLogStore: { getState: () => ({ addLog: vi.fn() }) },
}));

describe("useRulesStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have correct initial state", async () => {
    const { useRulesStore } = await import("../use-rules-store");
    expect(useRulesStore.getState().rules).toEqual([]);
  });

  it("should fetch rules", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useRulesStore } = await import("../use-rules-store");
    const rules = [
      { id: "r1", name: "no-console", pattern: "**/*.ts", enabled: true },
    ];
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rules });

    await useRulesStore.getState().fetchRules();
    expect(useRulesStore.getState().rules).toHaveLength(1);
    expect(useRulesStore.getState().rules[0].name).toBe("no-console");
  });

  it("should add a rule", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useRulesStore } = await import("../use-rules-store");
    const newRule = { id: "r2", name: "test-rule", pattern: "*.js", enabled: true };
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rule: newRule });

    await useRulesStore.getState().addRule("test-rule", "*.js");
    expect(useRulesStore.getState().rules).toHaveLength(1);
    expect(useRulesStore.getState().rules[0].id).toBe("r2");
    expect(apiClient.call).toHaveBeenCalledWith("rules.add", { name: "test-rule", pattern: "*.js" });
  });

  it("should toggle a rule", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useRulesStore } = await import("../use-rules-store");
    useRulesStore.setState({
      rules: [{ id: "r1", name: "rule", pattern: "*.ts", enabled: true }],
    });
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rule: { id: "r1", name: "rule", pattern: "*.ts", enabled: false },
    });

    await useRulesStore.getState().toggleRule("r1");
    expect(useRulesStore.getState().rules[0].enabled).toBe(false);
  });

  it("should remove a rule", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useRulesStore } = await import("../use-rules-store");
    useRulesStore.setState({
      rules: [
        { id: "r1", name: "a", pattern: "*.ts", enabled: true },
        { id: "r2", name: "b", pattern: "*.js", enabled: false },
      ],
    });
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    await useRulesStore.getState().removeRule("r1");
    expect(useRulesStore.getState().rules).toHaveLength(1);
    expect(useRulesStore.getState().rules[0].id).toBe("r2");
  });
});
