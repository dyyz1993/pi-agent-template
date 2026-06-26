import { useEffect } from "react";
import { useSidebarStore, useAssetsPanelStore, type Breakpoint } from "../stores/use-sidebar-store";

function getBreakpoint(width: number): Breakpoint {
	if (width < 768) return "mobile";
	if (width < 1024) return "tablet";
	if (width < 1280) return "desktop";
	return "wide";
}

/**
 * 单一 ResizeObserver，同步 breakpoint 到 store，并根据断点自动调整面板。
 *
 * 面板策略：
 * - wide (≥1280px)：侧栏 + 资源面板都固定展开
 * - desktop (1024-1279px)：侧栏固定，资源面板折叠为抽屉
 * - tablet (768-1023px)：侧栏抽屉，资源面板抽屉
 * - mobile (<768px)：全部抽屉，默认收起
 */
export function useBreakpointSync() {
	useEffect(() => {
		const applyBreakpoint = (bp: Breakpoint): void => {
			const sb = useSidebarStore.getState();
			const ap = useAssetsPanelStore.getState();

			if (bp === "wide") {
				// 宽屏：都展开
				if (!sb.isPinned) sb.setPinned(true);
				if (!ap.assetsVisible) ap.setAssetsVisible(true);
				if (ap.assetsDrawerOpen) ap.setAssetsDrawerOpen(false);
			} else if (bp === "desktop") {
				// 中屏：侧栏展开，资源面板折叠
				if (!sb.isPinned) sb.setPinned(true);
				if (ap.assetsVisible) ap.setAssetsVisible(false);
				if (ap.assetsDrawerOpen) ap.setAssetsDrawerOpen(false);
			} else {
				// tablet / mobile：都收起为抽屉
				if (sb.isPinned) sb.setPinned(false);
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
		applyBreakpoint(initBp);

		return () => {
			clearTimeout(timer);
			obs.disconnect();
		};
	}, []);
}
