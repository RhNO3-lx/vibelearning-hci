import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";
import { reducer } from "./model";
import { parseState } from "./storage";
import {
  repairRecommendations,
  sessionConceptIds,
  sessionRelations,
  weakComponents,
  canRemoveRelation,
} from "./sessionGraph";
const connected = (state: ReturnType<typeof createSeed>, id = "linear") =>
  weakComponents(
    sessionConceptIds(state, id),
    sessionRelations(state, id).filter((r) => r.type === "recommended"),
  ).length <= 1;
describe("session recommendation connectivity and prerequisites", () => {
  it("shows only the session modules, with independent prerequisite and recommendation edges", () => {
    const state = createSeed();
    expect(sessionConceptIds(state, "linear")).not.toContain("testing");
    expect(sessionConceptIds(state, "coding")).toEqual(["testing"]);
    expect(
      sessionRelations(state, "linear").filter(
        (r) => r.type === "prerequisite",
      ),
    ).toHaveLength(3);
    expect(
      sessionRelations(state, "linear").filter((r) => r.type === "recommended"),
    ).toHaveLength(3);
    expect(connected(state)).toBe(true);
  });
  it("does not count prerequisites as recommendation connectivity, and adds minimum bridges", () => {
    const state = createSeed();
    const repaired = repairRecommendations({
      ...state,
      relations: state.relations.filter((r) => r.type === "prerequisite"),
    });
    expect(connected(repaired)).toBe(true);
    expect(
      repaired.relations.filter((r) => r.type === "recommended"),
    ).toHaveLength(3);
    expect(repaired.relations.filter((r) => r.type === "prerequisite")).toEqual(
      state.relations.filter((r) => r.type === "prerequisite"),
    );
    expect(repairRecommendations(repaired)).toBe(repaired);
  });
  it("repairs a new module and a deleted bridge module without inventing prerequisites", () => {
    const seed = createSeed();
    let state = reducer(seed, {
      type: "addConcept",
      sessionId: "linear",
      concept: { ...seed.concepts[0], id: "new-module", name: "新模块" },
    });
    expect(connected(state)).toBe(true);
    expect(
      state.relations.some(
        (r) =>
          r.type === "prerequisite" &&
          [r.source, r.target].includes("new-module"),
      ),
    ).toBe(false);
    state = reducer(state, { type: "deleteConcept", id: "eigen" });
    expect(connected(state)).toBe(true);
    expect(
      state.relations.some((r) => r.source === "eigen" || r.target === "eigen"),
    ).toBe(false);
  });
  it("protects recommendation bridges until learners supply an alternate connection", () => {
    const seed = createSeed(),
      edge = seed.relations.find(
        (r) => r.type === "recommended" && r.source === "vectors",
      )!;
    expect(canRemoveRelation(seed, edge.id)).toBe(false);
    expect(reducer(seed, { type: "removeRecommendation", id: edge.id })).toBe(
      seed,
    );
    let state = reducer(seed, {
      type: "addRecommendation",
      source: "vectors",
      target: "eigen",
    });
    expect(canRemoveRelation(state, edge.id)).toBe(true);
    state = reducer(state, { type: "removeRecommendation", id: edge.id });
    expect(state.relations.some((r) => r.id === edge.id)).toBe(false);
    expect(connected(state)).toBe(true);
  });
  it("rejects prerequisite cycles while allowing flexible recommendation directions", () => {
    const seed = createSeed();
    expect(
      reducer(seed, {
        type: "addPrerequisite",
        source: "diagonal",
        target: "vectors",
      }),
    ).toBe(seed);
    const state = reducer(seed, {
      type: "addRecommendation",
      source: "diagonal",
      target: "vectors",
    });
    expect(state.relations.length).toBe(seed.relations.length + 1);
    expect(connected(state)).toBe(true);
  });
  it("migrates a legacy global recommendation, preserving its direction and fixing its gaps", () => {
    const seed = createSeed(),
      legacy = {
        ...seed,
        graphVersion: undefined,
        relations: [
          {
            id: "legacy",
            source: "eigen",
            target: "diagonal",
            type: "recommended",
          },
        ],
      };
    const restored = parseState(JSON.stringify(legacy))!;
    expect(restored.relations).toContainEqual({
      id: "legacy@linear",
      source: "eigen",
      target: "diagonal",
      type: "recommended",
      sessionId: "linear",
    });
    expect(restored.relations.some((r) => r.type === "prerequisite")).toBe(
      true,
    );
    expect(connected(restored)).toBe(true);
    expect(restored.sessions).toEqual(seed.sessions);
    expect(restored.turns).toEqual(seed.turns);
  });
  it("keeps another session connected independently even when modules overlap", () => {
    const seed = createSeed();
    const state = repairRecommendations({
      ...seed,
      sessions: seed.sessions.map((s) =>
        s.id === "coding" ? { ...s, pathIds: ["eigen", "testing"] } : s,
      ),
    });
    expect(connected(state, "coding")).toBe(true);
    expect(
      sessionRelations(state, "linear").filter((r) => r.type === "recommended"),
    ).toEqual(seed.relations.filter((r) => r.type === "recommended"));
    expect(
      sessionRelations(state, "coding")
        .filter((r) => r.type === "recommended")
        .every((r) => r.sessionId === "coding"),
    ).toBe(true);
  });
});
