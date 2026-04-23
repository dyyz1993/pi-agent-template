import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const el = document.documentElement;
    const obs = new ResizeObserver((entries) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const entry of entries) {
          setBp(getBreakpoint(entry.contentRect.width));
        }
      }, 100);
    });
    obs.observe(el);
    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
  }, []);

  return bp;
}
