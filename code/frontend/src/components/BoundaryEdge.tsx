import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { boundarySegment } from "../graphGeometry";

export function BoundaryEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const a = useInternalNode(source),
    b = useInternalNode(target);
  if (!a || !b) return null;
  const rect = (node: typeof a) => ({
    ...node.internals.positionAbsolute,
    width: node.measured.width ?? 0,
    height: node.measured.height ?? 0,
  });
  const line = boundarySegment(rect(a), rect(b));
  if (!line) return null;
  return (
    <>
      <BaseEdge
        id={id}
        path={`M ${line.x1},${line.y1} L ${line.x2},${line.y2}`}
        markerEnd={markerEnd}
        style={style}
      />
      {label && (
        <EdgeLabelRenderer>
          <span
            className="boundary-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${(line.x1 + line.x2) / 2}px, ${(line.y1 + line.y2) / 2}px)`,
            }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
