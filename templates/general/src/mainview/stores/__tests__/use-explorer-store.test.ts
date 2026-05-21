import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
	apiClient: {
		call: vi.fn(),
		getBaseUrl: vi.fn(() => "http://localhost:3000"),
		getAuthToken: vi.fn(() => "test-token"),
	},
}));

vi.mock("../use-log-store", () => ({
	useLogStore: { getState: () => ({ addLog: vi.fn() }) },
}));

vi.mock("../use-connection-store", () => ({
	useConnectionStore: { getState: () => ({ mode: "desktop" }) },
}));

vi.mock("../../utils/drop-handler", () => ({
	uploadEntriesWeb: vi.fn(() => Promise.resolve(3)),
	importFilesDesktop: vi.fn(() => Promise.resolve(3)),
}));

describe("useExplorerStore", () => {
	beforeEach(async () => {
		vi.resetModules();
	});

	it("should have correct initial state", async () => {
		const { useExplorerStore } = await import("../use-explorer-store");
		const state = useExplorerStore.getState();
		expect(state.treeNodes).toEqual([]);
		expect(state.currentPath).toBe("");
		expect(state.selectedPath).toBeNull();
		expect(state.filePreview).toBeNull();
		expect(state.loadingFile).toBe(false);
		expect(state.editingNode).toBeNull();
	});

	it("should set currentPath", async () => {
		const { useExplorerStore } = await import("../use-explorer-store");
		useExplorerStore.getState().setCurrentPath("/home/user");
		expect(useExplorerStore.getState().currentPath).toBe("/home/user");
	});

	it("should list root directory", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");
		const mockEntries = [
			{ name: "src", path: "/src", type: "directory" as const, size: 0 },
			{ name: "readme.md", path: "/readme.md", type: "file" as const, size: 100 },
		];
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: mockEntries,
			basePath: "/root",
		});

		useExplorerStore.getState().setCurrentPath("/");
		await useExplorerStore.getState().listRootDir();

		const state = useExplorerStore.getState();
		expect(state.treeNodes).toHaveLength(2);
		expect(state.treeNodes[0].name).toBe("src");
		expect(state.treeNodes[0].expanded).toBe(false);
		expect(state.treeNodes[0].loaded).toBe(false);
		expect(state.treeNodes[1].name).toBe("readme.md");
		expect(state.currentPath).toBe("/root");
	});

	it("should toggle node to expand and load children", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");

		const rootNodes = [{ name: "src", path: "/src", type: "directory" as const, size: 0 }];
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: rootNodes,
			basePath: "/",
		});
		await useExplorerStore.getState().listRootDir();

		const childEntries = [
			{ name: "index.ts", path: "/src/index.ts", type: "file" as const, size: 50 },
		];
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: childEntries,
		});

		await useExplorerStore.getState().toggleNode("/src");

		const state = useExplorerStore.getState();
		expect(state.treeNodes[0].expanded).toBe(true);
		expect(state.treeNodes[0].loaded).toBe(true);
		expect(state.treeNodes[0].children).toHaveLength(1);
		expect(state.treeNodes[0].children![0].name).toBe("index.ts");
	});

	it("should collapse an expanded node", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");

		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: [{ name: "src", path: "/src", type: "directory" as const, size: 0 }],
			basePath: "/",
		});
		await useExplorerStore.getState().listRootDir();

		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: [],
		});
		await useExplorerStore.getState().toggleNode("/src");
		expect(useExplorerStore.getState().treeNodes[0].expanded).toBe(true);

		await useExplorerStore.getState().toggleNode("/src");
		expect(useExplorerStore.getState().treeNodes[0].expanded).toBe(false);
	});

	it("should start and cancel editing", async () => {
		const { useExplorerStore } = await import("../use-explorer-store");
		useExplorerStore.getState().startEditing("/src", "file");
		expect(useExplorerStore.getState().editingNode).toEqual({ path: "/src", type: "file" });

		useExplorerStore.getState().cancelEditing();
		expect(useExplorerStore.getState().editingNode).toBeNull();
	});

	it("should close preview", async () => {
		const { useExplorerStore } = await import("../use-explorer-store");
		useExplorerStore.setState({
			selectedPath: "/file.ts",
			filePreview: { path: "/file.ts", name: "file.ts" } as any,
		});
		useExplorerStore.getState().closePreview();
		expect(useExplorerStore.getState().selectedPath).toBeNull();
		expect(useExplorerStore.getState().filePreview).toBeNull();
	});

	it("should create file and refresh dir", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");
		useExplorerStore.getState().startEditing("/src", "file");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce(undefined);
		callMock.mockResolvedValueOnce({
			entries: [{ name: "new.ts", path: "/src/new.ts", type: "file" as const, size: 0 }],
			basePath: "/src",
		});

		await useExplorerStore.getState().createFile("/src", "new.ts");
		expect(callMock).toHaveBeenCalledWith("file.createFile", { dirPath: "/src", name: "new.ts" });
		expect(useExplorerStore.getState().editingNode).toBeNull();
	});

	it("should clear editingNode on createFile error", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");
		useExplorerStore.getState().startEditing("/src", "file");
		(apiClient.call as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));

		await useExplorerStore.getState().createFile("/src", "bad.ts");
		expect(useExplorerStore.getState().editingNode).toBeNull();
	});

	it("should create dir and refresh", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");
		const callMock = apiClient.call as ReturnType<typeof vi.fn>;
		callMock.mockResolvedValueOnce(undefined);
		callMock.mockResolvedValueOnce({
			entries: [{ name: "newdir", path: "/src/newdir", type: "directory" as const, size: 0 }],
			basePath: "/src",
		});

		await useExplorerStore.getState().createDir("/src", "newdir");
		expect(callMock).toHaveBeenCalledWith("file.createDir", { dirPath: "/src", name: "newdir" });
		expect(useExplorerStore.getState().editingNode).toBeNull();
	});

	it("should rename node", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: [{ name: "old.ts", path: "/old.ts", type: "file" as const, size: 10 }],
			basePath: "/",
		});
		await useExplorerStore.getState().listRootDir();

		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			newPath: "/renamed.ts",
		});

		await useExplorerStore.getState().renameNode("/old.ts", "renamed.ts");
		const state = useExplorerStore.getState();
		expect(state.treeNodes[0].name).toBe("renamed.ts");
		expect(state.treeNodes[0].path).toBe("/renamed.ts");
		expect(state.editingNode).toBeNull();
	});

	it("should delete node and clear preview if selected", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: [{ name: "del.ts", path: "/del.ts", type: "file" as const, size: 10 }],
			basePath: "/",
		});
		await useExplorerStore.getState().listRootDir();
		useExplorerStore.setState({ selectedPath: "/del.ts" });

		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: [],
			basePath: "/",
		});

		await useExplorerStore.getState().deleteNode("/del.ts");
		expect(useExplorerStore.getState().treeNodes).toHaveLength(0);
		expect(useExplorerStore.getState().selectedPath).toBeNull();
		expect(useExplorerStore.getState().filePreview).toBeNull();
	});

	it("should open text file in desktop mode", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useExplorerStore } = await import("../use-explorer-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			content: "file contents",
		});

		const node = { name: "test.ts", path: "/test.ts", type: "file" as const, size: 50 };
		await useExplorerStore.getState().openFile(node);

		const state = useExplorerStore.getState();
		expect(state.selectedPath).toBe("/test.ts");
		expect(state.filePreview).not.toBeNull();
		expect(state.filePreview!.content).toBe("file contents");
		expect(state.filePreview!.isText).toBe(true);
		expect(state.loadingFile).toBe(false);
	});

	it("should not open directory", async () => {
		const { useExplorerStore } = await import("../use-explorer-store");
		const dirNode = { name: "src", path: "/src", type: "directory" as const, size: 0 };

		await useExplorerStore.getState().openFile(dirNode);
		expect(useExplorerStore.getState().filePreview).toBeNull();
	});

	it("should import files in desktop mode", async () => {
		const { useExplorerStore } = await import("../use-explorer-store");
		const { apiClient } = await import("../../lib/api-client");
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			entries: [],
			basePath: "/dest",
		});

		const count = await useExplorerStore
			.getState()
			.importFiles([{ path: "/a.txt", name: "a.txt", kind: "file" }], "/dest");
		expect(count).toBe(3);
	});
});
