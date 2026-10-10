const fs = require("node:fs");
const path = require("node:path");
fs.rmSync(path.join(__dirname, "ui"), { recursive: true, force: true });
fs.cpSync(
  path.join(__dirname, "../frontend/dist"),
  path.join(__dirname, "ui"),
  { recursive: true },
);
