import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GitPanel } from "../../components/git/GitPanel";
import { useGitStore } from "../../stores/use-git-store";
import { act } from "@testing-library/react";

const defaultGitState = {
  branch: "main",
  ahead: 0,
  behind: 0,
  staged: [],
  changed: [],
  untracked: [],
  commits: [],
  loadingCommits: false,
  currentDiff: null,
  loadingDiff: false,
  expandedCommits: new Set(),
  commitFiles: {},
  loadingCommitFiles: new Set(),
  branches: [],
  loadingBranches: false,
  worktrees: [],
  loadingAction: null,
  fetchStatus: vi.fn().mockResolvedValue(undefined),
  fetchDiff: vi.fn().mockResolvedValue(undefined),
  fetchLog: vi.fn().mockResolvedValue(undefined),
  clearDiff: vi.fn(),
  toggleCommitExpand: vi.fn().mockResolvedValue(undefined),
  fetchCommitFileDiff: vi.fn().mockResolvedValue(undefined),
  fetchBranches: vi.fn().mockResolvedValue(undefined),
  checkout: vi.fn().mockResolvedValue(undefined),
  stageFiles: vi.fn().mockResolvedValue(undefined),
  unstageFiles: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  push: vi.fn().mockResolvedValue(undefined),
  pull: vi.fn().mockResolvedValue(undefined),
  fetchWorktrees: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    call: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../stores/use-log-store", () => ({
  useLogStore: Object.assign(
    (s: (state: { addLog: () => void }) => unknown) => s({ addLog: vi.fn() }),
    { getState: () => ({ addLog: vi.fn() }) }
  ),
}));

vi.mock("../../stores/use-explorer-store", () => ({
  useExplorerStore: Object.assign(
    (s: (state: { currentPath: string; openFile: () => void }) => unknown) =>
      s({ currentPath: "/repo", openFile: vi.fn() }),
    { getState: () => ({ currentPath: "/repo", openFile: vi.fn() }) }
  ),
}));

vi.mock("../../stores/use-sidebar-store", () => ({
  useSidebarStore: (s: (state: { isPinned: boolean; breakpoint: string }) => unknown) =>
    s({ isPinned: false, breakpoint: "desktop" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "git.title": "Source Control",
        "git.staged": "Staged",
        "git.changes": "Changes",
        "git.untracked": "Untracked",
        "git.noChanges": "No changes",
        "git.commits": "Commits",
        "git.refresh": "Refresh",
        "git.pull": "Pull",
        "git.push": "Push",
        "git.unstageAll": "Unstage All",
        "git.stageAll": "Stage All",
        "git.openDiff": "Open Diff",
        "git.openFile": "Open File",
        "git.copyPath": "Copy Path",
        "git.copyHash": "Copy Hash",
        "git.copyMessage": "Copy Message",
        "git.loadingFiles": "Loading...",
        "git.noFiles": "No files",
        "git.noCommits": "No commits",
        "git.worktrees": "Worktrees",
        "git.close": "Close",
        "git.justNow": "just now",
        "git.minutesAgo": "{{count}}m ago",
        "git.hoursAgo": "{{count}}h ago",
        "git.daysAgo": "{{count}}d ago",
        "common.loading": "Loading...",
        "git.commitPlaceholder": "Message",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

describe("GitPanel", () => {
  beforeEach(() => {
    act(() => {
      useGitStore.setState(defaultGitState);
    });
  });

  it("renders git title", () => {
    render(<GitPanel />);
    expect(screen.getByText("Source Control")).toBeInTheDocument();
  });

  it("shows no changes when empty", () => {
    render(<GitPanel />);
    expect(screen.getByText("No changes")).toBeInTheDocument();
  });

  it("displays staged files with label", () => {
    act(() => {
      useGitStore.setState({
        ...defaultGitState,
        staged: [{ path: "src/foo.ts", status: "modified" }],
      });
    });
    render(<GitPanel />);
    expect(screen.getByText("foo.ts")).toBeInTheDocument();
    expect(screen.getByText(/Staged/)).toBeInTheDocument();
  });

  it("displays changed files with label", () => {
    act(() => {
      useGitStore.setState({
        ...defaultGitState,
        changed: [{ path: "src/bar.ts", status: "added" }],
      });
    });
    render(<GitPanel />);
    expect(screen.getByText("bar.ts")).toBeInTheDocument();
    expect(screen.getByText(/Changes/)).toBeInTheDocument();
  });

  it("shows branch name", () => {
    render(<GitPanel />);
    expect(screen.getByText("main")).toBeInTheDocument();
  });
});
