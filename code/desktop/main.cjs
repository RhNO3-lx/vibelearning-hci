const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  protocol,
  net,
  screen,
  shell,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { inDockZone, validChannel } = require("./window-policy.cjs");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "vibelearning",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
const origin = "vibelearning://app";
const smoke = process.argv.includes("--smoke");
if (smoke)
  app.setPath(
    "userData",
    path.join(app.getPath("temp"), `vibelearning-smoke-${process.pid}`),
  );
app.setName("Vibe Learning");
let mainWindow,
  mapWindow,
  closingParent = false,
  collapseOnClose = false;
let mapBounds = { width: 640, height: 800 };
const preferences = {
  preload: path.join(__dirname, "preload.cjs"),
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
};
function allowed(event, mainOnly = false) {
  return (
    (event.sender === mainWindow?.webContents ||
      (!mainOnly && event.sender === mapWindow?.webContents)) &&
    event.senderFrame?.url.startsWith(origin + "/")
  );
}
function externalPolicy(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin + "/")) event.preventDefault();
  });
}
function notify(state) {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send("map:window-state", state);
}
function dock(collapse = false) {
  collapseOnClose = collapse;
  if (mapWindow && !mapWindow.isDestroyed()) mapWindow.close();
  else notify({ opened: false, collapse });
  mainWindow?.show();
  mainWindow?.focus();
}
async function openMap(channel) {
  if (!validChannel(channel)) throw new Error("Invalid map channel");
  if (mapWindow && !mapWindow.isDestroyed()) {
    mapWindow.show();
    mapWindow.focus();
    return true;
  }
  collapseOnClose = false;
  const parent = mainWindow.getBounds(),
    display = screen.getDisplayMatching(parent).workArea;
  const x = Math.max(
    display.x,
    Math.min(parent.x + 80, display.x + display.width - mapBounds.width),
  );
  const y = Math.max(
    display.y,
    Math.min(parent.y + 60, display.y + display.height - mapBounds.height),
  );
  const child = new BrowserWindow({
    title: "Vibe Learning · 学习地图",
    parent: mainWindow,
    modal: false,
    x,
    y,
    ...mapBounds,
    minWidth: 360,
    minHeight: 440,
    resizable: true,
    maximizable: true,
    minimizable: true,
    frame: true,
    show: false,
    backgroundColor: "#f8fafc",
    webPreferences: preferences,
  });
  mapWindow = child;
  externalPolicy(child);
  let wasNear = inDockZone(mainWindow.getBounds(), child.getBounds());
  child.on("moved", () => {
    if (!mainWindow || mainWindow.isDestroyed() || child.isDestroyed()) return;
    const near = inDockZone(mainWindow.getBounds(), child.getBounds());
    if (near && !wasNear && child.isFocused() && !child.isMaximized()) dock();
    wasNear = near;
  });
  child.on("resize", () => {
    if (!child.isMaximized() && !child.isFullScreen()) {
      const b = child.getBounds();
      mapBounds = { width: b.width, height: b.height };
    }
  });
  child.on("close", () => {
    const b = child.getNormalBounds();
    mapBounds = { width: b.width, height: b.height };
  });
  child.on("closed", () => {
    mapWindow = null;
    if (!closingParent) notify({ opened: false, collapse: collapseOnClose });
  });
  await child.loadURL(
    `${origin}/?view=map&channel=${encodeURIComponent(channel)}`,
  );
  if (!child.isDestroyed()) {
    child.show();
    child.focus();
    notify({ opened: true });
  }
  return true;
}
ipcMain.handle("map:open", (event, channel) => {
  if (!allowed(event, true)) throw new Error("Untrusted caller");
  return openMap(channel);
});
ipcMain.handle("map:dock", (event, collapse) => {
  if (!allowed(event)) throw new Error("Untrusted caller");
  dock(Boolean(collapse));
  return true;
});
app.whenReady().then(async () => {
  const root = path.join(__dirname, "ui");
  protocol.handle("vibelearning", (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "app")
      return new Response("Not found", { status: 404 });
    const file = path.resolve(
      root,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (file !== root && !file.startsWith(root + path.sep))
      return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(file).href);
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Vibe Learning",
        submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }],
      },
      {
        label: "编辑",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "窗口",
        submenu: [
          { role: "minimize" },
          { role: "zoom" },
          { label: "吸附学习地图", click: () => dock() },
          { role: "close" },
        ],
      },
    ]),
  );
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 760,
    minHeight: 580,
    title: "Vibe Learning",
    backgroundColor: "#ffffff",
    webPreferences: preferences,
  });
  externalPolicy(mainWindow);
  mainWindow.on("close", () => {
    closingParent = true;
    mapWindow?.destroy();
  });
  await mainWindow.loadURL(origin + "/");
  if (smoke) {
    try {
      const assert = require("node:assert/strict");
      await openMap("vibelearning-map-smoke");
      assert.equal(mapWindow.getParentWindow(), mainWindow);
      assert.equal(mapWindow.isResizable(), true);
      assert.equal(mapWindow.isMaximizable(), true);
      mapWindow.setSize(780, 720);
      assert.deepEqual(mapWindow.getSize(), [780, 720]);
      const childId = mapWindow.id;
      const minimized = require("node:events").once(mapWindow, "minimize");
      mapWindow.minimize();
      await minimized;
      assert.equal(mapWindow.isMinimized(), true);
      const restored = require("node:events").once(mapWindow, "restore");
      mapWindow.restore();
      await restored;
      const closed = require("node:events").once(mapWindow, "closed");
      dock();
      await closed;
      assert.equal(BrowserWindow.fromId(childId), null);
      await openMap("vibelearning-map-smoke");
      assert.deepEqual(mapWindow.getSize(), [780, 720]);
      const secondId = mapWindow.id;
      const secondClosed = require("node:events").once(mapWindow, "closed");
      mapWindow.close();
      await secondClosed;
      assert.equal(BrowserWindow.fromId(secondId), null);
      const report = {
        passed: true,
        electron: process.versions.electron,
        checks: [
          "bundled-ui-load",
          "native-parent",
          "resizable",
          "maximizable",
          "resize",
          "minimize-restore",
          "dock-destroys-child",
          "restore-size",
          "close-child",
        ],
      };
      fs.writeFileSync(
        path.join(__dirname, "smoke-report.json"),
        JSON.stringify(report, null, 2),
      );
      console.log(JSON.stringify(report));
      app.quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  }
});
app.on("window-all-closed", () => app.quit());
