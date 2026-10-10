export type MapWindowKind = "tree" | "knowledge" | "both";
export type MapView = {
  selectedConcept: string | null;
  selectionOrigin: "tree" | "knowledge";
  relationMode: "prerequisite" | "recommended" | "both";
};
export function mapWindowKind(value: string | null): MapWindowKind {
  return value === "tree" || value === "knowledge" ? value : "both";
}
export function coversGraph(
  opened: MapWindowKind[],
  graph: "tree" | "knowledge",
) {
  return opened.includes("both") || opened.includes(graph);
}
export function conflictingWindows(
  opened: MapWindowKind[],
  next: MapWindowKind,
) {
  return opened.filter(
    (kind) => kind !== next && (next === "both" || kind === "both"),
  );
}
