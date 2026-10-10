import type { AppState } from "./model";
import { createSeed } from "./seed";
export const STORAGE_KEY = "vibelearning.frontend.v1";

export function parseState(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as AppState;
    if (
      s.version !== 1 ||
      !Array.isArray(s.sessions) ||
      !s.sessions.length ||
      !Array.isArray(s.turns) ||
      !s.turns.length
    )
      return null;
    const arrays: (keyof AppState)[] = [
      "concepts",
      "relations",
      "evidence",
      "knowledgeBases",
      "agents",
      "skills",
    ];
    if (arrays.some((key) => !Array.isArray(s[key]))) return null;
    if (
      !s.settings ||
      typeof s.settings.contextLimit !== "number" ||
      s.settings.contextLimit < 1000
    )
      return null;
    if (
      !s.sessions.every(
        (n) =>
          typeof n.id === "string" &&
          typeof n.workspace === "string" &&
          typeof n.goal === "string" &&
          typeof n.title === "string" &&
          Array.isArray(n.pathIds) &&
          Array.isArray(n.exclusions) &&
          Array.isArray(n.kbIds) &&
          Array.isArray(n.skillIds) &&
          n.contexts &&
          typeof n.contexts === "object" &&
          s.turns.some((t) => t.id === n.activeId && t.sessionId === n.id) &&
          s.turns.some(
            (t) =>
              t.id === n.rootId && t.parentId === null && t.sessionId === n.id,
          ),
      )
    )
      return null;
    if (
      !s.sessions.every((n) =>
        Object.values(n.contexts).every(
          (c) =>
            c &&
            typeof c.seen === "object" &&
            c.seen !== null &&
            Array.isArray(c.updates) &&
            c.updates.every(
              (u) => typeof u.id === "string" && typeof u.text === "string",
            ),
        ),
      )
    )
      return null;
    if (
      !s.turns.every(
        (t) =>
          typeof t.id === "string" &&
          typeof t.user === "string" &&
          typeof t.assistant === "string" &&
          typeof t.summary === "string" &&
          typeof t.summaryVersion === "number" &&
          typeof t.branchId === "string" &&
          Array.isArray(t.conceptIds) &&
          Array.isArray(t.attachments) &&
          ["concept", "quiz", "project", "flashcard"].includes(t.activity) &&
          s.sessions.some((n) => n.id === t.sessionId) &&
          (t.parentId === null ||
            s.turns.some(
              (p) => p.id === t.parentId && p.sessionId === t.sessionId,
            )),
      )
    )
      return null;
    if (
      !s.concepts.every(
        (c) =>
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          Array.isArray(c.topics),
      )
    )
      return null;
    if (
      !s.knowledgeBases.every(
        (k) =>
          typeof k.id === "string" &&
          typeof k.name === "string" &&
          Array.isArray(k.files),
      )
    )
      return null;
    if (
      !s.agents.every(
        (a) => typeof a.id === "string" && typeof a.name === "string",
      ) ||
      !s.skills.every(
        (a) => typeof a.id === "string" && typeof a.name === "string",
      )
    )
      return null;
    if (!s.sessions.some((n) => n.id === s.activeSessionId)) return null;
    if (
      new Set(s.turns.map((t) => t.id)).size !== s.turns.length ||
      new Set(s.sessions.map((n) => n.id)).size !== s.sessions.length
    )
      return null;
    for (const turn of s.turns) {
      const visited = new Set<string>();
      let node = turn;
      while (node.parentId) {
        if (visited.has(node.id)) return null;
        visited.add(node.id);
        node = s.turns.find((t) => t.id === node.parentId)!;
      }
      if (s.sessions.find((n) => n.id === turn.sessionId)?.rootId !== node.id)
        return null;
    }
    // Upgrade earlier v1 records without replacing sessions, turns or summaries.
    s.settings = {
      model: typeof s.settings.model === "string" ? s.settings.model : "",
      endpoint:
        typeof s.settings.endpoint === "string" ? s.settings.endpoint : "",
      contextLimit: s.settings.contextLimit,
      reduceMotion: Boolean(s.settings.reduceMotion),
      defaultWorkspace:
        typeof s.settings.defaultWorkspace === "string"
          ? s.settings.defaultWorkspace
          : "~/learning",
    };
    s.relations = s.relations
      .filter(
        (r) =>
          r &&
          r.type === "prerequisite" &&
          typeof r.id === "string" &&
          s.concepts.some((c) => c.id === r.source && !c.deleted) &&
          s.concepts.some((c) => c.id === r.target && !c.deleted) &&
          r.source !== r.target,
      )
      .map((r) => ({
        id: r.id,
        source: r.source,
        target: r.target,
        type: "prerequisite",
      }));
    return s;
  } catch {
    return null;
  }
}
export function loadState(): AppState {
  try {
    return parseState(localStorage.getItem(STORAGE_KEY)) ?? createSeed();
  } catch {
    return createSeed();
  }
}
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
