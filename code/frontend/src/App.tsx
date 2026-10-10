import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type CSSProperties,
} from "react";
import { useMapWindow } from "./components/useMapWindow";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  GitBranch,
  GraduationCap,
  Layers,
  Menu,
  MessageSquare,
  Network,
  Paperclip,
  Plus,
  Route,
  Settings2,
  Sparkles,
  Sprout,
  Trash2,
  X,
  ArrowDown,
  PanelRightOpen,
  Zap,
} from "lucide-react";
import {
  activeSession,
  ancestors,
  activityNames,
  descendants,
  reducer,
  uid,
  type Activity,
  type Attachment,
  type Concept,
  type Page,
} from "./model";
import { createSeed, createSession, demoTurn } from "./seed";
import { loadState, saveState } from "./storage";
import { GraphPanel } from "./components/GraphPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { LearningCards } from "./components/Cards";
import { ConfigPages, formatSize } from "./components/ConfigPages";

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first =
      ref.current?.querySelector<HTMLElement>("input,select,textarea") ??
      ref.current?.querySelector<HTMLElement>("button");
    first?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,select,textarea,a[href]",
          ) ?? []),
        ];
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="关闭对话框"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
type Dialog =
  | { type: "new" | "path" | "resources" | "addConcept" | "help" }
  | { type: "deleteTurn" | "deleteConcept" | "deleteSession"; id: string }
  | { type: "rename" | "workspace"; id: string }
  | { type: "removePath"; id: string }
  | { type: "reset" };
const navItems = [
  { page: "learn" as Page, label: "学习工作台", icon: MessageSquare },
  { page: "sessions" as Page, label: "所有会话", icon: Layers },
  { page: "knowledge" as Page, label: "知识库", icon: BookOpen },
  { page: "agents" as Page, label: "子 Agent", icon: Bot },
  { page: "skills" as Page, label: "技能", icon: Sparkles },
];

export default function App() {
  const [state, localDispatch] = useReducer(reducer, undefined, loadState),
    [page, setPage] = useState<Page>("learn");
  const [dialog, setDialog] = useState<Dialog | null>(null),
    [draft, setDraft] = useState(""),
    [activity, setActivity] = useState<Activity>("concept"),
    [pendingFork, setPendingFork] = useState<{
      parentId: string;
      quote: string;
    } | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(
      "diagonal",
    ),
    [tab, setTab] = useState<"tree" | "knowledge" | "both">("tree"),
    [expanded, setExpanded] = useState<string[]>([]),
    [mapOpen, setMapOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(410),
    [selectionOrigin, setSelectionOrigin] = useState<"tree" | "knowledge">(
      "tree",
    ),
    [sessionMenu, setSessionMenu] = useState<{
      id: string;
      x: number;
      y: number;
    } | null>(null),
    [sessionName, setSessionName] = useState("");
  const [relationMode, setRelationMode] = useState<
    "prerequisite" | "recommended" | "both"
  >("recommended");
  const mapWindow = useMapWindow({
    state,
    dispatch: localDispatch,
    view: { selectedConcept, selectionOrigin, relationMode },
    onView: (view) => {
      setSelectedConcept(view.selectedConcept);
      setSelectionOrigin(view.selectionOrigin);
      setRelationMode(view.relationMode);
    },
    onDismiss: () => setMapOpen(true),
  });
  const dispatch = mapWindow.dispatch;
  const workbench = useRef<HTMLDivElement>(null),
    menuRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false),
    [toast, setToast] = useState(""),
    [saved, setSaved] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]),
    [previews, setPreviews] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [selection, setSelection] = useState<{
      text: string;
      id: string;
      x: number;
      y: number;
    } | null>(null);
  const [goal, setGoal] = useState(""),
    [workspace, setWorkspace] = useState("~/learning/new-project"),
    [newKbIds, setNewKbIds] = useState<string[]>([]),
    [reason, setReason] = useState("暂不相关"),
    [moduleName, setModuleName] = useState(""),
    [moduleSummary, setModuleSummary] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null),
    upload = useRef<HTMLInputElement>(null),
    scrollArea = useRef<HTMLDivElement>(null),
    pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    previewRef = useRef(previews);
  previewRef.current = previews;
  const session = activeSession(state),
    current = state.turns.find((t) => t.id === session.activeId)!,
    path = ancestors(state.turns, session.activeId);
  const turns = historyOpen ? path : path.slice(-1),
    mainPath = new Set(
      ancestors(state.turns, session.mainLeafId).map((t) => t.id),
    );
  const latestContext = session.contexts[current.branchId],
    liveUpdates =
      latestContext?.updates.filter((u) => !u.retracted && !u.superseded) ?? [];
  const contextTokens = Math.ceil(
    (path.map((t) => t.user + t.assistant).join("").length +
      liveUpdates.map((u) => u.text).join("").length) /
      1.5,
  );
  const occupancy = Math.min(
    100,
    (contextTokens / state.settings.contextLimit) * 100,
  );
  const enabledAgent = state.agents.find(
    (a) => a.id === session.agentId && a.enabled,
  );
  const notify = (text: string) => setToast(text);

  useEffect(() => {
    if (!mapWindow.detached) setSaved(saveState(state));
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4300);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setDraft("");
    setAttachments([]);
    setPendingFork(null);
    setHistoryOpen(false);
    setSelection(null);
    setSelectedConcept(current.conceptIds.at(-1) ?? null);
    setSelectionOrigin("tree");
  }, [session.id]);
  useEffect(() => {
    scrollArea.current?.scrollTo({ top: 0, behavior: "instant" });
    setSelection(null);
  }, [session.activeId]);
  useEffect(
    () => () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      Object.values(previewRef.current).forEach(URL.revokeObjectURL);
    },
    [],
  );
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelection(null);
        if (!dialog) setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [dialog]);
  useEffect(() => {
    if (!sessionMenu) return;
    const trigger = document.activeElement as HTMLElement | null;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function dismiss(e: Event) {
      if (!menuRef.current?.contains(e.target as Node)) setSessionMenu(null);
    }
    function keyboard(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSessionMenu(null);
        trigger?.focus();
      }
      if (e.key === "Tab") setSessionMenu(null);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [
          ...(menuRef.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) ?? []),
        ];
        const index = items.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        items[
          (index + (e.key === "ArrowDown" ? 1 : items.length - 1)) %
            items.length
        ]?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keyboard);
    window.addEventListener("resize", dismiss);
    document.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", dismiss);
      document.removeEventListener("scroll", dismiss, true);
    };
  }, [sessionMenu]);
  function showSessionMenu(id: string, x: number, y: number) {
    setSessionMenu({
      id,
      x: Math.max(8, Math.min(x, window.innerWidth - 208)),
      y: Math.max(8, Math.min(y, window.innerHeight - 154)),
    });
  }
  function editSession(type: "rename" | "workspace", id: string) {
    const target = state.sessions.find((s) => s.id === id);
    if (!target) return;
    setSessionName(target.title);
    setWorkspace(target.workspace);
    setSessionMenu(null);
    setDialog({ type, id });
  }
  function navigate(next: Page) {
    setSessionMenu(null);
    setPage(next);
    setSidebarOpen(false);
    setSelection(null);
  }
  function beginFork(id = current.id, quote = "") {
    setPendingFork({ parentId: id, quote });
    setDraft(quote ? `关于「${quote}」，` : "");
    setSelection(null);
    setPage("learn");
    requestAnimationFrame(() => composer.current?.focus());
  }
  function appendActivity(kind: Activity, concept: Concept) {
    const turn = demoTurn(
      current,
      kind === "quiz"
        ? `测试我对「${concept.name}」的理解`
        : kind === "flashcard"
          ? `回顾「${concept.name}」的关键概念`
          : `围绕「${concept.name}」做一个小项目`,
      kind,
      [concept.id],
      true,
    );
    dispatch({ type: "addTurn", turn });
    navigate("learn");
    setPendingFork(null);
    notify("已从当前思考创建学习分支");
  }
  function consultRoute() {
    const turn = demoTurn(
      current,
      "请辅助我检查当前学习路线与目标是否匹配",
      "concept",
      session.pathIds,
      true,
    );
    turn.title = "协商学习路线";
    turn.assistant = `当前目标是：**${session.goal}**。\n\n路线包含：${
      session.pathIds
        .map((id) => state.concepts.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(" → ") || "尚未选择模块"
    }。\n\n可以先核对哪些内容已经有独立作答依据，哪些只是暂时不想学，再决定顺序。\n\n> ${enabledAgent ? `已选择「${enabledAgent.name}」配置。` : "尚未指定辅助 Agent。"}这是路线协商的前端演示，未调用外部服务。`;
    turn.summary = "发起学习路线协商；没有新增能力证据。";
    dispatch({ type: "addTurn", turn });
    setDialog(null);
    navigate("learn");
  }
  function send() {
    if ((!draft.trim() && !attachments.length) || busy) return;
    const parent = state.turns.find(
      (t) => t.id === (pendingFork?.parentId ?? current.id),
    );
    if (!parent) {
      notify("原分支已删除，请重新选择追问位置");
      return;
    }
    const text = draft.trim() || "请结合这些附件帮助我学习。";
    const conceptIds =
      selectionOrigin === "knowledge" &&
      selectedConcept &&
      state.concepts.some((c) => c.id === selectedConcept && !c.deleted)
        ? [selectedConcept]
        : parent.conceptIds.filter((id) =>
            state.concepts.some((c) => c.id === id && !c.deleted),
          );
    const turn = demoTurn(parent, text, activity, conceptIds, !!pendingFork);
    turn.attachments = attachments;
    const extendMain = !pendingFork && session.mainLeafId === parent.id;
    setBusy(true);
    setDraft("");
    setAttachments([]);
    setSelection(null);
    pendingTimer.current = setTimeout(() => {
      dispatch({ type: "addTurn", turn, main: extendMain });
      setBusy(false);
      setPendingFork(null);
      pendingTimer.current = null;
    }, 450);
  }
  function addFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter((f) => f.size <= 20 * 1024 * 1024);
    if (valid.length < files.length) notify("单个附件限 20 MB，超出文件未添加");
    const nextPreviews: Record<string, string> = {},
      items = valid.map((f) => {
        const id = uid("attachment");
        if (f.type.startsWith("image/"))
          nextPreviews[id] = URL.createObjectURL(f);
        return { id, name: f.name, size: f.size, type: f.type };
      });
    setAttachments((v) => [...v, ...items]);
    setPreviews((v) => ({ ...v, ...nextPreviews }));
    if (upload.current) upload.current.value = "";
  }
  function captureSelection(id: string) {
    const selected = window.getSelection(),
      text = selected?.toString().trim();
    if (!selected || !text || text.length < 2 || text.length > 1200) {
      setSelection(null);
      return;
    }
    const rect = selected.getRangeAt(0).getBoundingClientRect();
    setSelection({
      text,
      id,
      x: Math.max(12, Math.min(window.innerWidth - 180, rect.left)),
      y: Math.max(12, rect.top - 44),
    });
  }
  async function openGraphWindow(kind: "tree" | "knowledge" | "both") {
    if (!(await mapWindow.open(kind)))
      notify("浏览器未允许独立窗口，请允许弹窗或使用桌面版");
  }
  function startFloatDrag(e: PointerEvent<HTMLDivElement>) {
    if (
      mapWindow.detached ||
      e.button !== 0 ||
      !(e.target as HTMLElement).closest(".panel-title")
    )
      return;
    const x = e.clientX,
      y = e.clientY;
    const release = (event: globalThis.PointerEvent) => {
      cleanup();
      if (Math.hypot(event.clientX - x, event.clientY - y) > 12)
        void openGraphWindow(tab);
    };
    const cleanup = () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", cleanup);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", cleanup);
  }
  function openNew() {
    setGoal("");
    setWorkspace(state.settings.defaultWorkspace);
    setNewKbIds([]);
    setDialog({ type: "new" });
  }
  const graphProps = {
    state,
    dispatch,
    selectedConcept,
    setSelectedConcept: (id: string | null) => {
      setSelectionOrigin("knowledge");
      setSelectedConcept(id);
    },
    selectionOrigin,
    relationMode,
    setRelationMode,
    onSelectTree: (id: string) => {
      setSelectionOrigin("tree");
      dispatch({ type: "selectTurn", id });
    },
    tab: mapWindow.detached && mapWindow.kind !== "both" ? mapWindow.kind : tab,
    setTab,
    expanded,
    setExpanded,
    onActivity: appendActivity,
    onFork: () => beginFork(),
    onDeleteTurn: (id: string) => setDialog({ type: "deleteTurn", id }),
    onDeleteConcept: (id: string) => setDialog({ type: "deleteConcept", id }),
    onAddConcept: () => {
      setModuleName("");
      setModuleSummary("");
      setDialog({ type: "addConcept" });
    },
    onPath: () => setDialog({ type: "path" }),
    floating: mapWindow.detached,
    external: mapWindow.detached,
    fixedKind:
      mapWindow.detached && mapWindow.kind !== "both"
        ? mapWindow.kind
        : undefined,
    detachedKinds: mapWindow.detached ? [] : mapWindow.openedKinds,
    onOpenWindow: openGraphWindow,
    onDockGraph: (kind: "tree" | "knowledge") =>
      mapWindow.close(mapWindow.openedKinds.includes("both") ? "both" : kind),
    onFloat: () => openGraphWindow(tab),
    onDock: () => mapWindow.close(),
    onClose: () => {
      if (mapWindow.detached) mapWindow.close();
      else setMapOpen(false);
    },
    onDrag: startFloatDrag,
  };

  const dialogElement = dialog && (
    <Modal
      title={
        dialog.type === "new"
          ? "开始一段新的探索"
          : dialog.type === "path"
            ? "调整我的学习路线"
            : dialog.type === "workspace"
              ? "设置会话工作区"
              : dialog.type === "rename"
                ? "重命名会话"
                : dialog.type === "resources"
                  ? "这次学习使用什么？"
                  : dialog.type === "removePath"
                    ? "将模块移出当前路线"
                    : dialog.type === "addConcept"
                      ? "添加一个知识模块"
                      : dialog.type === "help"
                        ? "欢迎来到 Vibe Learning"
                        : dialog.type === "reset"
                          ? "重置演示工作台"
                          : "确认删除"
      }
      onClose={() => setDialog(null)}
    >
      {dialog.type === "new" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!goal.trim()) return;
            const created = createSession(
              goal.trim(),
              workspace.trim() ||
                state.settings.defaultWorkspace ||
                "~/learning",
              newKbIds,
            );
            dispatch({ type: "newSession", ...created });
            setSelectedConcept(null);
            navigate("learn");
            setDialog(null);
          }}
        >
          <p className="modal-intro">
            先说清楚想学会什么。一个具体目标，是探索的起点。
          </p>
          <label className="full-label">
            学习目标
            <textarea
              autoFocus
              placeholder="例如：理解特征值的几何意义，并能解释对角化证明"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />
          </label>
          <label className="full-label">
            会话工作区
            <input
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
            />
            <small>所有轮次共用此路径；本地文件操作将在后端接入。</small>
          </label>
          <div className="option-list">
            {state.knowledgeBases.map((k) => (
              <label key={k.id}>
                <input
                  type="checkbox"
                  checked={newKbIds.includes(k.id)}
                  onChange={(e) =>
                    setNewKbIds((v) =>
                      e.target.checked
                        ? [...v, k.id]
                        : v.filter((id) => id !== k.id),
                    )
                  }
                />
                <BookOpen size={15} />
                {k.name}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setDialog(null)}
            >
              取消
            </button>
            <button className="btn primary" disabled={!goal.trim()}>
              开始学习 <ArrowUpRight size={15} />
            </button>
          </div>
        </form>
      )}
      {(dialog.type === "workspace" || dialog.type === "rename") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value =
              dialog.type === "rename" ? sessionName.trim() : workspace.trim();
            if (!value) return;
            dispatch({
              type: "sessionConfig",
              id: dialog.id,
              patch:
                dialog.type === "rename"
                  ? { title: value }
                  : { workspace: value },
            });
            setDialog(null);
          }}
        >
          <p className="modal-intro">
            {state.sessions.find((s) => s.id === dialog.id)?.title}
          </p>
          <label className="full-label">
            {dialog.type === "rename" ? "会话名称" : "工作区路径"}
            <input
              required
              value={dialog.type === "rename" ? sessionName : workspace}
              onChange={(e) =>
                dialog.type === "rename"
                  ? setSessionName(e.target.value)
                  : setWorkspace(e.target.value)
              }
            />
            {dialog.type === "workspace" && (
              <small>此会话所有轮次共用一个工作区。</small>
            )}
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setDialog(null)}
            >
              取消
            </button>
            <button className="btn primary">
              {dialog.type === "rename" ? "保存名称" : "保存工作区"}
            </button>
          </div>
        </form>
      )}
      {dialog.type === "resources" && (
        <>
          <p className="modal-intro">
            选择参与当前会话的资料与能力。此原型保留选择，检索和调用待接入。
          </p>
          <h4 className="modal-section-title">
            <BookOpen size={15} /> 知识库
          </h4>
          <div className="option-list">
            {state.knowledgeBases.map((k) => (
              <label key={k.id}>
                <input
                  type="checkbox"
                  checked={session.kbIds.includes(k.id)}
                  onChange={(e) =>
                    dispatch({
                      type: "sessionConfig",
                      id: session.id,
                      patch: {
                        kbIds: e.target.checked
                          ? [...session.kbIds, k.id]
                          : session.kbIds.filter((id) => id !== k.id),
                      },
                    })
                  }
                />
                {k.name}
                <small>{k.files.length} 份资料</small>
              </label>
            ))}
            {!state.knowledgeBases.length && (
              <p>还没有知识库，可在侧边栏添加。</p>
            )}
          </div>
          <label className="full-label">
            <span>
              <Bot size={15} /> 辅助 Agent
            </span>
            <select
              aria-label="辅助 Agent"
              value={session.agentId}
              onChange={(e) =>
                dispatch({
                  type: "sessionConfig",
                  id: session.id,
                  patch: { agentId: e.target.value },
                })
              }
            >
              <option value="">不指定</option>
              {state.agents
                .filter((a) => a.enabled)
                .map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <h4 className="modal-section-title">
            <Sparkles size={15} /> 技能
          </h4>
          <div className="option-list">
            {state.skills
              .filter((s) => s.enabled)
              .map((s) => (
                <label key={s.id}>
                  <input
                    type="checkbox"
                    checked={session.skillIds.includes(s.id)}
                    onChange={(e) =>
                      dispatch({
                        type: "sessionConfig",
                        id: session.id,
                        patch: {
                          skillIds: e.target.checked
                            ? [...session.skillIds, s.id]
                            : session.skillIds.filter((id) => id !== s.id),
                        },
                      })
                    }
                  />
                  {s.name}
                </label>
              ))}
            {!state.skills.some((s) => s.enabled) && (
              <p>暂无启用的技能。可在技能页配置。</p>
            )}
          </div>
          <div className="modal-actions">
            <button
              className="btn"
              onClick={() => {
                setDialog(null);
                navigate("knowledge");
              }}
            >
              管理资料
            </button>
            <button className="btn primary" onClick={() => setDialog(null)}>
              完成选择
            </button>
          </div>
        </>
      )}
      {dialog.type === "path" && (
        <>
          <p className="modal-intro">
            路线是你的参考路标。调整顺序，或选择暂时不学的模块。
          </p>
          <div className="path-editor">
            {session.pathIds.map((id, i) => (
              <div key={id}>
                <span className="path-order">{i + 1}</span>
                <span>{state.concepts.find((c) => c.id === id)?.name}</span>
                <button
                  className="icon-button"
                  disabled={i === 0}
                  aria-label={`上移${state.concepts.find((c) => c.id === id)?.name}`}
                  onClick={() =>
                    dispatch({
                      type: "reorderPath",
                      sessionId: session.id,
                      from: i,
                      to: i - 1,
                    })
                  }
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="icon-button"
                  disabled={i === session.pathIds.length - 1}
                  aria-label={`下移${state.concepts.find((c) => c.id === id)?.name}`}
                  onClick={() =>
                    dispatch({
                      type: "reorderPath",
                      sessionId: session.id,
                      from: i,
                      to: i + 1,
                    })
                  }
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`移出路线${state.concepts.find((c) => c.id === id)?.name}`}
                  onClick={() => {
                    setReason("暂不相关");
                    setDialog({ type: "removePath", id });
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <h4 className="modal-section-title">可以加入的模块</h4>
          <div className="available-modules">
            {state.concepts
              .filter((c) => !c.deleted && !session.pathIds.includes(c.id))
              .map((c) => (
                <button
                  className="btn small"
                  key={c.id}
                  onClick={() =>
                    dispatch({
                      type: "addPath",
                      sessionId: session.id,
                      conceptId: c.id,
                    })
                  }
                >
                  <Plus size={13} />
                  {c.name}
                </button>
              ))}
          </div>
          {session.exclusions.length > 0 && (
            <details className="exclusions">
              <summary>查看移出原因</summary>
              {session.exclusions.map((e) => (
                <p key={e.conceptId}>
                  {state.concepts.find((c) => c.id === e.conceptId)?.name ??
                    "历史模块"}
                  ：{e.reason}
                </p>
              ))}
            </details>
          )}
          <div className="modal-actions">
            <button className="btn" onClick={consultRoute}>
              <Bot size={15} />
              咨询学习伙伴
            </button>
            <button className="btn primary" onClick={() => setDialog(null)}>
              完成调整
            </button>
          </div>
        </>
      )}
      {dialog.type === "removePath" && (
        <>
          <p className="modal-intro">
            「{state.concepts.find((c) => c.id === dialog.id)?.name}
            」仅从当前路线移出，全局模块与掌握记录保留。
          </p>
          <div className="option-list">
            {["已学过", "暂不相关", "稍后学习"].map((item) => (
              <label key={item}>
                <input
                  type="radio"
                  name="reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                {item}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDialog({ type: "path" })}>
              返回
            </button>
            <button
              className="btn primary"
              onClick={() => {
                dispatch({
                  type: "removePath",
                  sessionId: session.id,
                  conceptId: dialog.id,
                  reason,
                });
                setDialog({ type: "path" });
              }}
            >
              移出路线
            </button>
          </div>
        </>
      )}
      {dialog.type === "addConcept" && (
        <>
          <p className="modal-intro">
            先添加模块范围。详细知识划分与可靠关系将在后端阶段建立。
          </p>
          <label className="full-label">
            模块名称
            <input
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="例如：内积与正交性"
            />
          </label>
          <label className="full-label">
            范围或学习目标
            <textarea
              value={moduleSummary}
              onChange={(e) => setModuleSummary(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button
              className="btn primary"
              disabled={!moduleName.trim()}
              onClick={() => {
                const concept: Concept = {
                  id: uid("concept"),
                  name: moduleName.trim(),
                  summary: moduleSummary.trim(),
                  category: "自定义",
                  difficulty: "待评估",
                  challenge: "尚未记录",
                  topics: [],
                  source: "学习者添加 · 待核实",
                  sourceUrl: "",
                  baseScore: null,
                };
                dispatch({
                  type: "addConcept",
                  concept,
                  sessionId: session.id,
                });
                setSelectedConcept(concept.id);
                setDialog(null);
              }}
            >
              添加到知识图与路线
            </button>
          </div>
        </>
      )}
      {dialog.type === "deleteTurn" && (
        <>
          <p className="modal-intro">
            将删除「{state.turns.find((t) => t.id === dialog.id)?.title}
            」及其 {descendants(state.turns, dialog.id).size - 1}{" "}
            个后续节点。相关演示作答会被撤回，支线摘要产生更正记录。
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              保留
            </button>
            <button
              className="btn danger-solid"
              onClick={() => {
                dispatch({ type: "deleteTurn", id: dialog.id });
                setDialog(null);
                setPendingFork(null);
                notify("已删除子树并撤回相关演示证据");
              }}
            >
              删除子树
            </button>
          </div>
        </>
      )}
      {dialog.type === "deleteConcept" && (
        <>
          <p className="modal-intro">
            全局删除「{state.concepts.find((c) => c.id === dialog.id)?.name}
            」将移除所有会话路线中的关联和图中的关系。历史对话与作答证据会保留。
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              保留
            </button>
            <button
              className="btn danger-solid"
              onClick={() => {
                dispatch({ type: "deleteConcept", id: dialog.id });
                setSelectedConcept(null);
                setDialog(null);
                notify("已全局删除模块，历史证据保留");
              }}
            >
              全局删除
            </button>
          </div>
        </>
      )}
      {dialog.type === "deleteSession" && (
        <>
          <p className="modal-intro">
            删除「{state.sessions.find((s) => s.id === dialog.id)?.title}
            」会删除该会话的对话树，并撤回相关演示作答。其他会话保留。
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              取消
            </button>
            <button
              className="btn danger-solid"
              onClick={() => {
                dispatch({ type: "deleteSession", id: dialog.id });
                setDialog(null);
              }}
            >
              删除会话
            </button>
          </div>
        </>
      )}
      {dialog.type === "reset" && (
        <>
          <p className="modal-intro">
            清除当前浏览器中的原型会话、图与配置，恢复初始示例。可以先在设置页导出数据。
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDialog(null)}>
              取消
            </button>
            <button
              className="btn danger-solid"
              onClick={() => {
                dispatch({ type: "reset", state: createSeed() });
                setSelectedConcept("diagonal");
                setDialog(null);
                notify("演示数据已重置");
              }}
            >
              重置数据
            </button>
          </div>
        </>
      )}
      {dialog.type === "help" && (
        <>
          <p className="modal-intro">
            沿着主线学习，遇到值得追问的细节，就为它开一条支线。
          </p>
          <div className="help-step">
            <GitBranch size={19} />
            <div>
              <strong>从一句话出发</strong>
              <p>
                选中回答中的文字，或点击“分叉追问”。新问题成为当前节点的孩子。
              </p>
            </div>
          </div>
          <div className="help-step">
            <Network size={19} />
            <div>
              <strong>在两张图之间找到位置</strong>
              <p>
                探索树记录思考，知识图记录学习范围。选择节点会高亮关联区域，也可将地图浮动后拖到右边缘吸附。
              </p>
            </div>
          </div>
          <div className="help-step">
            <Route size={19} />
            <div>
              <strong>路线可以改变</strong>
              <p>
                增删模块、调整顺序，或发起诊断练习。闪卡是自评，测验是演示证据。
              </p>
            </div>
          </div>
          <div className="info-strip">
            当前为前端原型：回复、题目和参考分是演示；没有连接模型、执行文件操作或验证真实掌握。
          </div>
          <div className="modal-actions">
            <button className="btn primary" onClick={() => setDialog(null)}>
              继续探索 <ArrowUpRight size={15} />
            </button>
          </div>
        </>
      )}
    </Modal>
  );
  if (mapWindow.detached)
    return (
      <>
        <aside className="graph-panel detached-map">
          <GraphPanel {...graphProps} />
        </aside>
        {dialogElement}
      </>
    );

  return (
    <div
      className={`app-shell ${state.settings.reduceMotion ? "reduce-motion" : ""}`}
    >
      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="关闭侧边栏"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("learn");
          }}
        >
          <span className="brand-mark">
            <Sprout size={24} />
          </span>
          <span>
            vibe<span className="brand-light">learning</span>
            <small>让好奇心，有迹可循。</small>
          </span>
        </a>
        <button className="btn new-session" onClick={openNew}>
          <Plus size={17} /> 开始新学习 <span>↗</span>
        </button>
        <nav aria-label="主导航">
          {navItems.map(({ page: p, label, icon: Icon }) => (
            <button
              className={`nav-item ${p === page ? "active" : ""}`}
              key={p}
              onClick={() => navigate(p)}
            >
              <Icon size={18} />
              {label}
              {p === page && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-section-label">
          最近的探索
          <button
            className="icon-button"
            aria-label="查看所有会话"
            onClick={() => navigate("sessions")}
          >
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="recent-sessions">
          {state.sessions.slice(0, 5).map((s) => (
            <button
              key={s.id}
              aria-haspopup="menu"
              onContextMenu={(e) => {
                e.preventDefault();
                showSessionMenu(s.id, e.clientX, e.clientY);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "ContextMenu" ||
                  (e.shiftKey && e.key === "F10")
                ) {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  showSessionMenu(s.id, r.left + 20, r.bottom);
                }
              }}
              className={
                s.id === session.id && page === "learn" ? "current" : ""
              }
              onClick={() => {
                dispatch({ type: "selectSession", id: s.id });
                navigate("learn");
              }}
            >
              <span className="session-dot" />
              <span>{s.title}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>
              <Sparkles size={14} /> 留一点空间给探索
            </span>
            <p>沿着主线前进，也允许自己走进一条有趣的支线。</p>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={17} /> 设置
          </button>
          <button
            className="profile-row"
            onClick={() => setDialog({ type: "help" })}
          >
            <span className="avatar">L</span>
            <span>
              <strong>我的学习空间</strong>
              <small>本地原型 · 自动保存</small>
            </span>
            <CircleHelp size={16} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="打开侧边栏"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={19} />
            </button>
            <GraduationCap size={17} />
            <span>我的学习空间</span>
            <ChevronRight size={13} />
            <strong>
              {page === "learn"
                ? "学习工作台"
                : page === "settings"
                  ? "设置"
                  : navItems.find((n) => n.page === page)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="save-status">
              <span className={saved ? "status-dot" : "status-dot warning"} />
              {saved ? "已保存到本地" : "本地保存失败"}
            </span>
            <span className="demo-badge">
              <Zap size={12} /> 演示模式
            </span>
            <button
              className="icon-button"
              title="原型使用说明"
              aria-label="原型使用说明"
              onClick={() => setDialog({ type: "help" })}
            >
              <CircleHelp size={17} />
            </button>
          </div>
        </header>
        {page === "learn" ? (
          <div
            className={`workbench ${mapOpen ? "with-map" : ""}`}
            ref={workbench}
            style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
          >
            <section className="conversation">
              <div className="lesson-header">
                <div className="lesson-eyebrow">
                  <span className="tiny-square" /> 当前学习目标{" "}
                  <span className="lesson-index">LEARNING / 01</span>
                </div>
                <div className="lesson-title-row">
                  <h1>{session.title}</h1>
                </div>
                <p>{session.goal}</p>
                <div className="lesson-meta">
                  <span title={session.workspace}>
                    <FolderOpen size={13} />
                    {session.workspace.split("/").at(-1) || "工作区"}
                  </span>
                  <button onClick={() => setDialog({ type: "resources" })}>
                    <BookOpen size={13} />
                    {session.kbIds.length} 个知识库
                  </button>
                  {enabledAgent && (
                    <span>
                      <Bot size={13} />
                      {enabledAgent.name}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="conversation-scroll"
                ref={scrollArea}
                onScroll={() => setSelection(null)}
              >
                <div className="branch-breadcrumb">
                  <GitBranch size={13} />
                  <span>{mainPath.has(current.id) ? "主线" : "探索支线"}</span>
                  <ChevronRight size={12} />
                  <span>{current.title}</span>
                  <span className="branch-number">{path.length} 轮</span>
                </div>
                {path.length > 1 && (
                  <button
                    className="history-toggle"
                    onClick={() => setHistoryOpen((v) => !v)}
                  >
                    {historyOpen ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                    {historyOpen
                      ? "收起之前的对话"
                      : `查看之前 ${path.length - 1} 轮对话`}
                  </button>
                )}
                {turns.map((turn) => (
                  <article
                    className={`conversation-turn ${turn.id === current.id ? "current-turn" : ""}`}
                    key={turn.id}
                  >
                    <div className="user-message">
                      <div>
                        <span className="speaker-label">你</span>
                        <p>{turn.user}</p>
                        {turn.attachments.length > 0 && (
                          <div className="message-attachments">
                            {turn.attachments.map((a) => (
                              <div key={a.id}>
                                {previews[a.id] ? (
                                  <img src={previews[a.id]} alt={a.name} />
                                ) : (
                                  <FileText size={16} />
                                )}
                                <span>{a.name}</span>
                                {a.type.startsWith("image/") &&
                                  !previews[a.id] && (
                                    <small>预览需重新添加</small>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="user-avatar">L</span>
                    </div>
                    <div className="assistant-message">
                      <span className="assistant-avatar">
                        <Sprout size={18} />
                      </span>
                      <div className="assistant-body">
                        <div className="assistant-heading">
                          <strong>Vibe Tutor</strong>
                          <span>{activityNames[turn.activity]}</span>
                          {turn.id === current.id && (
                            <span className="current-pill">当前思考</span>
                          )}
                        </div>
                        <div
                          className="markdown"
                          onMouseUp={() => captureSelection(turn.id)}
                        >
                          <Markdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {turn.assistant}
                          </Markdown>
                        </div>
                        <LearningCards turn={turn} dispatch={dispatch} />
                        <div className="turn-actions">
                          <button onClick={() => beginFork(turn.id)}>
                            <GitBranch size={13} /> 分叉追问
                          </button>
                          <button
                            onClick={() => {
                              dispatch({ type: "selectTurn", id: turn.id });
                              setSelectionOrigin("tree");
                              setMapOpen(true);
                              setTab("tree");
                            }}
                          >
                            <Network size={13} /> 在地图中查看
                          </button>
                          {turn.parentId && (
                            <button
                              title="删除此对话及子树"
                              aria-label={`删除对话${turn.title}`}
                              onClick={() =>
                                setDialog({ type: "deleteTurn", id: turn.id })
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                {busy && (
                  <div className="demo-generating">
                    <Sprout size={16} />
                    <span>正在准备演示回复…</span>
                    <span className="loading-dots">•••</span>
                  </div>
                )}
                <div className="continue-row">
                  <span />
                  继续沿着好奇心探索
                  <span />
                </div>
              </div>
              <div className="composer-area">
                {liveUpdates.length > 0 && (
                  <div className="shared-context">
                    <Check size={12} />
                    已整合 {liveUpdates.length} 条支线摘要{" "}
                    <button
                      onClick={() => {
                        setTab("tree");
                        setMapOpen(true);
                      }}
                    >
                      查看来源 <ArrowUpRight size={11} />
                    </button>
                  </div>
                )}
                <div
                  className={`composer ${pendingFork ? "fork-composer" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles(e.dataTransfer.files);
                  }}
                >
                  {pendingFork && (
                    <div className="fork-banner">
                      <GitBranch size={13} />
                      <span>
                        从「
                        {state.turns.find((t) => t.id === pendingFork.parentId)
                          ?.title ?? "已删除节点"}
                        」分叉
                        {pendingFork.quote &&
                          ` · ${pendingFork.quote.slice(0, 35)}`}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="取消分叉"
                        onClick={() => {
                          setPendingFork(null);
                          setDraft("");
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div className="composer-attachments">
                      {attachments.map((a) => (
                        <div key={a.id}>
                          {previews[a.id] ? (
                            <img src={previews[a.id]} alt={a.name} />
                          ) : (
                            <FileText size={16} />
                          )}
                          <span>
                            {a.name}
                            <small>{formatSize(a.size)}</small>
                          </span>
                          <button
                            className="icon-button"
                            aria-label={`移除附件${a.name}`}
                            onClick={() => {
                              setAttachments((v) =>
                                v.filter((item) => item.id !== a.id),
                              );
                              if (previews[a.id]) {
                                URL.revokeObjectURL(previews[a.id]);
                                setPreviews((v) => {
                                  const next = { ...v };
                                  delete next[a.id];
                                  return next;
                                });
                              }
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    ref={composer}
                    aria-label="学习问题"
                    placeholder={
                      pendingFork
                        ? "把这个想法再展开一点…"
                        : "有什么想继续探索的？"
                    }
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onPaste={(e) => {
                      const files = [...e.clipboardData.items]
                        .filter((i) => i.kind === "file")
                        .map((i) => i.getAsFile())
                        .filter((f): f is File => f !== null);
                      if (files.length) {
                        e.preventDefault();
                        addFiles(files);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <div className="composer-toolbar">
                    <div className="button-row">
                      <input
                        ref={upload}
                        type="file"
                        hidden
                        multiple
                        onChange={(e) => {
                          if (e.target.files) addFiles(e.target.files);
                        }}
                      />
                      <button
                        className="icon-button"
                        title="添加附件或粘贴图片"
                        aria-label="添加附件"
                        onClick={() => upload.current?.click()}
                      >
                        <Paperclip size={17} />
                      </button>
                      <button
                        className="composer-resource"
                        onClick={() => setDialog({ type: "resources" })}
                      >
                        <BookOpen size={14} /> 资料与能力{" "}
                        <ChevronDown size={12} />
                      </button>
                      <select
                        aria-label="学习活动类型"
                        value={activity}
                        onChange={(e) =>
                          setActivity(e.target.value as Activity)
                        }
                      >
                        {Object.entries(activityNames).map(([id, name]) => (
                          <option value={id} key={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="send-button"
                      aria-label="发送学习问题"
                      disabled={busy || (!draft.trim() && !attachments.length)}
                      onClick={send}
                    >
                      <ArrowUp size={20} />
                    </button>
                  </div>
                </div>
                <div className="composer-footnote">
                  <span>演示回复 · ⌘ / Ctrl + Enter 发送</span>
                  <span
                    className="context-meter"
                    title="按文本长度估算，非模型实际 token 使用量"
                  >
                    <span className="context-bar">
                      <i style={{ width: `${occupancy}%` }} />
                    </span>
                    {(contextTokens / 1000).toFixed(1)}k /{" "}
                    {state.settings.contextLimit / 1000}k <span>估算</span>
                  </span>
                </div>
              </div>
            </section>
            {mapOpen && (
              <>
                <ResizeHandle
                  orientation="vertical"
                  label="调整学习地图宽度"
                  value={panelWidth}
                  minimum={260}
                  maximum={Math.max(
                    260,
                    (workbench.current?.clientWidth ?? window.innerWidth) - 320,
                  )}
                  onDelta={(dx) =>
                    setPanelWidth((w) =>
                      Math.max(
                        260,
                        Math.min(
                          w - dx,
                          (workbench.current?.clientWidth ?? 900) - 320,
                        ),
                      ),
                    )
                  }
                  onReset={() => setPanelWidth(410)}
                />
                <aside className="graph-panel">
                  <GraphPanel {...graphProps} />
                </aside>
              </>
            )}
            {!mapOpen && (
              <aside className="map-collapsed-rail">
                <button
                  className="icon-button"
                  aria-label="展开学习地图"
                  title="展开学习地图"
                  onClick={() => {
                    setMapOpen(true);
                  }}
                >
                  <PanelRightOpen size={18} />
                </button>
              </aside>
            )}
          </div>
        ) : (
          <ConfigPages
            key={page}
            page={page}
            state={state}
            dispatch={dispatch}
            onNavigate={navigate}
            onNewSession={openNew}
            onDeleteSession={(id) => setDialog({ type: "deleteSession", id })}
            onReset={() => setDialog({ type: "reset" })}
            notify={notify}
          />
        )}
      </div>
      {sessionMenu && (
        <div
          ref={menuRef}
          className="session-context-menu"
          role="menu"
          aria-label="会话操作"
          style={{ left: sessionMenu.x, top: sessionMenu.y }}
        >
          <button
            role="menuitem"
            onClick={() => editSession("rename", sessionMenu.id)}
          >
            <FileText size={15} />
            重命名
          </button>
          <button
            role="menuitem"
            onClick={() => editSession("workspace", sessionMenu.id)}
          >
            <FolderOpen size={15} />
            设置工作区
          </button>
          <button
            role="menuitem"
            className="danger"
            disabled={state.sessions.length === 1}
            onClick={() => {
              setDialog({ type: "deleteSession", id: sessionMenu.id });
              setSessionMenu(null);
            }}
          >
            <Trash2 size={15} />
            删除
          </button>
        </div>
      )}
      {selection && (
        <button
          className="selection-menu"
          style={{ left: selection.x, top: selection.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => beginFork(selection.id, selection.text)}
        >
          <GitBranch size={14} /> 分支追问这段内容
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => setToast("")}
          >
            <X size={13} />
          </button>
        </div>
      )}
      {dialogElement}
    </div>
  );
}
