# Vibe Learning 桌面版

Electron 原生主窗口与学习地图子窗口，复用 React 前端。地图支持系统边框缩放、最小化和窗口缩放；点击“吸附到右侧”、窗口菜单“吸附学习地图”，或将地图窗口右边缘移到父窗口右边缘附近，返回工作台。两窗口同步会话、选中模块和地图显示模式。关闭地图窗口也会恢复父窗口中的地图。

## 运行与打包

需要 Node.js 和前端依赖。首次运行：

```sh
npm --prefix code/frontend ci
npm --prefix code/desktop ci
npm --prefix code/desktop start
```

独立打包目前面向 macOS Apple Silicon：

```sh
npm --prefix code/desktop run package
```

产物为 `artifacts/desktop/Vibe Learning-darwin-arm64/Vibe Learning.app`，双击打开即可，不依赖 Vite 服务。此包为本地开发构建，未签名和公证。

```sh
npm --prefix code/desktop test
npm --prefix code/desktop run smoke
```

原生冒烟检查实际创建窗口，验证父子关系、调整尺寸、最小化恢复、吸附销毁子窗口、再次打开恢复尺寸，以及关闭窗口；使用独立临时数据目录，不改动日常应用数据。

## 数据与接口

桌面版使用 `vibelearning://app` 加载本地构建文件，浏览器版使用 HTTP，两者各自保存本地数据；不会自动导入浏览器中的旧会话。原生窗口通过受限 preload 接口管理，页面不获得 Node.js 权限。地图和主窗口通过同源状态通道同步。

前端仍为演示模式，模型、Flask 与本地工作区文件操作尚未接入。窗口尺寸在本次进程中保留，退出应用后恢复默认尺寸。
