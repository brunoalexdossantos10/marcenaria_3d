import type { AccessoryId, FurnitureConfig, MaterialSet, Part } from "./types.ts";
import { typeDef, ACCESSORIES } from "./types.ts";
import { constrainPosition, findModularPlacement, isMovable } from "./placement.ts";
import { componentDef } from "./components.ts";

const BACK_T = 0.6;

export const DEFAULT_MATERIALS: MaterialSet = {
  estrutura: "carvalho",
  portas: "carvalho",
  interior: "branco",
  fundo: "branco",
};

/** Older saved projects only carry a subset of the config. Fill the gaps so the
 *  builder can always assume a complete object. */
export function normalizeConfig(
  cfg: Partial<FurnitureConfig> & { type: FurnitureConfig["type"] },
): FurnitureConfig {
  const definition = typeDef(cfg.type);
  const safeNumber = (value: unknown, fallback: number, min: number, max: number) =>
    Math.max(
      min,
      Math.min(max, typeof value === "number" && Number.isFinite(value) ? value : fallback),
    );
  const width = safeNumber(cfg.width, definition.defaults.width ?? 240, ...definition.limits.width);
  const height = safeNumber(
    cfg.height,
    definition.defaults.height ?? 220,
    ...definition.limits.height,
  );
  const depth = safeNumber(cfg.depth, definition.defaults.depth ?? 60, ...definition.limits.depth);
  const thickness = safeNumber(cfg.panelThickness, 1.8, 0.8, 5);
  const maxColumns = Math.max(1, Math.min(12, Math.floor((width - thickness) / (10 + thickness))));
  const base = cfg.material ?? "carvalho";
  const ids = new Set<string>();
  const componentInstances = Array.isArray(cfg.componentInstances)
    ? cfg.componentInstances
        .filter((instance) => {
          if (
            !instance ||
            typeof instance.id !== "string" ||
            !instance.id.startsWith("mod-") ||
            ids.has(instance.id) ||
            !componentDef(instance.type) ||
            !Array.isArray(instance.position) ||
            instance.position.length !== 3 ||
            !instance.position.every(
              (coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate),
            )
          )
            return false;
          ids.add(instance.id);
          return true;
        })
        .slice(0, 60)
    : [];
  const roomItems = Array.isArray(cfg.roomItems)
    ? cfg.roomItems
        .filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            item.config &&
            typeDef(item.config.type).id === item.config.type &&
            Array.isArray(item.position) &&
            item.position.length === 2 &&
            item.position.every(
              (coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate),
            ),
        )
        .slice(0, 8)
        .map((item) => ({
          id: item.id,
          position: [...item.position] as [number, number],
          config: normalizeConfig({ ...item.config, roomItems: [] }),
        }))
    : [];
  return {
    floorPosition: [0, 0],
    doorStyle: "simples",
    doorFace: "padrao",
    drawerHeight: 0,
    drawerGlassFront: false,
    shelfMaterial: "mdf",
    hanger: false,
    mirror: false,
    mirrorInside: false,
    showDimensions: false,
    openDoors: false,
    material: base,
    accessoryOffsets: {},
    componentOffsets: {},
    activeFurnitureId: "primary",
    ...cfg,
    type: definition.id,
    width,
    height,
    depth,
    panelThickness: thickness,
    columns: Math.round(safeNumber(cfg.columns, 3, 1, maxColumns)),
    doors: Math.round(safeNumber(cfg.doors, 2, 0, 16)),
    drawers: Math.round(safeNumber(cfg.drawers, 0, 0, 40)),
    shelves: Math.round(safeNumber(cfg.shelves, 0, 0, 60)),
    niches: Math.round(safeNumber(cfg.niches, 0, 0, 6)),
    handle: {
      model: "reto",
      finish: "preto",
      orientation: "vertical",
      size: 20,
      ...(cfg.handle ?? {}),
    },
    led: { on: false, intensity: 1, temp: 3000, ...(cfg.led ?? {}) },
    accessories: Array.isArray(cfg.accessories)
      ? [...new Set(cfg.accessories)].filter((id) =>
          ACCESSORIES.some((a) => a.id === id && a.categories.includes(definition.category)),
        )
      : [],
    componentInstances,
    roomItems,
    materials: {
      estrutura: base,
      portas: base,
      interior: "branco",
      fundo: "branco",
      ...(cfg.materials ?? {}),
    },
  } as FurnitureConfig;
}

/**
 * Parametric furniture builder: turns a plain config object into a list of
 * physical parts (position + size in cm). The renderer deliberately has no
 * knowledge of furniture categories: the selected type is resolved here,
 * before the model is sent to the 3D, camera or export layers.
 */
export function buildFurniture(input: FurnitureConfig): Part[] {
  const cfg = normalizeConfig(input);
  const baseType = typeDef(cfg.type).baseType ?? cfg.type;
  if (baseType === "mesa") return buildDeskFurniture(cfg);
  if (baseType === "painel-tv") return buildPanelFurniture(cfg);
  return buildCabinetFurniture(cfg);
}

function pushWithAccessoryOffset(cfg: FurnitureConfig, parts: Part[], part: Part) {
  const offset = part.kind === "acessorio" ? cfg.accessoryOffsets?.[part.id] : undefined;
  parts.push(
    offset ? { ...part, pos: part.pos.map((v, i) => v + offset[i]!) as Part["pos"] } : part,
  );
}

function createHandlePart(cfg: FurnitureConfig, host: Part, kind: "porta" | "gaveta"): Part | null {
  const h = cfg.handle;
  if (!h || h.model === "nenhum") return null;
  const [hw, hh, ht] = host.size;
  const vertical = kind === "porta" && h.orientation === "vertical";
  const len = Math.max(6, Math.min(h.size || 20, vertical ? hh - 8 : hw - 6));
  const edge = kind === "porta" ? (host.hinge === 1 ? -1 : 1) : 0;
  const px = kind === "porta" ? edge * (hw / 2 - 4) : 0;
  const py = kind === "porta" ? (vertical ? 0 : -hh / 2 + 8) : 0;
  return {
    id: `puxador-${host.id}`,
    kind: "puxador",
    label: `Puxador · ${host.label}`,
    parent: host.id,
    pos: [px, py, ht / 2 + 0.2],
    size: vertical ? [2.4, len, 3.2] : [len, 2.4, 3.2],
    handle: {
      model: h.model,
      finish: h.finish,
      orientation: vertical ? "vertical" : "horizontal",
    },
  };
}

function applyFurnitureOffsets(cfg: FurnitureConfig, parts: Part[]): Part[] {
  const shelfIds = parts
    .filter((part) => part.kind === "prateleira" || part.kind === "nicho")
    .slice(0, 6)
    .map((part) => part.id);
  for (const part of parts) {
    if (!isMovable(part)) continue;
    part.homePos = [...part.pos];
    const offset = cfg.componentOffsets?.[part.id];
    if (!offset) continue;
    const next = constrainPosition(
      cfg,
      parts,
      part,
      part.pos.map((value, axis) => value + offset[axis]!) as Part["pos"],
    );
    const deltaX = next[0] - part.pos[0];
    part.pos = next;
    if (part.sliding && part.slideTo !== undefined) part.slideTo += deltaX;
    const shelfIndex = shelfIds.indexOf(part.id);
    if (shelfIndex >= 0) {
      const strip = parts.find((candidate) => candidate.id === `led-${shelfIndex + 1}`);
      if (strip) {
        strip.pos[0] += next[0] - part.homePos[0];
        strip.pos[1] += next[1] - part.homePos[1];
      }
    }
  }
  return parts;
}

function appendComponentInstances(cfg: FurnitureConfig, parts: Part[], push: (part: Part) => void) {
  const { width: W, height: H, depth: D, panelThickness: t } = cfg;
  const M = cfg.materials;
  const cols = Math.max(1, Math.round(cfg.columns));
  const colW = (W - 2 * t - (cols - 1) * t) / cols;
  const colCenter = (i: number) => -(W - 2 * t) / 2 + colW / 2 + i * (colW + t);
  for (const instance of cfg.componentInstances ?? []) {
    const definition = componentDef(instance.type);
    if (
      !definition ||
      !definition.allowed.includes(typeDef(cfg.type).category) ||
      D < (definition.minDepth ?? 0)
    )
      continue;
    const col = Math.max(
      0,
      Math.min(cols - 1, Math.round((instance.position[0] - colCenter(0)) / (colW + t))),
    );
    const x = definition.kind === "divisoria" ? instance.position[0] : colCenter(col);
    const y = Math.max(t + 2, Math.min(H - t - 2, instance.position[1]));
    const shallow = Math.max(2, D - BACK_T - 4);
    const front = definition.kind === "porta" || definition.kind === "gaveta";
    const size: Part["size"] =
      definition.kind === "divisoria"
        ? [t, H - 2 * t, shallow]
        : definition.kind === "porta"
          ? [Math.max(4, colW - 0.5), Math.max(4, H - 2 * t), t]
          : definition.kind === "gaveta"
            ? [Math.max(4, colW - 1), definition.height ?? 20, t]
            : definition.kind === "prateleira" || definition.kind === "nicho"
              ? [Math.max(4, colW - 0.6), t, shallow]
              : definition.kind === "espelho"
                ? [Math.max(4, colW - 8), Math.min(Math.max(4, H - 12), 95), 0.6]
                : definition.kind === "puxador"
                  ? [Math.min(Math.max(4, colW - 8), 20), 2.4, 3.2]
                  : definition.kind === "led"
                    ? [Math.max(6, colW - 6), 0.7, 0.7]
                    : definition.kind === "cabideiro"
                      ? [Math.max(4, colW - 4), 2.5, 2.5]
                      : [Math.max(4, colW - 5), definition.height ?? 3, Math.min(shallow, 28)];
    const z = front
      ? D / 2 + t / 2
      : definition.kind === "espelho" || definition.kind === "puxador"
        ? D / 2 + 1
        : definition.kind === "led"
          ? D / 2 - 4
          : 0;
    if (size.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) continue;
    const part: Part = {
      id: instance.id,
      kind: definition.kind,
      label: definition.label,
      pos: [x, y, z],
      size,
      material: instance.material ?? (front ? M.portas : M.interior),
      ...(definition.shape ? { shape: definition.shape } : {}),
      removable: true,
      interactive: definition.kind === "porta" || definition.kind === "gaveta",
      ...(definition.kind === "porta"
        ? {
            hinge: -1 as const,
            face: instance.type === "porta-vidro" ? ("vidro" as const) : cfg.doorFace,
            sliding: instance.type === "porta-correr",
            tilt: instance.type === "porta-basculante",
            openLimit: 95,
          }
        : {}),
      ...(definition.kind === "gaveta" ? { drawer: true, travel: Math.max(10, D - t - 4) } : {}),
      ...(definition.kind === "led"
        ? { led: { intensity: cfg.led.intensity, temp: cfg.led.temp } }
        : {}),
      ...(definition.kind === "puxador"
        ? {
            handle: {
              model: cfg.handle.model,
              finish: cfg.handle.finish,
              orientation: "horizontal" as const,
            },
          }
        : {}),
    };
    const placement = findModularPlacement(cfg, parts, part, x, y);
    if (!placement) continue;
    part.pos = placement;
    push(part);
    if (definition.kind === "porta" || definition.kind === "gaveta") {
      const handle = createHandlePart(cfg, part, definition.kind);
      if (handle) push(handle);
    }
  }
}

/** A desk is a top with legs and optional under-top drawers, never a cabinet carcass. */
function buildDeskFurniture(cfg: FurnitureConfig): Part[] {
  const { width: W, height: H, depth: D, panelThickness: t } = cfg;
  const M = cfg.materials;
  const parts: Part[] = [];
  const push = (part: Part) => pushWithAccessoryOffset(cfg, parts, part);
  const legHeight = Math.max(t, H - t);
  const legDepth = Math.max(t, D - 4);

  push({
    id: "tampo",
    kind: "tampo",
    label: "Tampo da mesa",
    pos: [0, H - t / 2, 0],
    size: [W, t, D],
    material: M.estrutura,
  });
  for (const side of [-1, 1]) {
    push({
      id: side < 0 ? "perna-esq" : "perna-dir",
      kind: "lateral",
      label: side < 0 ? "Perna esquerda" : "Perna direita",
      pos: [side * (W / 2 - t / 2), legHeight / 2, 0],
      size: [t, legHeight, legDepth],
      material: M.estrutura,
    });
  }
  push({
    id: "travessa-fundo",
    kind: "fundo",
    label: "Travessa traseira",
    pos: [0, Math.max(t * 2, H * 0.38), -D / 2 + t / 2],
    size: [Math.max(t, W - 2 * t), t, t],
    material: M.estrutura,
  });

  const drawerCount = Math.max(0, Math.min(Math.round(cfg.drawers), 8));
  const drawerH = Math.min(22, Math.max(12, (H - t - 4) / Math.max(drawerCount, 1)));
  const drawerW = (W - 2 * t - Math.max(0, drawerCount - 1) * 0.6) / Math.max(drawerCount, 1);
  for (let i = 0; i < drawerCount; i++) {
    const front: Part = {
      id: `gaveta-${i}`,
      kind: "gaveta",
      label: `Gaveta ${i + 1}`,
      pos: [-W / 2 + t + drawerW / 2 + i * (drawerW + 0.6), H - t - drawerH / 2 - 2, D / 2 + t / 2],
      size: [Math.max(4, drawerW), drawerH, t],
      material: M.portas,
      drawer: true,
      interactive: true,
      travel: Math.max(10, D - t - 4),
      removable: true,
    };
    push(front);
    const handle = createHandlePart(cfg, front, "gaveta");
    if (handle) push(handle);
  }

  const doorCount = Math.max(0, Math.min(Math.round(cfg.doors), 8));
  const doorSpace = Math.max(t + 4, H - t - 4);
  const doorH = Math.min(28, Math.max(12, doorSpace / Math.max(doorCount, 1)));
  const doorW = (W - 2 * t - Math.max(0, doorCount - 1) * 0.6) / Math.max(doorCount, 1);
  for (let i = 0; i < doorCount; i++) {
    const door: Part = {
      id: `porta-mesa-${i}`,
      kind: "porta",
      label: `Porta ${i + 1}`,
      pos: [
        -W / 2 + t + doorW / 2 + i * (doorW + 0.6),
        t + doorH / 2 + 2 + i * (doorH + 0.4),
        D / 2 + t / 2,
      ],
      size: [Math.max(4, doorW), doorH, t],
      material:
        cfg.doorFace === "vidro" ? "vidro" : cfg.doorFace === "espelho" ? "espelho" : M.portas,
      face: cfg.doorFace,
      hinge: i % 2 === 0 ? -1 : 1,
      sliding: cfg.doorStyle === "correr",
      tilt: cfg.doorStyle === "basculante",
      bifold: cfg.doorStyle === "camarao",
      openLimit: cfg.doorStyle === "dupla" ? 110 : 95,
      interactive: true,
      removable: true,
    };
    push(door);
    const handle = createHandlePart(cfg, door, "porta");
    if (handle) push(handle);
  }

  const shelves = Math.max(0, Math.min(Math.round(cfg.shelves), 2));
  const shelfMaterial = cfg.shelfMaterial === "vidro" ? "vidro" : M.interior;
  for (let i = 0; i < shelves; i++) {
    push({
      id: `prateleira-mesa-${i}`,
      kind: "prateleira",
      label: `Prateleira inferior ${i + 1}`,
      pos: [0, Math.max(t + 2, H * (0.28 + i * 0.18)), 0],
      size: [Math.max(t, W - 2 * t), t, Math.max(t, D - 4)],
      material: shelfMaterial,
      removable: true,
    });
  }

  if (cfg.mirror) {
    push({
      id: "espelho",
      kind: "espelho",
      label: "Espelho",
      pos: [0, H + Math.min(55, H * 0.55), -D / 2 + 0.5],
      size: [Math.min(W - 12, 70), Math.min(H, 80), 0.6],
      removable: true,
    });
  }
  if (cfg.led?.on) {
    push({
      id: "led-0",
      kind: "led",
      label: "LED da mesa",
      pos: [0, H - t - 1.2, D / 2 - 6],
      size: [Math.max(6, W - 2 * t), 1, 1.4],
      led: { intensity: cfg.led.intensity, temp: cfg.led.temp },
    });
  }
  const has = (id: AccessoryId) => cfg.accessories?.includes(id);
  if (has("divisorias")) {
    push({
      id: "acc-divisoria",
      kind: "acessorio",
      label: "Divisória da mesa",
      pos: [0, Math.max(t + 2, (H - t) / 2), 0],
      size: [1.2, Math.max(t, H - t - 4), Math.max(t, D - 4)],
      material: M.interior,
      shape: "placa",
      removable: true,
    });
  }
  if (has("gavetas-internas")) {
    for (let i = 0; i < 2; i++) {
      push({
        id: `acc-gaveta-interna-${i}`,
        kind: "acessorio",
        label: `Gaveta interna ${i + 1}`,
        pos: [0, Math.max(t + 8, H * 0.32 + i * 16), D / 2 - t - 6],
        size: [Math.max(4, W / 2 - 4), 13, Math.max(4, D - 12)],
        material: M.interior,
        shape: "caixa",
        removable: true,
      });
    }
  }
  if (has("organizador")) {
    push({
      id: "acc-organizador",
      kind: "acessorio",
      label: "Organizador",
      pos: [0, Math.max(t + 8, H * 0.22), D / 2 - t - 8],
      size: [Math.min(Math.max(4, W / 2 - 4), 40), 9, Math.max(4, D - 16)],
      material: M.interior,
      shape: "caixa",
      removable: true,
    });
  }
  if (has("torre-tomadas")) {
    push({
      id: "acc-tomadas",
      kind: "acessorio",
      label: "Torre de tomadas",
      pos: [W / 2 - 8, H + 7, 0],
      size: [8, 14, 8],
      shape: "tubo",
      material: "preto",
      removable: true,
    });
  }
  if (has("passagem-cabos")) {
    push({
      id: "acc-cabos",
      kind: "acessorio",
      label: "Passagem de cabos",
      pos: [0, H - t - 1, -D / 2 + 6],
      size: [8, 1, 8],
      shape: "placa",
      material: "preto",
      removable: true,
    });
  }
  if (has("suporte-monitor")) {
    push({
      id: "acc-monitor",
      kind: "acessorio",
      label: "Suporte para monitor",
      pos: [0, H + 6, -D / 4],
      size: [Math.min(W * 0.5, 60), 12, Math.min(D * 0.5, 22)],
      shape: "caixa",
      material: M.estrutura,
      removable: true,
    });
  }
  appendComponentInstances(cfg, parts, push);
  return applyFurnitureOffsets(cfg, parts);
}

/** A TV panel is a shallow wall panel with front niches; it has no cabinet carcass. */
function buildPanelFurniture(cfg: FurnitureConfig): Part[] {
  const { width: W, height: H, depth: D, panelThickness: t } = cfg;
  const M = cfg.materials;
  const parts: Part[] = [];
  const push = (part: Part) => pushWithAccessoryOffset(cfg, parts, part);

  push({
    id: "painel-principal",
    kind: "painel",
    label: "Painel principal",
    pos: [0, H / 2, 0],
    size: [W, H, Math.max(t, D)],
    material: M.estrutura,
  });
  const nicheCount = Math.max(0, Math.min(Math.round(cfg.niches), 6));
  const columns = Math.max(1, Math.min(Math.round(cfg.columns), nicheCount || 1));
  const nicheW = Math.max(6, (W - (columns + 1) * t) / columns);
  for (let i = 0; i < nicheCount; i++) {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const x = -W / 2 + t + nicheW / 2 + column * (nicheW + t);
    const y = Math.max(t + 4, H - 24 - row * 26);
    push({
      id: `nicho-${i}`,
      kind: "nicho",
      label: `Nicho ${i + 1}`,
      pos: [x, y, D / 2 + t / 2],
      size: [nicheW, t, Math.max(t, D - 2)],
      material: M.interior,
      removable: true,
    });
  }
  const shelfMaterial = cfg.shelfMaterial === "vidro" ? "vidro" : M.interior;
  const shelfCount = Math.max(0, Math.min(Math.round(cfg.shelves), 4));
  for (let i = 0; i < shelfCount; i++) {
    push({
      id: `prateleira-painel-${i}`,
      kind: "prateleira",
      label: `Prateleira do painel ${i + 1}`,
      pos: [0, Math.max(t + 4, H * 0.34 - i * 16), D / 2 + t / 2],
      size: [Math.max(6, W - 2 * t), t, Math.max(t, D - 2)],
      material: shelfMaterial,
      removable: true,
    });
  }
  const storageHeight = Math.min(30, Math.max(12, H * 0.16));
  const doorCount = Math.max(0, Math.min(Math.round(cfg.doors), 8));
  const doorW = (W / 2 - t - Math.max(0, doorCount - 1) * 0.6) / Math.max(doorCount, 1);
  for (let i = 0; i < doorCount; i++) {
    const door: Part = {
      id: `porta-painel-${i}`,
      kind: "porta",
      label: `Porta do painel ${i + 1}`,
      pos: [
        -W / 4 + (i - (doorCount - 1) / 2) * (doorW + 0.6),
        storageHeight / 2 + t + 2,
        D / 2 + t / 2,
      ],
      size: [Math.max(4, doorW), storageHeight, t],
      material:
        cfg.doorFace === "vidro" ? "vidro" : cfg.doorFace === "espelho" ? "espelho" : M.portas,
      face: cfg.doorFace,
      hinge: i % 2 === 0 ? -1 : 1,
      sliding: cfg.doorStyle === "correr",
      tilt: cfg.doorStyle === "basculante",
      bifold: cfg.doorStyle === "camarao",
      openLimit: cfg.doorStyle === "dupla" ? 110 : 95,
      interactive: true,
      removable: true,
    };
    push(door);
    const handle = createHandlePart(cfg, door, "porta");
    if (handle) push(handle);
  }
  const drawerCount = Math.max(0, Math.min(Math.round(cfg.drawers), 8));
  const drawerW = (W / 2 - t - Math.max(0, drawerCount - 1) * 0.6) / Math.max(drawerCount, 1);
  for (let i = 0; i < drawerCount; i++) {
    const drawer: Part = {
      id: `gaveta-painel-${i}`,
      kind: "gaveta",
      label: `Gaveta do painel ${i + 1}`,
      pos: [
        W / 4 + (i - (drawerCount - 1) / 2) * (drawerW + 0.6),
        storageHeight / 2 + t + 2,
        D / 2 + t / 2,
      ],
      size: [Math.max(4, drawerW), storageHeight, t],
      material: cfg.drawerGlassFront ? "vidro" : M.portas,
      drawer: true,
      interactive: true,
      travel: Math.max(10, D - t - 4),
      removable: true,
    };
    push(drawer);
    const handle = createHandlePart(cfg, drawer, "gaveta");
    if (handle) push(handle);
  }
  if (cfg.mirror) {
    push({
      id: "espelho",
      kind: "espelho",
      label: "Espelho do painel",
      pos: [0, H / 2, D / 2 + 0.6],
      size: [Math.min(W - 12, 140), Math.min(H - 20, 100), 0.6],
      removable: true,
    });
  }
  if (cfg.accessories?.includes("suporte-tv")) {
    push({
      id: "acc-suporte-tv",
      kind: "acessorio",
      label: "Suporte para TV",
      pos: [0, H * 0.52, D / 2 + 2],
      size: [Math.min(W * 0.75, 120), 70, 3],
      shape: "placa",
      material: "preto",
      removable: true,
    });
  }
  if (cfg.accessories?.includes("painel-ripado")) {
    push({
      id: "acc-ripado",
      kind: "acessorio",
      label: "Painel ripado",
      pos: [0, H / 2, D / 2 + 1],
      size: [W, H * 0.9, 2],
      shape: "ripado",
      material: M.portas,
      removable: true,
    });
  }
  if (cfg.led?.on) {
    push({
      id: "led-0",
      kind: "led",
      label: "LED do painel",
      pos: [0, H - t - 1.2, D / 2 + 2],
      size: [Math.max(6, W - 2 * t), 1, 1.4],
      led: { intensity: cfg.led.intensity, temp: cfg.led.temp },
    });
  }
  if (cfg.accessories?.includes("passagem-cabos")) {
    push({
      id: "acc-cabos",
      kind: "acessorio",
      label: "Passagem de cabos",
      pos: [0, H * 0.52, D / 2 + 2],
      size: [8, 1, 8],
      shape: "placa",
      material: "preto",
      removable: true,
    });
  }
  if (cfg.accessories?.includes("divisorias")) {
    push({
      id: "acc-divisoria-painel",
      kind: "acessorio",
      label: "Divisória do painel",
      pos: [0, H * 0.34, D / 2 + 2],
      size: [1.2, Math.max(t, H * 0.3), 1],
      material: M.interior,
      shape: "placa",
      removable: true,
    });
  }
  appendComponentInstances(cfg, parts, push);
  return applyFurnitureOffsets(cfg, parts);
}

function buildCabinetFurniture(input: FurnitureConfig): Part[] {
  const cfg = normalizeConfig(input);
  const { width: W, height: H, depth: D, panelThickness: t } = cfg;
  const M = cfg.materials;
  const parts: Part[] = [];
  const push = (p: Part) => {
    const offset = p.kind === "acessorio" ? cfg.accessoryOffsets?.[p.id] : undefined;
    parts.push(offset ? { ...p, pos: p.pos.map((v, i) => v + offset[i]!) as Part["pos"] } : p);
  };
  const has = (a: AccessoryId) => cfg.accessories?.includes(a);

  // ---- carcass -------------------------------------------------------------
  push({
    id: "lateral-esq",
    kind: "lateral",
    label: "Lateral esquerda",
    pos: [-W / 2 + t / 2, H / 2, 0],
    size: [t, H, D],
    material: M.estrutura,
  });
  push({
    id: "lateral-dir",
    kind: "lateral",
    label: "Lateral direita",
    pos: [W / 2 - t / 2, H / 2, 0],
    size: [t, H, D],
    material: M.estrutura,
  });

  const innerW = W - 2 * t;
  push({
    id: "tampo",
    kind: "tampo",
    label: "Tampo",
    pos: [0, H - t / 2, 0],
    size: [innerW, t, D],
    material: M.estrutura,
  });
  push({
    id: "base",
    kind: "base",
    label: "Base",
    pos: [0, t / 2, 0],
    size: [innerW, t, D],
    material: M.estrutura,
  });
  push({
    id: "fundo",
    kind: "fundo",
    label: "Fundo",
    pos: [0, H / 2, -D / 2 + BACK_T / 2],
    size: [W, H, BACK_T],
    material: M.fundo,
  });

  // ---- columns / dividers -------------------------------------------------
  const cols = Math.max(1, Math.round(cfg.columns));
  const colW = (innerW - (cols - 1) * t) / cols;
  const colCenter = (i: number) => -innerW / 2 + colW / 2 + i * (colW + t);

  for (let i = 1; i < cols; i++) {
    push({
      id: `divisoria-${i}`,
      kind: "divisoria",
      label: `Divisória ${i}`,
      pos: [colCenter(i) - colW / 2 - t / 2, H / 2, 0],
      size: [t, H - 2 * t, D],
      material: M.interior,
      removable: true,
    });
  }

  const innerH = H - 2 * t;
  const innerBottom = t;

  // ---- drawers (stacked at the bottom of column 0) ------------------------
  const drawers = Math.max(0, Math.round(cfg.drawers));
  const drawerH =
    cfg.drawerHeight && cfg.drawerHeight > 0
      ? Math.min(cfg.drawerHeight, innerH / 2)
      : Math.min(22, Math.max(12, innerH / Math.max(drawers, 1) / 1.6));
  let drawerStackTop = innerBottom;
  const drawerTravel = Math.max(10, D - t - 4);
  for (let i = 0; i < drawers; i++) {
    const col = i % cols;
    const idx = Math.floor(i / cols);
    const y = innerBottom + idx * (drawerH + 0.4) + drawerH / 2;
    if (y + drawerH / 2 > innerBottom + innerH) break;
    drawerStackTop = Math.max(drawerStackTop, y + drawerH / 2 + 0.4);
    const front: Part = {
      id: `gaveta-${i}`,
      kind: "gaveta",
      label: `Gaveta ${i + 1}`,
      pos: [colCenter(col), y, D / 2 - t / 2],
      size: [colW - 0.6, drawerH, t],
      material: cfg.drawerGlassFront ? "vidro" : M.portas,
      drawer: true,
      interactive: true,
      travel: drawerTravel,
      removable: true,
    };
    push(front);
    pushHandle(front, "gaveta");
  }

  // ---- shelves ------------------------------------------------------------
  const shelfMat = cfg.shelfMaterial === "vidro" ? "vidro" : M.interior;
  const shelves = Math.max(0, Math.round(cfg.shelves));
  const perCol = Math.ceil(shelves / cols);
  const shelfYs: [number, number][] = []; // [x, y] for LED strips
  const shelfIds: string[] = [];
  let placed = 0;
  for (let c = 0; c < cols && placed < shelves; c++) {
    const zoneBottom = drawers > 0 ? drawerStackTop : innerBottom;
    const zoneTop = innerBottom + innerH - (cfg.hanger && c === cols - 1 ? 110 : 0);
    const zoneH = Math.max(zoneTop - zoneBottom, 20);
    const n = Math.min(perCol, shelves - placed);
    for (let s = 0; s < n; s++) {
      const y = zoneBottom + ((s + 1) * zoneH) / (n + 1);
      push({
        id: `prateleira-${c}-${s}`,
        kind: "prateleira",
        label: `Prateleira ${placed + 1}`,
        pos: [colCenter(c), y, BACK_T / 2],
        size: [colW - 0.4, cfg.shelfMaterial === "vidro" ? 0.8 : t, D - BACK_T - 2],
        material: shelfMat,
        removable: true,
      });
      shelfYs.push([colCenter(c), y]);
      shelfIds.push(`prateleira-${c}-${s}`);
      placed++;
    }
  }

  // ---- niches (open frames on the top row) --------------------------------
  const niches = Math.max(0, Math.round(cfg.niches));
  for (let i = 0; i < niches; i++) {
    const y = innerBottom + innerH - 18 - i * 26;
    if (y < innerBottom + 20) break;
    push({
      id: `nicho-${i}`,
      kind: "nicho",
      label: `Nicho ${i + 1}`,
      pos: [colCenter(i % cols), y, BACK_T / 2],
      size: [colW - 0.4, t, D - BACK_T - 6],
      material: M.interior,
      removable: true,
    });
    shelfYs.push([colCenter(i % cols), y]);
    shelfIds.push(`nicho-${i}`);
  }

  // ---- hanger rod + hangers ----------------------------------------------
  if (cfg.hanger) {
    const rodY = innerBottom + innerH - 8;
    const rodX = colCenter(cols - 1);
    push({
      id: "cabideiro",
      kind: "cabideiro",
      label: "Cabideiro",
      pos: [rodX, rodY, 0],
      size: [colW - 1.5, 2.5, 2.5],
      removable: true,
    });
    const hangerW = Math.max(26, Math.min(D - 14, 44)); // along Z
    const hangerH = Math.min(34, innerH * 0.22);
    const usableSpan = Math.max(colW - 10, 6);
    const count = Math.max(2, Math.min(8, Math.floor(usableSpan / 7)));
    const step = usableSpan / count;
    for (let i = 0; i < count; i++) {
      push({
        id: `cabide-${i}`,
        kind: "cabide",
        label: `Cabide ${i + 1}`,
        pos: [rodX - usableSpan / 2 + step / 2 + i * step, rodY - hangerH / 2 - 1, 0],
        size: [1.2, hangerH, hangerW],
      });
    }
  }

  // ---- accessories --------------------------------------------------------
  const accCol = (i: number) => colCenter(Math.min(cols - 1, i));
  if (has("sapateira")) {
    for (let i = 0; i < 3; i++) {
      push({
        id: `acc-sapateira-${i}`,
        kind: "acessorio",
        label: `Sapateira ${i + 1}`,
        pos: [accCol(0), innerBottom + 24 + i * 22, BACK_T / 2 + 2],
        size: [colW - 1, 1.6, Math.min(D - 8, 30)],
        material: M.interior,
        shape: "inclinada",
        removable: true,
      });
    }
  }
  if (has("calceiro")) {
    push({
      id: "acc-calceiro",
      kind: "acessorio",
      label: "Calceiro",
      pos: [accCol(cols - 1), innerBottom + innerH * 0.45, 0],
      size: [colW - 4, 2, 2],
      shape: "tubo",
      removable: true,
    });
  }
  if (has("cabideiro-retratil")) {
    push({
      id: "acc-cabideiro-retratil",
      kind: "acessorio",
      label: "Cabideiro retrátil",
      pos: [accCol(0), innerBottom + innerH * 0.72, 0],
      size: [colW - 4, 2, 2],
      shape: "tubo",
      removable: true,
    });
  }
  if (has("divisorias")) {
    push({
      id: "acc-divisoria",
      kind: "acessorio",
      label: "Divisória interna",
      pos: [accCol(0), innerBottom + innerH * 0.55, BACK_T / 2],
      size: [1.2, Math.min(innerH * 0.35, 60), D - BACK_T - 4],
      material: M.interior,
      shape: "placa",
      removable: true,
    });
  }
  if (has("gavetas-internas")) {
    for (let i = 0; i < 2; i++) {
      push({
        id: `acc-gaveta-interna-${i}`,
        kind: "acessorio",
        label: `Gaveta interna ${i + 1}`,
        pos: [accCol(1), innerBottom + innerH * 0.35 + i * 16, D / 2 - t - 6],
        size: [colW - 4, 13, Math.max(D - 12, 20)],
        material: M.interior,
        shape: "caixa",
        removable: true,
      });
    }
  }
  if (has("organizador")) {
    push({
      id: "acc-organizador",
      kind: "acessorio",
      label: "Organizador",
      pos: [accCol(1), innerBottom + innerH * 0.2, D / 2 - t - 8],
      size: [Math.min(colW - 4, 40), 9, Math.max(D - 16, 18)],
      material: M.interior,
      shape: "caixa",
      removable: true,
    });
  }
  if (has("porta-temperos")) {
    push({
      id: "acc-temperos",
      kind: "acessorio",
      label: "Porta-temperos",
      pos: [accCol(0), innerBottom + innerH * 0.6, D / 2 - t - 5],
      size: [Math.min(colW - 6, 25), 10, 10],
      material: M.interior,
      shape: "caixa",
      removable: true,
    });
  }
  if (has("lixeira")) {
    push({
      id: "acc-lixeira",
      kind: "acessorio",
      label: "Lixeira embutida",
      pos: [accCol(cols - 1), innerBottom + 16, 0],
      size: [Math.min(colW - 6, 30), 32, Math.min(D - 14, 34)],
      shape: "caixa",
      material: "cinza",
      removable: true,
    });
  }
  if (has("torre-tomadas")) {
    push({
      id: "acc-tomadas",
      kind: "acessorio",
      label: "Torre de tomadas",
      pos: [colCenter(cols - 1), H + 7, 0],
      size: [8, 14, 8],
      shape: "tubo",
      material: "preto",
      removable: true,
    });
  }
  if (has("painel-ripado")) {
    push({
      id: "acc-ripado",
      kind: "acessorio",
      label: "Painel ripado",
      pos: [0, H / 2, -D / 2 - 1],
      size: [W, H * 0.9, 2],
      shape: "ripado",
      material: M.portas,
      removable: true,
    });
  }
  if (has("suporte-tv")) {
    push({
      id: "acc-suporte-tv",
      kind: "acessorio",
      label: "Suporte para TV",
      pos: [0, H + 45, -D / 2 + 2],
      size: [Math.min(W * 0.75, 120), 70, 3],
      shape: "placa",
      material: "preto",
      removable: true,
    });
  }
  if (has("passagem-cabos")) {
    push({
      id: "acc-cabos",
      kind: "acessorio",
      label: "Passagem de cabos",
      pos: [colCenter(cols - 1), H - t - 1, -D / 2 + 6],
      size: [8, 1, 8],
      shape: "placa",
      material: "preto",
      removable: true,
    });
  }
  if (has("suporte-monitor")) {
    push({
      id: "acc-monitor",
      kind: "acessorio",
      label: "Suporte para monitor",
      pos: [0, H + 6, -D / 4],
      size: [Math.min(W * 0.5, 60), 12, Math.min(D * 0.5, 22)],
      shape: "caixa",
      material: M.estrutura,
      removable: true,
    });
  }

  // ---- internal mirror ----------------------------------------------------
  if (cfg.mirrorInside) {
    push({
      id: "espelho-interno",
      kind: "espelho",
      label: "Espelho interno",
      pos: [colCenter(0), innerBottom + innerH / 2, -D / 2 + BACK_T + 0.4],
      size: [Math.max(colW - 6, 10), Math.min(innerH - 10, 150), 0.5],
      removable: true,
    });
  }

  // ---- LED ----------------------------------------------------------------
  if (cfg.led?.on) {
    const strips: [number, number, number, number][] = []; // x, y, z, width
    strips.push([0, H - t - 1.2, D / 2 - 6, innerW - 2]);
    shelfYs.slice(0, 6).forEach(([x, y]) => strips.push([x, y - 1.2, D / 2 - 6, colW - 4]));
    strips.forEach(([x, y, z, w], i) =>
      push({
        id: `led-${i}`,
        kind: "led",
        label: `LED ${i + 1}`,
        pos: [x, y, z],
        size: [Math.max(w, 6), 1, 1.4],
        led: { intensity: cfg.led.intensity, temp: cfg.led.temp },
      }),
    );
  }

  // ---- doors --------------------------------------------------------------
  const doors = Math.max(0, Math.round(cfg.doors));
  const sliding = cfg.doorStyle === "correr";
  const tilt = cfg.doorStyle === "basculante";
  const doorMat =
    cfg.doorFace === "vidro" ? "vidro" : cfg.doorFace === "espelho" ? "espelho" : M.portas;
  let frontDoor: Part | null = null;
  if (doors > 0 && sliding) {
    const panels = Math.max(2, doors);
    const overlap = 2;
    const panelW = (W + overlap * (panels - 1)) / panels;
    const doorH = H - 1;
    const half = (W - panelW) / 2;
    for (let i = 0; i < panels; i++) {
      const track = i % 2;
      const closedX = -W / 2 + panelW / 2 + i * (panelW - overlap);
      const dir = i < panels / 2 ? 1 : -1;
      const openX = Math.max(-half, Math.min(half, closedX + dir * (panelW - overlap)));
      const p: Part = {
        id: `porta-${i}`,
        kind: "porta",
        label: `Porta de correr ${i + 1}`,
        pos: [closedX, doorH / 2 + 0.5, D / 2 + 1.4 + track * (t + 0.8)],
        size: [panelW, doorH, t],
        material: doorMat,
        face: cfg.doorFace,
        sliding: true,
        slideTo: openX,
        interactive: true,
        removable: true,
      };
      push(p);
      pushHandle(p, "porta");
      if (!frontDoor) frontDoor = p;
    }
  } else if (doors > 0) {
    const doorW = W / doors - 0.3;
    const startY = drawers > 0 ? drawerStackTop : 0;
    const topY = H;
    const usableH = topY - startY - 0.3;
    for (let i = 0; i < doors; i++) {
      const x = -W / 2 + W / doors / 2 + i * (W / doors);
      const hinge: -1 | 1 =
        cfg.doorStyle === "dupla" ? (i % 2 === 0 ? -1 : 1) : i < doors / 2 ? -1 : 1;
      // opening limit: never past 110°, and reduced when doors sit side by side
      const openLimit = tilt ? 85 : doors > 1 ? 100 : 110;
      const p: Part = {
        id: `porta-${i}`,
        kind: "porta",
        label: tilt ? `Porta basculante ${i + 1}` : `Porta ${i + 1}`,
        pos: [x, startY + usableH / 2 + 0.15, D / 2 + t / 2],
        size: [doorW, usableH, t],
        material: doorMat,
        face: cfg.doorFace,
        hinge,
        tilt,
        bifold: cfg.doorStyle === "camarao",
        openLimit,
        interactive: true,
        removable: true,
      };
      push(p);
      pushHandle(p, "porta");
      if (!frontDoor) frontDoor = p;
    }
  }

  // ---- mirror -------------------------------------------------------------
  if (cfg.mirror) {
    if (frontDoor) {
      const [dw, dh] = frontDoor.size;
      push({
        id: "espelho",
        kind: "espelho",
        label: "Espelho",
        parent: frontDoor.id,
        pos: [0, 0, frontDoor.size[2] / 2 + 0.3],
        size: [Math.max(dw - 8, 10), Math.max(dh - 10, 10), 0.5],
        removable: true,
      });
    } else {
      push({
        id: "espelho",
        kind: "espelho",
        label: "Espelho",
        pos: [0, H / 2, D / 2 + 0.6],
        size: [Math.min(W - 12, 70), Math.min(H - 20, 140), 0.6],
        removable: true,
      });
    }
  }

  // Independent components use local centimetre coordinates. Their IDs survive
  // material and dimension changes, unlike the preset's generated indices.
  for (const instance of cfg.componentInstances ?? []) {
    const definition = componentDef(instance.type);
    if (
      !definition ||
      !definition.allowed.includes(typeDef(cfg.type).category) ||
      D < (definition.minDepth ?? 0)
    )
      continue;
    const col = Math.max(
      0,
      Math.min(cols - 1, Math.round((instance.position[0] - colCenter(0)) / (colW + t))),
    );
    const x = definition.kind === "divisoria" ? instance.position[0] : colCenter(col);
    const y = Math.max(t + 2, Math.min(H - t - 2, instance.position[1]));
    const shallow = Math.max(2, D - BACK_T - 4);
    const front = definition.kind === "porta" || definition.kind === "gaveta";
    const size: Part["size"] =
      definition.kind === "divisoria"
        ? [t, H - 2 * t, shallow]
        : definition.kind === "porta"
          ? [colW - 0.5, H - 2 * t, t]
          : definition.kind === "gaveta"
            ? [colW - 1, definition.height ?? 20, t]
            : definition.kind === "prateleira" || definition.kind === "nicho"
              ? [colW - 0.6, t, shallow]
              : definition.kind === "espelho"
                ? [colW - 8, Math.min(H - 12, 95), 0.6]
                : definition.kind === "puxador"
                  ? [Math.min(colW - 8, 20), 2.4, 3.2]
                  : definition.kind === "led"
                    ? [colW - 6, 0.7, 0.7]
                    : definition.kind === "cabideiro"
                      ? [colW - 4, 2.5, 2.5]
                      : [colW - 5, definition.height ?? 3, Math.min(shallow, 28)];
    const z = front
      ? D / 2 + t / 2
      : definition.kind === "espelho" || definition.kind === "puxador"
        ? D / 2 + 1
        : definition.kind === "led"
          ? D / 2 - 4
          : 0;
    if (size.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) continue;
    const part: Part = {
      id: instance.id,
      kind: definition.kind,
      label: definition.label,
      pos: [x, y, z],
      size,
      material: instance.material ?? (front ? M.portas : M.interior),
      ...(definition.shape ? { shape: definition.shape } : {}),
      removable: true,
      interactive: definition.kind === "porta" || definition.kind === "gaveta",
      ...(definition.kind === "porta"
        ? {
            hinge: -1 as const,
            face: instance.type === "porta-vidro" ? ("vidro" as const) : cfg.doorFace,
            sliding: instance.type === "porta-correr",
            tilt: instance.type === "porta-basculante",
            openLimit: 95,
          }
        : {}),
      ...(definition.kind === "gaveta" ? { drawer: true, travel: Math.max(10, D - t - 4) } : {}),
      ...(definition.kind === "led"
        ? { led: { intensity: cfg.led.intensity, temp: cfg.led.temp } }
        : {}),
      ...(definition.kind === "puxador"
        ? {
            handle: {
              model: cfg.handle.model,
              finish: cfg.handle.finish,
              orientation: "horizontal" as const,
            },
          }
        : {}),
    };
    const placement = findModularPlacement(cfg, parts, part, x, y);
    if (!placement) continue;
    part.pos = placement;
    push(part);
    if (definition.kind === "porta" || definition.kind === "gaveta")
      pushHandle(part, definition.kind);
  }

  // Resolve persisted offsets against the current geometry every time. Changes
  // in dimensions, counts or type cannot leave a stored piece outside its case.
  for (const part of parts) {
    if (!isMovable(part)) continue;
    part.homePos = [...part.pos];
    const offset = cfg.componentOffsets?.[part.id];
    if (!offset) continue;
    const next = constrainPosition(
      cfg,
      parts,
      part,
      part.pos.map((v, i) => v + offset[i]!) as Part["pos"],
    );
    const deltaX = next[0] - part.pos[0];
    part.pos = next;
    if (part.sliding && part.slideTo !== undefined) part.slideTo += deltaX;
    const shelfIndex = shelfIds.indexOf(part.id);
    if (shelfIndex >= 0 && shelfIndex < 6) {
      const strip = parts.find((candidate) => candidate.id === `led-${shelfIndex + 1}`);
      if (strip) {
        strip.pos[0] += next[0] - part.homePos[0];
        strip.pos[1] += next[1] - part.homePos[1];
      }
    }
  }
  return parts;

  /** handles are mounted on their door/drawer so they follow the animation */
  function pushHandle(host: Part, kind: "porta" | "gaveta") {
    const h = cfg.handle;
    if (!h || h.model === "nenhum") return;
    const [hw, hh, ht] = host.size;
    const vertical = kind === "porta" ? h.orientation === "vertical" : false;
    const len = Math.max(6, Math.min(h.size || 20, vertical ? hh - 8 : hw - 6));
    const edge = kind === "porta" ? (host.hinge === 1 ? -1 : 1) : 0;
    const px = kind === "porta" ? edge * (hw / 2 - 4) : 0;
    const py = kind === "porta" ? (vertical ? 0 : -hh / 2 + 8) : 0;
    push({
      id: `puxador-${host.id}`,
      kind: "puxador",
      label: `Puxador · ${host.label}`,
      parent: host.id,
      pos: [px, py, ht / 2 + 0.2],
      size: vertical ? [2.4, len, 3.2] : [len, 2.4, 3.2],
      handle: {
        model: h.model,
        finish: h.finish,
        orientation: vertical ? "vertical" : "horizontal",
      },
    });
  }
}

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

export function validate(cfg: FurnitureConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const def = typeDef(cfg.type);
  const [wMin, wMax] = def.limits.width;
  const [hMin, hMax] = def.limits.height;
  const [dMin, dMax] = def.limits.depth;

  if (cfg.width < wMin || cfg.width > wMax)
    issues.push({
      level: "error",
      message: `A largura deve ficar entre ${wMin} e ${wMax} cm.`,
    });
  if (cfg.height < hMin || cfg.height > hMax)
    issues.push({
      level: "error",
      message: `A altura deve ficar entre ${hMin} e ${hMax} cm.`,
    });
  if (cfg.depth < dMin || cfg.depth > dMax)
    issues.push({
      level: "error",
      message: `A profundidade deve ficar entre ${dMin} e ${dMax} cm.`,
    });

  if (cfg.drawers > 0 && cfg.depth < def.minDrawerDepth)
    issues.push({
      level: "error",
      message: `Essa configuração não é possível com a profundidade atual: gavetas precisam de pelo menos ${def.minDrawerDepth} cm.`,
    });

  const doorW = cfg.doors > 0 ? cfg.width / cfg.doors : 0;
  if (cfg.doors > 0 && doorW > 70)
    issues.push({
      level: "warning",
      message: `Cada porta ficaria com ${Math.round(doorW)} cm. Acima de 70 cm recomendamos mais portas.`,
    });
  if (cfg.doors > 0 && doorW < 25)
    issues.push({
      level: "error",
      message: "Muitas portas para essa largura — reduza a quantidade.",
    });

  const innerW = cfg.width - 2 * cfg.panelThickness;
  const colW = (innerW - (cfg.columns - 1) * cfg.panelThickness) / cfg.columns;
  if (colW < 25)
    issues.push({
      level: "error",
      message: "Muitos módulos para essa largura — cada módulo ficaria estreito demais.",
    });

  const innerH = cfg.height - 2 * cfg.panelThickness;
  if (cfg.shelves > 0 && innerH / (cfg.shelves / cfg.columns + 1) < 18)
    issues.push({
      level: "warning",
      message: "As prateleiras ficariam muito próximas para essa altura.",
    });

  if (cfg.hanger && cfg.height < 120)
    issues.push({
      level: "warning",
      message: "O cabideiro precisa de pelo menos 120 cm de altura para ser útil.",
    });

  if (cfg.doorStyle === "correr" && cfg.doors > 0 && cfg.width / Math.max(2, cfg.doors) < 40)
    issues.push({
      level: "warning",
      message: "Portas de correr muito estreitas — reduza a quantidade de folhas.",
    });

  return issues;
}
