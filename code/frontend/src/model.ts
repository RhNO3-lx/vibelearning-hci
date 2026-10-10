export type Activity = "concept" | "quiz" | "project" | "flashcard";
export type Page =
  "learn" | "sessions" | "knowledge" | "agents" | "skills" | "settings";
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}
export interface Quiz {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  selected?: number;
  submitted?: boolean;
}
export interface Flashcard {
  front: string;
  back: string;
  flipped: boolean;
  rating?: "again" | "known";
}
export interface Turn {
  id: string;
  sessionId: string;
  parentId: string | null;
  branchId: string;
  title: string;
  user: string;
  assistant: string;
  activity: Activity;
  conceptIds: string[];
  attachments: Attachment[];
  createdAt: number;
  summary: string;
  summaryVersion: number;
  quiz?: Quiz;
  flashcard?: Flashcard;
  projectChecks?: boolean[];
}
export interface SyncUpdate {
  id: string;
  nodeId: string;
  version: number;
  text: string;
  time: number;
  retracted?: boolean;
  superseded?: boolean;
  replacesVersion?: number;
}
export interface BranchContext {
  seen: Record<string, number>;
  updates: SyncUpdate[];
}
export interface Session {
  id: string;
  title: string;
  goal: string;
  workspace: string;
  rootId: string;
  activeId: string;
  mainLeafId: string;
  pathIds: string[];
  exclusions: { conceptId: string; reason: string }[];
  kbIds: string[];
  agentId: string;
  skillIds: string[];
  contexts: Record<string, BranchContext>;
  updatedAt: number;
}
export interface Concept {
  id: string;
  name: string;
  category: string;
  summary: string;
  difficulty: string;
  challenge: string;
  topics: string[];
  source: string;
  sourceUrl: string;
  baseScore: number | null;
  deleted?: boolean;
}
export interface Relation {
  id: string;
  source: string;
  target: string;
  type: "prerequisite" | "helpful";
  confidence: number | null;
  help: string;
  sourceNote: string;
}
export interface Evidence {
  id: string;
  turnId: string;
  conceptId: string;
  correct: boolean;
  valid: boolean;
  time: number;
}
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  files: Attachment[];
}
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  command: string;
  enabled: boolean;
}
export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
}
export interface Settings {
  model: string;
  endpoint: string;
  contextLimit: number;
  autoSummary: boolean;
  showMath: boolean;
  reduceMotion: boolean;
}
export interface AppState {
  version: 1;
  activeSessionId: string;
  sessions: Session[];
  turns: Turn[];
  concepts: Concept[];
  relations: Relation[];
  evidence: Evidence[];
  knowledgeBases: KnowledgeBase[];
  agents: AgentConfig[];
  skills: SkillConfig[];
  settings: Settings;
}
export const activityNames: Record<Activity, string> = {
  concept: "概念讲解",
  quiz: "诊断练习",
  project: "项目实践",
  flashcard: "闪卡回顾",
};
export const uid = (prefix = "id") => `${prefix}-${crypto.randomUUID()}`;
export const activeSession = (state: AppState) =>
  state.sessions.find((s) => s.id === state.activeSessionId) ??
  state.sessions[0];
export function ancestors(turns: Turn[], id: string): Turn[] {
  const path: Turn[] = [],
    seen = new Set<string>();
  let node = turns.find((t) => t.id === id);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    path.unshift(node);
    node = node.parentId
      ? turns.find((t) => t.id === node!.parentId)
      : undefined;
  }
  return path;
}
export function descendants(turns: Turn[], id: string): Set<string> {
  const found = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const turn of turns)
      if (turn.parentId && found.has(turn.parentId) && !found.has(turn.id)) {
        found.add(turn.id);
        changed = true;
      }
  }
  return found;
}
export function conceptScore(state: AppState, id: string): number | null {
  const evidence = state.evidence.filter((e) => e.conceptId === id && e.valid);
  if (!evidence.length)
    return state.concepts.find((c) => c.id === id)?.baseScore ?? null;
  return Math.round(
    (evidence.filter((e) => e.correct).length / evidence.length) * 100,
  );
}

export type Action =
  | { type: "selectSession"; id: string }
  | { type: "selectTurn"; id: string }
  | { type: "addTurn"; turn: Turn; main?: boolean }
  | { type: "mainline"; id: string }
  | { type: "deleteTurn"; id: string }
  | { type: "newSession"; session: Session; root: Turn }
  | { type: "deleteSession"; id: string }
  | { type: "sessionConfig"; id: string; patch: Partial<Session> }
  | { type: "quizChoice"; id: string; index: number }
  | { type: "quizSubmit"; id: string }
  | { type: "flashcard"; id: string; rating?: "again" | "known" }
  | { type: "projectCheck"; id: string; index: number }
  | { type: "removePath"; sessionId: string; conceptId: string; reason: string }
  | { type: "addPath"; sessionId: string; conceptId: string }
  | { type: "reorderPath"; sessionId: string; from: number; to: number }
  | { type: "deleteConcept"; id: string }
  | { type: "addConcept"; concept: Concept; sessionId: string }
  | { type: "setKBs"; items: KnowledgeBase[] }
  | { type: "setAgents"; items: AgentConfig[] }
  | { type: "setSkills"; items: SkillConfig[] }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "reset"; state: AppState };

function synchronize(state: AppState): AppState {
  if (!state.settings.autoSummary) return state;
  const session = activeSession(state),
    node = state.turns.find((t) => t.id === session.activeId);
  if (!node) return state;
  const context = session.contexts[node.branchId] ?? { seen: {}, updates: [] };
  const seen = { ...context.seen },
    updates = context.updates.map((update) => ({ ...update }));
  const roots = state.turns.filter(
    (t) =>
      t.sessionId === session.id &&
      t.branchId !== node.branchId &&
      (!t.parentId ||
        state.turns.find((p) => p.id === t.parentId)?.branchId !== t.branchId),
  );
  for (const root of roots)
    if ((seen[root.id] ?? 0) < root.summaryVersion) {
      const replacesVersion = seen[root.id];
      for (const previous of updates) {
        if (previous.nodeId === root.id && !previous.retracted)
          previous.superseded = true;
      }
      seen[root.id] = root.summaryVersion;
      updates.push({
        id: `${node.branchId}:${root.id}:${root.summaryVersion}`,
        nodeId: root.id,
        version: root.summaryVersion,
        text: root.summary,
        time: Date.now(),
        replacesVersion,
      });
    }
  const next = {
    ...session,
    contexts: { ...session.contexts, [node.branchId]: { seen, updates } },
  };
  return {
    ...state,
    sessions: state.sessions.map((s) => (s.id === session.id ? next : s)),
  };
}
function refreshSummaries(turns: Turn[], parentId: string | null): Turn[] {
  if (!parentId) return turns;
  const ids = new Set(ancestors(turns, parentId).map((t) => t.id));
  return turns.map((t) =>
    ids.has(t.id)
      ? {
          ...t,
          summaryVersion: t.summaryVersion + 1,
          summary: `${t.title}。${
            turns
              .filter(
                (n) => n.id !== t.id && descendants(turns, t.id).has(n.id),
              )
              .map(
                (n) =>
                  `${activityNames[n.activity]}：${n.title}${n.quiz?.submitted ? `（演示作答${n.quiz.selected === n.quiz.answer ? "正确" : "有误"}）` : ""}`,
              )
              .join("；") || "暂无后续探索。"
          }（演示摘要，不作为新的能力证据）`,
        }
      : t,
  );
}
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "reset":
      return action.state;
    case "selectSession":
      return state.sessions.some((s) => s.id === action.id)
        ? synchronize({ ...state, activeSessionId: action.id })
        : state;
    case "selectTurn": {
      const turn = state.turns.find((t) => t.id === action.id);
      if (!turn) return state;
      return synchronize({
        ...state,
        activeSessionId: turn.sessionId,
        sessions: state.sessions.map((s) =>
          s.id === turn.sessionId ? { ...s, activeId: turn.id } : s,
        ),
      });
    }
    case "newSession":
      return {
        ...state,
        sessions: [action.session, ...state.sessions],
        turns: [...state.turns, action.root],
        activeSessionId: action.session.id,
      };
    case "deleteSession": {
      if (state.sessions.length <= 1) return state;
      const deleted = new Set(
        state.turns.filter((t) => t.sessionId === action.id).map((t) => t.id),
      );
      const sessions = state.sessions.filter((s) => s.id !== action.id);
      return {
        ...state,
        sessions,
        activeSessionId:
          state.activeSessionId === action.id
            ? sessions[0].id
            : state.activeSessionId,
        turns: state.turns.filter((t) => !deleted.has(t.id)),
        evidence: state.evidence.map((e) =>
          deleted.has(e.turnId) ? { ...e, valid: false } : e,
        ),
      };
    }
    case "addTurn": {
      const parent = state.turns.find((t) => t.id === action.turn.parentId);
      if (
        !parent ||
        parent.sessionId !== action.turn.sessionId ||
        state.turns.some((t) => t.id === action.turn.id)
      )
        return state;
      const turns = refreshSummaries([...state.turns, action.turn], parent.id);
      const sessions = state.sessions.map((s) =>
        s.id === parent.sessionId
          ? {
              ...s,
              activeId: action.turn.id,
              mainLeafId: action.main ? action.turn.id : s.mainLeafId,
              updatedAt: Date.now(),
            }
          : s,
      );
      return synchronize({
        ...state,
        turns,
        sessions,
        activeSessionId: state.activeSessionId,
      });
    }
    case "mainline": {
      const turn = state.turns.find((t) => t.id === action.id);
      return turn
        ? {
            ...state,
            sessions: state.sessions.map((s) =>
              s.id === turn.sessionId ? { ...s, mainLeafId: turn.id } : s,
            ),
          }
        : state;
    }
    case "deleteTurn": {
      const target = state.turns.find((t) => t.id === action.id);
      if (!target || !target.parentId) return state;
      const removed = descendants(state.turns, target.id);
      const turns = refreshSummaries(
        state.turns.filter((t) => !removed.has(t.id)),
        target.parentId,
      );
      const sessions = state.sessions.map((s) =>
        s.id !== target.sessionId
          ? s
          : {
              ...s,
              activeId: removed.has(s.activeId) ? target.parentId! : s.activeId,
              mainLeafId: removed.has(s.mainLeafId)
                ? target.parentId!
                : s.mainLeafId,
              contexts: Object.fromEntries(
                Object.entries(s.contexts).map(([branch, ctx]) => [
                  branch,
                  {
                    ...ctx,
                    updates: [
                      ...ctx.updates.map((u) =>
                        removed.has(u.nodeId) ? { ...u, retracted: true } : u,
                      ),
                      {
                        id: `retract:${target.id}:${Date.now()}`,
                        nodeId: target.id,
                        version: target.summaryVersion + 1,
                        text: `已删除「${target.title}」及 ${removed.size - 1} 个后续节点。相关演示证据已撤回。`,
                        time: Date.now(),
                        retracted: true,
                      },
                    ],
                  },
                ]),
              ),
            },
      );
      return synchronize({
        ...state,
        turns,
        sessions,
        evidence: state.evidence.map((e) =>
          removed.has(e.turnId) ? { ...e, valid: false } : e,
        ),
      });
    }
    case "sessionConfig":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id ? { ...s, ...action.patch } : s,
        ),
      };
    case "quizChoice":
      return {
        ...state,
        turns: state.turns.map((t) =>
          t.id === action.id &&
          t.quiz &&
          !t.quiz.submitted &&
          Number.isInteger(action.index) &&
          action.index >= 0 &&
          action.index < t.quiz.options.length
            ? { ...t, quiz: { ...t.quiz, selected: action.index } }
            : t,
        ),
      };
    case "quizSubmit": {
      const turn = state.turns.find((t) => t.id === action.id);
      if (
        !turn?.quiz ||
        turn.quiz.submitted ||
        turn.quiz.selected === undefined
      )
        return state;
      const isCorrect = turn.quiz.selected === turn.quiz.answer;
      const evidence = turn.conceptIds
        .filter((id) => state.concepts.some((c) => c.id === id && !c.deleted))
        .map((id) => ({
          id: `${turn.id}:${id}`,
          turnId: turn.id,
          conceptId: id,
          correct: isCorrect,
          valid: true,
          time: Date.now(),
        }));
      const turns = refreshSummaries(
        state.turns.map((t) =>
          t.id === turn.id
            ? {
                ...t,
                quiz: { ...turn.quiz!, submitted: true },
                summaryVersion: t.summaryVersion + 1,
                summary: `${t.title}；完成一次演示诊断，作答${isCorrect ? "正确" : "有误"}。仅代表本次作答，不等于长期掌握。`,
              }
            : t,
        ),
        turn.parentId,
      );
      return synchronize({
        ...state,
        turns,
        evidence: [
          ...state.evidence,
          ...evidence.filter(
            (e) => !state.evidence.some((old) => old.id === e.id),
          ),
        ],
      });
    }
    case "flashcard":
      return {
        ...state,
        turns: state.turns.map((t) =>
          t.id === action.id && t.flashcard
            ? {
                ...t,
                flashcard: {
                  ...t.flashcard,
                  flipped: !t.flashcard.flipped,
                  ...(action.rating ? { rating: action.rating } : {}),
                },
              }
            : t,
        ),
      };
    case "projectCheck":
      return {
        ...state,
        turns: state.turns.map((t) =>
          t.id === action.id
            ? {
                ...t,
                projectChecks: (t.projectChecks ?? [false, false, false]).map(
                  (v, i) => (i === action.index ? !v : v),
                ),
              }
            : t,
        ),
      };
    case "removePath":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                pathIds: s.pathIds.filter((id) => id !== action.conceptId),
                exclusions: [
                  ...s.exclusions.filter(
                    (e) => e.conceptId !== action.conceptId,
                  ),
                  { conceptId: action.conceptId, reason: action.reason },
                ],
              }
            : s,
        ),
      };
    case "addPath":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId &&
          !s.pathIds.includes(action.conceptId) &&
          state.concepts.some((c) => c.id === action.conceptId && !c.deleted)
            ? {
                ...s,
                pathIds: [...s.pathIds, action.conceptId],
                exclusions: s.exclusions.filter(
                  (e) => e.conceptId !== action.conceptId,
                ),
              }
            : s,
        ),
      };
    case "reorderPath":
      return {
        ...state,
        sessions: state.sessions.map((s) => {
          if (
            s.id !== action.sessionId ||
            action.to < 0 ||
            action.to >= s.pathIds.length ||
            action.from < 0 ||
            action.from >= s.pathIds.length
          )
            return s;
          const pathIds = [...s.pathIds],
            [item] = pathIds.splice(action.from, 1);
          pathIds.splice(action.to, 0, item);
          return { ...s, pathIds };
        }),
      };
    case "deleteConcept":
      return {
        ...state,
        concepts: state.concepts.map((c) =>
          c.id === action.id ? { ...c, deleted: true } : c,
        ),
        relations: state.relations.filter(
          (e) => e.source !== action.id && e.target !== action.id,
        ),
        sessions: state.sessions.map((s) => ({
          ...s,
          pathIds: s.pathIds.filter((id) => id !== action.id),
        })),
      };
    case "addConcept":
      return {
        ...state,
        concepts: [...state.concepts, action.concept],
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? { ...s, pathIds: [...s.pathIds, action.concept.id] }
            : s,
        ),
      };
    case "setKBs":
      return {
        ...state,
        knowledgeBases: action.items,
        sessions: state.sessions.map((s) => ({
          ...s,
          kbIds: s.kbIds.filter((id) => action.items.some((k) => k.id === id)),
        })),
      };
    case "setAgents":
      return { ...state, agents: action.items };
    case "setSkills":
      return { ...state, skills: action.items };
    case "settings":
      return synchronize({
        ...state,
        settings: { ...state.settings, ...action.patch },
      });
  }
}
