import type { RoomKind, RoomStyle } from "./types";

export type EnvironmentPreset = {
  floor: "wood" | "stone";
  tileMetres: number;
  windowWidth: number;
  windowHeight: number;
  daylight: number;
  artificial: number;
  wallFinish: "paint" | "tile";
};

const base: Record<RoomKind, EnvironmentPreset> = {
  quarto: {
    floor: "wood",
    tileMetres: 0.18,
    windowWidth: 1.45,
    windowHeight: 1.3,
    daylight: 2.25,
    artificial: 4.4,
    wallFinish: "paint",
  },
  sala: {
    floor: "wood",
    tileMetres: 0.18,
    windowWidth: 1.8,
    windowHeight: 1.45,
    daylight: 2.5,
    artificial: 3.7,
    wallFinish: "paint",
  },
  cozinha: {
    floor: "stone",
    tileMetres: 0.8,
    windowWidth: 1.35,
    windowHeight: 1.25,
    daylight: 2.35,
    artificial: 5.5,
    wallFinish: "tile",
  },
  banheiro: {
    floor: "stone",
    tileMetres: 0.6,
    windowWidth: 0.9,
    windowHeight: 0.8,
    daylight: 1.65,
    artificial: 5.1,
    wallFinish: "tile",
  },
};

export function environmentPreset(kind: RoomKind, style: RoomStyle): EnvironmentPreset {
  const preset = base[kind];
  return {
    ...preset,
    floor: style === "minimalista" ? "stone" : preset.floor,
    artificial: style === "premium" ? preset.artificial * 1.12 : preset.artificial,
    daylight: style === "premium" ? preset.daylight * 0.9 : preset.daylight,
  };
}
