import type { FurnitureConfig, Part } from "./types.ts";
import { material } from "./materials.ts";
import { buildFurniture, normalizeConfig } from "./builder.ts";

export interface PriceTable {
  hardwarePerDoor: number;
  hardwarePerDrawer: number;
  drawerBox: number;
  hangerRod: number;
  mirrorPerM2: number;
  laborPerM2: number;
  assemblyBase: number;
  assemblyPerMeter: number;
}

export const DEFAULT_PRICES: PriceTable = {
  hardwarePerDoor: 95,
  hardwarePerDrawer: 85,
  drawerBox: 110,
  hangerRod: 70,
  mirrorPerM2: 420,
  laborPerM2: 210,
  assemblyBase: 250,
  assemblyPerMeter: 60,
};

export interface PriceBreakdown {
  mdf: number;
  ferragens: number;
  gavetas: number;
  portas: number;
  espelho: number;
  vidro: number;
  acessorios: number;
  iluminacao: number;
  maoDeObra: number;
  montagem: number;
  total: number;
  areaM2: number;
}

const m2 = (part: Part) => {
  const w = part.size[0] / 100;
  const h = part.size[1] / 100;
  const d = part.size[2] / 100;
  // largest face of the panel
  return Math.max(w * h, w * d, h * d);
};

export function computePrice(
  cfg: FurnitureConfig,
  parts: Part[],
  prices: PriceTable = DEFAULT_PRICES,
): PriceBreakdown {
  cfg = normalizeConfig(cfg);
  const panels = parts.filter(
    (p) => !["espelho", "cabideiro", "cabide", "puxador", "led", "acessorio"].includes(p.kind),
  );
  const areaM2 = panels.reduce((sum, p) => sum + m2(p), 0);

  const doorParts = parts.filter((p) => p.kind === "porta");
  const drawerParts = parts.filter((p) => p.kind === "gaveta");
  const mirrorParts = parts.filter((p) => p.kind === "espelho");

  // Glass is accounted for in `vidro`; charge a wooden frame only if the
  // builder actually supplied one as a separate part.
  const panelPrice = (p: Part) =>
    p.face === "vidro" || p.material === "vidro"
      ? 0
      : m2(p) * material(p.material ?? cfg.material).pricePerM2;
  const mdf = panels
    .filter((p) => p.kind !== "porta" && p.kind !== "gaveta")
    .reduce((sum, p) => sum + panelPrice(p), 0);
  const portas = doorParts.reduce((sum, p) => sum + panelPrice(p), 0);
  const gavetas =
    drawerParts.reduce((sum, p) => sum + panelPrice(p), 0) + drawerParts.length * prices.drawerBox;
  const ferragens =
    doorParts.length * prices.hardwarePerDoor +
    drawerParts.length * prices.hardwarePerDrawer +
    parts.filter((part) => part.kind === "cabideiro").length * prices.hangerRod;
  const glassParts = parts.filter((p) => p.face === "vidro" || p.material === "vidro");
  const vidro = glassParts.reduce((s2, p) => s2 + m2(p), 0) * prices.mirrorPerM2 * 0.8;
  const acessorios =
    ((cfg.accessories?.length ?? 0) +
      parts.filter((part) => part.id.startsWith("mod-") && part.kind === "acessorio").length) *
    180;
  const iluminacao =
    (cfg.led?.on ? 240 : 0) +
    parts.filter((part) => part.id.startsWith("mod-") && part.kind === "led").length * 80;
  const espelho = mirrorParts.reduce((s, p) => s + m2(p), 0) * prices.mirrorPerM2;
  const maoDeObra = areaM2 * prices.laborPerM2;
  const montagem = prices.assemblyBase + (cfg.width / 100) * prices.assemblyPerMeter;

  const round = (n: number) => Math.round(n / 10) * 10;
  const b = {
    mdf: round(mdf),
    ferragens: round(ferragens),
    gavetas: round(gavetas),
    portas: round(portas),
    espelho: round(espelho),
    vidro: round(vidro),
    acessorios: round(acessorios),
    iluminacao: round(iluminacao),
    maoDeObra: round(maoDeObra),
    montagem: round(montagem),
    areaM2: Math.round(areaM2 * 100) / 100,
  };
  return {
    ...b,
    total:
      b.mdf +
      b.ferragens +
      b.gavetas +
      b.portas +
      b.espelho +
      b.vidro +
      b.acessorios +
      b.iluminacao +
      b.maoDeObra +
      b.montagem,
  };
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export function combinePrices(values: PriceBreakdown[]): PriceBreakdown {
  const result = {
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
    areaM2: 0,
    total: 0,
  };
  for (const value of values)
    for (const key of Object.keys(result) as (keyof PriceBreakdown)[]) result[key] += value[key];
  result.areaM2 = Math.round(result.areaM2 * 100) / 100;
  return result;
}

/** Shared by the browser and quote server; no parallel pricing formula. */
export function computeScenePrice(config: FurnitureConfig): PriceBreakdown {
  const configs = [config, ...(config.roomItems ?? []).map((item) => item.config)];
  return combinePrices(configs.map((cfg) => computePrice(cfg, buildFurniture(cfg))));
}
