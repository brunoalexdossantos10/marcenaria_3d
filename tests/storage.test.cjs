const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return originalResolve.call(
    this,
    name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name,
    ...args,
  );
};
require.extensions[".ts"] = (module, file) => {
  if (file.endsWith("/lib/supabase.ts")) {
    module._compile("exports.supabase = null;", file);
    return;
  }
  module._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
};
const {
  loadProjects,
  persistProject,
  setLocalProjectOwner,
  BASE_CONFIG,
  nextProjectCode,
} = require("../src/lib/furniture/store.ts");
const values = new Map();
global.window = {
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  },
};

test("local projects stay isolated across two accounts and guest mode", async () => {
  const project = {
    id: "local-a",
    code: nextProjectCode(),
    createdAt: new Date().toISOString(),
    config: BASE_CONFIG,
    price: 123,
    status: "Rascunho",
  };
  setLocalProjectOwner("user-a");
  await persistProject(project);
  assert.equal(loadProjects().length, 1);
  setLocalProjectOwner("user-b");
  assert.equal(loadProjects().length, 0);
  setLocalProjectOwner(null);
  assert.equal(loadProjects().length, 0);
  setLocalProjectOwner("user-a");
  assert.equal(loadProjects()[0].id, project.id);
});
test("corrupted storage does not crash the project picker", () => {
  setLocalProjectOwner("corrupt");
  values.set("marcenaria.projects:corrupt", "{}");
  assert.deepEqual(loadProjects(), []);
  values.set("marcenaria.projects:corrupt", "null");
  assert.deepEqual(loadProjects(), []);
  values.set("marcenaria.projects:corrupt", "[null,{}]");
  assert.deepEqual(loadProjects(), []);
});
test("new proposal numbers do not depend on a local/cloud project count", () => {
  const a = nextProjectCode();
  const b = nextProjectCode();
  assert.match(a, /^M3D-[0-9]{4}-[A-F0-9]{12}$/);
  assert.notEqual(a, b);
});
