import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import type { SetStateAction } from "react";
import type { FurnitureConfig, FurnitureType, ModularComponentType } from "./types";
import { typeDef } from "./types";
import { buildFurniture, normalizeConfig, validate } from "./builder";
import { computePrice, DEFAULT_PRICES, combinePrices } from "./pricing";
import { parseFurnitureConfig } from "./configValidation";
import { findModularPlacement, findNichePlacement } from "./placement";
import { componentDef } from "./components";
import { clampFurnitureFloor } from "./roomBounds";
import { supabase } from "@/lib/supabase";

export const BASE_CONFIG: FurnitureConfig = normalizeConfig({
  type: "guarda-roupa",
  width: 240,
  height: 220,
  depth: 60,
  columns: 3,
  doors: 4,
  doorStyle: "simples",
  drawers: 3,
  shelves: 6,
  niches: 0,
  hanger: true,
  mirror: false,
  material: "carvalho",
  panelThickness: 1.8,
  showDimensions: false,
  openDoors: false,
});

type ConfigHistory = {
  present: FurnitureConfig;
  past: FurnitureConfig[];
  future: FurnitureConfig[];
  tag?: string | undefined;
  at?: number;
};
type ConfigAction =
  | { type: "change"; update: SetStateAction<FurnitureConfig>; tag?: string }
  | { type: "undo" }
  | { type: "redo" };

function configHistory(state: ConfigHistory, action: ConfigAction): ConfigHistory {
  if (action.type === "undo") {
    if (!state.past.length) return state;
    return {
      present: state.past[state.past.length - 1]!,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future].slice(0, 80),
    };
  }
  if (action.type === "redo") {
    if (!state.future.length) return state;
    return {
      present: state.future[0]!,
      past: [...state.past, state.present].slice(-80),
      future: state.future.slice(1),
    };
  }
  const next =
    typeof action.update === "function"
      ? (action.update as (value: FurnitureConfig) => FurnitureConfig)(state.present)
      : action.update;
  if (next === state.present) return state;
  const now = Date.now();
  const merge = action.tag && action.tag === state.tag && now - (state.at ?? 0) < 700;
  return {
    present: next,
    past: merge ? state.past : [...state.past, state.present].slice(-80),
    future: [],
    tag: action.tag,
    at: now,
  };
}

export interface SavedProject {
  id: string;
  code: string;
  createdAt: string;
  config: FurnitureConfig;
  price: number;
  customer?: {
    name: string;
    phone: string;
    email: string;
    city: string;
    notes: string;
  };
  status: string;
}

const STORAGE_KEY = "marcenaria.projects";
let projectOwner: string | null = null;
export function setLocalProjectOwner(userId: string | null) {
  projectOwner = userId;
}
const storageKey = () => `${STORAGE_KEY}:${projectOwner ?? "guest"}`;

async function currentUser() {
  if (!supabase) return null;
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  setLocalProjectOwner(user?.id ?? null);
  return user;
}

export function loadProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const serialized =
      window.localStorage.getItem(storageKey()) ??
      (projectOwner ? "[]" : (window.localStorage.getItem(STORAGE_KEY) ?? "[]"));
    const projects: unknown = JSON.parse(serialized);
    if (!Array.isArray(projects)) return [];
    return projects.flatMap((project) => {
      try {
        if (
          !project ||
          typeof project.id !== "string" ||
          typeof project.code !== "string" ||
          !Number.isFinite(project.price)
        )
          return [];
        return [
          {
            ...project,
            config: normalizeConfig(parseFurnitureConfig(project.config) as FurnitureConfig),
          },
        ];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export async function persistProject(project: SavedProject) {
  if (supabase) {
    const user = await currentUser();
    if (user) {
      const { error } = await supabase.from("projects").upsert({
        id: project.id,
        user_id: user.id,
        code: project.code,
        created_at: project.createdAt,
        config: project.config,
        price: project.price,
        customer: project.customer ?? null,
        status: project.status,
      });
      if (error) throw error;
      return { project, cloud: true };
    }
  }
  const all = loadProjects();
  const next = [project, ...all.filter((p) => p.id !== project.id)];
  window.localStorage.setItem(storageKey(), JSON.stringify(next));
  return { project, cloud: false };
}

export async function fetchProjects(): Promise<SavedProject[]> {
  if (!supabase) return loadProjects();
  const user = await currentUser();
  const local = loadProjects();
  if (!user) return local;
  const { data, error } = await supabase
    .from("projects")
    .select("id, code, created_at, config, price, customer, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return [
    ...(data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      createdAt: row.created_at,
      config: row.config as FurnitureConfig,
      price: Number(row.price),
      customer: row.customer ?? undefined,
      status: row.status,
    })),
    ...local.filter((p) => !(data ?? []).some((row) => row.id === p.id)),
  ];
}

export async function deleteProject(id: string) {
  if (supabase) {
    const user = await currentUser();
    if (user) {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    }
  }
  window.localStorage.setItem(
    storageKey(),
    JSON.stringify(loadProjects().filter((p) => p.id !== id)),
  );
}

export function nextProjectCode() {
  return `M3D-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export function useConfigurator(initial: FurnitureConfig = BASE_CONFIG) {
  const [history, dispatch] = useReducer(configHistory, initial, (present): ConfigHistory => ({
    present: normalizeConfig(present),
    past: [],
    future: [],
  }));
  const config = history.present;
  const setConfig = useCallback(
    (update: SetStateAction<FurnitureConfig>) => dispatch({ type: "change", update }),
    [],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const undo = useCallback(() => {
    dispatch({ type: "undo" });
    setSelected(null);
  }, []);
  const redo = useCallback(() => {
    dispatch({ type: "redo" });
    setSelected(null);
  }, []);

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        !["z", "y"].includes(event.key.toLowerCase()) ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;
      event.preventDefault();
      if (event.key.toLowerCase() === "y" || event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [undo, redo]);

  const set = useCallback(
    <K extends keyof FurnitureConfig>(key: K, value: FurnitureConfig[K]) => {
      setConfig((c) => {
        const next =
          key === "material"
            ? {
                ...c,
                material: value as string,
                materials: {
                  estrutura: value as string,
                  portas: value as string,
                  interior: value as string,
                  fundo: value as string,
                },
              }
            : { ...c, [key]: value };
        const normalized = normalizeConfig(next);
        return {
          ...normalized,
          floorPosition: clampFurnitureFloor(normalized, normalized.floorPosition ?? [0, 0]),
        };
      });
    },
    [setConfig],
  );

  const moveAccessory = useCallback(
    (id: string, offset: [number, number, number]) => {
      setConfig((c) => ({
        ...c,
        accessoryOffsets: {
          ...c.accessoryOffsets,
          [id]: offset.map((value, axis) =>
            Math.max(axis === 1 ? -80 : -50, Math.min(axis === 1 ? 80 : 50, value)),
          ) as [number, number, number],
        },
      }));
    },
    [setConfig],
  );

  const moveComponent = useCallback((id: string, offset: [number, number, number]) => {
    dispatch({
      type: "change",
      tag: `drag:${id}`,
      update: (c) => ({
        ...c,
        componentOffsets: { ...c.componentOffsets, [id]: offset },
      }),
    });
  }, []);

  const addNicheAt = useCallback(
    (x: number, y: number) => {
      if (config.niches >= 6) return false;
      const id = `nicho-${config.niches}`;
      const offsets = { ...config.componentOffsets };
      delete offsets[id];
      const next = {
        ...config,
        niches: config.niches + 1,
        componentOffsets: offsets,
      };
      const existing = buildFurniture(next);
      const niche = existing.find((part) => part.id === id);
      if (!niche) return false;
      const position = findNichePlacement(next, existing, niche, x, y);
      if (!position) return false;
      next.componentOffsets[id] = [position[0] - niche.pos[0], position[1] - niche.pos[1], 0];
      setConfig(next);
      setSelected(id);
      return true;
    },
    [config, setConfig],
  );

  const addComponent = useCallback(
    (type: ModularComponentType, x: number, y: number) => {
      const definition = componentDef(type);
      if (
        !definition?.allowed.includes(typeDef(config.type).category) ||
        config.depth < (definition.minDepth ?? 0)
      )
        return false;
      if (
        (config.componentInstances?.length ?? 0) >= 60 ||
        (definition.kind === "led" &&
          (config.componentInstances ?? []).filter(
            (part) => componentDef(part.type)?.kind === "led",
          ).length >= 6)
      )
        return false;
      const id = `mod-${crypto.randomUUID()}`;
      const instance = {
        id,
        type,
        position: [x, y, 0] as [number, number, number],
      };
      const next = {
        ...config,
        componentInstances: [...(config.componentInstances ?? []), instance],
      };
      const parts = buildFurniture(next);
      const candidate = parts.find((part) => part.id === id);
      if (!candidate) return false;
      const position = findModularPlacement(next, parts, candidate, x, y);
      if (!position) return false;
      instance.position = position;
      setConfig(next);
      setSelected(id);
      return true;
    },
    [config, setConfig],
  );

  const duplicateComponent = useCallback(
    (id: string) => {
      const original = config.componentInstances?.find((part) => part.id === id);
      if (!original) return false;
      const newId = `mod-${crypto.randomUUID()}`;
      const copy = {
        ...original,
        id: newId,
        position: [...original.position] as [number, number, number],
      };
      const next = {
        ...config,
        componentInstances: [...(config.componentInstances ?? []), copy],
      };
      const parts = buildFurniture(next);
      const candidate = parts.find((part) => part.id === newId);
      if (!candidate) return false;
      const position = findModularPlacement(
        next,
        parts,
        candidate,
        original.position[0],
        original.position[1] + candidate.size[1] + 2,
      );
      if (!position) return false;
      copy.position = position;
      setConfig(next);
      setSelected(newId);
      return true;
    },
    [config, setConfig],
  );

  const setComponentMaterial = useCallback(
    (id: string, material: string) => {
      setConfig((c) => ({
        ...c,
        componentInstances: (c.componentInstances ?? []).map((part) =>
          part.id === id ? { ...part, material } : part,
        ),
      }));
    },
    [setConfig],
  );

  const selectFurniture = useCallback(
    (id: string) => {
      setConfig((current) => {
        if (id === (current.activeFurnitureId ?? "primary")) return current;
        const target = current.roomItems?.find((item) => item.id === id);
        if (!target) return current;
        const { roomItems: _items, activeFurnitureId: _active, ...single } = current;
        return {
          ...target.config,
          floorPosition: target.position,
          activeFurnitureId: id,
          roomItems: [
            ...(current.roomItems ?? []).filter((item) => item.id !== id),
            {
              id: current.activeFurnitureId ?? "primary",
              position: current.floorPosition ?? [0, 0],
              config: single,
            },
          ],
        };
      });
      setSelected(null);
    },
    [setConfig],
  );

  const addFurniture = useCallback(
    (type: FurnitureType) => {
      const limit =
        typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? 3 : 8;
      if ((config.roomItems?.length ?? 0) >= limit) return false;
      const definition = typeDef(type);
      const next = normalizeConfig({
        ...BASE_CONFIG,
        type,
        ...definition.defaults,
        roomItems: [],
      });
      const occupied = [
        { config, position: config.floorPosition ?? [0, 0] },
        ...(config.roomItems ?? []),
      ];
      let position: [number, number] | null = null;
      for (let ring = 1; ring <= 18 && !position; ring++) {
        const candidates: [number, number][] = [
          [ring * 50, 0],
          [-ring * 50, 0],
          [0, ring * 50],
          [0, -ring * 50],
        ];
        position =
          candidates.find(([x, z]) =>
            occupied.every(
              (item) =>
                Math.abs(x - item.position[0]) >= (next.width + item.config.width) / 2 + 15 ||
                Math.abs(z - item.position[1]) >= (next.depth + item.config.depth) / 2 + 15,
            ),
          ) ?? null;
      }
      if (!position) return false;
      const { roomItems: _items, activeFurnitureId: _active, ...single } = config;
      const id = crypto.randomUUID();
      setConfig({
        ...next,
        activeFurnitureId: id,
        floorPosition: position,
        roomItems: [
          ...(config.roomItems ?? []),
          {
            id: config.activeFurnitureId ?? "primary",
            position: config.floorPosition ?? [0, 0],
            config: single,
          },
        ],
      });
      setSelected(null);
      return true;
    },
    [config, setConfig],
  );

  const duplicateFurniture = useCallback(() => {
    const added = addFurniture(config.type);
    if (!added) return false;
    const {
      roomItems: _items,
      activeFurnitureId: _active,
      floorPosition: _position,
      ...single
    } = config;
    const componentOffsets = { ...config.componentOffsets };
    const componentInstances =
      config.componentInstances?.map((part) => {
        const id = `mod-${crypto.randomUUID()}`;
        const savedOffset = componentOffsets[part.id];
        if (savedOffset) {
          componentOffsets[id] = savedOffset;
          delete componentOffsets[part.id];
        }
        return { ...part, id };
      }) ?? [];
    setConfig((current) => ({
      ...single,
      activeFurnitureId: current.activeFurnitureId ?? "primary",
      floorPosition: current.floorPosition ?? [0, 0],
      roomItems: current.roomItems ?? [],
      componentInstances,
      componentOffsets,
    }));
    return true;
  }, [addFurniture, config, setConfig]);

  const removeFurniture = useCallback(
    (id: string) => {
      if (id !== (config.activeFurnitureId ?? "primary")) {
        setConfig((current) => ({
          ...current,
          roomItems: (current.roomItems ?? []).filter((item) => item.id !== id),
        }));
        return;
      }
      const [first, ...rest] = config.roomItems ?? [];
      if (!first) return;
      setConfig({
        ...first.config,
        floorPosition: first.position,
        activeFurnitureId: first.id,
        roomItems: rest,
      });
      setSelected(null);
    },
    [config, setConfig],
  );

  const setType = useCallback(
    (type: FurnitureType) => {
      setConfig((c) => {
        const d = typeDef(type);
        const next = { ...BASE_CONFIG, ...c, type, niches: 0, ...d.defaults };
        // keep dimensions inside the new type's limits
        const clamp = (v: number, [a, b]: [number, number]) => Math.min(b, Math.max(a, v));
        next.width = clamp(next.width, d.limits.width);
        next.height = clamp(next.height, d.limits.height);
        next.depth = clamp(next.depth, d.limits.depth);
        return {
          ...next,
          floorPosition: clampFurnitureFloor(next, next.floorPosition ?? [0, 0]),
        };
      });
    },
    [setConfig],
  );

  const {
    roomItems: _roomItems,
    floorPosition: _floorPosition,
    floorRotation: _floorRotation,
    floorElevation: _floorElevation,
    activeFurnitureId: _activeId,
    openDoors: _openDoors,
    showDimensions: _showDimensions,
    ...geometryConfig
  } = config;
  const geometryKey = JSON.stringify(geometryConfig);
  const parts = useMemo(
    () => buildFurniture(JSON.parse(geometryKey) as FurnitureConfig),
    [geometryKey],
  );
  const issues = useMemo(() => validate(config), [config]);
  const otherPrices = useMemo(
    () =>
      (config.roomItems ?? []).map((item) =>
        computePrice(item.config, buildFurniture(item.config), DEFAULT_PRICES),
      ),
    [config.roomItems],
  );
  const price = useMemo(() => {
    const values = [computePrice(config, parts, DEFAULT_PRICES), ...otherPrices];
    return combinePrices(values);
  }, [config, parts, otherPrices]);

  const removePart = useCallback(
    (id: string) => {
      setSelected(null);
      setConfig((c) => {
        if (id.startsWith("mod-")) {
          const offsets = { ...c.componentOffsets };
          delete offsets[id];
          return {
            ...c,
            componentOffsets: offsets,
            componentInstances: (c.componentInstances ?? []).filter((part) => part.id !== id),
          };
        }
        if (id.startsWith("porta")) return { ...c, doors: Math.max(0, c.doors - 1) };
        if (id.startsWith("gaveta")) return { ...c, drawers: Math.max(0, c.drawers - 1) };
        if (id.startsWith("prateleira")) return { ...c, shelves: Math.max(0, c.shelves - 1) };
        if (id.startsWith("divisoria")) return { ...c, columns: Math.max(1, c.columns - 1) };
        if (id.startsWith("nicho")) return { ...c, niches: Math.max(0, c.niches - 1) };
        if (id === "cabideiro") return { ...c, hanger: false };
        if (id === "espelho") return { ...c, mirror: false };
        if (id === "espelho-interno") return { ...c, mirrorInside: false };
        if (id.startsWith("acc-")) {
          const accessory = id.startsWith("acc-sapateira")
            ? "sapateira"
            : id.startsWith("acc-gaveta-interna")
              ? "gavetas-internas"
              : (
                  {
                    "acc-calceiro": "calceiro",
                    "acc-cabideiro-retratil": "cabideiro-retratil",
                    "acc-divisoria": "divisorias",
                    "acc-organizador": "organizador",
                    "acc-temperos": "porta-temperos",
                    "acc-lixeira": "lixeira",
                    "acc-tomadas": "torre-tomadas",
                    "acc-ripado": "painel-ripado",
                    "acc-suporte-tv": "suporte-tv",
                    "acc-cabos": "passagem-cabos",
                    "acc-monitor": "suporte-monitor",
                  } as Record<string, string>
                )[id];
          if (accessory)
            return {
              ...c,
              accessories: c.accessories.filter((a) => a !== accessory),
            };
        }
        return c;
      });
    },
    [setConfig],
  );

  return {
    config,
    setConfig,
    set,
    setType,
    parts,
    issues,
    price,
    selected,
    setSelected,
    moveAccessory,
    moveComponent,
    addNicheAt,
    addComponent,
    duplicateComponent,
    setComponentMaterial,
    removePart,
    addFurniture,
    selectFurniture,
    duplicateFurniture,
    removeFurniture,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

export type Configurator = ReturnType<typeof useConfigurator>;
