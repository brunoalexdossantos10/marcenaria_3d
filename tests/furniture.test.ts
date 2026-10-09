import test from "node:test";
import assert from "node:assert/strict";
import { buildFurniture, normalizeConfig } from "../src/lib/furniture/builder.ts";
import { FURNITURE_TYPES } from "../src/lib/furniture/types.ts";
import { computePrice, computeScenePrice } from "../src/lib/furniture/pricing.ts";
import { constrainPosition } from "../src/lib/furniture/placement.ts";
import {
  parseFurnitureConfig,
  encodeConfiguration,
  decodeConfiguration,
  isConfigurationAllowed,
} from "../src/lib/furniture/configValidation.ts";
import {
  gestureMetrics,
  gestureTransform,
  INITIAL_TRANSFORM,
  cameraErrorMessage,
} from "../src/lib/furniture/arInteraction.ts";
import { createFurnitureScene } from "../src/lib/furniture/usdz.ts";
import type { Part } from "../src/lib/furniture/types.ts";

test("all 104 presets generate finite, positive parts and prices", () => {
  assert.equal(FURNITURE_TYPES.length, 104);
  for (const definition of FURNITURE_TYPES) {
    const config = normalizeConfig({
      type: definition.id,
      ...definition.defaults,
    });
    const parts = buildFurniture(config);
    assert.ok(parts.length > 0, definition.id);
    assert.ok(
      parts.every(
        (part) =>
          part.size.every((n) => Number.isFinite(n) && n > 0) && part.pos.every(Number.isFinite),
      ),
      definition.id,
    );
    assert.ok(Number.isFinite(computePrice(config, parts).total), definition.id);
  }
});
test("null dimensions, unknown materials and unbounded counters are rejected before rendering", () => {
  const config = normalizeConfig({ type: "guarda-roupa" });
  for (const change of [
    { width: null },
    { columns: 1e9 },
    { material: "invalid" },
    { handle: null },
    { componentOffsets: { x: [null, 0, 0] } },
  ]) {
    assert.throws(() => parseFurnitureConfig({ ...config, ...change }));
  }
  const safe = normalizeConfig({ ...config, columns: 1e9, shelves: 1e9 });
  assert.ok(safe.columns <= 12 && safe.shelves <= 60);
  assert.ok(buildFurniture(safe).length < 300);
});
test("glass is charged once, including glass shelves", () => {
  const config = normalizeConfig({ type: "guarda-roupa" });
  const glass: Part = {
    id: "porta-0",
    label: "Vidro",
    kind: "porta",
    pos: [0, 50, 0],
    size: [100, 100, 1],
    material: "vidro",
    face: "vidro",
  };
  const price = computePrice(config, [glass]);
  assert.equal(price.portas, 0);
  assert.equal(price.mdf, 0);
  assert.equal(price.vidro, 340);
  assert.equal(computePrice(config, [{ ...glass, kind: "prateleira" }]).mdf, 0);
});
test("scene pricing includes every cabinet with the same formula", () => {
  const config = normalizeConfig({
    type: "guarda-roupa",
    roomItems: [
      {
        id: "second",
        position: [300, 0],
        config: normalizeConfig({ type: "rack" }),
      },
    ],
  });
  assert.equal(
    computeScenePrice(config).total,
    computePrice(config, buildFurniture(config)).total +
      computePrice(config.roomItems![0].config, buildFurniture(config.roomItems![0].config)).total,
  );
});
test("an impossible drag interval keeps its base position", () => {
  const config = normalizeConfig({ type: "guarda-roupa" });
  const shelf: Part = {
    id: "prateleira-0",
    label: "Prateleira",
    kind: "prateleira",
    pos: [0, 50, 0],
    size: [50, 2, 40],
  };
  const drawer = (id: string, y: number): Part => ({
    id,
    label: id,
    kind: "gaveta",
    pos: [0, y, 0],
    size: [50, 12, 40],
  });
  assert.deepEqual(
    constrainPosition(
      config,
      [shelf, drawer("gaveta-0", 45), drawer("gaveta-1", 55)],
      shelf,
      [0, 52, 0],
    ),
    shelf.pos,
  );
});
test("shelf offsets survive material changes and are revalidated after resize", () => {
  const config = normalizeConfig({
    type: "guarda-roupa",
    shelves: 2,
    drawers: 0,
  });
  const shelf = buildFurniture(config).find((part) => part.kind === "prateleira")!;
  const changed = normalizeConfig({
    ...config,
    componentOffsets: { [shelf.id]: [0, 3, 0] },
  });
  const moved = buildFurniture(changed).find((part) => part.id === shelf.id)!;
  const materialChanged = buildFurniture(
    normalizeConfig({
      ...changed,
      material: "nogueira",
      materials: { ...changed.materials, interior: "nogueira" },
    }),
  ).find((part) => part.id === shelf.id)!;
  assert.notDeepEqual(moved.pos, shelf.pos);
  assert.deepEqual(materialChanged.pos, moved.pos);
  const resized = normalizeConfig({ ...changed, height: 160 });
  const part = buildFurniture(resized).find((p) => p.id === shelf.id)!;
  assert.ok(
    part.pos[1] - part.size[1] / 2 >= resized.panelThickness &&
      part.pos[1] + part.size[1] / 2 <= resized.height,
  );
});
test("shared links support Unicode and cannot bypass a disabled catalog option", () => {
  const config = normalizeConfig({
    type: "guarda-roupa",
    activeFurnitureId: "móvel",
  });
  assert.equal(decodeConfiguration(encodeConfiguration(config)).activeFurnitureId, "móvel");
  assert.equal(
    isConfigurationAllowed(config, [{ kind: "model", source_id: config.type, active: false }]),
    false,
  );
  assert.throws(() => encodeConfiguration({ data: "x".repeat(40000) }));
});

test("URL-encoded saved links recover the exact furniture configuration", () => {
  const config = normalizeConfig({
    type: "mesa",
    width: 180,
    material: "nogueira",
    materials: { estrutura: "nogueira", portas: "carvalho", interior: "branco", fundo: "branco" },
  });
  const encoded = encodeURIComponent(encodeConfiguration(config));
  const recovered = decodeConfiguration(new URLSearchParams(`c=${encoded}`).get("c")!);
  assert.equal(recovered.type, "mesa");
  assert.equal(recovered.width, 180);
  assert.equal(recovered.material, "nogueira");
});
test("one-finger pan and two-finger pinch/rotation use bounded transforms", () => {
  const start = gestureMetrics([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ])!;
  const next = gestureMetrics([
    { x: 0, y: 0 },
    { x: 0, y: 200 },
  ])!;
  const transformed = gestureTransform(start, next, INITIAL_TRANSFORM);
  assert.equal(transformed.scale, 2);
  assert.equal(transformed.rotation, Math.PI / 2);
  assert.equal(gestureTransform(start, { ...next, distance: 10000 }, INITIAL_TRANSFORM).scale, 2.5);
  assert.match(
    cameraErrorMessage(new DOMException("denied", "NotAllowedError")),
    /Permita a câmera/,
  );
  assert.match(
    cameraErrorMessage(new DOMException("busy", "NotReadableError")),
    /outro aplicativo/,
  );
});

test("desk and TV panel use category-specific geometry instead of wardrobe carcass", () => {
  const desk = buildFurniture(normalizeConfig({ type: "mesa" }));
  const panel = buildFurniture(normalizeConfig({ type: "painel-tv" }));
  assert.ok(desk.some((part) => part.id === "perna-esq"));
  assert.ok(!desk.some((part) => part.id === "lateral-esq"));
  assert.ok(panel.some((part) => part.id === "painel-principal" && part.kind === "painel"));
  assert.ok(!panel.some((part) => part.id === "lateral-esq"));
});

test("camera scene is rebuilt from the active config and changes furniture identity", () => {
  const wardrobe = normalizeConfig({ type: "guarda-roupa" });
  const desk = normalizeConfig({ type: "mesa", width: 180, height: 75, depth: 70 });
  const wardrobeScene = createFurnitureScene(wardrobe);
  const deskScene = createFurnitureScene(desk);
  assert.ok(wardrobeScene.children.some((child) => child.name === "Lateral esquerda"));
  assert.ok(deskScene.children.some((child) => child.name === "Tampo da mesa"));
  assert.ok(!deskScene.children.some((child) => child.name === "Lateral esquerda"));
  assert.ok(deskScene.children.some((child) => child.name === "Perna esquerda"));
});

test("specific families keep editable counters and modular components", () => {
  for (const type of ["mesa", "painel-tv"] as const) {
    const config = normalizeConfig({
      type,
      doors: 2,
      drawers: 2,
      shelves: 2,
      mirror: true,
      componentInstances: [{ id: "mod-prateleira", type: "prateleira", position: [0, 40, 0] }],
    });
    const parts = buildFurniture(config);
    assert.equal(parts.filter((part) => part.kind === "porta").length, 2, type);
    assert.equal(parts.filter((part) => part.kind === "gaveta").length, 2, type);
    assert.ok(
      parts.some((part) => part.id === "mod-prateleira"),
      type,
    );
    assert.ok(
      parts.some((part) => part.kind === "espelho"),
      type,
    );
  }
});
