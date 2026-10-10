const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (m, filename) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const root = path.resolve(__dirname, "../src/lib/furniture");
const { normalizeConfig, buildFurniture } = require(root + "/builder.ts");
const { constrainPose, footprint } = require(root + "/positioning.ts");
const { computePrice } = require(root + "/pricing.ts");
const { encodeConfiguration, decodeConfiguration, parseFurnitureConfig } = require(
  root + "/configValidation.ts",
);
const cfg = normalizeConfig({ type: "guarda-roupa", width: 240, height: 220, depth: 60 });
const start = { x: 0, z: 0, elevation: 0, rotation: 0 };
test("position is clamped to room walls, floor and ceiling using the rotated footprint", () => {
  const p = constrainPose(cfg, cfg, { x: 10000, z: 10000, elevation: 10000, rotation: 450 }, start);
  assert.equal(p.rotation, 90);
  assert.equal(Math.round(footprint(cfg, 90).depth), 240);
  assert.ok(p.x <= 428);
  assert.ok(p.z <= 614);
  assert.ok(p.elevation <= 88);
  assert.ok(p.elevation >= 0);
});
test("furniture cannot overlap another cabinet, but can stack above a low cabinet", () => {
  const small = normalizeConfig({ type: "criado-mudo", width: 50, height: 50, depth: 45 });
  const prev = { x: -180, z: 100, elevation: 0, rotation: 0 };
  const obstacle = { config: small, position: [0, 100] };
  const blocked = constrainPose(small, cfg, { ...prev, x: 0 }, prev, [obstacle]);
  assert.notEqual(blocked.x, 0);
  const stacked = constrainPose(small, cfg, { ...prev, x: 0, elevation: 52 }, prev, [obstacle]);
  assert.equal(stacked.x, 0);
  assert.equal(stacked.elevation, 52);
});
test("position, full rotation and elevation survive normalization, sharing and a multi-furniture project", () => {
  const saved = {
    ...cfg,
    activeFurnitureId: "cabinet-2",
    floorPosition: [100, 150],
    floorRotation: 275,
    floorElevation: 45,
    roomItems: [{ id: "primary", position: [-150, 100], config: { ...cfg, floorRotation: 90 } }],
  };
  const loaded = normalizeConfig(decodeConfiguration(encodeConfiguration(saved)));
  assert.equal(loaded.floorRotation, 275);
  assert.equal(loaded.floorElevation, 45);
  assert.deepEqual(loaded.floorPosition, [100, 150]);
  assert.equal(loaded.roomItems[0].config.floorRotation, 90);
  assert.throws(() =>
    parseFurnitureConfig({ ...saved, roomItems: [{ ...saved.roomItems[0], id: "cabinet-2" }] }),
  );
});
test("placement changes neither cabinet parts nor its price", () => {
  const placed = { ...cfg, floorPosition: [100, 120], floorRotation: 123, floorElevation: 40 };
  assert.deepEqual(buildFurniture(cfg), buildFurniture(placed));
  assert.equal(
    computePrice(cfg, buildFurniture(cfg)).total,
    computePrice(placed, buildFurniture(placed)).total,
  );
});
