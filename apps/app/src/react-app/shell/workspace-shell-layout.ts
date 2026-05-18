/** @jsxImportSource react */
import { useCallback, useEffect, useRef } from "react";

import { useUiStateStore } from "./ui-state-store";

export function useLeftSidebarResize() {
  const leftSidebarWidth = useUiStateStore((state) => state.workspaceLeftSidebarWidth);
  const setLeftSidebarWidth = useUiStateStore((state) => state.setWorkspaceLeftSidebarWidth);
  const setLeftSidebarResizing = useUiStateStore((state) => state.setWorkspaceLeftSidebarResizing);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const stopLeftSidebarResize = useCallback(() => {
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    setLeftSidebarResizing(false);
    if (typeof document === "undefined") return;
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, [setLeftSidebarResizing]);

  const startLeftSidebarResize = useCallback(
    (event: PointerEvent | React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || typeof window === "undefined") return;

      stopLeftSidebarResize();
      setLeftSidebarResizing(true);
      const initialX = event.clientX;
      const initialWidth = leftSidebarWidth;

      const handleMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - initialX;
        setLeftSidebarWidth(initialWidth + delta);
      };

      const handleStop = () => {
        stopLeftSidebarResize();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleStop);
      window.addEventListener("pointercancel", handleStop);
      dragCleanupRef.current = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleStop);
        window.removeEventListener("pointercancel", handleStop);
      };

      if (typeof document !== "undefined") {
        Object.assign(document.body.style, {
          cursor: "col-resize",
          userSelect: "none",
        });
      }

      event.preventDefault();
    },
    [
      leftSidebarWidth,
      setLeftSidebarResizing,
      setLeftSidebarWidth,
      stopLeftSidebarResize,
    ],
  );

  useEffect(() => {
    return () => {
      stopLeftSidebarResize();
    };
  }, [stopLeftSidebarResize]);

  return startLeftSidebarResize;
}
