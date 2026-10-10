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
module.exports = { inDockZone, validChannel };
