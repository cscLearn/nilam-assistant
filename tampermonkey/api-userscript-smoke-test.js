const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("tampermonkey/nilam-api.user.js", "utf8");

assert.ok(source.includes('const SCRIPT_VERSION = "0.6.1";'));
assert.ok(source.includes("state.authHeader = authHeader;"));
assert.ok(source.includes("if (!state.apiTemplate?.bodyText)"));
assert.ok(!source.includes("Auto-constructed apiTemplate"));
console.log("API userscript smoke test passed");
