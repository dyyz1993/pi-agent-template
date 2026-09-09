import { useCallback, useRef } from "react";
import { useSidebarStore } from "../stores/use-sidebar-store";

export function useSidebarResize() {
  const sidebarWidth = useSidebarStore((s) => s.sidebarWidth);
  const setSidebarWidth = useSidebarStore((s) => s.setSidebarWidth);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = ev.clientX - startXRef.current;
        setSidebarWidth(startWidthRef.current + delta);
      };
      const onUp = () => {
        resizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth, setSidebarWidth]
  );

  return { sidebarWidth, handleResizeStart };
}
