import { describe, expect, it } from "vitest";
import { conflictingWindows, coversGraph, mapWindowKind } from "./mapWindows";
import { createSeed } from "./seed";
import { parseState } from "./storage";
import { reducer } from "./model";

describe("independent map windows and tracking preferences", () => {
  it("allows both single graphs concurrently and replaces them only for a combined window", () => {
    expect(conflictingWindows(["tree"], "knowledge")).toEqual([]);
    expect(conflictingWindows(["tree", "knowledge"], "tree")).toEqual([]);
    expect(conflictingWindows(["tree", "knowledge"], "both")).toEqual([
      "tree",
      "knowledge",
    ]);
    expect(conflictingWindows(["both"], "tree")).toEqual(["both"]);
    expect(coversGraph(["tree"], "knowledge")).toBe(false);
    expect(coversGraph(["both"], "knowledge")).toBe(true);
  });
  it("defaults old map URLs to combined and supports explicit single graph URLs", () => {
    expect(mapWindowKind(null)).toBe("both");
    expect(mapWindowKind("tree")).toBe("tree");
    expect(mapWindowKind("knowledge")).toBe("knowledge");
    expect(mapWindowKind("unknown")).toBe("both");
  });
  it("defaults legacy data to tracking on and preserves an explicitly disabled preference", () => {
    const seed = createSeed();
    const legacy = {
      ...seed,
      settings: { ...seed.settings, trackView: undefined },
    };
    expect(parseState(JSON.stringify(legacy))!.settings.trackView).toBe(true);
    const disabled = reducer(seed, {
      type: "settings",
      patch: { trackView: false },
    });
    expect(parseState(JSON.stringify(disabled))!.settings.trackView).toBe(
      false,
    );
    expect(disabled.turns).toBe(seed.turns);
    expect(disabled.relations).toBe(seed.relations);
  });
});
