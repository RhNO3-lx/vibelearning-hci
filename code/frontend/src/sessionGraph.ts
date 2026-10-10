import type { AppState, Relation } from "./model";

export function sessionConceptIds(
  state: AppState,
  sessionId: string,
): string[] {
  const session = state.sessions.find((s) => s.id === sessionId);
  const candidates = [
    ...(session?.pathIds ?? []),
    ...state.turns
      .filter((t) => t.sessionId === sessionId)
      .flatMap((t) => t.conceptIds),
  ];
  return [...new Set(candidates)].filter((id) =>
    state.concepts.some((c) => c.id === id && !c.deleted),
  );
}
export function weakComponents(
  ids: string[],
  edges: Pick<Relation, "source" | "target">[],
): string[][] {
  const unseen = new Set(ids),
    components: string[][] = [];
  while (unseen.size) {
    const queue = [unseen.values().next().value!],
      group: string[] = [];
    unseen.delete(queue[0]);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      group.push(id);
      for (const edge of edges) {
        const neighbor =
          edge.source === id
            ? edge.target
            : edge.target === id
              ? edge.source
              : null;
        if (neighbor !== null && unseen.delete(neighbor)) queue.push(neighbor);
      }
    }
    components.push(group);
  }
  return components;
}
export function sessionRelations(state: AppState, sessionId: string) {
  const ids = new Set(sessionConceptIds(state, sessionId));
  return state.relations.filter(
    (r) =>
      ids.has(r.source) &&
      ids.has(r.target) &&
      (r.type === "prerequisite" || r.sessionId === sessionId),
  );
}
/** Preserve recommendations and bridge only disconnected components, in route order. */
export function repairRecommendations(state: AppState): AppState {
  const relations: Relation[] = state.relations.filter(
    (r) =>
      r.type === "prerequisite" ||
      (r.sessionId &&
        state.sessions.some(
          (s) =>
            s.id === r.sessionId &&
            sessionConceptIds(state, s.id).includes(r.source) &&
            sessionConceptIds(state, s.id).includes(r.target),
        )),
  );
  for (const session of state.sessions) {
    const ids = sessionConceptIds(state, session.id);
    for (const legacy of state.relations.filter(
      (r) => r.type === "recommended" && !r.sessionId,
    )) {
      if (
        ids.includes(legacy.source) &&
        ids.includes(legacy.target) &&
        !relations.some(
          (r) =>
            r.type === "recommended" &&
            r.sessionId === session.id &&
            r.source === legacy.source &&
            r.target === legacy.target,
        )
      )
        relations.push({
          ...legacy,
          id: `${legacy.id}@${session.id}`,
          sessionId: session.id,
        });
    }
    let groups = weakComponents(
      ids,
      relations.filter(
        (r) => r.type === "recommended" && r.sessionId === session.id,
      ),
    );
    for (let i = 1; i < ids.length && groups.length > 1; i++) {
      if (groups.some((g) => g.includes(ids[i - 1]) && g.includes(ids[i])))
        continue;
      let id = `route:${encodeURIComponent(session.id)}:${encodeURIComponent(ids[i - 1])}:${encodeURIComponent(ids[i])}`;
      while (relations.some((r) => r.id === id)) id += ":next";
      relations.push({
        id,
        source: ids[i - 1],
        target: ids[i],
        type: "recommended",
        sessionId: session.id,
      });
      groups = weakComponents(
        ids,
        relations.filter(
          (r) => r.type === "recommended" && r.sessionId === session.id,
        ),
      );
    }
  }
  const same =
    relations.length === state.relations.length &&
    relations.every((r, i) => r === state.relations[i]);
  return same ? state : { ...state, relations };
}
export function canRemoveRelation(state: AppState, id: string) {
  const edge = state.relations.find((r) => r.id === id);
  if (!edge || edge.type === "prerequisite" || !edge.sessionId) return true;
  const remaining = state.relations.filter(
    (r) =>
      r.id !== id && r.type === "recommended" && r.sessionId === edge.sessionId,
  );
  return (
    weakComponents(sessionConceptIds(state, edge.sessionId), remaining)
      .length <= 1
  );
}
export function createsPrerequisiteCycle(
  relations: Relation[],
  source: string,
  target: string,
  ignoreId?: string,
): boolean {
  const seen = new Set<string>(),
    queue = [target];
  for (let i = 0; i < queue.length; i++) {
    if (queue[i] === source) return true;
    if (seen.has(queue[i])) continue;
    seen.add(queue[i]);
    for (const r of relations)
      if (
        r.type === "prerequisite" &&
        r.id !== ignoreId &&
        r.source === queue[i]
      )
        queue.push(r.target);
  }
  return false;
}
