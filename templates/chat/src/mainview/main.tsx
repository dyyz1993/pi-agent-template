import "./lib/i18n";
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { apiClient } from "./lib/api-client";
import { ErrorBoundary as _EB } from "@shared/components/ErrorBoundary";
import "./index.css";
import App from "./App";

const ErrorBoundary = _EB as unknown as React.FC<{ children: ReactNode }>;

const isElectrobun = typeof window !== "undefined" && !!window.__electrobunBunBridge;

if (isElectrobun) {
	apiClient.initSyncForDesktop();
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</StrictMode>
);
