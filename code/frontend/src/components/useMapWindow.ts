import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, AppState } from "../model";
import {
  mapWindowKind,
  conflictingWindows,
  type MapWindowKind,
  type MapView,
} from "../mapWindows";

type WindowMessage =
  | { kind: "ready" | "dock" | "hide"; windowKind: MapWindowKind }
  | { kind: "shutdown"; windowKind?: MapWindowKind }
  | { kind: "action"; action: Action }
  | { kind: "view"; view: MapView }
  | {
      kind: "state";
      state: AppState;
      view: MapView;
      windowKind?: MapWindowKind;
    };

/** The workbench owns domain state; graph windows retain their own tabs and cameras. */
export function useMapWindow(options: {
  state: AppState;
  dispatch: (action: Action) => void;
  view: MapView;
  onView: (view: MapView) => void;
  onDismiss: () => void;
}) {
  const desktop = window.vibeDesktop;
  const params = new URLSearchParams(window.location.search);
  const detached = params.get("view") === "map";
  const kind = mapWindowKind(params.get("mapKind"));
  const channelName = useRef(
    params.get("channel") ?? `vibelearning-map-${crypto.randomUUID()}`,
  );
  const [openedKinds, setOpenedKinds] = useState<MapWindowKind[]>([]);
  const [synchronized, setSynchronized] = useState(!detached);
  const popups = useRef<Partial<Record<MapWindowKind, Window>>>({});
  const channel = useRef<BroadcastChannel | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const markWindow = useCallback(
    (windowKind: MapWindowKind, opened: boolean) => {
      setOpenedKinds((previous) =>
        opened
          ? previous.includes(windowKind)
            ? previous
            : [...previous, windowKind]
          : previous.filter((k) => k !== windowKind),
      );
    },
    [],
  );
  const dismiss = useCallback(
    (windowKind: MapWindowKind) => {
      const child = popups.current[windowKind];
      delete popups.current[windowKind];
      child?.close();
      markWindow(windowKind, false);
      latest.current.onDismiss();
    },
    [markWindow],
  );
  useEffect(() => {
    const bc = new BroadcastChannel(channelName.current);
    channel.current = bc;
    bc.onmessage = (event: MessageEvent<WindowMessage>) => {
      const message = event.data;
      if (detached) {
        if (
          message.kind === "state" &&
          (!message.windowKind || message.windowKind === kind)
        ) {
          latest.current.dispatch({ type: "reset", state: message.state });
          latest.current.onView(message.view);
          setSynchronized(true);
        }
        if (
          message.kind === "shutdown" &&
          (!message.windowKind || message.windowKind === kind)
        )
          window.close();
      } else {
        if (message.kind === "ready") {
          markWindow(message.windowKind, true);
          bc.postMessage({
            kind: "state",
            state: latest.current.state,
            view: latest.current.view,
            windowKind: message.windowKind,
          });
        }
        if (message.kind === "action") latest.current.dispatch(message.action);
        if (message.kind === "view") latest.current.onView(message.view);
        if (message.kind === "dock" || message.kind === "hide")
          dismiss(message.windowKind);
      }
    };
    if (detached) {
      document.title = `Vibe Learning · ${kind === "tree" ? "探索树" : kind === "knowledge" ? "知识图" : "学习地图"}`;
      bc.postMessage({ kind: "ready", windowKind: kind });
    }
    const unsubscribe = desktop?.onMapWindowChange((state) => {
      if (detached) return;
      markWindow(state.kind, state.opened);
      if (!state.opened) latest.current.onDismiss();
    });
    const unload = () => {
      if (!detached) {
        bc.postMessage({ kind: "shutdown" });
        Object.values(popups.current).forEach((child) => child?.close());
      } else if (!desktop) bc.postMessage({ kind: "dock", windowKind: kind });
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("beforeunload", unload);
      unsubscribe?.();
      bc.close();
      if (!detached)
        Object.values(popups.current).forEach((child) => child?.close());
    };
  }, [detached, kind, dismiss, markWindow, desktop]);
  useEffect(() => {
    if (!detached && openedKinds.length)
      channel.current?.postMessage({
        kind: "state",
        state: options.state,
        view: options.view,
      });
  }, [
    detached,
    openedKinds,
    options.state,
    options.view.selectedConcept,
    options.view.selectionOrigin,
    options.view.relationMode,
  ]);
  useEffect(() => {
    if (detached && synchronized)
      channel.current?.postMessage({ kind: "view", view: options.view });
  }, [
    detached,
    synchronized,
    options.view.selectedConcept,
    options.view.selectionOrigin,
    options.view.relationMode,
  ]);
  useEffect(() => {
    if (!openedKinds.length || desktop || detached) return;
    const timer = setInterval(() => {
      for (const k of openedKinds) if (popups.current[k]?.closed) dismiss(k);
    }, 500);
    return () => clearInterval(timer);
  }, [openedKinds, dismiss, desktop, detached]);
  const open = useCallback(
    async (windowKind: MapWindowKind = "both") => {
      if (desktop) {
        try {
          return await desktop.openMap(channelName.current, windowKind);
        } catch {
          return false;
        }
      }
      const existing = popups.current[windowKind];
      if (existing && !existing.closed) {
        existing.focus();
        return true;
      }
      const mapUrl = new URL(window.location.href);
      mapUrl.search = new URLSearchParams({
        view: "map",
        channel: channelName.current,
        mapKind: windowKind,
      }).toString();
      const child = window.open(
        mapUrl.href,
        "_blank",
        "popup=yes,width=640,height=780,resizable=yes,scrollbars=no",
      );
      if (!child) return false;
      for (const other of conflictingWindows(
        Object.keys(popups.current) as MapWindowKind[],
        windowKind,
      ))
        dismiss(other);
      popups.current[windowKind] = child;
      markWindow(windowKind, true);
      return true;
    },
    [desktop, dismiss, markWindow],
  );
  const close = useCallback(
    (windowKind?: MapWindowKind) => {
      const target = windowKind ?? (detached ? kind : "all");
      if (desktop) {
        void desktop.dockMap(target);
        return;
      }
      if (detached && target === kind) {
        channel.current?.postMessage({ kind: "dock", windowKind: kind });
        setTimeout(() => window.close(), 40);
      } else if (target === "all") {
        Object.keys(popups.current).forEach((k) => dismiss(k as MapWindowKind));
      } else dismiss(target);
    },
    [desktop, detached, kind, dismiss],
  );
  const dispatch = useCallback(
    (action: Action) => {
      if (detached) channel.current?.postMessage({ kind: "action", action });
      else latest.current.dispatch(action);
    },
    [detached],
  );
  return {
    detached,
    kind,
    openedKinds,
    opened: openedKinds.length > 0,
    open,
    close,
    dispatch,
  };
}
