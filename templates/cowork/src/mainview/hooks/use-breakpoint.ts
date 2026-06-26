import { useEffect } from 'react';
import { useSidebarStore, useAssetsPanelStore, type Breakpoint } from '../stores/use-sidebar-store';

function getBreakpoint(width: number): Breakpoint {
	if (width < 768) return 'mobile';
	if (width < 1024) return 'tablet';
	if (width < 1280) return 'desktop';
	return 'wide';
}

/**
 * 单一 ResizeObserver，同步 breakpoint 到 store。
 *
 * 仅在断点**变化**时调整面板，不覆盖用户的 sidebarMode 手动设置。
 */
export function useBreakpointSync() {
	useEffect(() => {
		const applyBreakpoint = (bp: Breakpoint): void => {
			const ap = useAssetsPanelStore.getState();

			if (bp === 'wide') {
				if (!ap.assetsVisible) ap.setAssetsVisible(true);
				if (ap.assetsDrawerOpen) ap.setAssetsDrawerOpen(false);
			} else if (bp === 'desktop') {
				if (ap.assetsVisible) ap.setAssetsVisible(false);
				if (ap.assetsDrawerOpen) ap.setAssetsDrawerOpen(false);
			} else {
				// tablet / mobile：侧栏走抽屉，资源面板收起
				if (ap.assetsVisible) ap.setAssetsVisible(false);
			}
		};

		let timer: ReturnType<typeof setTimeout>;
		const obs = new ResizeObserver((entries) => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				for (const entry of entries) {
					const bp = getBreakpoint(entry.contentRect.width);
					const current = useSidebarStore.getState().breakpoint;
					if (bp !== current) {
						useSidebarStore.getState()._setBreakpoint(bp);
						applyBreakpoint(bp);
					}
				}
			}, 150);
		});
		obs.observe(document.documentElement);

		// 初始也应用一次
		const initBp = getBreakpoint(document.documentElement.clientWidth);
		useSidebarStore.getState()._setBreakpoint(initBp);
		applyBreakpoint(initBp);

		return () => {
			clearTimeout(timer);
			obs.disconnect();
		};
	}, []);
}
