import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../../../stores/use-connection-store', () => ({
	useConnectionStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({ mode: 'desktop' }),
}));

vi.mock('../../../stores/use-explorer-store', () => ({
	useExplorerStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({ filePreview: null, loadingFile: false, closePreview: vi.fn() }),
}));

vi.mock('../../../stores/use-sidebar-store', () => ({
	useSidebarStore: <T,>(selector: (s: Record<string, unknown>) => T) =>
		selector({
			activePanel: 'explorer',
			isPinned: true,
			drawerOpen: false,
			breakpoint: 'desktop',
			setDrawerOpen: vi.fn(),
		}),
}));

vi.mock('../../activity-bar/ActivityBar', () => ({
	ActivityBar: () => <div data-testid="activity-bar" />,
}));

vi.mock('../../activity-bar/MobileTabBar', () => ({
	MobileTabBar: () => <div data-testid="mobile-tab-bar" />,
}));

vi.mock('../../explorer/ExplorerSidebar', () => ({
	ExplorerSidebar: () => <div data-testid="explorer-sidebar" />,
}));

vi.mock('../../git/GitPanel', () => ({
	GitPanel: () => <div data-testid="git-panel" />,
}));

vi.mock('../../search/SearchPanel', () => ({
	SearchPanel: () => <div data-testid="search-panel" />,
}));

vi.mock('../../rules/RulesPanel', () => ({
	RulesPanel: () => <div data-testid="rules-panel" />,
}));

vi.mock('../../chat/ChatPanel', () => ({
	ChatPanel: () => <div data-testid="chat-panel" />,
}));

vi.mock('../../feed/FeedPanel', () => ({
	FeedPanel: () => <div data-testid="feed-panel" />,
}));

vi.mock('../../bash/BashPanel', () => ({
	BashPanel: () => <div data-testid="bash-panel" />,
}));

vi.mock('../../todo/TodoPanel', () => ({
	TodoPanel: () => <div data-testid="todo-panel" />,
}));

vi.mock('../../file-preview/FilePreviewOverlay', () => ({
	FilePreviewOverlay: () => <div data-testid="file-preview" />,
}));

vi.mock('../../diff/DiffViewerPanel', () => ({
	DiffViewerPanel: () => <div data-testid="diff-panel" />,
}));

vi.mock('../../debug/DebugPanel', () => ({
	DebugPanel: () => <div data-testid="debug-panel" />,
}));

vi.mock('../../common/ThemeToggle', () => ({
	ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (k: string) => k }),
}));

describe('AppLayout', () => {
	afterEach(cleanup);

	it('should render center tab buttons', async () => {
		const { AppLayout } = await import('../AppLayout');
		render(
			<AppLayout
				centerTab="chat"
				setCenterTab={vi.fn()}
				sidebarWidth={240}
				handleResizeStart={vi.fn()}
			/>,
		);
		expect(screen.getByText('tabs.chat')).toBeDefined();
		expect(screen.getByText('tabs.feed')).toBeDefined();
		expect(screen.getByText('tabs.bash')).toBeDefined();
		expect(screen.getByText('tabs.todo')).toBeDefined();
	});

	it('should render ActivityBar on desktop', async () => {
		const { AppLayout } = await import('../AppLayout');
		render(
			<AppLayout
				centerTab="chat"
				setCenterTab={vi.fn()}
				sidebarWidth={240}
				handleResizeStart={vi.fn()}
			/>,
		);
		expect(screen.getByTestId('activity-bar')).toBeDefined();
	});

	it('should render sidebar content when panel is active and pinned', async () => {
		const { AppLayout } = await import('../AppLayout');
		render(
			<AppLayout
				centerTab="chat"
				setCenterTab={vi.fn()}
				sidebarWidth={240}
				handleResizeStart={vi.fn()}
			/>,
		);
		expect(screen.getByTestId('explorer-sidebar')).toBeDefined();
	});

	it('should call setCenterTab when tab is clicked', async () => {
		const setCenterTab = vi.fn();
		const { AppLayout } = await import('../AppLayout');
		render(
			<AppLayout
				centerTab="chat"
				setCenterTab={setCenterTab}
				sidebarWidth={240}
				handleResizeStart={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText('tabs.feed'));
		expect(setCenterTab).toHaveBeenCalledWith('feed');
	});

	it('should render mode indicator in title bar', async () => {
		const { AppLayout } = await import('../AppLayout');
		render(
			<AppLayout
				centerTab="chat"
				setCenterTab={vi.fn()}
				sidebarWidth={240}
				handleResizeStart={vi.fn()}
			/>,
		);
		expect(screen.getByText('app.mode.desktop')).toBeDefined();
	});

	it('should render DebugPanel on desktop', async () => {
		const { AppLayout } = await import('../AppLayout');
		render(
			<AppLayout
				centerTab="chat"
				setCenterTab={vi.fn()}
				sidebarWidth={240}
				handleResizeStart={vi.fn()}
			/>,
		);
		expect(screen.getByTestId('debug-panel')).toBeDefined();
	});
});
