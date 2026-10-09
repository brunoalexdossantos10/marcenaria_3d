import { z } from "zod";
import { ACCESSORIES, FURNITURE_TYPES, HANDLE_FINISHES, HANDLE_MODELS } from "./types.ts";
import { MATERIALS } from "./materials.ts";
import { COMPONENT_CATALOG } from "./components.ts";

const materialId = z
  .string()
  .refine((id) => MATERIALS.some((m) => m.id === id), "Material inválido");
const coordinate = z.number().finite().min(-1000).max(1000);
const position = z.tuple([coordinate, coordinate, coordinate]);
const offsets = z
  .record(position)
  .refine((value) => Object.keys(value).length <= 200, "Posições em excesso");
const furniture = z.object({
  type: z.string().refine((id) => FURNITURE_TYPES.some((m) => m.id === id), "Modelo inválido"),
  width: z.number().finite().positive().max(1000),
  height: z.number().finite().positive().max(1000),
  depth: z.number().finite().positive().max(1000),
  columns: z.number().int().min(1).max(12).optional(),
  doors: z.number().int().min(0).max(16).optional(),
  drawers: z.number().int().min(0).max(40).optional(),
  shelves: z.number().int().min(0).max(60).optional(),
  niches: z.number().int().min(0).max(6).optional(),
  panelThickness: z.number().finite().min(0.8).max(5).optional(),
  drawerHeight: z.number().finite().min(0).max(100).optional(),
  doorStyle: z.enum(["simples", "dupla", "correr", "basculante", "camarao"]).optional(),
  doorFace: z.enum(["padrao", "ripada", "vidro", "espelho"]).optional(),
  shelfMaterial: z.enum(["mdf", "vidro"]).optional(),
  hanger: z.boolean().optional(),
  mirror: z.boolean().optional(),
  mirrorInside: z.boolean().optional(),
  showDimensions: z.boolean().optional(),
  openDoors: z.boolean().optional(),
  drawerGlassFront: z.boolean().optional(),
  material: materialId.optional(),
  materials: z
    .object({
      estrutura: materialId,
      portas: materialId,
      interior: materialId,
      fundo: materialId,
    })
    .partial()
    .optional(),
  handle: z
    .object({
      model: z.string().refine((id) => HANDLE_MODELS.some((m) => m.id === id)),
      finish: z.string().refine((id) => HANDLE_FINISHES.some((m) => m.id === id)),
      orientation: z.enum(["vertical", "horizontal"]),
      size: z.number().finite().min(1).max(100),
    })
    .optional(),
  led: z
    .object({
      on: z.boolean(),
      intensity: z.number().finite().min(0).max(5),
      temp: z.number().finite().min(1000).max(12000),
    })
    .optional(),
  accessories: z
    .array(z.string().refine((id) => ACCESSORIES.some((a) => a.id === id)))
    .max(20)
    .optional(),
  componentOffsets: offsets.optional(),
  accessoryOffsets: offsets.optional(),
  componentInstances: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^mod-[a-zA-Z0-9-]+$/)
          .max(80),
        type: z.string().refine((id) => COMPONENT_CATALOG.some((c) => c.id === id)),
        position,
        material: materialId.optional(),
      }),
    )
    .max(60)
    .optional(),
  floorPosition: z.tuple([coordinate, coordinate]).optional(),
  floorRotation: z.number().finite().min(-3600).max(3600).optional(),
  floorElevation: z.number().finite().min(0).max(1000).optional(),
  activeFurnitureId: z.string().max(80).optional(),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .max(30)
    .transform((phone) => phone.replace(/\D/g, ""))
    .refine((phone) => phone.length >= 10 && phone.length <= 15, "Informe telefone com DDD"),
  email: z
    .union([z.string().email().max(254), z.literal("")])
    .optional()
    .default(""),
  city: z.string().max(120).optional().default(""),
  notes: z.string().max(3000).optional().default(""),
});

export const configSchema = furniture
  .extend({
    roomItems: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          position: z.tuple([coordinate, coordinate]),
          config: furniture.extend({
            roomItems: z.array(z.never()).max(0).optional(),
          }),
        }),
      )
      .max(8)
      .optional(),
  })
  .superRefine((cfg, ctx) => {
    const ids = [...(cfg.componentInstances ?? []).map((c) => c.id)];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        path: ["componentInstances"],
        message: "Componentes duplicados",
      });
    const roomIds = (cfg.roomItems ?? []).map((item) => item.id);
    if (
      roomIds.includes(cfg.activeFurnitureId ?? "primary") ||
      new Set(roomIds).size !== roomIds.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["roomItems"],
        message: "Móveis duplicados",
      });
  });

export function parseFurnitureConfig(value: unknown) {
  const result = configSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      `Configuração inválida: ${result.error.issues[0]?.path.join(".") || "projeto"}.`,
    );
  return result.data;
}

export function encodeConfiguration(config: unknown): string {
  const json = JSON.stringify(config);
  const encoded = btoa(
    Array.from(new TextEncoder().encode(json), (byte) => String.fromCharCode(byte)).join(""),
  );
  if (encoded.length > 32000)
    throw new Error(
      "Este projeto é grande demais para um link. Salve o projeto ou exporte seu JSON.",
    );
  return encoded;
}
export function decodeConfiguration(encoded: string) {
  if (encoded.length > 32000) throw new Error("Link de projeto grande demais.");
  const binary = atob(encoded);
  // Older links used Latin-1 directly; keep compatibility with those links.
  let json: string;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (char) => char.charCodeAt(0)),
    );
  } catch {
    json = binary;
  }
  return parseFurnitureConfig(JSON.parse(json));
}

export function isConfigurationAllowed(
  config: unknown,
  catalog: { kind: string; source_id: string; active: boolean }[],
): boolean {
  const parsed = configSchema.safeParse(config);
  if (!parsed.success) return false;
  const allowed = (kind: string, id: string) =>
    !catalog.some((entry) => entry.kind === kind) ||
    catalog.some((entry) => entry.kind === kind && entry.source_id === id && entry.active);
  const configs = [parsed.data, ...(parsed.data.roomItems ?? []).map((item) => item.config)];
  return configs.every(
    (cfg) =>
      allowed("model", cfg.type) &&
      [
        cfg.material,
        ...Object.values(cfg.materials ?? {}),
        ...(cfg.componentInstances ?? []).map((c) => c.material),
      ].every((id) => !id || allowed("material", id)) &&
      (!cfg.handle || cfg.handle.model === "nenhum" || allowed("handle", cfg.handle.model)) &&
      (cfg.accessories ?? []).every((id) => allowed("accessory", id)),
  );
}
