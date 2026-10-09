export type Finish = "madeira" | "mdf" | "espelho" | "vidro";

export interface MaterialDef {
  id: string;
  label: string;
  /** base color as hex, used by the 3D material */
  color: string;
  roughness: number;
  /** wood grain intensity 0..1 */
  grain: number;
  /** price per m² in BRL */
  pricePerM2: number;
  finish?: Finish;
  metalness?: number;
  opacity?: number;
}

export const MATERIALS: MaterialDef[] = [
  // MDF / cores
  {
    id: "branco",
    label: "MDF Branco",
    color: "#f3f0ea",
    roughness: 0.55,
    grain: 0.05,
    pricePerM2: 190,
    finish: "mdf",
  },
  {
    id: "offwhite",
    label: "MDF Off-white",
    color: "#e9e3d7",
    roughness: 0.6,
    grain: 0.05,
    pricePerM2: 195,
    finish: "mdf",
  },
  {
    id: "bege",
    label: "MDF Bege",
    color: "#d9c9b0",
    roughness: 0.62,
    grain: 0.06,
    pricePerM2: 195,
    finish: "mdf",
  },
  {
    id: "fendi",
    label: "MDF Fendi",
    color: "#b3a89b",
    roughness: 0.62,
    grain: 0.06,
    pricePerM2: 200,
    finish: "mdf",
  },
  {
    id: "cinza",
    label: "MDF Cinza",
    color: "#8d8b88",
    roughness: 0.6,
    grain: 0.08,
    pricePerM2: 200,
    finish: "mdf",
  },
  {
    id: "preto",
    label: "MDF Preto",
    color: "#232323",
    roughness: 0.5,
    grain: 0.05,
    pricePerM2: 210,
    finish: "mdf",
  },
  // madeiras
  {
    id: "carvalho",
    label: "Carvalho",
    color: "#b98f5d",
    roughness: 0.65,
    grain: 0.55,
    pricePerM2: 260,
    finish: "madeira",
  },
  {
    id: "carvalho-claro",
    label: "Carvalho claro",
    color: "#d8bb90",
    roughness: 0.68,
    grain: 0.5,
    pricePerM2: 265,
    finish: "madeira",
  },
  {
    id: "freijo",
    label: "Freijó",
    color: "#9a6f45",
    roughness: 0.65,
    grain: 0.6,
    pricePerM2: 275,
    finish: "madeira",
  },
  {
    id: "nogueira",
    label: "Nogueira",
    color: "#6b452c",
    roughness: 0.6,
    grain: 0.7,
    pricePerM2: 290,
    finish: "madeira",
  },
  {
    id: "amadeirado",
    label: "Amadeirado",
    color: "#c9a878",
    roughness: 0.7,
    grain: 0.45,
    pricePerM2: 245,
    finish: "madeira",
  },
  {
    id: "madeira-escura",
    label: "Madeira escura",
    color: "#4a3123",
    roughness: 0.55,
    grain: 0.75,
    pricePerM2: 300,
    finish: "madeira",
  },
  // vidros e espelho
  {
    id: "espelho",
    label: "Espelho",
    color: "#eef3f5",
    roughness: 0.02,
    grain: 0,
    pricePerM2: 420,
    finish: "espelho",
    metalness: 1,
  },
  {
    id: "vidro",
    label: "Vidro",
    color: "#dbe8ee",
    roughness: 0.03,
    grain: 0,
    pricePerM2: 380,
    finish: "vidro",
    opacity: 0.28,
  },
  {
    id: "vidro-fume",
    label: "Vidro fumê",
    color: "#4a4c50",
    roughness: 0.05,
    grain: 0,
    pricePerM2: 400,
    finish: "vidro",
    opacity: 0.5,
  },
  {
    id: "fosco",
    label: "Vidro fosco",
    color: "#cfd6d6",
    roughness: 0.55,
    grain: 0,
    pricePerM2: 390,
    finish: "vidro",
    opacity: 0.6,
  },
  {
    id: "acetinado",
    label: "Acetinado",
    color: "#e2e6e4",
    roughness: 0.35,
    grain: 0.05,
    pricePerM2: 300,
    finish: "mdf",
  },
];

export function material(id: string): MaterialDef {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]!;
}
