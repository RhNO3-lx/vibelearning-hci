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

function FlowCanvas({
  initialNodes,
  edges,
  onSelect,
  kind,
}: {
  initialNodes: GraphNode[];
  edges: Edge[];
  onSelect: (id: string) => void;
  kind: string;
}) {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<GraphNode>(initialNodes);
  const instance = useRef<ReactFlowInstance<GraphNode, Edge> | null>(null);
  const positions = useRef<Record<string, { x: number; y: number }>>({});
  const count = useRef(initialNodes.length);
  const focusId = initialNodes.find((n) => n.data.active)?.id;
  const previousFocus = useRef(focusId);
  const container = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(initialNodes);
  nodesRef.current = initialNodes;
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const focused = nodesRef.current.filter((n) => n.data.focus);
      void instance.current?.fitView({
        nodes: focused.length ? focused : undefined,
        padding: 0.12,
        maxZoom: 0.95,
      });
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setNodes(
      initialNodes.map((n) => ({
        ...n,
        position: positions.current[n.id] ?? n.position,
      })),
    );
    if (
      count.current !== initialNodes.length ||
      previousFocus.current !== focusId
    ) {
      count.current = initialNodes.length;
      previousFocus.current = focusId;
      requestAnimationFrame(
        () =>
          void instance.current?.fitView({
            nodes: initialNodes.some((n) => n.data.focus)
              ? initialNodes.filter((n) => n.data.focus)
              : undefined,
            padding: 0.12,
            duration: 160,
            maxZoom: 1,
          }),
      );
    }
  }, [initialNodes, setNodes, kind, focusId]);
  return (
    <div
      ref={container}
      className="flow-canvas"
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
          setTimeout(
            () =>
              void flow.fitView({
                nodes: initialNodes.some((n) => n.data.focus)
                  ? initialNodes.filter((n) => n.data.focus)
                  : undefined,
                padding: 0.12,
                maxZoom: 0.95,
              }),
            80,
          );
        }}
        minZoom={0.18}
        maxZoom={1.6}
        nodesConnectable={false}
        deleteKeyCode={null}
        attributionPosition="bottom-right"
      >
        <Background gap={22} size={1} color="#cdd8ce" />
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
      : leaf++ * 220;
    positions[id] = { x, y: depth * 146 };
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
        type: "smoothstep",
        style: {
          stroke: main.has(t.id) ? "#538772" : "#c0ccc2",
          strokeWidth: main.has(t.id) ? 2 : 1.5,
          strokeDasharray: main.has(t.id) ? undefined : "4 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: main.has(t.id) ? "#538772" : "#b1beb6",
        },
      })),
  };
}

export function GraphPanel({
  state,
  dispatch,
  selectedConcept,
  setSelectedConcept,
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
    () => treeLayout(state, selectedConcept),
    [state, selectedConcept],
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
          { x: (i % 2) * 230, y: Math.floor(i / 2) * 230 },
        ]),
      );
    const relation =
      state.relations.find((r) => r.source === selectedConcept) ??
      state.relations.find((r) => r.target === selectedConcept);
    const neighbor = expanded.includes(selectedConcept ?? "")
      ? null
      : relation
        ? relation.source === selectedConcept
          ? relation.target
          : relation.source
        : null;
    const nodes: GraphNode[] = concepts.map((c) => ({
      id: c.id,
      type: "map",
      ariaLabel: `知识模块：${c.name}`,
      ariaRole: "button",
      position: positions.get(c.id)!,
      data: {
        title: c.name,
        subtitle: c.category,
        score: conceptScore(state, c.id),
        goal: session.pathIds.at(-1) === c.id,
        active: c.id === selectedConcept,
        focus: c.id === selectedConcept || c.id === neighbor,
        linked: current.conceptIds.includes(c.id),
        expanded: expanded.includes(c.id),
        expand: () => toggleExpand(c.id),
      },
    }));
    const edges: Edge[] = state.relations.map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      type: "smoothstep",
      label: r.type === "prerequisite" ? "先修" : "有帮助",
      labelStyle: { fontSize: 10, fill: "#6f7e73" },
      labelBgStyle: { fill: "#f4f6f0" },
      style: {
        stroke: "#a6bcb0",
        strokeWidth: 1.4,
        strokeDasharray: r.type === "helpful" ? "4 4" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#a6bcb0" },
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
          data: {
            title: topic,
            subtitle: c.name,
            topic: true,
            focus: c.id === selectedConcept,
            linked: current.conceptIds.includes(c.id),
          },
        });
        edges.push({
          id: `part-${id}`,
          source: c.id,
          target: id,
          type: "smoothstep",
          style: { stroke: "#c3cdc2", strokeDasharray: "2 3" },
        });
      });
    return { nodes, edges };
  }, [
    state,
    session.pathIds,
    current.conceptIds,
    selectedConcept,
    expanded,
    toggleExpand,
  ]);
  const relatedTurns = state.turns.filter((t) =>
    t.conceptIds.includes(selectedConcept ?? ""),
  );
  const contexts = session.contexts[current.branchId]?.updates ?? [];
  const [showUpdates, setShowUpdates] = useState(false);
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
            ? "全局模块 · 虚线表示有帮助"
            : `当前会话 · ${tree.nodes.length} 个节点`}
        </span>
        <button
          className="text-button"
          onClick={tab === "knowledge" ? onAddConcept : onFork}
        >
          <Plus size={14} />
          {tab === "knowledge" ? "模块" : "分支"}
        </button>
      </div>
      <div className={`maps-container ${tab === "both" ? "both" : ""}`}>
        {tab !== "knowledge" && (
          <FlowCanvas
            kind="tree"
            initialNodes={tree.nodes}
            edges={tree.edges}
            onSelect={(id) => {
              dispatch({ type: "selectTurn", id });
              const turn = state.turns.find((t) => t.id === id);
              setSelectedConcept(turn?.conceptIds[0] ?? null);
            }}
          />
        )}
        {tab !== "tree" && (
          <FlowCanvas
            kind="knowledge"
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
                  <button
                    key={t.id}
                    onClick={() => dispatch({ type: "selectTurn", id: t.id })}
                  >
                    {t.title}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              <details className="relation-details">
                <summary>关系依据与属性</summary>
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
                      <p>
                        {r.type === "prerequisite" ? "先修" : "有帮助"} ·
                        置信度：
                        {r.confidence === null ? "待核实" : `${r.confidence}%`}
                        <br />
                        帮助：{r.help}
                        <br />
                        {r.sourceNote}
                      </p>
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
