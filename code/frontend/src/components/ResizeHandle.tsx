import { useRef } from "react";

export function ResizeHandle({
  orientation,
  label,
  value,
  onDelta,
  onReset,
  minimum = 0,
  maximum = 100,
}: {
  orientation: "vertical" | "horizontal";
  label: string;
  value: number;
  minimum?: number;
  maximum?: number;
  onDelta: (pixels: number) => void;
  onReset: () => void;
}) {
  const previous = useRef<number | null>(null);
  const vertical = orientation === "vertical";
  return (
    <div
      className={`resize-handle ${orientation}`}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={Math.round(Math.max(minimum, Math.min(maximum, value)))}
      aria-valuemin={minimum}
      aria-valuemax={Math.round(maximum)}
      tabIndex={0}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        previous.current = vertical ? e.clientX : e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (previous.current === null) return;
        const next = vertical ? e.clientX : e.clientY;
        onDelta(next - previous.current);
        previous.current = next;
      }}
      onPointerUp={(e) => {
        previous.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        previous.current = null;
      }}
      onLostPointerCapture={() => {
        previous.current = null;
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const minus = vertical ? "ArrowLeft" : "ArrowUp";
        const plus = vertical ? "ArrowRight" : "ArrowDown";
        if (e.key === minus || e.key === plus) {
          e.preventDefault();
          onDelta(e.key === minus ? -24 : 24);
        }
        if (e.key === "Home") {
          e.preventDefault();
          onReset();
        }
      }}
    >
      <span />
    </div>
  );
}
