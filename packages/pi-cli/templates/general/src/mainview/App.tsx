import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "./stores/use-connection-store";
import { useBreakpointSync } from "./hooks/use-breakpoint";
import { useRpcInit } from "./hooks/use-rpc-init";
import { useSidebarResize } from "./hooks/use-sidebar-resize";
import { AppLayout, type CenterTab } from "./components/layout/AppLayout";

function App() {
  const { t } = useTranslation();
  const ready = useConnectionStore((s) => s.ready);
  const [centerTab, setCenterTab] = useState<CenterTab>("chat");

  useBreakpointSync();
  useRpcInit();

  const { sidebarWidth, handleResizeStart } = useSidebarResize();

  if (!ready) {
    return (
      <div className="h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[var(--color-text-accent)] border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-[var(--color-text-tertiary)] text-sm">{t("app.connecting")}</div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      centerTab={centerTab}
      setCenterTab={setCenterTab}
      sidebarWidth={sidebarWidth}
      handleResizeStart={handleResizeStart}
    />
  );
}

export default App;
