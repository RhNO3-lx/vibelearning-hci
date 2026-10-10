import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  type Node,
  type NodeProps,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  GitBranch,
  Network,
  BookOpen,
  Target,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Plus,
  Trash2,
  Route,
  CheckCheck,
  ExternalLink,
  ClipboardPen,
  Swords,
  Layers,
  SquareArrowOutUpRight,
  ArrowLeftRight,
  FlaskConical,
  X,
  Grip,
  PanelRightClose,
  PanelsTopLeft,
} from "lucide-react";
import { BoundaryEdge } from "./BoundaryEdge";
import { eventTitleLines } from "../graphGeometry";
import { ResizeHandle } from "./ResizeHandle";
import {
  activeSession,
  ancestors,
  activityNames,
  conceptScore,
  type AppState,
  type Action,
  type Concept,
  type Activity,
} from "../model";

type GraphData = {
  title: string;
  subtitle: string;
  activity?: Activity;
  score?: number | null;
  main?: boolean;
  active?: boolean;
  focus?: boolean;
  linked?: boolean;
  categoryMatch?: boolean;
  fullSummary?: string;
  difficulty?: string;
  goal?: boolean;
  topic?: boolean;
  expanded?: boolean;
  expand?: () => void;
};
type GraphNode = Node<GraphData>;
const eventKinds = {
  concept: { icon: BookOpen, label: "概念讲解", color: "#7c3aed" },
  quiz: { icon: ClipboardPen, label: "集中检测", color: "#0891b2" },
  project: { icon: Swords, label: "实操演练", color: "#db2777" },
  flashcard: { icon: Layers, label: "闪卡回顾", color: "#2563eb" },
};
function MapNode({ data }: NodeProps<GraphNode>) {
  if (data.activity) {
    const kind = eventKinds[data.activity],
      Icon = kind.icon;
    return (
      <div
        className={`map-node event-node ${data.active ? "active" : ""} ${data.linked ? "linked" : ""} ${data.categoryMatch ? "category-match" : ""}`}
        title={`${kind.label} · ${data.title}\n${data.fullSummary ?? ""}`}
      >
        <Handle type="target" position={Position.Top} />
        <Icon className="event-icon" size={22} style={{ color: kind.color }} />
        <strong className="event-short-title">
          {eventTitleLines(data.title).map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </strong>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }
  return (
    <div
      className={`map-node ${data.activity ? "turn-node" : ""} ${data.active ? "active" : ""} ${data.linked ? "linked" : ""} ${data.topic ? "topic" : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="map-node-top">
        <span className={`map-kind ${data.activity === "quiz" ? "amber" : ""}`}>
          {data.topic ? (
            <span className="node-dot" />
          ) : data.activity ? (
            <GitBranch size={13} />
          ) : (
            <BookOpen size={13} />
          )}
          {data.activity ? activityNames[data.activity] : data.subtitle}
        </span>
        {data.goal && <Target size={13} />}
      </div>
      <strong>{data.title}</strong>
      {data.activity ? (
        <small>{data.active ? "你在这里" : data.subtitle}</small>
      ) : (
        !data.topic && (
          <div className="node-progress">
            <div>
              <i style={{ width: `${data.score ?? 0}%` }} />
            </div>
            <span>{data.score === null ? "证据不足" : `${data.score}%`}</span>
          </div>
        )
      )}
      {data.difficulty && (
        <small className="node-difficulty">预估难度 · {data.difficulty}</small>
      )}
      {data.expand && (
        <button
          className="node-expand nodrag"
          onClick={(e) => {
            e.stopPropagation();
            data.expand!();
          }}
          aria-label={`${data.expanded ? "收起" : "展开"}${data.title}知识点`}
        >
          {data.expanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}{" "}
          知识点
        </button>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { map: MapNode };
const edgeTypes = { boundary: BoundaryEdge };

// Approximate text width for initial placement; React Flow measures final content height.
function nodeWidth(title: string) {
  return Math.max(
    148,
    Math.min(
      248,
      [...title].reduce(
        (w, c) => w + (/[^\u0000-\u00ff]/.test(c) ? 13 : 7),
        32,
      ),
    ),
  );
}
function FlowCanvas({
  initialNodes,
  edges,
  onSelect,
  kind,
  reduceMotion,
  ratio = 1,
  onContextMenu,
  children,
}: {
  initialNodes: GraphNode[];
  edges: Edge[];
  onSelect: (id: string) => void;
  kind: "tree" | "knowledge";
  reduceMotion: boolean;
  ratio?: number;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  children?: React.ReactNode;
}) {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<GraphNode>(initialNodes);
  const instance = useRef<ReactFlowInstance<GraphNode, Edge> | null>(null);
  const positions = useRef<Record<string, { x: number; y: number }>>({});
  const container = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(initialNodes),
    motionRef = useRef(reduceMotion);
  nodesRef.current = initialNodes;
  motionRef.current = reduceMotion;
  const focusKey = initialNodes
    .filter((n) => n.data.focus)
    .map((n) => n.id)
    .sort()
    .join("|");
  const count = initialNodes.length;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const flow = instance.current;
      if (!flow) return;
      const ids = new Set(
        nodesRef.current.filter((n) => n.data.focus).map((n) => n.id),
      );
      // Pass IDs from current measured nodes, retaining any positions dragged by the user.
      const measured = flow
        .getNodes()
        .filter((n) => !ids.size || ids.has(n.id));
      void flow.fitView({
        nodes: measured,
        padding: 0.13,
        minZoom: 0.05,
        maxZoom: 1.15,
        duration: motionRef.current ? 0 : 480,
        interpolate: "linear",
        ease: (t) => (1 - Math.exp(-6 * t)) / (1 - Math.exp(-6)),
      });
    }, 60);
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver(fit);
    if (container.current) observer.observe(container.current);
    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fit]);
  useEffect(() => {
    setNodes(
      initialNodes.map((n) => ({
        ...n,
        position: positions.current[n.id] ?? n.position,
      })),
    );
  }, [initialNodes, setNodes]);
  useEffect(fit, [focusKey, count, fit]);
  return (
    <div
      ref={container}
      className={`flow-canvas ${kind}-canvas`}
      style={{ flex: ratio }}
      aria-label={kind === "tree" ? "交互轨迹图" : "知识模块图"}
    >
      <ReactFlow<GraphNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeContextMenu={(e, n) => onContextMenu?.(e, n.id)}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => onSelect(n.id)}
        onNodeDragStop={(_, n) => {
          positions.current[n.id] = n.position;
        }}
        onInit={(flow) => {
          instance.current = flow;
          fit();
        }}
        minZoom={0.05}
        maxZoom={1.8}
        nodesConnectable={false}
        deleteKeyCode={null}
        attributionPosition="bottom-right"
      >
        <Background gap={22} size={1} color="#d8e0ef" />
        <Controls showInteractive={false} position="top-left" />
      </ReactFlow>
      {children}
    </div>
  );
}

function treeLayout(
  state: AppState,
  selectedConcept: string | null,
  category: Activity | null,
): { nodes: GraphNode[]; edges: Edge[] } {
  const session = activeSession(state),
    turns = state.turns.filter((t) => t.sessionId === session.id),
    main = new Set(ancestors(turns, session.mainLeafId).map((t) => t.id));
  const pitch = 176;
  let leaf = 0;
  const positions: Record<string, { x: number; y: number }> = {},
    visited = new Set<string>();
  function place(id: string, depth: number): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const children = turns.filter((t) => t.parentId === id);
    const xs = children.map((t) => place(t.id, depth + 1));
    const x = xs.length
      ? xs.reduce((a, b) => a + b, 0) / xs.length
      : leaf++ * pitch;
    positions[id] = { x, y: depth * 104 };
    return x;
  }
  place(session.rootId, 0);
  const active = turns.find((t) => t.id === session.activeId)!,
    focus = new Set([
      active.id,
      ...(active.parentId
        ? [
            active.parentId,
            ...turns
              .filter((t) => t.parentId === active.parentId)
              .map((t) => t.id),
          ]
        : turns.filter((t) => t.parentId === active.id).map((t) => t.id)),
    ]);
  const related = turns.filter(
    (t) => selectedConcept && t.conceptIds.includes(selectedConcept),
  );
  const filtered = turns.filter((t) => category && t.activity === category);
  const focusedIds = category
    ? new Set(filtered.map((t) => t.id))
    : related.length
      ? new Set(related.map((t) => t.id))
      : focus;
  return {
    nodes: turns.map((t) => ({
      id: t.id,
      type: "map",
      ariaLabel: `对话节点：${t.title}`,
      ariaRole: "button",
      position: positions[t.id] ?? { x: 0, y: 0 },
      style: { width: 136 },
      data: {
        title: t.title,
        activity: t.activity,
        subtitle:
          t.conceptIds
            .map(
              (id) =>
                state.concepts.find((c) => c.id === id)?.name ?? "历史模块",
            )
            .join(" · ") || "学习目标",
        main: main.has(t.id),
        active: t.id === session.activeId,
        fullSummary: t.summary,
        focus: focusedIds.has(t.id),
        categoryMatch: !!category && t.activity === category,
        linked: !!selectedConcept && t.conceptIds.includes(selectedConcept),
      },
    })),
    edges: turns
      .filter((t) => t.parentId)
      .map((t) => ({
        id: `tree-${t.id}`,
        source: t.parentId!,
        target: t.id,
        type: "boundary",
        style: {
          stroke: main.has(t.id) ? "#8b5cf6" : "#c4b5fd",
          strokeWidth: main.has(t.id) ? 2 : 1.5,
          strokeDasharray: main.has(t.id) ? undefined : "4 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: main.has(t.id) ? "#8b5cf6" : "#c4b5fd",
        },
      })),
  };
}

export function GraphPanel({
  state,
  dispatch,
  selectedConcept,
  setSelectedConcept: selectConcept,
  selectionOrigin,
  onSelectTree,
  tab,
  setTab,
  expanded,
  setExpanded,
  onActivity,
  onFork,
  onDeleteTurn,
  onDeleteConcept,
  onAddConcept,
  onPath,
  floating,
  onFloat,
  onDock,
  onClose,
  onDrag,
  onPopOut,
  popOutUrl,
  external,
}: {
  state: AppState;
  dispatch: (action: Action) => void;
  selectedConcept: string | null;
  setSelectedConcept: (id: string | null) => void;
  selectionOrigin: "tree" | "knowledge";
  onSelectTree: (id: string) => void;
  tab: "tree" | "knowledge" | "both";
  setTab: (tab: "tree" | "knowledge" | "both") => void;
  expanded: string[];
  setExpanded: (ids: string[]) => void;
  onActivity: (activity: Activity, concept: Concept) => void;
  onFork: () => void;
  onDeleteTurn: (id: string) => void;
  onDeleteConcept: (id: string) => void;
  onAddConcept: () => void;
  onPath: () => void;
  floating: boolean;
  onFloat: () => void;
  onDock: () => void;
  onClose: () => void;
  onDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPopOut: () => void;
  popOutUrl: string;
  external: boolean;
}) {
  const session = activeSession(state),
    current = state.turns.find((t) => t.id === session.activeId)!;
  const concept = state.concepts.find(
    (c) => c.id === selectedConcept && !c.deleted,
  );
  const [category, setCategory] = useState<Activity | null>(null);
  const setSelectedConcept = useCallback(
    (id: string | null) => {
      setCategory(null);
      selectConcept(id);
    },
    [selectConcept],
  );
  const [eventMenu, setEventMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [editOrder, setEditOrder] = useState(false);
  const [orderSource, setOrderSource] = useState(""),
    [orderTarget, setOrderTarget] = useState("");
  const tree = useMemo(
    () =>
      treeLayout(
        state,
        selectionOrigin === "knowledge" ? selectedConcept : null,
        category,
      ),
    [state, selectedConcept, selectionOrigin, category],
  );
  const toggleExpand = useCallback(
    (id: string) => {
      setSelectedConcept(id);
      setExpanded(
        expanded.includes(id)
          ? expanded.filter((v) => v !== id)
          : [...expanded, id],
      );
    },
    [expanded, setExpanded, setSelectedConcept],
  );
  const knowledge = useMemo(() => {
    const concepts = state.concepts.filter((c) => !c.deleted),
      positions = new Map(
        concepts.map((c, i) => [
          c.id,
          { x: (i % 2) * 284, y: Math.floor(i / 2) * 252 },
        ]),
      );
    const nodes: GraphNode[] = concepts.map((c) => ({
      id: c.id,
      type: "map",
      ariaLabel: `知识模块：${c.name}`,
      ariaRole: "button",
      position: positions.get(c.id)!,
      style: { width: nodeWidth(c.name) },
      data: {
        title: c.name,
        subtitle: c.category,
        score: conceptScore(state, c.id),
        difficulty: c.difficulty,
        goal: session.pathIds.at(-1) === c.id,
        active: c.id === selectedConcept,
        focus:
          selectionOrigin === "tree"
            ? current.conceptIds.includes(c.id)
            : c.id === selectedConcept,
        linked: selectionOrigin === "tree" && current.conceptIds.includes(c.id),
        expanded: expanded.includes(c.id),
        expand: () => toggleExpand(c.id),
      },
    }));
    const edges: Edge[] = state.relations.map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      type: "boundary",
      label: "推荐",
      labelStyle: { fontSize: 10, fill: "#64748b" },
      labelBgStyle: { fill: "#f8fafc" },
      style: {
        stroke: "#22b8cf",
        strokeWidth: 1.4,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#22b8cf" },
    }));
    for (const c of concepts.filter((c) => expanded.includes(c.id)))
      c.topics.forEach((topic, i) => {
        const p = positions.get(c.id)!,
          id = `${c.id}::${i}`;
        nodes.push({
          id,
          type: "map",
          ariaLabel: `知识点：${topic}`,
          ariaRole: "button",
          position: {
            x: p.x + (i - (c.topics.length - 1) / 2) * 175,
            y: p.y + 160,
          },
          style: { width: nodeWidth(topic) },
          data: {
            title: topic,
            subtitle: c.name,
            topic: true,
            focus: selectionOrigin === "knowledge" && c.id === selectedConcept,
            linked:
              selectionOrigin === "tree" && current.conceptIds.includes(c.id),
          },
        });
        edges.push({
          id: `part-${id}`,
          source: c.id,
          target: id,
          type: "boundary",
          style: { stroke: "#cbd5e1", strokeDasharray: "2 3" },
        });
      });
    return { nodes, edges };
  }, [
    state,
    session.pathIds,
    current.conceptIds,
    selectedConcept,
    selectionOrigin,
    expanded,
    toggleExpand,
  ]);
  const relatedTurns = state.turns.filter(
    (t) =>
      t.sessionId === session.id &&
      t.conceptIds.includes(selectedConcept ?? ""),
  );
  const contexts = session.contexts[current.branchId]?.updates ?? [];
  const [showUpdates, setShowUpdates] = useState(false),
    [splitRatio, setSplitRatio] = useState(0.5);
  const mapsContainer = useRef<HTMLDivElement>(null),
    eventMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCategory(null);
    setEventMenu(null);
  }, [session.id]);
  useEffect(() => {
    if (!eventMenu) return;
    const doc = mapsContainer.current?.ownerDocument ?? document;
    eventMenuRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    const dismiss = (e: Event) => {
      if (!eventMenuRef.current?.contains(e.target as globalThis.Node))
        setEventMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEventMenu(null);
    };
    doc.addEventListener("pointerdown", dismiss);
    doc.addEventListener("keydown", key);
    return () => {
      doc.removeEventListener("pointerdown", dismiss);
      doc.removeEventListener("keydown", key);
    };
  }, [eventMenu]);
  return (
    <>
      <div
        className={`panel-heading ${floating ? "draggable" : ""}`}
        onPointerDown={external ? undefined : onDrag}
      >
        <div className="panel-title">
          <Grip size={15} />
          <strong>学习地图</strong>
          <span>看见你的思考</span>
        </div>
        <div className="button-row">
          {!external && (
            <a
              className="icon-button"
              aria-label="在独立窗口打开地图"
              title="在独立窗口打开地图"
              href={popOutUrl}
              target="_blank"
              onClick={(e) => {
                e.preventDefault();
                onPopOut();
              }}
            >
              <SquareArrowOutUpRight size={16} />
            </a>
          )}
          <button
            className="icon-button"
            title={floating ? "吸附到右侧" : "浮动学习地图"}
            aria-label={floating ? "吸附到右侧" : "浮动学习地图"}
            onClick={floating ? onDock : onFloat}
          >
            <PanelsTopLeft size={16} />
          </button>
          <button
            className="icon-button"
            title="收起学习地图"
            aria-label="收起学习地图"
            onClick={onClose}
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>
      <div className="graph-tabs" role="tablist" aria-label="学习地图视图">
        <button
          role="tab"
          aria-selected={tab === "tree"}
          className={tab === "tree" ? "selected" : ""}
          onClick={() => setTab("tree")}
        >
          <GitBranch size={15} /> 探索树
        </button>
        <button
          role="tab"
          aria-selected={tab === "knowledge"}
          className={tab === "knowledge" ? "selected" : ""}
          onClick={() => setTab("knowledge")}
        >
          <Network size={15} /> 知识图
        </button>
        <button
          role="tab"
          aria-selected={tab === "both"}
          className={tab === "both" ? "selected" : ""}
          onClick={() => setTab("both")}
        >
          并看
        </button>
      </div>
      <div className="graph-toolbar">
        <span>
          <i className="legend-dot" />
          {tab === "knowledge"
            ? "全局模块 · 推荐学习顺序"
            : `当前会话 · ${tree.nodes.length} 个节点`}
        </span>
        {tab !== "tree" && (
          <button
            className="text-button"
            onClick={() => setEditOrder((v) => !v)}
          >
            <ArrowLeftRight size={13} />
            编辑顺序
          </button>
        )}
        {tab !== "tree" && (
          <button className="text-button" onClick={onAddConcept}>
            <Plus size={14} />
            模块
          </button>
        )}
      </div>
      <div
        ref={mapsContainer}
        className={`maps-container ${tab === "both" ? "both" : ""}`}
      >
        {tab !== "knowledge" && (
          <FlowCanvas
            kind="tree"
            initialNodes={tree.nodes}
            edges={tree.edges}
            onSelect={(id) => {
              setCategory(null);
              onSelectTree(id);
            }}
            onContextMenu={(e, id) => {
              e.preventDefault();
              const view =
                mapsContainer.current?.ownerDocument.defaultView ?? window;
              setEventMenu({
                id,
                x: Math.max(8, Math.min(e.clientX, view.innerWidth - 228)),
                y: Math.max(8, Math.min(e.clientY, view.innerHeight - 75)),
              });
            }}
            reduceMotion={state.settings.reduceMotion}
            ratio={tab === "both" ? splitRatio : 1}
          >
            <div className="event-category-card" aria-label="事件类别">
              {Object.entries(eventKinds).map(([id, kind]) => {
                const Icon = kind.icon,
                  count = state.turns.filter(
                    (t) => t.sessionId === session.id && t.activity === id,
                  ).length;
                return (
                  <button
                    key={id}
                    className={category === id ? "selected" : ""}
                    aria-pressed={category === id}
                    aria-label={`高亮${kind.label}事件`}
                    onClick={() => {
                      setCategory(category === id ? null : (id as Activity));
                    }}
                  >
                    <Icon size={17} style={{ color: kind.color }} />
                    <span>{kind.label}</span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </div>
          </FlowCanvas>
        )}
        {tab === "both" && (
          <ResizeHandle
            orientation="horizontal"
            label="调整两图高度"
            value={splitRatio * 100}
            minimum={20}
            maximum={80}
            onDelta={(dy) =>
              setSplitRatio((r) =>
                Math.max(
                  0.2,
                  Math.min(
                    0.8,
                    r +
                      dy /
                        Math.max(
                          1,
                          (mapsContainer.current?.clientHeight ?? 400) - 8,
                        ),
                  ),
                ),
              )
            }
            onReset={() => setSplitRatio(0.5)}
          />
        )}
        {tab !== "tree" && (
          <FlowCanvas
            kind="knowledge"
            reduceMotion={state.settings.reduceMotion}
            ratio={tab === "both" ? 1 - splitRatio : 1}
            initialNodes={knowledge.nodes}
            edges={knowledge.edges}
            onSelect={(id) => setSelectedConcept(id.split("::")[0])}
          />
        )}
      </div>
      {eventMenu && (
        <div
          ref={eventMenuRef}
          className="session-context-menu event-context-menu"
          role="menu"
          aria-label="事件操作"
          style={{ left: eventMenu.x, top: eventMenu.y }}
        >
          <button
            role="menuitem"
            disabled={state.turns.some((t) => t.parentId === eventMenu.id)}
            onClick={() => {
              dispatch({ type: "mainline", id: eventMenu.id });
              setEventMenu(null);
            }}
          >
            设为主线终点
          </button>
          {state.turns.some((t) => t.parentId === eventMenu.id) && (
            <small>仅叶子事件可设为终点</small>
          )}
        </div>
      )}
      {editOrder && (
        <section
          className="recommendation-editor"
          aria-label="编辑推荐学习顺序"
        >
          <div className="detail-title">
            <strong>推荐学习顺序</strong>
            <button
              className="icon-button"
              aria-label="关闭顺序编辑"
              onClick={() => setEditOrder(false)}
            >
              <X size={15} />
            </button>
          </div>
          <p>箭头表示建议先后，可按自己的学习方式调整。</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({
                type: "addRecommendation",
                source: orderSource,
                target: orderTarget,
              });
            }}
          >
            <select
              aria-label="推荐先学模块"
              value={orderSource}
              onChange={(e) => setOrderSource(e.target.value)}
              required
            >
              <option value="">先学…</option>
              {state.concepts
                .filter((c) => !c.deleted)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <span>→</span>
            <select
              aria-label="推荐后学模块"
              value={orderTarget}
              onChange={(e) => setOrderTarget(e.target.value)}
              required
            >
              <option value="">再学…</option>
              {state.concepts
                .filter((c) => !c.deleted)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <button
              className="btn small"
              disabled={
                !orderSource || !orderTarget || orderSource === orderTarget
              }
            >
              添加
            </button>
          </form>
          <div className="recommendation-list">
            {state.relations.map((r) => (
              <div key={r.id}>
                <span>
                  {state.concepts.find((c) => c.id === r.source)?.name} →{" "}
                  {state.concepts.find((c) => c.id === r.target)?.name}
                </span>
                <button
                  className="icon-button"
                  aria-label={`反转${state.concepts.find((c) => c.id === r.source)?.name}到${state.concepts.find((c) => c.id === r.target)?.name}的推荐顺序`}
                  title="反转顺序"
                  onClick={() =>
                    dispatch({ type: "reverseRecommendation", id: r.id })
                  }
                >
                  <ArrowLeftRight size={14} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`移除${state.concepts.find((c) => c.id === r.source)?.name}到${state.concepts.find((c) => c.id === r.target)?.name}的推荐`}
                  title="移除推荐"
                  onClick={() =>
                    dispatch({ type: "removeRecommendation", id: r.id })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="map-legend">
        <span>
          <i className="legend-line" /> 主线 / 推荐顺序
        </span>
        <span>
          <i className="legend-ring" /> 当前关联
        </span>
        <span>拖动节点 · 滚轮缩放</span>
      </div>
      <div className="graph-details">
        {tab === "tree" && (
          <section className="node-detail">
            <div className="detail-eyebrow">
              当前思考 <span>{activityNames[current.activity]}</span>
            </div>
            <h3>{current.title}</h3>
            <div className="concept-tags">
              {current.conceptIds.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setSelectedConcept(id);
                    setTab("knowledge");
                  }}
                >
                  <BookOpen size={12} />
                  {state.concepts.find((c) => c.id === id)?.name ??
                    "已删除模块"}{" "}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
            <p className="summary-text">{current.summary}</p>
            <div className="button-row">
              <button className="btn small" onClick={onFork}>
                <GitBranch size={14} /> 分叉追问
              </button>
              <button
                className="btn small"
                disabled={state.turns.some((t) => t.parentId === current.id)}
                onClick={() => dispatch({ type: "mainline", id: current.id })}
              >
                {session.mainLeafId === current.id
                  ? "主线终点"
                  : "设为主线终点"}
              </button>
              <button
                className="icon-button danger"
                aria-label="删除当前对话子树"
                title="删除当前对话子树"
                disabled={!current.parentId}
                onClick={() => onDeleteTurn(current.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <button
              className="updates-button"
              onClick={() => setShowUpdates((v) => !v)}
            >
              <CheckCheck size={14} />
              已接收{" "}
              {
                contexts.filter((u) => !u.retracted && !u.superseded).length
              }{" "}
              条支线摘要更新 <ChevronDown size={14} />
            </button>
            {showUpdates && (
              <div className="updates-list">
                {contexts.length ? (
                  contexts
                    .slice()
                    .reverse()
                    .map((u) => (
                      <div
                        className={
                          u.retracted
                            ? "retracted"
                            : u.superseded
                              ? "superseded"
                              : ""
                        }
                        key={u.id}
                      >
                        <small>
                          {u.retracted
                            ? "撤回记录"
                            : `${u.superseded ? "已替代 · " : ""}摘要 v${u.version}${u.replacesVersion ? `，替代 v${u.replacesVersion}` : ""}`}
                        </small>
                        <p>{u.text}</p>
                      </div>
                    ))
                ) : (
                  <p>暂无其他支线更新。所有支线可供后续检索。</p>
                )}
              </div>
            )}
          </section>
        )}
        {tab !== "tree" &&
          (concept ? (
            <section className="node-detail">
              <div className="detail-eyebrow">
                模块详情 <span>{concept.difficulty}</span>
              </div>
              <div className="detail-title">
                <h3>{concept.name}</h3>
                <button
                  className="icon-button danger"
                  title="全局删除模块"
                  aria-label="全局删除模块"
                  onClick={() => onDeleteConcept(concept.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p>{concept.summary}</p>
              <div className="mastery-detail">
                <span>
                  {conceptScore(state, concept.id) === null
                    ? "证据不足，尚未诊断"
                    : `演示参考分 ${conceptScore(state, concept.id)}%`}
                </span>
                <small>
                  {
                    state.evidence.filter(
                      (e) => e.conceptId === concept.id && e.valid,
                    ).length
                  }{" "}
                  条有效演示作答
                </small>
              </div>
              <p className="challenge">
                <strong>值得留意</strong>
                {concept.challenge}
              </p>
              <div className="button-row">
                <button
                  className="btn small primary"
                  onClick={() => onActivity("quiz", concept)}
                >
                  <FlaskConical size={14} /> 测试我的理解
                </button>
                <button
                  className="btn small"
                  onClick={() => onActivity("flashcard", concept)}
                >
                  闪卡回顾
                </button>
              </div>
              <div className="related-turns">
                <strong>关联对话 · {relatedTurns.length}</strong>
                {relatedTurns.map((t) => (
                  <button key={t.id} onClick={() => onSelectTree(t.id)}>
                    {t.title}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              <details className="relation-details">
                <summary>推荐学习顺序</summary>
                {state.relations
                  .filter(
                    (r) => r.source === concept.id || r.target === concept.id,
                  )
                  .map((r) => (
                    <div key={r.id}>
                      <strong>
                        {state.concepts.find((c) => c.id === r.source)?.name} →{" "}
                        {state.concepts.find((c) => c.id === r.target)?.name}
                      </strong>
                      <p>推荐先学前者，可自由调整</p>
                    </div>
                  ))}
              </details>
              {concept.sourceUrl ? (
                <a
                  className="source-link"
                  href={concept.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {concept.source}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span className="source-link">{concept.source}</span>
              )}
            </section>
          ) : (
            <div className="map-empty">
              <Network size={24} />
              <p>选择模块查看掌握证据与关联对话</p>
            </div>
          ))}
      </div>
      <div className="path-footer">
        <div>
          <Route size={16} />
          <strong>我的学习路线</strong>
          <span>{session.pathIds.length} 个模块</span>
        </div>
        <button className="text-button" onClick={onPath}>
          调整路线 <ArrowUpRight size={14} />
        </button>
        <div className="route-chips">
          {session.pathIds.map((id, i) => (
            <button
              key={id}
              onClick={() => {
                setSelectedConcept(id);
                setTab("knowledge");
              }}
            >
              <span>{i + 1}</span>
              {state.concepts.find((c) => c.id === id)?.name}
            </button>
          ))}
          {!session.pathIds.length && <p>还没有路线，可按目标添加模块。</p>}
        </div>
      </div>
      {floating && (
        <button className="floating-dock-btn" onClick={onDock}>
          <X size={13} />
          结束浮动，吸附到右侧
        </button>
      )}
    </>
  );
}
