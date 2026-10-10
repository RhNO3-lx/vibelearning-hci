import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, AppState } from "../model";

type MapView = {
  selectedConcept: string | null;
  selectionOrigin: "tree" | "knowledge";
};
type WindowMessage =
  | { kind: "ready" | "dock" | "hide" | "shutdown" }
  | { kind: "action"; action: Action }
  | { kind: "view"; view: MapView }
  | { kind: "state"; state: AppState; view: MapView };

/** A real map-only page; BroadcastChannel keeps the parent authoritative. */
export function useMapWindow(options: {
  state: AppState;
  dispatch: (action: Action) => void;
  view: MapView;
  onView: (view: MapView) => void;
  onDismiss: () => void;
  onHide: () => void;
}) {
  const params = new URLSearchParams(window.location.search);
  const detached = params.get("view") === "map";
  const channelName = useRef(
    params.get("channel") ?? `vibelearning-map-${crypto.randomUUID()}`,
  );
  const [opened, setOpened] = useState(false);
  const [synchronized, setSynchronized] = useState(!detached);
  const popup = useRef<Window | null>(null),
    channel = useRef<BroadcastChannel | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const dismiss = useCallback(() => {
    const child = popup.current;
    popup.current = null;
    setOpened(false);
    child?.close();
    latest.current.onDismiss();
  }, []);
  useEffect(() => {
    const bc = new BroadcastChannel(channelName.current);
    channel.current = bc;
    bc.onmessage = (event: MessageEvent<WindowMessage>) => {
      const message = event.data;
      if (detached) {
        if (message.kind === "state") {
          latest.current.dispatch({ type: "reset", state: message.state });
          latest.current.onView(message.view);
          setSynchronized(true);
        }
        if (message.kind === "shutdown") window.close();
      } else {
        if (message.kind === "ready")
          bc.postMessage({
            kind: "state",
            state: latest.current.state,
            view: latest.current.view,
          });
        if (message.kind === "action") latest.current.dispatch(message.action);
        if (message.kind === "view") latest.current.onView(message.view);
        if (message.kind === "dock") dismiss();
        if (message.kind === "hide") {
          dismiss();
          latest.current.onHide();
        }
      }
    };
    if (detached) {
      document.title = "Vibe Learning · 学习地图";
      bc.postMessage({ kind: "ready" });
    }
    const unload = () => {
      bc.postMessage({ kind: detached ? "dock" : "shutdown" });
      if (!detached) popup.current?.close();
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("beforeunload", unload);
      bc.close();
      if (!detached) popup.current?.close();
    };
  }, [detached, dismiss]);
  useEffect(() => {
    if (!detached && opened)
      channel.current?.postMessage({
        kind: "state",
        state: options.state,
        view: options.view,
      });
  }, [
    detached,
    opened,
    options.state,
    options.view.selectedConcept,
    options.view.selectionOrigin,
  ]);
  useEffect(() => {
    if (detached && synchronized)
      channel.current?.postMessage({ kind: "view", view: options.view });
  }, [
    detached,
    synchronized,
    options.view.selectedConcept,
    options.view.selectionOrigin,
  ]);
  useEffect(() => {
    if (!opened) return;
    const timer = setInterval(() => {
      if (popup.current?.closed) dismiss();
    }, 500);
    return () => clearInterval(timer);
  }, [opened, dismiss]);
  const mapUrl = new URL(window.location.href);
  mapUrl.search = new URLSearchParams({
    view: "map",
    channel: channelName.current,
  }).toString();
  const url = mapUrl.href;
  const open = useCallback(() => {
    if (popup.current && !popup.current.closed) {
      popup.current.focus();
      return true;
    }
    const child = window.open(
      url,
      "_blank",
      "popup=yes,width=540,height=780,resizable=yes,scrollbars=no",
    );
    if (!child) return false;
    popup.current = child;
    setOpened(true);
    return true;
  }, [url]);
  const close = useCallback(
    (collapse = false) => {
      if (detached) {
        channel.current?.postMessage({ kind: collapse ? "hide" : "dock" });
        setTimeout(() => window.close(), 40);
      } else {
        dismiss();
        if (collapse) latest.current.onHide();
      }
    },
    [detached, dismiss],
  );
  const dispatch = useCallback(
    (action: Action) => {
      if (detached) channel.current?.postMessage({ kind: "action", action });
      else latest.current.dispatch(action);
    },
    [detached],
  );
  return { detached, opened, open, close, dispatch, url };
}
