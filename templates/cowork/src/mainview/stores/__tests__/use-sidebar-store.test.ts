import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useSidebarStore + useRightPanelStore', () => {
	beforeEach(async () => {
		vi.resetModules();
		localStorage.clear();
	});

	describe('useRightPanelStore.preview (expandedForPreview)', () => {
		it('initial state should not be expanded for preview', async () => {
			const { useRightPanelStore } = await import('../use-sidebar-store');
			const state = useRightPanelStore.getState();
			expect(state.expandedForPreview).toBe(false);
			expect(state.widthBeforeExpand).toBeNull();
		});

		it('openForPreview should set expandedForPreview and snapshot width', async () => {
			vi.stubGlobal('innerWidth', 1440);
			const { useRightPanelStore } = await import('../use-sidebar-store');
			const widthBefore = useRightPanelStore.getState().width;

			useRightPanelStore.getState().openForPreview();

			const state = useRightPanelStore.getState();
			expect(state.expandedForPreview).toBe(true);
			// ~40% of 1440 = 576, clamped to [240, 600] → 576
			expect(state.width).toBe(576);
			expect(state.widthBeforeExpand).toBe(widthBefore);
			vi.unstubAllGlobals();
		});

		it('openForPreview should clamp to max width on narrow viewports', async () => {
			vi.stubGlobal('innerWidth', 2000);
			const { useRightPanelStore } = await import('../use-sidebar-store');

			useRightPanelStore.getState().openForPreview();

			// 40% of 2000 = 800, clamped to max 600
			expect(useRightPanelStore.getState().width).toBe(600);
			vi.unstubAllGlobals();
		});

		it('openForPreview should be idempotent when already expanded', async () => {
			vi.stubGlobal('innerWidth', 1440);
			const { useRightPanelStore } = await import('../use-sidebar-store');
			useRightPanelStore.getState().openForPreview();

			// Manually resize after opening
			useRightPanelStore.getState().setWidth(300);
			useRightPanelStore.getState().openForPreview(); // second call should no-op

			expect(useRightPanelStore.getState().width).toBe(300);
			vi.unstubAllGlobals();
		});

		it('closePreview should restore the width from before expanding', async () => {
			vi.stubGlobal('innerWidth', 1440);
			const { useRightPanelStore } = await import('../use-sidebar-store');
			const widthBefore = useRightPanelStore.getState().width;

			useRightPanelStore.getState().openForPreview();
			expect(useRightPanelStore.getState().width).not.toBe(widthBefore);

			useRightPanelStore.getState().closePreview();

			const state = useRightPanelStore.getState();
			expect(state.expandedForPreview).toBe(false);
			expect(state.width).toBe(widthBefore);
			expect(state.widthBeforeExpand).toBeNull();
			vi.unstubAllGlobals();
		});

		it('closePreview should fall back to default width when no snapshot', async () => {
			const { useRightPanelStore, RIGHT_PANEL_DEFAULT_WIDTH } =
				await import('../use-sidebar-store');
			useRightPanelStore.getState().closePreview();
			// No prior expand → falls back to default (320)
			expect(useRightPanelStore.getState().width).toBe(RIGHT_PANEL_DEFAULT_WIDTH);
		});
	});
});
