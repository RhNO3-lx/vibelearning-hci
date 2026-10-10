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
const {
  inDockZone,
  validChannel,
  validKind,
  conflicts,
} = require("./window-policy.cjs");
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
  closingParent = false;
const mapWindows = new Map();
const mapBounds = new Map();
const titles = { tree: "探索树", knowledge: "知识图", both: "学习地图" };
const preferences = {
  preload: path.join(__dirname, "preload.cjs"),
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
};
function allowed(event, mainOnly = false) {
  return (
    (event.sender === mainWindow?.webContents ||
      (!mainOnly &&
        [...mapWindows.values()].some(
          (entry) => event.sender === entry.win.webContents,
        ))) &&
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
function dock(kind = "all") {
  const targets = kind === "all" ? [...mapWindows.keys()] : [kind];
  for (const key of targets) mapWindows.get(key)?.win.close();
  if (!closingParent && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}
async function openMap(channel, kind = "both") {
  if (!validChannel(channel) || !validKind(kind))
    throw new Error("Invalid map window");
  const existing = mapWindows.get(kind);
  if (existing && !existing.win.isDestroyed()) {
    existing.win.show();
    existing.win.focus();
    return true;
  }
  for (const other of conflicts([...mapWindows.keys()], kind)) dock(other);
  const parent = mainWindow.getBounds(),
    display = screen.getDisplayMatching(parent).workArea;
  const size = mapBounds.get(kind) ?? {
    width: 640,
    height: kind === "both" ? 800 : 640,
  };
  const offset = kind === "knowledge" ? 160 : 60;
  const x = Math.max(
    display.x,
    Math.min(parent.x + offset, display.x + display.width - size.width),
  );
  const y = Math.max(
    display.y,
    Math.min(parent.y + offset, display.y + display.height - size.height),
  );
  // A top-level native window: no parent constraint, native frame owns all resize borders.
  const win = new BrowserWindow({
    title: `Vibe Learning · ${titles[kind]}`,
    x,
    y,
    ...size,
    minWidth: 360,
    minHeight: 440,
    resizable: true,
    maximizable: true,
    minimizable: true,
    movable: true,
    frame: true,
    show: false,
    backgroundColor: "#f8fafc",
    webPreferences: preferences,
  });
  mapWindows.set(kind, { win, channel });
  externalPolicy(win);
  let wasNear = inDockZone(mainWindow.getBounds(), win.getBounds());
  win.on("moved", () => {
    if (
      closingParent ||
      !mainWindow ||
      mainWindow.isDestroyed() ||
      win.isDestroyed()
    )
      return;
    const near = inDockZone(mainWindow.getBounds(), win.getBounds());
    if (near && !wasNear && win.isFocused() && !win.isMaximized()) dock(kind);
    wasNear = near;
  });
  win.on("resize", () => {
    if (!win.isMaximized() && !win.isFullScreen()) {
      const b = win.getBounds();
      mapBounds.set(kind, { width: b.width, height: b.height });
    }
  });
  win.on("close", () => {
    const b = win.getNormalBounds();
    mapBounds.set(kind, { width: b.width, height: b.height });
  });
  win.on("closed", () => {
    mapWindows.delete(kind);
    if (!closingParent) notify({ kind, opened: false });
  });
  await win.loadURL(
    `${origin}/?view=map&channel=${encodeURIComponent(channel)}&mapKind=${kind}`,
  );
  if (!win.isDestroyed()) {
    win.show();
    win.focus();
    notify({ kind, opened: true });
  }
  return true;
}
ipcMain.handle("map:open", (event, channel, kind) => {
  if (!allowed(event) || !validKind(kind)) throw new Error("Untrusted caller");
  const sender = [...mapWindows.values()].find(
    (entry) => entry.win.webContents === event.sender,
  );
  if (sender && sender.channel !== channel) throw new Error("Wrong channel");
  return openMap(channel, kind);
});
ipcMain.handle("map:dock", (event, kind) => {
  if (!allowed(event) || (kind !== "all" && !validKind(kind)))
    throw new Error("Untrusted caller");
  dock(kind);
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
          { label: "吸附所有地图", click: () => dock() },
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
    for (const { win } of mapWindows.values()) win.destroy();
  });
  await mainWindow.loadURL(origin + "/");
  if (smoke) {
    try {
      const assert = require("node:assert/strict");
      const { once } = require("node:events");
      await openMap("vibelearning-map-smoke", "tree");
      await openMap("vibelearning-map-smoke", "knowledge");
      const tree = mapWindows.get("tree").win,
        knowledge = mapWindows.get("knowledge").win;
      assert.equal(mapWindows.size, 2);
      for (const win of [tree, knowledge]) {
        assert.equal(win.getParentWindow(), null);
        assert.equal(win.isResizable(), true);
        assert.equal(win.isMaximizable(), true);
      }
      // Leave desktop space to place a map entirely outside the workbench.
      const area = screen.getPrimaryDisplay().workArea;
      mainWindow.setBounds({ x: area.x, y: area.y, width: 800, height: 580 });
      tree.setBounds({
        x: area.x + 830,
        y: area.y + 20,
        width: 400,
        height: 500,
      });
      assert.ok(
        tree.getBounds().x >=
          mainWindow.getBounds().x + mainWindow.getBounds().width,
      );
      assert.equal(tree.isVisible(), true);
      const detachedPosition = tree.getPosition();
      mainWindow.setPosition(area.x + 20, area.y + 40);
      assert.deepEqual(tree.getPosition(), detachedPosition);
      // Exercise each boundary independently while keeping its opposite boundary fixed.
      for (const side of ["left", "right", "top", "bottom"]) {
        const before = tree.getBounds(),
          after = { ...before };
        if (side === "left") {
          after.x -= 20;
          after.width += 20;
        }
        if (side === "right") after.width += 20;
        if (side === "top") {
          after.y -= 20;
          after.height += 20;
        }
        if (side === "bottom") after.height += 20;
        tree.setBounds(after);
        assert.deepEqual(tree.getBounds(), after);
      }
      const minimized = once(tree, "minimize");
      tree.minimize();
      await minimized;
      assert.equal(tree.isMinimized(), true);
      const restored = once(tree, "restore");
      tree.restore();
      await restored;
      const treeSize = tree.getSize(),
        treeId = tree.id;
      const closed = once(tree, "closed");
      dock("tree");
      await closed;
      assert.equal(BrowserWindow.fromId(treeId), null);
      assert.equal(knowledge.isDestroyed(), false);
      assert.equal(mapWindows.size, 1);
      await openMap("vibelearning-map-smoke", "tree");
      assert.deepEqual(mapWindows.get("tree").win.getSize(), treeSize);
      // Opening a combined window atomically retires both single-graph windows.
      const remainingTree = mapWindows.get("tree").win;
      const singlesClosed = Promise.all([
        once(remainingTree, "closed"),
        once(knowledge, "closed"),
      ]);
      await openMap("vibelearning-map-smoke", "both");
      await singlesClosed;
      assert.deepEqual([...mapWindows.keys()], ["both"]);
      const combined = mapWindows.get("both").win;
      const finalClosed = once(combined, "closed");
      dock();
      await finalClosed;
      assert.equal(mapWindows.size, 0);
      const report = {
        passed: true,
        electron: process.versions.electron,
        checks: [
          "bundled-ui-load",
          "two-simultaneous-windows",
          "top-level-windows",
          "outside-workbench-visible",
          "parent-move-independent",
          "four-boundary-bounds",
          "minimize-restore",
          "independent-dock",
          "restore-size",
          "combined-replaces-singles",
          "dock-all",
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
