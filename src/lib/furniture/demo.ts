import { normalizeConfig } from "./builder";

/**
 * Single source of truth for the cabinet shown on the landing page.
 * It is intentionally a normal FurnitureConfig so the configurator can edit it
 * without a second, landing-only model definition.
 */
export const DEMO_CONFIG = normalizeConfig({
  type: "guarda-roupa-2",
  width: 180,
  height: 220,
  depth: 58,
  columns: 2,
  doors: 2,
  doorStyle: "dupla",
  doorFace: "padrao",
  drawers: 2,
  shelves: 3,
  hanger: true,
  mirror: false,
  material: "nogueira",
  materials: {
    estrutura: "nogueira",
    portas: "nogueira",
    interior: "carvalho-claro",
    fundo: "branco",
  },
  handle: {
    model: "cava",
    finish: "bronze",
    orientation: "vertical",
    size: 20,
  },
  panelThickness: 1.8,
  showDimensions: false,
  openDoors: false,
});
