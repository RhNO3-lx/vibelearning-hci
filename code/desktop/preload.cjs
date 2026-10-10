const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("vibeDesktop", {
  openMap: (channel, kind) => ipcRenderer.invoke("map:open", channel, kind),
  dockMap: (kind) => ipcRenderer.invoke("map:dock", kind),
  onMapWindowChange: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("map:window-state", listener);
    return () => ipcRenderer.removeListener("map:window-state", listener);
  },
});
