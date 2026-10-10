export {};
declare global {
  interface Window {
    vibeDesktop?: {
      openMap: (channel: string) => Promise<boolean>;
      dockMap: (collapse: boolean) => Promise<boolean>;
      onMapWindowChange: (
        callback: (state: { opened: boolean; collapse?: boolean }) => void,
      ) => () => void;
    };
  }
}
