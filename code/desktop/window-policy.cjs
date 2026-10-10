function inDockZone(parent, child) {
  const overlap =
    Math.min(parent.y + parent.height, child.y + child.height) -
    Math.max(parent.y, child.y);
  return (
    overlap >= 100 &&
    Math.abs(child.x + child.width - parent.x - parent.width) <= 36
  );
}
function validChannel(value) {
  return (
    typeof value === "string" &&
    /^vibelearning-map-[a-zA-Z0-9-]{1,100}$/.test(value)
  );
}
function validKind(kind) {
  return ["tree", "knowledge", "both"].includes(kind);
}
function conflicts(opened, next) {
  return opened.filter(
    (kind) => kind !== next && (next === "both" || kind === "both"),
  );
}
module.exports = { inDockZone, validChannel, validKind, conflicts };
