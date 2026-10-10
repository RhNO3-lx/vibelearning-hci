const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("vibeDesktop", {
  openMap: (channel) => ipcRenderer.invoke("map:open", channel),
  dockMap: (collapse) => ipcRenderer.invoke("map:dock", Boolean(collapse)),
  onMapWindowChange: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("map:window-state", listener);
    return () => ipcRenderer.removeListener("map:window-state", listener);
  },
});
