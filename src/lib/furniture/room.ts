import { useCallback, useMemo, useRef, useState } from "react";
import type { FurnitureConfig, FurnitureType, Part } from "./types";
import { typeDef } from "./types";
import { buildFurniture, normalizeConfig, validate } from "./builder";
import { computePrice, DEFAULT_PRICES, type PriceBreakdown } from "./pricing";
import { BASE_CONFIG } from "./store";

export type EnvironmentId = "quarto" | "closet" | "sala" | "cozinha" | "home-office" | "banheiro";

export interface EnvironmentDef {
  id: EnvironmentId;
  label: string;
  /** room size in cm */
  size: { w: number; d: number; h: number };
  wall: string;
  floor: string;
  suggested: FurnitureType[];
}

export const ENVIRONMENTS: EnvironmentDef[] = [
  {
    id: "quarto",
    label: "Quarto",
    size: { w: 400, d: 380, h: 270 },
    wall: "#e8e2d8",
    floor: "#b98f5d",
    suggested: ["guarda-roupa", "criado-mudo", "comoda", "cabeceira"],
  },
  {
    id: "closet",
    label: "Closet",
    size: { w: 320, d: 300, h: 260 },
    wall: "#ded7cc",
    floor: "#a9855a",
    suggested: ["guarda-roupa-correr", "comoda", "gaveteiro"],
  },
  {
    id: "sala",
    label: "Sala",
    size: { w: 500, d: 420, h: 280 },
    wall: "#eee9e1",
    floor: "#c9a878",
    suggested: ["rack", "painel-tv", "estante", "aparador"],
  },
  {
    id: "cozinha",
    label: "Cozinha",
    size: { w: 420, d: 360, h: 270 },
    wall: "#f0efeb",
    floor: "#cfc9c0",
    suggested: ["cozinha", "cozinha-superior", "torre-quente", "balcao", "ilha"],
  },
  {
    id: "home-office",
    label: "Home office",
    size: { w: 380, d: 340, h: 270 },
    wall: "#e7e4dd",
    floor: "#b98f5d",
    suggested: ["mesa", "gaveteiro", "home-office", "estante"],
  },
  {
    id: "banheiro",
    label: "Banheiro",
    size: { w: 260, d: 240, h: 250 },
    wall: "#e9eded",
    floor: "#d5d2cb",
    suggested: ["banheiro"],
  },
];

export function environmentDef(id: EnvironmentId): EnvironmentDef {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0]!;
}

export interface RoomItem {
  id: string;
  config: FurnitureConfig;
  /** floor position in cm, origin at room center */
  x: number;
  z: number;
  /** rotation around Y in degrees */
  rot: number;
}

export interface RoomState {
  name: string;
  environment: EnvironmentId;
  items: RoomItem[];
  selectedItemId: string | null;
}

export function configFor(type: FurnitureType): FurnitureConfig {
  const d = typeDef(type);
  return normalizeConfig({ ...BASE_CONFIG, type, niches: 0, ...d.defaults });
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function makeItem(type: FurnitureType, x = 0, z = 0, rot = 0): RoomItem {
  return { id: uid(), config: configFor(type), x, z, rot };
}

export function initialRoom(environment: EnvironmentId = "quarto"): RoomState {
  const first = makeItem("guarda-roupa");
  const env = environmentDef(environment);
  first.z = -env.size.d / 2 + first.config.depth / 2;
  return {
    name: "Novo ambiente",
    environment,
    items: [first],
    selectedItemId: first.id,
  };
}

/** furniture footprint after rotation (cm) */
export function footprint(item: RoomItem): { w: number; d: number } {
  const a = (item.rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const { width, depth } = item.config;
  return { w: width * c + depth * s, d: width * s + depth * c };
}

export function clampToRoom(item: RoomItem, env: EnvironmentDef): { x: number; z: number } {
  const { w, d } = footprint(item);
  const maxX = Math.max(0, env.size.w / 2 - w / 2);
  const maxZ = Math.max(0, env.size.d / 2 - d / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, item.x)),
    z: Math.min(maxZ, Math.max(-maxZ, item.z)),
  };
}

const HISTORY_LIMIT = 60;

export function useRoom(initial: RoomState = initialRoom()) {
  const [room, setRoom] = useState<RoomState>(initial);
  const [selected, setSelected] = useState<string | null>(null); // selected PART inside the item
  const past = useRef<RoomState[]>([]);
  const future = useRef<RoomState[]>([]);
  const lastTag = useRef<{ tag: string; at: number } | null>(null);
  const [, bump] = useState(0);

  /** Applies a change and records it in the undo stack. Repeated changes with
   *  the same tag inside 700 ms are merged (dragging, sliders...). */
  const commit = useCallback((fn: (r: RoomState) => RoomState, tag?: string) => {
    setRoom((prev) => {
      const now = Date.now();
      const merge =
        tag && lastTag.current && lastTag.current.tag === tag && now - lastTag.current.at < 700;
      if (!merge) {
        past.current = [...past.current, prev].slice(-HISTORY_LIMIT);
        future.current = [];
      }
      lastTag.current = tag ? { tag, at: now } : null;
      return fn(prev);
    });
    bump((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    setRoom((prev) => {
      const p = past.current.pop();
      if (!p) return prev;
      future.current = [prev, ...future.current].slice(0, HISTORY_LIMIT);
      lastTag.current = null;
      return p;
    });
    bump((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    setRoom((prev) => {
      const [f, ...rest] = future.current;
      if (!f) return prev;
      future.current = rest;
      past.current = [...past.current, prev].slice(-HISTORY_LIMIT);
      lastTag.current = null;
      return f;
    });
    bump((n) => n + 1);
  }, []);

  const env = environmentDef(room.environment);
  const item = room.items.find((i) => i.id === room.selectedItemId) ?? room.items[0] ?? null;
  const config = item?.config ?? BASE_CONFIG;

  const patchItem = useCallback(
    (id: string, patch: (i: RoomItem) => RoomItem, tag?: string) =>
      commit(
        (r) => ({
          ...r,
          items: r.items.map((i) => (i.id === id ? patch(i) : i)),
        }),
        tag,
      ),
    [commit],
  );

  const set = useCallback(
    <K extends keyof FurnitureConfig>(key: K, value: FurnitureConfig[K]) => {
      if (!item) return;
      patchItem(
        item.id,
        (i) => ({ ...i, config: { ...i.config, [key]: value } }),
        `set:${item.id}:${String(key)}`,
      );
    },
    [item, patchItem],
  );

  const setConfig = useCallback(
    (next: FurnitureConfig | ((c: FurnitureConfig) => FurnitureConfig)) => {
      if (!item) return;
      patchItem(item.id, (i) => ({
        ...i,
        config: normalizeConfig(typeof next === "function" ? next(i.config) : next),
      }));
    },
    [item, patchItem],
  );

  const setType = useCallback(
    (type: FurnitureType) => {
      if (!item) return;
      patchItem(item.id, (i) => {
        const d = typeDef(type);
        const next = normalizeConfig({
          ...i.config,
          type,
          niches: 0,
          ...d.defaults,
        });
        const clamp = (v: number, [a, b]: [number, number]) => Math.min(b, Math.max(a, v));
        next.width = clamp(next.width, d.limits.width);
        next.height = clamp(next.height, d.limits.height);
        next.depth = clamp(next.depth, d.limits.depth);
        return { ...i, config: next };
      });
    },
    [item, patchItem],
  );

  const addItem = useCallback(
    (type: FurnitureType) => {
      const e = environmentDef(room.environment);
      const n = makeItem(type);
      n.z = -e.size.d / 2 + n.config.depth / 2;
      n.x = Math.min(
        e.size.w / 2 - n.config.width / 2,
        -e.size.w / 2 + n.config.width / 2 + room.items.length * 40,
      );
      const c = clampToRoom(n, e);
      n.x = c.x;
      n.z = c.z;
      commit((r) => ({ ...r, items: [...r.items, n], selectedItemId: n.id }));
      setSelected(null);
    },
    [commit, room.environment, room.items.length],
  );

  const duplicateItem = useCallback(
    (id: string) => {
      commit((r) => {
        const src = r.items.find((i) => i.id === id);
        if (!src) return r;
        const copy: RoomItem = {
          ...src,
          id: uid(),
          x: src.x + 30,
          z: src.z + 30,
        };
        const c = clampToRoom(copy, environmentDef(r.environment));
        copy.x = c.x;
        copy.z = c.z;
        return { ...r, items: [...r.items, copy], selectedItemId: copy.id };
      });
    },
    [commit],
  );

  const removeItem = useCallback(
    (id: string) => {
      commit((r) => {
        const items = r.items.filter((i) => i.id !== id);
        return {
          ...r,
          items,
          selectedItemId: r.selectedItemId === id ? (items[0]?.id ?? null) : r.selectedItemId,
        };
      });
      setSelected(null);
    },
    [commit],
  );

  const selectItem = useCallback((id: string | null) => {
    setRoom((r) => (r.selectedItemId === id ? r : { ...r, selectedItemId: id }));
    setSelected(null);
  }, []);

  const moveItem = useCallback(
    (id: string, x: number, z: number, live = true) => {
      patchItem(
        id,
        (i) => {
          const moved = { ...i, x, z };
          const c = clampToRoom(moved, environmentDef(room.environment));
          return { ...moved, ...c };
        },
        live ? `move:${id}` : undefined,
      );
    },
    [patchItem, room.environment],
  );

  const rotateItem = useCallback(
    (id: string, rot: number) => {
      patchItem(
        id,
        (i) => {
          const r = { ...i, rot: ((rot % 360) + 360) % 360 };
          return { ...r, ...clampToRoom(r, environmentDef(room.environment)) };
        },
        `rot:${id}`,
      );
    },
    [patchItem, room.environment],
  );

  /** snaps the item flat against the nearest wall */
  const snapToWall = useCallback(
    (id: string) => {
      patchItem(id, (i) => {
        const e = environmentDef(room.environment);
        const d = [
          {
            rot: 0,
            dist: Math.abs(-e.size.d / 2 - i.z),
            pos: { x: i.x, z: -e.size.d / 2 + i.config.depth / 2 },
          },
          {
            rot: 180,
            dist: Math.abs(e.size.d / 2 - i.z),
            pos: { x: i.x, z: e.size.d / 2 - i.config.depth / 2 },
          },
          {
            rot: 90,
            dist: Math.abs(-e.size.w / 2 - i.x),
            pos: { x: -e.size.w / 2 + i.config.depth / 2, z: i.z },
          },
          {
            rot: 270,
            dist: Math.abs(e.size.w / 2 - i.x),
            pos: { x: e.size.w / 2 - i.config.depth / 2, z: i.z },
          },
        ].sort((a, b) => a.dist - b.dist)[0]!;
        const next = { ...i, rot: d.rot, ...d.pos };
        return {
          ...next,
          ...clampToRoom(next, environmentDef(room.environment)),
        };
      });
    },
    [patchItem, room.environment],
  );

  const setEnvironment = useCallback(
    (id: EnvironmentId) => commit((r) => ({ ...r, environment: id })),
    [commit],
  );

  const setName = useCallback((name: string) => commit((r) => ({ ...r, name }), "name"), [commit]);

  const loadRoom = useCallback((state: RoomState) => {
    past.current = [];
    future.current = [];
    setRoom({
      ...state,
      items: state.items.map((i) => ({
        ...i,
        config: normalizeConfig(i.config),
      })),
    });
    setSelected(null);
  }, []);

  const parts = useMemo(() => (item ? buildFurniture(item.config) : []), [item]);
  const issues = useMemo(() => (item ? validate(item.config) : []), [item]);
  const price = useMemo(() => computePrice(config, parts, DEFAULT_PRICES), [config, parts]);

  const itemParts = useMemo(
    () => room.items.map((i) => ({ item: i, parts: buildFurniture(i.config) })),
    [room.items],
  );

  const roomPrice = useMemo<PriceBreakdown>(() => {
    return itemParts
      .map(({ item: i, parts: p }) => computePrice(i.config, p, DEFAULT_PRICES))
      .reduce(
        (a, b) => ({
          mdf: a.mdf + b.mdf,
          ferragens: a.ferragens + b.ferragens,
          gavetas: a.gavetas + b.gavetas,
          portas: a.portas + b.portas,
          espelho: a.espelho + b.espelho,
          vidro: a.vidro + b.vidro,
          acessorios: a.acessorios + b.acessorios,
          iluminacao: a.iluminacao + b.iluminacao,
          maoDeObra: a.maoDeObra + b.maoDeObra,
          montagem: a.montagem + b.montagem,
          total: a.total + b.total,
          areaM2: Math.round((a.areaM2 + b.areaM2) * 100) / 100,
        }),
        {
          mdf: 0,
          ferragens: 0,
          gavetas: 0,
          portas: 0,
          espelho: 0,
          vidro: 0,
          acessorios: 0,
          iluminacao: 0,
          maoDeObra: 0,
          montagem: 0,
          total: 0,
          areaM2: 0,
        } as PriceBreakdown,
      );
  }, [itemParts]);

  const removePart = useCallback(
    (id: string) => {
      setSelected(null);
      if (!item) return;
      patchItem(item.id, (i) => {
        const c = i.config;
        let next = c;
        if (id.startsWith("porta")) next = { ...c, doors: Math.max(0, c.doors - 1) };
        else if (id.startsWith("gaveta")) next = { ...c, drawers: Math.max(0, c.drawers - 1) };
        else if (id.startsWith("prateleira")) next = { ...c, shelves: Math.max(0, c.shelves - 1) };
        else if (id.startsWith("divisoria")) next = { ...c, columns: Math.max(1, c.columns - 1) };
        else if (id.startsWith("nicho")) next = { ...c, niches: Math.max(0, c.niches - 1) };
        else if (id === "cabideiro") next = { ...c, hanger: false };
        else if (id === "espelho") next = { ...c, mirror: false };
        else if (id === "espelho-interno") next = { ...c, mirrorInside: false };
        else if (id.startsWith("acc-")) {
          const acc = ACCESSORY_BY_PART[id.replace(/-\d+$/, "")];
          if (acc)
            next = {
              ...c,
              accessories: c.accessories.filter((a) => a !== acc),
            };
        }
        return { ...i, config: next };
      });
    },
    [item, patchItem],
  );

  return {
    room,
    env,
    item,
    items: room.items,
    itemParts,
    config,
    parts,
    issues,
    price,
    roomPrice,
    selected,
    setSelected,
    set,
    setConfig,
    setType,
    addItem,
    duplicateItem,
    removeItem,
    selectItem,
    moveItem,
    rotateItem,
    snapToWall,
    setEnvironment,
    setName,
    loadRoom,
    removePart,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}

const ACCESSORY_BY_PART: Record<string, import("./types").AccessoryId> = {
  "acc-sapateira": "sapateira",
  "acc-calceiro": "calceiro",
  "acc-cabideiro-retratil": "cabideiro-retratil",
  "acc-divisoria": "divisorias",
  "acc-gaveta-interna": "gavetas-internas",
  "acc-organizador": "organizador",
  "acc-temperos": "porta-temperos",
  "acc-lixeira": "lixeira",
  "acc-tomadas": "torre-tomadas",
  "acc-ripado": "painel-ripado",
  "acc-suporte-tv": "suporte-tv",
  "acc-cabos": "passagem-cabos",
  "acc-monitor": "suporte-monitor",
};

export type Editor = ReturnType<typeof useRoom>;

/** technical sheet used by the spec panel and the quote */
export function specSheet(config: FurnitureConfig, parts: Part[]) {
  const count = (k: Part["kind"]) => parts.filter((p) => p.kind === k).length;
  return {
    dimensions: `${config.width} × ${config.height} × ${config.depth} cm`,
    thickness: `${config.panelThickness * 10} mm`,
    doors: count("porta"),
    drawers: count("gaveta"),
    shelves: count("prateleira"),
    niches: count("nicho"),
    hangers: count("cabideiro"),
    mirrors: count("espelho"),
    handles: count("puxador"),
    led: count("led"),
    accessories: parts.filter((p) => p.kind === "acessorio").map((p) => p.label),
    pieces: parts.length,
  };
}
