import type {
  FurnitureCategory,
  FurnitureConfig,
  ModularComponentType,
  Part,
  PartKind,
} from "./types.ts";

export interface ComponentDefinition {
  id: ModularComponentType;
  label: string;
  category: "Estrutura" | "Armazenamento" | "Roupas" | "Portas" | "Acabamentos" | "Iluminação";
  kind: PartKind;
  allowed: FurnitureCategory[];
  minDepth?: number;
  shape?: Part["shape"];
  height?: number;
}

const all: FurnitureCategory[] = [
  "guarda-roupa",
  "cozinha",
  "sala",
  "escritorio",
  "quarto",
  "banheiro",
  "lavanderia",
  "hall",
];
const storage: FurnitureCategory[] = [
  "guarda-roupa",
  "cozinha",
  "sala",
  "escritorio",
  "quarto",
  "banheiro",
  "lavanderia",
  "hall",
];
const clothes: FurnitureCategory[] = ["guarda-roupa", "quarto", "hall"];

/** Data-only catalog. A component is converted to a procedural Part when the
 * selected cabinet is built. The catalog itself never loads meshes. */
export const COMPONENT_CATALOG: ComponentDefinition[] = [
  {
    id: "prateleira",
    label: "Prateleira",
    category: "Estrutura",
    kind: "prateleira",
    allowed: all,
  },
  {
    id: "divisoria",
    label: "Divisória vertical",
    category: "Estrutura",
    kind: "divisoria",
    allowed: all,
  },
  {
    id: "divisoria-horizontal",
    label: "Divisória horizontal",
    category: "Estrutura",
    kind: "prateleira",
    allowed: all,
  },
  {
    id: "nicho",
    label: "Nicho",
    category: "Estrutura",
    kind: "nicho",
    allowed: all,
  },
  {
    id: "maleiro",
    label: "Maleiro",
    category: "Estrutura",
    kind: "prateleira",
    allowed: clothes,
  },
  {
    id: "gaveta",
    label: "Gaveta",
    category: "Armazenamento",
    kind: "gaveta",
    allowed: storage,
    minDepth: 35,
    height: 20,
  },
  {
    id: "gaveta-dupla",
    label: "Gaveta dupla",
    category: "Armazenamento",
    kind: "gaveta",
    allowed: storage,
    minDepth: 35,
    height: 26,
  },
  {
    id: "gaveta-profunda",
    label: "Gaveta profunda",
    category: "Armazenamento",
    kind: "gaveta",
    allowed: storage,
    minDepth: 40,
    height: 34,
  },
  {
    id: "cesto",
    label: "Cesto",
    category: "Armazenamento",
    kind: "acessorio",
    allowed: storage,
    minDepth: 35,
    shape: "caixa",
    height: 20,
  },
  {
    id: "sapateira",
    label: "Sapateira",
    category: "Armazenamento",
    kind: "acessorio",
    allowed: clothes,
    minDepth: 35,
    shape: "inclinada",
  },
  {
    id: "calceiro",
    label: "Calceiro",
    category: "Armazenamento",
    kind: "acessorio",
    allowed: clothes,
    shape: "tubo",
  },
  {
    id: "cabideiro",
    label: "Cabideiro horizontal",
    category: "Roupas",
    kind: "cabideiro",
    allowed: clothes,
    minDepth: 40,
  },
  {
    id: "cabideiro-retratil",
    label: "Cabideiro retrátil",
    category: "Roupas",
    kind: "acessorio",
    allowed: clothes,
    minDepth: 40,
    shape: "tubo",
  },
  {
    id: "porta",
    label: "Porta comum",
    category: "Portas",
    kind: "porta",
    allowed: storage,
  },
  {
    id: "porta-dupla",
    label: "Porta dupla",
    category: "Portas",
    kind: "porta",
    allowed: storage,
  },
  {
    id: "porta-correr",
    label: "Porta de correr",
    category: "Portas",
    kind: "porta",
    allowed: storage,
  },
  {
    id: "porta-basculante",
    label: "Porta basculante",
    category: "Portas",
    kind: "porta",
    allowed: storage,
  },
  {
    id: "porta-vidro",
    label: "Porta de vidro",
    category: "Portas",
    kind: "porta",
    allowed: storage,
  },
  {
    id: "espelho",
    label: "Espelho",
    category: "Acabamentos",
    kind: "espelho",
    allowed: all,
  },
  {
    id: "puxador",
    label: "Puxador",
    category: "Acabamentos",
    kind: "puxador",
    allowed: storage,
  },
  {
    id: "perfil",
    label: "Perfil",
    category: "Acabamentos",
    kind: "acessorio",
    allowed: all,
    shape: "barra",
  },
  {
    id: "painel-ripado",
    label: "Painel ripado",
    category: "Acabamentos",
    kind: "acessorio",
    allowed: all,
    shape: "ripado",
  },
  {
    id: "fita-led",
    label: "Fita LED",
    category: "Iluminação",
    kind: "led",
    allowed: all,
  },
  {
    id: "led-interno",
    label: "LED interno",
    category: "Iluminação",
    kind: "led",
    allowed: all,
  },
  {
    id: "led-inferior",
    label: "LED inferior",
    category: "Iluminação",
    kind: "led",
    allowed: all,
  },
  {
    id: "spot",
    label: "Spot",
    category: "Iluminação",
    kind: "led",
    allowed: all,
  },
];

export function componentDef(id: ModularComponentType) {
  return COMPONENT_CATALOG.find((component) => component.id === id);
}

export function canInstall(config: FurnitureConfig, id: ModularComponentType) {
  const def = componentDef(id);
  if (!def) return false;
  // Type metadata is resolved by the caller to avoid a runtime import cycle.
  return config.depth >= (def.minDepth ?? 0);
}
