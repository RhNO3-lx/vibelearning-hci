import type { MapWindowKind } from "./mapWindows";
export {};
declare global {
  interface Window {
    vibeDesktop?: {
      openMap: (channel: string, kind: MapWindowKind) => Promise<boolean>;
      dockMap: (kind: MapWindowKind | "all") => Promise<boolean>;
      onMapWindowChange: (
        callback: (state: { kind: MapWindowKind; opened: boolean }) => void,
      ) => () => void;
    };
  }
}
