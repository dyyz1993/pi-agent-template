import { useEffect } from 'react';
import { useSidebarStore, useRightPanelStore, type Breakpoint } from '../stores/use-sidebar-store';

function getBreakpoint(width: number): Breakpoint {
	if (width < 768) return 'mobile';
	if (width < 1024) return 'tablet';
	if (width < 1280) return 'desktop';
	return 'wide';
}

/**
 * 单一 ResizeObserver，同步 breakpoint 到 store。
 *
 * 仅在断点**变化**时调整面板，不覆盖用户的 sidebarMode/rightPanelMode 手动设置。
 */
export function useBreakpointSync() {
	useEffect(() => {
		const applyBreakpoint = (bp: Breakpoint): void => {
			const rp = useRightPanelStore.getState();

			// 移动端/平板自动收起右栏
			if (bp === 'mobile' || bp === 'tablet') {
				if (rp.mode !== 'hidden') rp.setMode('hidden');
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
