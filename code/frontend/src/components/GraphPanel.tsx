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
  Flag,
  FlaskConical,
  X,
  Grip,
  PanelRightClose,
  PanelsTopLeft,
} from "lucide-react";
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
  difficulty?: string;
  goal?: boolean;
  topic?: boolean;
  expanded?: boolean;
  expand?: () => void;
};
type GraphNode = Node<GraphData>;
function MapNode({ data }: NodeProps<GraphNode>) {
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
        {data.main && <Flag size={12} />}
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
}: {
  initialNodes: GraphNode[];
  edges: Edge[];
  onSelect: (id: string) => void;
  kind: "tree" | "knowledge";
  reduceMotion: boolean;
  ratio?: number;
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
    </div>
  );
}

function treeLayout(
  state: AppState,
  selectedConcept: string | null,
): { nodes: GraphNode[]; edges: Edge[] } {
  const session = activeSession(state),
    turns = state.turns.filter((t) => t.sessionId === session.id),
    main = new Set(ancestors(turns, session.mainLeafId).map((t) => t.id));
  const pitch = Math.max(...turns.map((t) => nodeWidth(t.title))) + 36;
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
    positions[id] = { x, y: depth * 136 };
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
  return {
    nodes: turns.map((t) => ({
      id: t.id,
      type: "map",
      ariaLabel: `对话节点：${t.title}`,
      ariaRole: "button",
      position: positions[t.id] ?? { x: 0, y: 0 },
      style: { width: nodeWidth(t.title) },
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
        focus: focus.has(t.id),
        linked: !!selectedConcept && t.conceptIds.includes(selectedConcept),
      },
    })),
    edges: turns
      .filter((t) => t.parentId)
      .map((t) => ({
        id: `tree-${t.id}`,
        source: t.parentId!,
        target: t.id,
        type: "default",
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
  setSelectedConcept,
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
}) {
  const session = activeSession(state),
    current = state.turns.find((t) => t.id === session.activeId)!;
  const concept = state.concepts.find(
    (c) => c.id === selectedConcept && !c.deleted,
  );
  const tree = useMemo(
    () =>
      treeLayout(
        state,
        selectionOrigin === "knowledge" ? selectedConcept : null,
      ),
    [state, selectedConcept, selectionOrigin],
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
      type: "default",
      label: "先修",
      labelStyle: { fontSize: 10, fill: "#64748b" },
      labelBgStyle: { fill: "#f8fafc" },
      style: {
        stroke: "#7da2e4",
        strokeWidth: 1.4,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#7da2e4" },
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
          type: "default",
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
  const relatedTurns = state.turns.filter((t) =>
    t.conceptIds.includes(selectedConcept ?? ""),
  );
  const contexts = session.contexts[current.branchId]?.updates ?? [];
  const [showUpdates, setShowUpdates] = useState(false),
    [splitRatio, setSplitRatio] = useState(0.5);
  const mapsContainer = useRef<HTMLDivElement>(null);
  return (
    <>
      <div
        className={`panel-heading ${floating ? "draggable" : ""}`}
        onPointerDown={onDrag}
      >
        <div className="panel-title">
          <Grip size={15} />
          <strong>学习地图</strong>
          <span>看见你的思考</span>
        </div>
        <div className="button-row">
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
            ? "全局模块 · 箭头表示先修"
            : `当前会话 · ${tree.nodes.length} 个节点`}
        </span>
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
            onSelect={onSelectTree}
            reduceMotion={state.settings.reduceMotion}
            ratio={tab === "both" ? splitRatio : 1}
          />
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
      <div className="map-legend">
        <span>
          <i className="legend-line" /> 主线 / 先修
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
                onClick={() => dispatch({ type: "mainline", id: current.id })}
              >
                <Flag size={14} />
                {session.mainLeafId === current.id ? "当前主线" : "设为主线"}
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
                <summary>先修关系</summary>
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
                      <p>先修关系</p>
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
