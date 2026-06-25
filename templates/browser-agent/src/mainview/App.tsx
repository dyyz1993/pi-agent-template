import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "./stores/use-connection-store";
import { useBreakpointSync } from "./hooks/use-breakpoint";
import { useRpcInit } from "./hooks/use-rpc-init";
import { useSidebarResize } from "./hooks/use-sidebar-resize";
import { AppLayout, type CenterTab } from "./components/layout/AppLayout";
import { OnboardingGuide } from "./components/onboarding/OnboardingGuide";
import { ErrorBoundary as _EB } from "./components/common/ErrorBoundary";

const ErrorBoundary = _EB as unknown as React.FC<{ children: ReactNode }>;

function App() {
	const { t } = useTranslation();
	const ready = useConnectionStore((s) => s.ready);
	const browserStatus = useConnectionStore((s) => s.browserStatus);
	const [centerTab, setCenterTab] = useState<CenterTab>("chat");

	useBreakpointSync();
	useRpcInit();

	const { sidebarWidth, handleResizeStart } = useSidebarResize();

	// 第一层：RPC/SSE 连接尚未建立
	if (!ready) {
		return (
			<div className="h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block w-8 h-8 border-2 border-[var(--color-text-accent)] border-t-transparent rounded-full animate-spin mb-4" />
					<div className="text-[var(--color-text-tertiary)] text-sm">
						{t("app.connecting")}
					</div>
				</div>
			</div>
		);
	}

	// 第二层：RPC 已连接，但浏览器未连接 → 显示引导
	if (browserStatus === "offline") {
		return (
			<ErrorBoundary>
				<OnboardingGuide />
			</ErrorBoundary>
		);
	}

	// 第三层：浏览器已连接 → 显示工作台
	return (
		<ErrorBoundary>
			<AppLayout
				centerTab={centerTab}
				setCenterTab={setCenterTab}
				sidebarWidth={sidebarWidth}
				handleResizeStart={handleResizeStart}
			/>
		</ErrorBoundary>
	);
}

export default App;
