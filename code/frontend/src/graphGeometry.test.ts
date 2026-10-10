import { describe, expect, it } from "vitest";
import {
  boundarySegment,
  eventTitleLines,
  type NodeRect,
} from "./graphGeometry";

describe("center-aligned rectangle boundary connections", () => {
  const source = { x: 0, y: 0, width: 100, height: 60 };
  it.each([
    { x: 240, y: 0, width: 80, height: 60 },
    { x: -240, y: 0, width: 80, height: 60 },
    { x: 0, y: 200, width: 100, height: 100 },
    { x: 0, y: -200, width: 100, height: 100 },
    { x: 220, y: 170, width: 150, height: 80 },
    { x: -200, y: -170, width: 120, height: 90 },
  ])("stays collinear and terminates at each boundary: %j", (target) => {
    const line = boundarySegment(source, target)!;
    const onBoundary = (x: number, y: number, r: NodeRect) =>
      Math.abs(
        Math.max(
          Math.abs(x - r.x - r.width / 2) / (r.width / 2),
          Math.abs(y - r.y - r.height / 2) / (r.height / 2),
        ) - 1,
      ) < 1e-9;
    expect(onBoundary(line.x1, line.y1, source)).toBe(true);
    expect(onBoundary(line.x2, line.y2, target)).toBe(true);
    const dx = target.x + target.width / 2 - source.width / 2;
    const dy = target.y + target.height / 2 - source.height / 2;
    expect((line.x2 - line.x1) * dy - (line.y2 - line.y1) * dx).toBeCloseTo(0);
  });
  it("omits segments for overlapping, touching or unmeasured boxes", () => {
    expect(boundarySegment(source, source)).toBeNull();
    expect(boundarySegment(source, { ...source, x: 100 })).toBeNull();
    expect(boundarySegment(source, { ...source, x: 10 })).toBeNull();
    expect(boundarySegment(source, { ...source, width: 0 })).toBeNull();
  });
});

it("limits event summaries to six characters per line and two lines", () => {
  expect(eventTitleLines("理解线性变换")).toEqual(["理解线性变换"]);
  expect(eventTitleLines("为什么需要线性无关的特征向量")).toEqual([
    "为什么需要线",
    "性无关的特…",
  ]);
  expect(eventTitleLines("🧪集中检测")).toEqual(["🧪集中检测"]);
});
