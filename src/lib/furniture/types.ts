import { CATALOG_VARIANTS } from "./catalog";

export type FurnitureCategory =
  | "guarda-roupa"
  | "cozinha"
  | "sala"
  | "escritorio"
  | "quarto"
  | "banheiro"
  | "lavanderia"
  | "hall";

export type FurnitureType =
  | "guarda-roupa"
  | "guarda-roupa-2"
  | "guarda-roupa-3"
  | "guarda-roupa-correr"
  | "cozinha"
  | "cozinha-superior"
  | "torre-quente"
  | "balcao"
  | "ilha"
  | "estante"
  | "rack"
  | "painel-tv"
  | "aparador"
  | "home-office"
  | "mesa"
  | "gaveteiro"
  | "criado-mudo"
  | "comoda"
  | "cabeceira"
  | "banheiro"
  | "mesa-redonda"
  | "mesa-oval"
  | "mesa-organica"
  | "mesa-jantar"
  | "cadeira"
  | "banco"
  | "banqueta"
  | "aparador-organico"
  | (string & {});

export type ModularComponentType = string;

export interface ComponentInstance {
  id: string;
  type: ModularComponentType;
  /** Coordinates in centimetres relative to the cabinet floor center. */
  position: [number, number, number];
  material?: string;
}

export interface FurnitureInstance {
  id: string;
  config: FurnitureConfig;
  /** Floor coordinates in centimetres; editing does not allow free movement. */
  position: [number, number];
}

export type DoorStyle = "simples" | "dupla" | "correr" | "basculante" | "camarao";

/** visual treatment of the door leaf */
export type DoorFace = "padrao" | "ripada" | "vidro" | "espelho";

export type HandleModel = "nenhum" | "reto" | "alca" | "botao" | "cava" | "perfil" | "embutido";

export type HandleFinish = "preto" | "cromado" | "inox" | "dourado" | "bronze" | "aluminio";

export const HANDLE_MODELS: { id: HandleModel; label: string }[] = [
  { id: "reto", label: "Reto" },
  { id: "alca", label: "Alça" },
  { id: "botao", label: "Botão" },
  { id: "cava", label: "Cava" },
  { id: "perfil", label: "Perfil de alumínio" },
  { id: "embutido", label: "Embutido" },
  { id: "nenhum", label: "Sem puxador" },
];

export const HANDLE_FINISHES: {
  id: HandleFinish;
  label: string;
  color: string;
  metalness: number;
  roughness: number;
}[] = [
  { id: "preto", label: "Preto", color: "#232323", metalness: 0.6, roughness: 0.45 },
  { id: "cromado", label: "Cromado", color: "#dfe4e8", metalness: 1, roughness: 0.08 },
  { id: "inox", label: "Inox", color: "#b8bcc0", metalness: 0.95, roughness: 0.3 },
  { id: "dourado", label: "Dourado", color: "#d8ac55", metalness: 1, roughness: 0.22 },
  { id: "bronze", label: "Bronze", color: "#8c6239", metalness: 0.9, roughness: 0.35 },
  { id: "aluminio", label: "Alumínio", color: "#c9ced3", metalness: 0.85, roughness: 0.35 },
];

export interface HandleConfig {
  model: HandleModel;
  finish: HandleFinish;
  orientation: "vertical" | "horizontal";
  size: number; // cm
}

/** materials can be combined per structural group */
export interface MaterialSet {
  estrutura: string;
  portas: string;
  interior: string;
  fundo: string;
}

export interface LedConfig {
  on: boolean;
  intensity: number; // 0..2
  temp: number; // kelvin-ish 2200..6000
}

export type AccessoryId =
  | "sapateira"
  | "calceiro"
  | "cabideiro-retratil"
  | "divisorias"
  | "gavetas-internas"
  | "organizador"
  | "porta-temperos"
  | "lixeira"
  | "torre-tomadas"
  | "painel-ripado"
  | "suporte-tv"
  | "passagem-cabos"
  | "suporte-monitor";

export const ACCESSORIES: { id: AccessoryId; label: string; categories: FurnitureCategory[] }[] = [
  { id: "sapateira", label: "Sapateira", categories: ["guarda-roupa", "quarto"] },
  { id: "calceiro", label: "Calceiro", categories: ["guarda-roupa", "quarto"] },
  { id: "cabideiro-retratil", label: "Cabideiro retrátil", categories: ["guarda-roupa", "quarto"] },
  {
    id: "divisorias",
    label: "Divisórias internas",
    categories: ["guarda-roupa", "quarto", "cozinha", "escritorio", "sala", "banheiro"],
  },
  {
    id: "gavetas-internas",
    label: "Gavetas internas",
    categories: ["guarda-roupa", "quarto", "cozinha", "escritorio"],
  },
  {
    id: "organizador",
    label: "Organizadores",
    categories: ["guarda-roupa", "quarto", "escritorio", "cozinha"],
  },
  { id: "porta-temperos", label: "Porta-temperos", categories: ["cozinha"] },
  { id: "lixeira", label: "Lixeira embutida", categories: ["cozinha"] },
  { id: "torre-tomadas", label: "Torre de tomadas", categories: ["cozinha", "escritorio"] },
  { id: "painel-ripado", label: "Painel ripado", categories: ["sala", "quarto"] },
  { id: "suporte-tv", label: "Suporte para TV", categories: ["sala"] },
  { id: "passagem-cabos", label: "Passagem de cabos", categories: ["sala", "escritorio"] },
  { id: "suporte-monitor", label: "Suporte para monitor", categories: ["escritorio"] },
];

export interface FurnitureConfig {
  type: FurnitureType;
  activeFurnitureId?: string;
  roomItems?: FurnitureInstance[];
  /** Centre of the cabinet on the floor, X and Z in centimetres. */
  floorPosition?: [number, number];
  /** Orientation in degrees and height above the floor in centimetres. */
  floorRotation?: number;
  floorElevation?: number;
  width: number; // cm
  height: number; // cm
  depth: number; // cm
  columns: number;
  doors: number;
  doorStyle: DoorStyle;
  doorFace: DoorFace;
  drawers: number;
  drawerHeight: number; // cm, 0 = automático
  drawerGlassFront: boolean;
  shelves: number;
  shelfMaterial: "mdf" | "vidro";
  niches: number;
  hanger: boolean;
  mirror: boolean;
  mirrorInside: boolean;
  material: string; // legacy / fallback
  materials: MaterialSet;
  handle: HandleConfig;
  accessories: AccessoryId[];
  /** User adjustments in centimetres, keyed by accessory part id. */
  accessoryOffsets: Record<string, [number, number, number]>;
  /** Saved adjustments to doors, drawers and shelves in centimetres. */
  componentOffsets: Record<string, [number, number, number]>;
  /** Added components remain independent of the preset counters. */
  componentInstances?: ComponentInstance[];
  led: LedConfig;
  panelThickness: number; // cm
  showDimensions: boolean;
  openDoors: boolean;
}

export type PartKind =
  | "lateral"
  | "tampo"
  | "base"
  | "fundo"
  | "divisoria"
  | "prateleira"
  | "nicho"
  | "porta"
  | "gaveta"
  | "cabideiro"
  | "cabide"
  | "espelho"
  | "puxador"
  | "led"
  | "acessorio"
  | "painel";

export interface Part {
  id: string;
  kind: PartKind;
  label: string;
  /** center position in cm, origin at floor center of the furniture.
   *  When `parent` is set, the position is local to the parent part. */
  pos: [number, number, number];
  /** Unadjusted position from the builder, used to keep drags in their aperture. */
  homePos?: [number, number, number];
  /** size in cm */
  size: [number, number, number];
  material?: string;
  /** hinge side for swing doors: -1 left, 1 right */
  hinge?: -1 | 1;
  /** sliding door: slides horizontally instead of rotating */
  sliding?: boolean;
  /** target x (cm) when a sliding door is open */
  slideTo?: number;
  /** id of the part this one is mounted on (mirror on a door, etc.) */
  parent?: string;
  /** slide axis offset for drawers */
  drawer?: boolean;
  removable?: boolean;
  /** swing doors: maximum opening in degrees */
  openLimit?: number;
  /** tilt-up (basculante) doors rotate around the top edge on X */
  tilt?: boolean;
  /** bi-fold (camarão) door: leaf folds in the middle */
  bifold?: boolean;
  /** drawers: maximum travel in cm (never leaves the runners) */
  travel?: number;
  /** door leaf visual treatment */
  face?: DoorFace;
  /** handle rendering hints (part.kind === "puxador") */
  handle?: { model: HandleModel; finish: HandleFinish; orientation: "vertical" | "horizontal" };
  /** LED strip color/intensity hint */
  led?: { intensity: number; temp: number };
  /** accessory shape hint */
  shape?: "barra" | "inclinada" | "caixa" | "ripado" | "placa" | "tubo";
  /** Explicit procedural geometry for non-carcass pieces. */
  geometry?: "cylinder" | "oval";
  /** part can be dragged open by the user */
  interactive?: boolean;
}

export interface Limits {
  width: [number, number];
  height: [number, number];
  depth: [number, number];
}

export interface FurnitureTypeDef {
  id: FurnitureType;
  label: string;
  category: FurnitureCategory;
  limits: Limits;
  defaults: Partial<FurnitureConfig>;
  /** minimum depth required for drawers */
  minDrawerDepth: number;
  description?: string;
  tags?: string[];
  installation?: "piso" | "parede" | "suspenso";
  /** Variants reuse the existing procedural builder. */
  baseType?: FurnitureType;
}

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  "guarda-roupa": "Guarda-roupas",
  cozinha: "Cozinha",
  sala: "Sala",
  escritorio: "Escritório",
  quarto: "Quarto",
  banheiro: "Banheiro",
  lavanderia: "Lavanderia",
  hall: "Hall / Entrada",
};

const wardrobe = (
  id: FurnitureType,
  label: string,
  defaults: Partial<FurnitureConfig>,
): FurnitureTypeDef => ({
  id,
  label,
  category: "guarda-roupa",
  limits: { width: [80, 400], height: [160, 280], depth: [40, 80] },
  defaults: { doorStyle: "dupla", hanger: true, shelves: 6, drawers: 3, ...defaults },
  minDrawerDepth: 40,
});

const BASE_FURNITURE_TYPES: FurnitureTypeDef[] = [
  wardrobe("guarda-roupa-2", "2 portas", {
    width: 140,
    height: 220,
    depth: 58,
    columns: 2,
    doors: 2,
  }),
  wardrobe("guarda-roupa-3", "3 portas", {
    width: 190,
    height: 220,
    depth: 58,
    columns: 3,
    doors: 3,
  }),
  wardrobe("guarda-roupa", "4 portas", {
    width: 240,
    height: 220,
    depth: 60,
    columns: 3,
    doors: 4,
  }),
  wardrobe("guarda-roupa-correr", "Portas de correr", {
    width: 260,
    height: 240,
    depth: 62,
    columns: 3,
    doors: 2,
    doorStyle: "correr",
  }),
  {
    id: "cozinha",
    label: "Armário inferior",
    category: "cozinha",
    limits: { width: [100, 500], height: [70, 100], depth: [45, 70] },
    defaults: {
      width: 300,
      height: 88,
      depth: 60,
      columns: 4,
      doors: 4,
      doorStyle: "dupla",
      drawers: 4,
      shelves: 2,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 40,
  },
  {
    id: "cozinha-superior",
    label: "Armário superior",
    category: "cozinha",
    limits: { width: [60, 400], height: [50, 110], depth: [30, 45] },
    defaults: {
      width: 240,
      height: 75,
      depth: 35,
      columns: 3,
      doors: 3,
      doorStyle: "dupla",
      drawers: 0,
      shelves: 3,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 35,
  },
  {
    id: "torre-quente",
    label: "Torre quente",
    category: "cozinha",
    limits: { width: [55, 90], height: [180, 260], depth: [55, 70] },
    defaults: {
      width: 70,
      height: 220,
      depth: 60,
      columns: 1,
      doors: 2,
      doorStyle: "simples",
      drawers: 2,
      shelves: 2,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 45,
  },
  {
    id: "balcao",
    label: "Balcão",
    category: "cozinha",
    limits: { width: [80, 400], height: [80, 110], depth: [40, 70] },
    defaults: {
      width: 200,
      height: 92,
      depth: 55,
      columns: 3,
      doors: 2,
      doorStyle: "dupla",
      drawers: 3,
      shelves: 1,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 40,
  },
  {
    id: "ilha",
    label: "Ilha",
    category: "cozinha",
    limits: { width: [100, 320], height: [85, 110], depth: [60, 120] },
    defaults: {
      width: 180,
      height: 92,
      depth: 90,
      columns: 3,
      doors: 2,
      doorStyle: "dupla",
      drawers: 4,
      shelves: 1,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 45,
  },
  {
    id: "rack",
    label: "Rack de TV",
    category: "sala",
    limits: { width: [90, 320], height: [30, 90], depth: [30, 60] },
    defaults: {
      width: 180,
      height: 50,
      depth: 45,
      columns: 3,
      doors: 2,
      doorStyle: "dupla",
      drawers: 2,
      shelves: 1,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 35,
  },
  {
    id: "painel-tv",
    label: "Painel de TV",
    category: "sala",
    limits: { width: [100, 400], height: [80, 260], depth: [6, 25] },
    defaults: {
      width: 220,
      height: 140,
      depth: 10,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      niches: 2,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
  },
  {
    id: "estante",
    label: "Estante",
    category: "sala",
    limits: { width: [60, 360], height: [80, 260], depth: [25, 50] },
    defaults: {
      width: 180,
      height: 200,
      depth: 32,
      columns: 3,
      doors: 0,
      drawers: 0,
      shelves: 9,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 35,
  },
  {
    id: "aparador",
    label: "Aparador",
    category: "sala",
    limits: { width: [80, 260], height: [70, 110], depth: [28, 50] },
    defaults: {
      width: 140,
      height: 85,
      depth: 35,
      columns: 2,
      doors: 2,
      doorStyle: "dupla",
      drawers: 2,
      shelves: 1,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
  },
  {
    id: "mesa",
    label: "Escrivaninha",
    category: "escritorio",
    limits: { width: [90, 300], height: [70, 80], depth: [50, 90] },
    defaults: {
      width: 150,
      height: 75,
      depth: 60,
      columns: 2,
      doors: 0,
      drawers: 2,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 45,
  },
  {
    id: "home-office",
    label: "Armário",
    category: "escritorio",
    limits: { width: [90, 400], height: [70, 260], depth: [40, 80] },
    defaults: {
      width: 220,
      height: 200,
      depth: 55,
      columns: 3,
      doors: 2,
      doorStyle: "dupla",
      drawers: 3,
      shelves: 5,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 40,
  },
  {
    id: "gaveteiro",
    label: "Gaveteiro",
    category: "escritorio",
    limits: { width: [35, 90], height: [50, 120], depth: [40, 65] },
    defaults: {
      width: 45,
      height: 70,
      depth: 50,
      columns: 1,
      doors: 0,
      drawers: 4,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 40,
  },
  {
    id: "criado-mudo",
    label: "Criado-mudo",
    category: "quarto",
    limits: { width: [35, 80], height: [35, 80], depth: [30, 55] },
    defaults: {
      width: 50,
      height: 55,
      depth: 40,
      columns: 1,
      doors: 0,
      drawers: 2,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 32,
  },
  {
    id: "comoda",
    label: "Cômoda",
    category: "quarto",
    limits: { width: [70, 220], height: [70, 130], depth: [35, 60] },
    defaults: {
      width: 120,
      height: 95,
      depth: 45,
      columns: 2,
      doors: 0,
      drawers: 6,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 35,
  },
  {
    id: "cabeceira",
    label: "Cabeceira",
    category: "quarto",
    limits: { width: [100, 260], height: [60, 140], depth: [6, 20] },
    defaults: {
      width: 160,
      height: 100,
      depth: 10,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      niches: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
  },
  {
    id: "banheiro",
    label: "Armário de banheiro",
    category: "banheiro",
    limits: { width: [40, 180], height: [40, 200], depth: [25, 55] },
    defaults: {
      width: 80,
      height: 70,
      depth: 40,
      columns: 2,
      doors: 2,
      doorStyle: "dupla",
      drawers: 1,
      shelves: 1,
      hanger: false,
      mirror: true,
    },
    minDrawerDepth: 30,
  },
  {
    id: "mesa-redonda",
    label: "Mesa redonda",
    category: "sala",
    limits: { width: [70, 220], height: [65, 85], depth: [70, 220] },
    defaults: {
      width: 120,
      height: 75,
      depth: 120,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Mesa circular com tampo e base central paramétricos.",
    tags: ["sala", "redonda", "orgânico"],
  },
  {
    id: "mesa-jantar",
    label: "Mesa de jantar",
    category: "sala",
    limits: { width: [120, 300], height: [65, 85], depth: [70, 140] },
    defaults: {
      width: 180,
      height: 76,
      depth: 90,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Mesa de jantar com tampo amplo e estrutura para cadeiras.",
    tags: ["sala", "jantar", "mesa"],
  },
  {
    id: "mesa-oval",
    label: "Mesa oval",
    category: "sala",
    limits: { width: [100, 300], height: [65, 85], depth: [60, 150] },
    defaults: {
      width: 180,
      height: 75,
      depth: 95,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Mesa oval de bordas suaves para circulação confortável.",
    tags: ["sala", "oval", "orgânico"],
  },
  {
    id: "mesa-organica",
    label: "Mesa orgânica",
    category: "sala",
    limits: { width: [90, 260], height: [35, 85], depth: [50, 160] },
    defaults: {
      width: 140,
      height: 45,
      depth: 80,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Mesa de centro oval com proporções orgânicas.",
    tags: ["sala", "centro", "orgânico"],
  },
  {
    id: "cadeira",
    label: "Cadeira",
    category: "sala",
    limits: { width: [40, 75], height: [75, 115], depth: [40, 70] },
    defaults: {
      width: 48,
      height: 88,
      depth: 52,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Cadeira paramétrica com assento, encosto e quatro pés.",
    tags: ["sala", "assento"],
  },
  {
    id: "banco",
    label: "Banco",
    category: "sala",
    limits: { width: [70, 220], height: [35, 60], depth: [30, 55] },
    defaults: {
      width: 120,
      height: 45,
      depth: 40,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Banco linear para hall, sala ou pé de cama.",
    tags: ["sala", "assento", "hall"],
  },
  {
    id: "banqueta",
    label: "Banqueta",
    category: "cozinha",
    limits: { width: [35, 60], height: [60, 85], depth: [35, 60] },
    defaults: {
      width: 45,
      height: 75,
      depth: 45,
      columns: 1,
      doors: 0,
      drawers: 0,
      shelves: 0,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Banqueta para ilhas e bancadas, com apoio estrutural leve.",
    tags: ["cozinha", "assento"],
  },
  {
    id: "aparador-organico",
    label: "Aparador orgânico",
    category: "sala",
    limits: { width: [100, 260], height: [65, 110], depth: [30, 60] },
    defaults: {
      width: 180,
      height: 82,
      depth: 42,
      columns: 2,
      doors: 0,
      drawers: 0,
      shelves: 1,
      hanger: false,
      mirror: false,
    },
    minDrawerDepth: 30,
    description: "Aparador com tampo oval, prateleira e pés cilíndricos.",
    tags: ["sala", "aparador", "orgânico", "oval"],
  },
];

export const FURNITURE_TYPES: FurnitureTypeDef[] = [
  ...BASE_FURNITURE_TYPES,
  ...CATALOG_VARIANTS.map((variant): FurnitureTypeDef => {
    const base = BASE_FURNITURE_TYPES.find((entry) => entry.id === variant.base)!;
    const limits = variant.limits ?? base.limits;
    const extend = (range: [number, number], value?: number): [number, number] =>
      value === undefined ? range : [Math.min(range[0], value), Math.max(range[1], value)];
    return {
      ...base,
      id: variant.id,
      label: variant.label,
      category: variant.category ?? base.category,
      limits: {
        width: extend(limits.width, variant.defaults.width),
        height: extend(limits.height, variant.defaults.height),
        depth: extend(limits.depth, variant.defaults.depth),
      },
      defaults: { ...base.defaults, ...variant.defaults },
      baseType: variant.base,
      description:
        variant.description ??
        `${variant.label} planejado, com dimensões e componentes personalizáveis.`,
      tags: variant.tags ?? [base.label, variant.base, "móvel"],
      installation: variant.installation ?? "piso",
    };
  }),
];

export function typeDef(id: FurnitureType): FurnitureTypeDef {
  return FURNITURE_TYPES.find((t) => t.id === id) ?? FURNITURE_TYPES[0]!;
}
