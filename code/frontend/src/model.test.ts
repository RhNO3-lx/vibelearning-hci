import { describe, expect, it } from "vitest";
import { activeSession, ancestors, conceptScore, reducer } from "./model";
import { createSeed, createSession, demoTurn } from "./seed";
import { parseState } from "./storage";

describe("branch navigation and shared summaries", () => {
  it("creates a separate branch without replacing the mainline", () => {
    const s = createSeed(),
      parent = s.turns.find((t) => t.id === "t2")!,
      turn = demoTurn(parent, "再解释这个方向", "concept", ["eigen"], true);
    const next = reducer(s, { type: "addTurn", turn });
    expect(turn.branchId).not.toBe(parent.branchId);
    expect(activeSession(next).activeId).toBe(turn.id);
    expect(activeSession(next).mainLeafId).toBe("t3");
    expect(ancestors(next.turns, turn.id).map((t) => t.id)).toEqual([
      "t0",
      "t1",
      "t2",
      turn.id,
    ]);
  });
  it("rejects nodes whose parent belongs to a different session", () => {
    const s = createSeed(),
      turn = demoTurn(s.turns[0], "问题", "concept", [], true);
    turn.sessionId = "coding";
    expect(reducer(s, { type: "addTurn", turn })).toBe(s);
  });
  it("switches context without injecting the same summary revision twice", () => {
    let s = reducer(createSeed(), { type: "selectTurn", id: "t4" });
    const first = activeSession(s).contexts.geometry.updates.length;
    s = reducer(s, { type: "selectTurn", id: "t3" });
    s = reducer(s, { type: "selectTurn", id: "t4" });
    expect(activeSession(s).contexts.geometry.updates).toHaveLength(first);
  });
  it("receives a new summary revision after another branch changes", () => {
    let s = reducer(createSeed(), { type: "selectTurn", id: "t4" });
    const before = activeSession(s).contexts.geometry.seen.t0;
    const parent = s.turns.find((t) => t.id === "t3")!;
    s = reducer(s, {
      type: "addTurn",
      turn: demoTurn(parent, "主线新增解释", "concept", ["diagonal"]),
    });
    s = reducer(s, { type: "selectTurn", id: "t4" });
    expect(activeSession(s).contexts.geometry.seen.t0).toBeGreaterThan(before);
    const versions = activeSession(s).contexts.geometry.updates.filter(
      (u) => u.nodeId === "t0",
    );
    expect(versions.filter((u) => !u.superseded)).toHaveLength(1);
    expect(versions.at(-1)?.replacesVersion).toBe(before);
  });
  it("marks exactly one ancestor path as the mainline", () => {
    const next = reducer(createSeed(), { type: "mainline", id: "t4" });
    expect(
      ancestors(next.turns, activeSession(next).mainLeafId).map((t) => t.id),
    ).toEqual(["t0", "t1", "t2", "t4"]);
  });
  it("keeps focus on a newly selected session when an older reply completes", () => {
    let s = createSeed();
    const turn = demoTurn(s.turns[3], "延迟完成的回复", "concept", [
      "diagonal",
    ]);
    const created = createSession("另一个目标", "~/learning/other");
    s = reducer(s, { type: "newSession", ...created });
    s = reducer(s, { type: "addTurn", turn });
    expect(activeSession(s).id).toBe(created.session.id);
    expect(activeSession(s).activeId).toBe(created.root.id);
    expect(s.turns.some((t) => t.id === turn.id)).toBe(true);
  });
  it("removes a subtree, restores a valid cursor and revokes its evidence", () => {
    let s = reducer(createSeed(), { type: "quizChoice", id: "t3", index: 1 });
    s = reducer(s, { type: "quizSubmit", id: "t3" });
    expect(conceptScore(s, "diagonal")).toBe(100);
    s = reducer(s, { type: "deleteTurn", id: "t2" });
    expect(s.turns.some((t) => ["t2", "t3", "t4"].includes(t.id))).toBe(false);
    expect(activeSession(s).activeId).toBe("t1");
    expect(activeSession(s).mainLeafId).toBe("t1");
    expect(s.evidence.every((e) => !e.valid)).toBe(true);
    expect(conceptScore(s, "diagonal")).toBeNull();
    expect(
      Object.values(activeSession(s).contexts)
        .flatMap((c) => c.updates)
        .some((u) => u.retracted),
    ).toBe(true);
  });
  it("preserves the root and other sessions when deleting a branch", () => {
    const seed = createSeed();
    expect(reducer(seed, { type: "deleteTurn", id: "t0" })).toBe(seed);
    const next = reducer(seed, { type: "deleteTurn", id: "t2" });
    expect(next.turns.some((t) => t.id === "c0")).toBe(true);
  });
});

describe("assessment and route invariants", () => {
  it("does not record an unanswered or repeatedly submitted quiz", () => {
    let s = createSeed();
    s = reducer(s, { type: "quizSubmit", id: "t3" });
    expect(s.evidence).toHaveLength(0);
    s = reducer(s, { type: "quizChoice", id: "t3", index: 1 });
    s = reducer(s, { type: "quizSubmit", id: "t3" });
    const length = s.evidence.length;
    s = reducer(s, { type: "quizSubmit", id: "t3" });
    expect(s.evidence).toHaveLength(length);
    expect(s.turns.find((t) => t.id === "t3")?.summaryVersion).toBeGreaterThan(
      1,
    );
    s = reducer(s, { type: "quizChoice", id: "t3", index: 0 });
    expect(s.turns.find((t) => t.id === "t3")?.quiz?.selected).toBe(1);
  });
  it("flashcard self-rating does not grant mastery evidence", () => {
    let s = createSeed(),
      turn = demoTurn(s.turns[3], "回顾", "flashcard", ["diagonal"], true);
    s = reducer(s, { type: "addTurn", turn });
    s = reducer(s, { type: "flashcard", id: turn.id, rating: "known" });
    expect(s.evidence).toHaveLength(0);
    expect(conceptScore(s, "diagonal")).toBeNull();
  });
  it("does not invent a diagnostic quiz for a custom unknown module", () => {
    const turn = demoTurn(
      createSeed().turns[3],
      "测试新模块",
      "quiz",
      ["unknown"],
      true,
    );
    expect(turn.quiz).toBeUndefined();
  });
  it("removes a module only from the specified route and stores the reason", () => {
    const next = reducer(createSeed(), {
      type: "removePath",
      sessionId: "linear",
      conceptId: "vectors",
      reason: "已学过",
    });
    expect(activeSession(next).pathIds).not.toContain("vectors");
    expect(activeSession(next).exclusions).toContainEqual({
      conceptId: "vectors",
      reason: "已学过",
    });
    expect(next.concepts.find((c) => c.id === "vectors")?.deleted).not.toBe(
      true,
    );
  });
  it("reorders routes, ignores invalid moves and avoids duplicate modules", () => {
    let s = createSeed();
    s = reducer(s, {
      type: "reorderPath",
      sessionId: "linear",
      from: 0,
      to: 2,
    });
    expect(activeSession(s).pathIds).toEqual([
      "transform",
      "eigen",
      "vectors",
      "diagonal",
    ]);
    const before = s;
    expect(
      reducer(s, { type: "reorderPath", sessionId: "linear", from: 0, to: -1 })
        .sessions,
    ).toEqual(before.sessions);
    s = reducer(s, {
      type: "addPath",
      sessionId: "linear",
      conceptId: "vectors",
    });
    expect(
      activeSession(s).pathIds.filter((id) => id === "vectors"),
    ).toHaveLength(1);
  });
  it("global deletion removes route edges but keeps historical evidence", () => {
    let s = reducer(createSeed(), { type: "quizChoice", id: "t3", index: 1 });
    s = reducer(s, { type: "quizSubmit", id: "t3" });
    const evidence = [...s.evidence];
    s = reducer(s, { type: "deleteConcept", id: "diagonal" });
    expect(s.sessions.every((n) => !n.pathIds.includes("diagonal"))).toBe(true);
    expect(
      s.relations.some(
        (r) => r.source === "diagonal" || r.target === "diagonal",
      ),
    ).toBe(false);
    expect(s.evidence).toEqual(evidence);
    expect(s.turns.find((t) => t.id === "t3")?.conceptIds).toContain(
      "diagonal",
    );
  });
  it("new sessions preserve the global graph without inventing a learning path", () => {
    const s = createSeed(),
      created = createSession("学习反例构造", "~/learning/proof");
    const next = reducer(s, { type: "newSession", ...created });
    expect(activeSession(next).goal).toBe("学习反例构造");
    expect(activeSession(next).pathIds).toEqual([]);
    expect(next.concepts).toEqual(s.concepts);
  });
});

describe("local persistence", () => {
  it("accepts valid persisted state and rejects malformed data", () => {
    const s = createSeed();
    expect(parseState(JSON.stringify(s))).toEqual(s);
    expect(parseState("{bad")).toBeNull();
    expect(parseState("{}")).toBeNull();
    expect(parseState(JSON.stringify({ ...s, sessions: [] }))).toBeNull();
    expect(
      parseState(JSON.stringify({ ...s, activeSessionId: "missing" })),
    ).toBeNull();
  });
  it("rejects cross-session parent links and broken context records", () => {
    const s = createSeed();
    s.turns[3].parentId = "c0";
    expect(parseState(JSON.stringify(s))).toBeNull();
    const broken = createSeed();
    broken.sessions[0].contexts.main = { seen: {}, updates: undefined! };
    expect(parseState(JSON.stringify(broken))).toBeNull();
  });
  it("rejects parent cycles and duplicate node identifiers", () => {
    const s = createSeed();
    s.turns[1].parentId = "t2";
    expect(parseState(JSON.stringify(s))).toBeNull();
    const duplicate = createSeed();
    duplicate.turns.push({ ...duplicate.turns[0] });
    expect(parseState(JSON.stringify(duplicate))).toBeNull();
  });
  it("has no credentials or browser blob URLs in persisted state", () => {
    const serialized = JSON.stringify(createSeed());
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("blob:");
  });
});

describe("revised configuration and legacy migration", () => {
  it("changes defaults without changing existing workspaces", () => {
    const seed = createSeed();
    const next = reducer(seed, {
      type: "settings",
      patch: { defaultWorkspace: "~/new-default" },
    });
    expect(next.sessions).toEqual(seed.sessions);
    const created = createSession("新的学习", next.settings.defaultWorkspace);
    expect(created.session.workspace).toBe("~/new-default");
    expect(seed.settings.defaultWorkspace).toBe("~/learning");
  });
  it("renames and sets the clicked inactive session without moving the current cursor", () => {
    const seed = createSeed();
    const next = reducer(seed, {
      type: "sessionConfig",
      id: "coding",
      patch: { title: "新的会话名称", workspace: "~/coding-only" },
    });
    expect(activeSession(next)).toEqual(activeSession(seed));
    expect(next.sessions.find((s) => s.id === "coding")?.workspace).toBe(
      "~/coding-only",
    );
    expect(next.sessions.find((s) => s.id === "coding")?.title).toBe(
      "新的会话名称",
    );
    expect(next.settings.defaultWorkspace).toBe(seed.settings.defaultWorkspace);
  });
  it("migrates disabled legacy toggles and relation metadata while retaining conversations", () => {
    const seed = createSeed();
    const { defaultWorkspace: _oldDefault, ...oldSettings } = seed.settings;
    const legacy = {
      ...seed,
      settings: { ...oldSettings, showMath: false, autoSummary: false },
      relations: [
        {
          ...seed.relations[0],
          type: "prerequisite",
          confidence: 80,
          help: "旧属性",
          sourceNote: "旧来源",
        },
        {
          id: "old-help",
          source: "vectors",
          target: "diagonal",
          type: "helpful",
        },
      ],
    };
    const restored = parseState(JSON.stringify(legacy))!;
    expect(restored.sessions).toEqual(seed.sessions);
    expect(restored.turns).toEqual(seed.turns);
    expect(restored.relations).toEqual([seed.relations[0]]);
    expect(restored.settings).toEqual(seed.settings);
    const switched = reducer(restored, { type: "selectTurn", id: "t4" });
    expect(
      activeSession(switched).contexts.geometry.updates.length,
    ).toBeGreaterThan(0);
  });
  it("retains the new default and rejects dangling or self prerequisites on restore", () => {
    const seed = createSeed();
    seed.settings.defaultWorkspace = "~/custom-default";
    seed.relations.push(
      {
        id: "dangling",
        source: "missing",
        target: "eigen",
        type: "recommended",
      },
      { id: "self", source: "eigen", target: "eigen", type: "recommended" },
    );
    const restored = parseState(JSON.stringify(seed))!;
    expect(restored.settings.defaultWorkspace).toBe("~/custom-default");
    expect(restored.relations).toHaveLength(3);
    expect(
      restored.concepts.every((c) => typeof c.difficulty === "string"),
    ).toBe(true);
  });
});

describe("recommended order and leaf mainline", () => {
  it("preserves direction when upgrading prerequisite edges", () => {
    const seed = createSeed();
    const legacy = {
      ...seed,
      relations: seed.relations.map((r) => ({ ...r, type: "prerequisite" })),
    };
    expect(parseState(JSON.stringify(legacy))?.relations).toEqual(
      seed.relations,
    );
  });
  it("lets learners add, reverse and remove recommendations without changing evidence or routes", () => {
    const seed = createSeed();
    let state = reducer(seed, {
      type: "addRecommendation",
      source: "testing",
      target: "eigen",
    });
    const relation = state.relations.at(-1)!;
    expect(state.relations).toHaveLength(seed.relations.length + 1);
    state = reducer(state, { type: "reverseRecommendation", id: relation.id });
    expect(state.relations.at(-1)).toMatchObject({
      source: "eigen",
      target: "testing",
    });
    state = reducer(state, { type: "removeRecommendation", id: relation.id });
    expect(state.relations).toEqual(seed.relations);
    expect(state.sessions).toEqual(seed.sessions);
    expect(state.evidence).toEqual(seed.evidence);
  });
  it("ignores self, duplicate and missing-node recommendations", () => {
    const seed = createSeed();
    for (const [source, target] of [
      ["eigen", "eigen"],
      ["missing", "testing"],
      ["vectors", "transform"],
    ]) {
      expect(reducer(seed, { type: "addRecommendation", source, target })).toBe(
        seed,
      );
    }
  });
  it("only accepts a leaf as the mainline endpoint", () => {
    const seed = createSeed();
    expect(reducer(seed, { type: "mainline", id: "t2" })).toBe(seed);
    expect(
      activeSession(reducer(seed, { type: "mainline", id: "t4" })).mainLeafId,
    ).toBe("t4");
    const next = reducer(seed, {
      type: "addTurn",
      turn: demoTurn(
        seed.turns.find((t) => t.id === "t3")!,
        "继续",
        "concept",
        ["diagonal"],
        true,
      ),
    });
    expect(
      next.turns.some((t) => t.parentId === activeSession(next).mainLeafId),
    ).toBe(false);
  });
});
