const { test } = require("node:test");
const assert = require("node:assert/strict");
const { inDockZone, validChannel } = require("./window-policy.cjs");
test("docks only at the parent right edge with sufficient vertical overlap", () => {
  const parent = { x: 100, y: 100, width: 1000, height: 700 };
  assert.equal(
    inDockZone(parent, { x: 460, y: 150, width: 640, height: 500 }),
    true,
  );
  assert.equal(
    inDockZone(parent, { x: 100, y: 150, width: 640, height: 500 }),
    false,
  );
  assert.equal(
    inDockZone(parent, { x: 460, y: 790, width: 640, height: 500 }),
    false,
  );
});
test("accepts only bounded private map channel identifiers", () => {
  assert.equal(validChannel("vibelearning-map-a1b2-1234"), true);
  for (const value of [
    null,
    {},
    "",
    "https://example.com",
    "vibelearning-map-../file",
    "vibelearning-map-" + "x".repeat(101),
  ])
    assert.equal(validChannel(value), false);
});
