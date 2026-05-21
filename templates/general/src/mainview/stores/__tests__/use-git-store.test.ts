import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
	apiClient: { call: vi.fn() },
}));

vi.mock("../use-log-store", () => ({
	useLogStore: { getState: () => ({ addLog: vi.fn() }) },
}));

describe("useGitStore", () => {
	beforeEach(async () => {
		vi.resetModules();
	});

	it("should have correct initial state", async () => {
		const { useGitStore } = await import("../use-git-store");
		const state = useGitStore.getState();
		expect(state.branch).toBe("");
		expect(state.ahead).toBe(0);
		expect(state.behind).toBe(0);
		expect(state.staged).toEqual([]);
		expect(state.changed).toEqual([]);
		expect(state.untracked).toEqual([]);
		expect(state.commits).toEqual([]);
		expect(state.loadingCommits).toBe(false);
		expect(state.currentDiff).toBeNull();
		expect(state.loadingDiff).toBe(false);
		expect(state.expandedCommits).toEqual(new Set());
		expect(state.commitFiles).toEqual({});
		expect(state.loadingCommitFiles).toEqual(new Set());
		expect(state.branches).toEqual([]);
		expect(state.loadingBranches).toBe(false);
		expect(state.worktrees).toEqual([]);
		expect(state.loadingAction).toBeNull();
	});

	it("should fetch status", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			branch: "main",
			ahead: 2,
			behind: 1,
			staged: [{ path: "a.ts", status: "modified" }],
			changed: [{ path: "b.ts", status: "added" }],
			untracked: ["c.ts"],
		});

		await useGitStore.getState().fetchStatus("/repo");
		const state = useGitStore.getState();
		expect(state.branch).toBe("main");
		expect(state.ahead).toBe(2);
		expect(state.behind).toBe(1);
		expect(state.staged).toHaveLength(1);
		expect(state.untracked).toEqual(["c.ts"]);
	});

	it("should fetch diff", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			filePath: "a.ts",
			diff: "+hello",
			oldContent: "",
			newContent: "hello",
		});

		await useGitStore.getState().fetchDiff("/repo", "a.ts");
		const state = useGitStore.getState();
		expect(state.currentDiff).not.toBeNull();
		expect(state.currentDiff!.filePath).toBe("a.ts");
		expect(state.loadingDiff).toBe(false);
	});

	it("should set loadingDiff on fetchDiff error", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));

		await useGitStore.getState().fetchDiff("/repo", "a.ts");
		expect(useGitStore.getState().loadingDiff).toBe(false);
	});

	it("should clear diff", async () => {
		const { useGitStore } = await import("../use-git-store");
		useGitStore.setState({
			currentDiff: { filePath: "a.ts", diff: "", oldContent: "", newContent: "" },
		});
		useGitStore.getState().clearDiff();
		expect(useGitStore.getState().currentDiff).toBeNull();
	});

	it("should fetch log", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		const commits = [
			{ hash: "abc123", shortHash: "abc1234", message: "init", author: "user", date: "2024-01-01" },
		];
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ commits });

		await useGitStore.getState().fetchLog("/repo");
		expect(useGitStore.getState().commits).toHaveLength(1);
		expect(useGitStore.getState().loadingCommits).toBe(false);
	});

	it("should set loadingCommits false on fetchLog error", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));

		await useGitStore.getState().fetchLog("/repo");
		expect(useGitStore.getState().loadingCommits).toBe(false);
	});

	it("should toggle commit expand and load files", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			files: [{ path: "a.ts", status: "modified" }],
		});

		await useGitStore.getState().toggleCommitExpand("/repo", "abc123");
		const state = useGitStore.getState();
		expect(state.expandedCommits.has("abc123")).toBe(true);
		expect(state.commitFiles["abc123"]).toHaveLength(1);
	});

	it("should collapse expanded commit on toggle", async () => {
		const { useGitStore } = await import("../use-git-store");
		useGitStore.setState({ expandedCommits: new Set(["abc123"]) });

		await useGitStore.getState().toggleCommitExpand("/repo", "abc123");
		expect(useGitStore.getState().expandedCommits.has("abc123")).toBe(false);
	});

	it("should fetch branches", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			branches: [
				{ name: "main", isCurrent: true, isRemote: false },
				{ name: "dev", isCurrent: false, isRemote: false },
			],
		});

		await useGitStore.getState().fetchBranches("/repo");
		expect(useGitStore.getState().branches).toHaveLength(2);
		expect(useGitStore.getState().loadingBranches).toBe(false);
	});

	it("should checkout and refresh", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce(undefined);
		callMock.mockResolvedValueOnce({
			branch: "dev",
			ahead: 0,
			behind: 0,
			staged: [],
			changed: [],
			untracked: [],
		});

		await useGitStore.getState().checkout("/repo", "dev");
		expect(callMock).toHaveBeenCalledWith("git.checkout", { repoPath: "/repo", branch: "dev" });
		expect(useGitStore.getState().loadingAction).toBeNull();
	});

	it("should stage files and refresh", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce(undefined);
		callMock.mockResolvedValueOnce({
			branch: "main",
			ahead: 0,
			behind: 0,
			staged: [],
			changed: [],
			untracked: [],
		});

		await useGitStore.getState().stageFiles("/repo", ["a.ts"]);
		expect(callMock).toHaveBeenCalledWith("git.add", { repoPath: "/repo", paths: ["a.ts"] });
		expect(useGitStore.getState().loadingAction).toBeNull();
	});

	it("should unstage files and refresh", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce(undefined);
		callMock.mockResolvedValueOnce({
			branch: "main",
			ahead: 0,
			behind: 0,
			staged: [],
			changed: [],
			untracked: [],
		});

		await useGitStore.getState().unstageFiles("/repo", ["a.ts"]);
		expect(callMock).toHaveBeenCalledWith("git.reset", { repoPath: "/repo", paths: ["a.ts"] });
		expect(useGitStore.getState().loadingAction).toBeNull();
	});

	it("should commit and refresh", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce({ shortHash: "abc1234" });
		callMock.mockResolvedValueOnce({
			branch: "main",
			ahead: 0,
			behind: 0,
			staged: [],
			changed: [],
			untracked: [],
		});

		await useGitStore.getState().commit("/repo", "init commit");
		expect(callMock).toHaveBeenCalledWith("git.commit", {
			repoPath: "/repo",
			message: "init commit",
		});
		expect(useGitStore.getState().loadingAction).toBeNull();
	});

	it("should push and refresh", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce(undefined);
		callMock.mockResolvedValueOnce({
			branch: "main",
			ahead: 0,
			behind: 0,
			staged: [],
			changed: [],
			untracked: [],
		});

		await useGitStore.getState().push("/repo");
		expect(callMock).toHaveBeenCalledWith("git.push", { repoPath: "/repo" });
		expect(useGitStore.getState().loadingAction).toBeNull();
	});

	it("should pull and refresh", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce(undefined);
		callMock.mockResolvedValueOnce({
			branch: "main",
			ahead: 0,
			behind: 0,
			staged: [],
			changed: [],
			untracked: [],
		});

		await useGitStore.getState().pull("/repo");
		expect(callMock).toHaveBeenCalledWith("git.pull", { repoPath: "/repo" });
		expect(useGitStore.getState().loadingAction).toBeNull();
	});

	it("should fetch worktrees", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			worktrees: [
				{ path: "/repo", branch: "main", isMain: true },
				{ path: "/repo-wt", branch: "dev", isMain: false },
			],
		});

		await useGitStore.getState().fetchWorktrees("/repo");
		expect(useGitStore.getState().worktrees).toHaveLength(2);
	});

	it("should fetch commit file diff", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			filePath: "a.ts",
			diff: "+x",
			oldContent: "",
			newContent: "x",
		});

		await useGitStore.getState().fetchCommitFileDiff("/repo", "abc123", "a.ts");
		expect(useGitStore.getState().currentDiff!.filePath).toBe("a.ts");
		expect(useGitStore.getState().loadingDiff).toBe(false);
	});

	it("should refresh by calling fetchStatus", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useGitStore } = await import("../use-git-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			branch: "main",
			ahead: 0,
			behind: 0,
			staged: [],
			changed: [],
			untracked: [],
		});

		await useGitStore.getState().refresh("/repo");
		expect(apiClient.call).toHaveBeenCalledWith("git.status", { repoPath: "/repo" });
	});
});
