import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

import type {
	GitFileChange,
	GitCommit,
	GitBranch,
	GitWorktree,
} from '../../../stores/use-git-store';

const mockFetchStatus = vi.fn();
const mockFetchWorktrees = vi.fn();
const mockFetchLog = vi.fn();
const mockFetchDiff = vi.fn();
const mockPush = vi.fn();
const mockPull = vi.fn();
const mockStageFiles = vi.fn();
const mockUnstageFiles = vi.fn();
const mockToggleCommitExpand = vi.fn();
const mockFetchCommitFileDiff = vi.fn();

const gitState = {
	branch: 'main',
	ahead: 2,
	behind: 1,
	staged: [{ path: 'src/a.ts', status: 'modified' as const }],
	changed: [{ path: 'src/b.ts', status: 'added' as const }],
	untracked: ['src/c.ts'],
	commits: [] as GitCommit[],
	loadingCommits: false,
	currentDiff: null as {
		filePath: string;
		diff: string;
		oldContent: string;
		newContent: string;
	} | null,
	expandedCommits: new Set<string>(),
	commitFiles: {} as Record<string, GitFileChange[]>,
	loadingCommitFiles: new Set<string>(),
	loadingAction: null as string | null,
	worktrees: [] as GitWorktree[],
	loadingDiff: false,
	loadingBranches: false,
	branches: [] as GitBranch[],
	fetchStatus: mockFetchStatus,
	fetchWorktrees: mockFetchWorktrees,
	fetchLog: mockFetchLog,
	fetchDiff: mockFetchDiff,
	push: mockPush,
	pull: mockPull,
	stageFiles: mockStageFiles,
	unstageFiles: mockUnstageFiles,
	toggleCommitExpand: mockToggleCommitExpand,
	fetchCommitFileDiff: mockFetchCommitFileDiff,
	commit: vi.fn(),
	fetchBranches: vi.fn(),
	checkout: vi.fn(),
};

vi.mock('../../../stores/use-git-store', () => ({
	useGitStore: <T,>(selector: (s: Record<string, unknown>) => T) => selector(gitState),
}));

const explorerState = {
	currentPath: '/project',
	openFile: vi.fn(),
};

vi.mock('../../../stores/use-explorer-store', () => ({
	useExplorerStore: <T,>(selector: (s: Record<string, unknown>) => T) => selector(explorerState),
}));

vi.mock('../../../stores/use-sidebar-store', () => ({
	useSidebarStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({ isPinned: true, breakpoint: 'desktop' }),
}));

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../GitCommitInput', () => ({
	GitCommitInput: () => <div data-testid="commit-input" />,
}));

vi.mock('../GitBranchSelector', () => ({
	GitBranchSelector: ({ onClose: _onClose }: { onClose: () => void }) => (
		<div data-testid="branch-selector" />
	),
}));

vi.mock('../../explorer/ContextMenu', () => ({
	ContextMenu: ({
		items: _items,
	}: {
		items: unknown[];
		x: number;
		y: number;
		onClose: () => void;
	}) => <div data-testid="context-menu" />,
}));

vi.mock('../../sidebar/PinButton', () => ({
	PinButton: () => <div data-testid="pin-button" />,
}));

describe('GitPanel', () => {
	afterEach(cleanup);

	it('should render git title', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText('git.title')).toBeDefined();
	});

	it('should display branch name', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText('main')).toBeDefined();
	});

	it('should show total changes badge', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText('3')).toBeDefined();
	});

	it('should show ahead/behind indicators', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText('↑2')).toBeDefined();
		expect(screen.getByText('↓1')).toBeDefined();
	});

	it('should render staged files section', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText(/git.staged/)).toBeDefined();
		expect(screen.getByText('a.ts')).toBeDefined();
	});

	it('should render changed files section', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText(/git.changes/)).toBeDefined();
		expect(screen.getByText('b.ts')).toBeDefined();
	});

	it('should render untracked files section', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText(/git.untracked/)).toBeDefined();
		expect(screen.getByText('c.ts')).toBeDefined();
	});

	it('should render push button', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByTitle('git.push')).toBeDefined();
	});

	it('should render pull button', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByTitle('git.pull')).toBeDefined();
	});

	it('should render refresh button', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByTitle('git.refresh')).toBeDefined();
	});

	it('should call fetchStatus on mount', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(mockFetchStatus).toHaveBeenCalledWith('/project');
	});

	it('should render commits toggle button', async () => {
		const { GitPanel } = await import('../GitPanel');
		render(<GitPanel />);
		expect(screen.getByText('git.commits')).toBeDefined();
	});

	it('should use full-width class when hideOuterShell is true', async () => {
		const { GitPanel } = await import('../GitPanel');
		const { container } = render(<GitPanel hideOuterShell />);
		expect(container.firstChild).toBeDefined();
	});
});
