import "./lib/i18n";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { apiClient } from "./lib/api-client";
import { ErrorBoundary } from "@shared/components/ErrorBoundary";
import "./index.css";
import App from "./App";

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
