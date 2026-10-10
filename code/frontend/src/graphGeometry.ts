export type NodeRect = { x: number; y: number; width: number; height: number };

/** Clip a center-to-center segment against both rectangular node boundaries. */
export function boundarySegment(source: NodeRect, target: NodeRect) {
  if ([source, target].some((r) => r.width <= 0 || r.height <= 0)) return null;
  const sx = source.x + source.width / 2,
    sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2,
    ty = target.y + target.height / 2;
  const dx = tx - sx,
    dy = ty - sy;
  if (dx === 0 && dy === 0) return null;
  const exit = (r: NodeRect) =>
    Math.min(
      dx === 0 ? Infinity : r.width / (2 * Math.abs(dx)),
      dy === 0 ? Infinity : r.height / (2 * Math.abs(dy)),
    );
  const a = exit(source),
    b = exit(target);
  // Overlapping/touching boxes have no visible exterior segment.
  if (a + b >= 1) return null;
  return { x1: sx + dx * a, y1: sy + dy * a, x2: tx - dx * b, y2: ty - dy * b };
}

export function eventTitleLines(title: string): string[] {
  const chars = [...title.replace(/\s+/g, "")];
  const short = chars.length > 12 ? [...chars.slice(0, 11), "…"] : chars;
  return [short.slice(0, 6).join(""), short.slice(6, 12).join("")].filter(
    Boolean,
  );
}
