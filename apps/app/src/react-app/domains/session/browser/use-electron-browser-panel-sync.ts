/** @jsxImportSource react */
import * as React from "react";

import { isElectronRuntime } from "../../../../app/utils";
import { useUiStateStore } from "../../../shell/ui-state-store";

export function useElectronBrowserPanelSync() {
  const openBrowserPanel = useUiStateStore((state) => state.openBrowserPanel);
  const closeBrowserPanel = useUiStateStore((state) => state.closeBrowserPanel);

  React.useEffect(() => {
    if (!isElectronRuntime()) {
      return;
    }

    const browser = window.__OPENWORK_ELECTRON__?.browser;

    if (!browser) {
      return;
    }

    const unsubscribeOpen = browser.onPanelOpened?.(openBrowserPanel);
    const unsubscribeClose = browser.onPanelClosed?.(closeBrowserPanel);

    return () => {
      unsubscribeOpen?.();
      unsubscribeClose?.();
    };
  }, [closeBrowserPanel, openBrowserPanel]);
}
