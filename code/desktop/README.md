# Vibe Learning 桌面版

Electron 原生主窗口与独立地图窗口，复用 React 前端。工作台的“独立探索树”和“独立知识图”可同时打开两张图；单图窗口固定显示其图。浮动按钮打开当前视图，“并看”可打开一体的地图窗口。

地图是无父窗口约束的原生顶层窗口，支持四边缩放、最小化、窗口缩放及移出工作台。点击“吸附到右侧”、在工作台点击对应图的吸附按钮，或将地图窗口右边缘移到工作台右边缘附近，即可返回。单独关闭/吸附一张图不影响另一张独立图；关闭工作台会关闭全部地图。

“视角追踪”默认开启，地图内和设置页均可切换，并在窗口间同步、持久保存。关闭时保留关联高亮，另一张图不自动平移缩放；在本图选择、分类筛选和手动适应全图仍可调整视角。

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

原生冒烟检查实际创建窗口，验证两窗口同时存在、顶层窗口、移出工作台仍可见、移动工作台不带动地图、四边尺寸变动、最小化恢复、独立吸附、尺寸恢复和并看替换单图；使用独立临时数据目录，不改动日常应用数据。

## 数据与接口

桌面版使用 `vibelearning://app` 加载本地构建文件，浏览器版使用 HTTP，两者各自保存本地数据；不会自动导入浏览器中的旧会话。原生窗口通过受限 preload 接口管理，页面不获得 Node.js 权限。地图和主窗口通过同源状态通道同步。

前端仍为演示模式，模型、Flask 与本地工作区文件操作尚未接入。窗口尺寸在本次进程中保留，退出应用后恢复默认尺寸。
