import { useTenant, tenantOptions } from "@/lib/saas/context";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  CATEGORY_LABELS,
  FURNITURE_TYPES,
  typeDef,
  type FurnitureCategory,
  type FurnitureType,
} from "@/lib/furniture/types";
import { COMPONENT_CATALOG } from "@/lib/furniture/components";
import type { Configurator } from "@/lib/furniture/store";

function Thumbnail({
  width,
  height,
  doors,
  shelves,
  drawers,
}: {
  width: number;
  height: number;
  doors: number;
  shelves: number;
  drawers: number;
}) {
  const aspect = Math.min(2.2, Math.max(0.45, width / Math.max(1, height)));
  const w = Math.min(76, 48 * aspect);
  const h = Math.min(65, 57 / aspect);
  const x = (96 - w) / 2;
  const y = (75 - h) / 2;
  return (
    <svg
      viewBox="0 0 96 75"
      className="h-16 w-20 shrink-0"
      role="img"
      aria-label="Miniatura esquemática do móvel"
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="2"
        fill="#d4b28a"
        stroke="#76583c"
        strokeWidth="2"
      />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill="#f4e9d9" />
      {doors > 0
        ? Array.from({ length: Math.min(doors, 6) }, (_, i) => (
            <g key={i}>
              <rect
                x={x + 4 + i * ((w - 8) / Math.min(doors, 6))}
                y={y + 4}
                width={(w - 8) / Math.min(doors, 6)}
                height={h - 8}
                fill="#d8b38c"
                stroke="#916e4e"
                strokeWidth="0.6"
              />
              <circle
                cx={x + 4 + (i + 0.82) * ((w - 8) / Math.min(doors, 6))}
                cy={y + h / 2}
                r="1"
                fill="#4d3f32"
              />
            </g>
          ))
        : Array.from({ length: Math.min(shelves, 5) }, (_, i) => (
            <line
              key={i}
              x1={x + 4}
              y1={y + 4 + (i + 1) * ((h - 8) / (Math.min(shelves, 5) + 1))}
              x2={x + w - 4}
              y2={y + 4 + (i + 1) * ((h - 8) / (Math.min(shelves, 5) + 1))}
              stroke="#8d6c4b"
              strokeWidth="2"
            />
          ))}
      {drawers > 0 && (
        <rect
          x={x + 5}
          y={y + h - 4 - Math.min(h / 2, drawers * 4)}
          width={w - 10}
          height={Math.min(h / 2, drawers * 4)}
          fill="#ba916d"
          opacity="0.9"
        />
      )}
    </svg>
  );
}

function DistinctThumbnail({ type }: { type: FurnitureType }) {
  const seating = ["cadeira", "banco", "banqueta"].includes(type);
  const table = ["mesa", "mesa-jantar", "mesa-redonda", "mesa-oval", "mesa-organica"].includes(
    type,
  );
  const sideboard = type === "aparador-organico";
  return (
    <svg
      viewBox="0 0 96 75"
      className="h-16 w-20 shrink-0"
      role="img"
      aria-label="Miniatura do móvel"
    >
      {seating ? (
        <>
          <rect
            x="24"
            y="37"
            width="48"
            height="8"
            rx="3"
            fill="#c79d73"
            stroke="#76583c"
            strokeWidth="2"
          />
          <rect
            x="29"
            y="19"
            width="38"
            height="22"
            rx="8"
            fill="#d4b28a"
            stroke="#76583c"
            strokeWidth="2"
          />
          {[28, 66, 63, 71].map((x, index) => (
            <rect key={`${x}-${index}`} x={x} y="44" width="5" height="24" rx="2" fill="#76583c" />
          ))}
        </>
      ) : table ? (
        <>
          <ellipse
            cx="48"
            cy="22"
            rx={type === "mesa-redonda" ? 28 : 34}
            ry="12"
            fill="#d4b28a"
            stroke="#76583c"
            strokeWidth="2"
          />
          <rect x="42" y="31" width="12" height="31" rx="4" fill="#76583c" />
          <path d="M20 64h56" stroke="#76583c" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : sideboard ? (
        <>
          <ellipse
            cx="48"
            cy="18"
            rx="34"
            ry="10"
            fill="#d4b28a"
            stroke="#76583c"
            strokeWidth="2"
          />
          <rect
            x="18"
            y="29"
            width="60"
            height="22"
            rx="5"
            fill="#c79d73"
            stroke="#76583c"
            strokeWidth="2"
          />
          <path
            d="M27 55l-5 12M69 55l5 12"
            stroke="#76583c"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line x1="27" y1="45" x2="69" y2="45" stroke="#f4e9d9" strokeWidth="2" />
        </>
      ) : (
        <Thumbnail width={120} height={100} doors={0} shelves={2} drawers={2} />
      )}
    </svg>
  );
}

function hasDistinctGeometry(def: (typeof FURNITURE_TYPES)[number]) {
  const type = def.baseType ?? def.id;
  return [
    "mesa",
    "mesa-jantar",
    "mesa-redonda",
    "mesa-oval",
    "mesa-organica",
    "cadeira",
    "banco",
    "banqueta",
    "aparador-organico",
  ].includes(type);
}

export function CatalogBrowser({
  c,
  onMessage,
}: {
  c: Configurator;
  onMessage?: ((message: string) => void) | undefined;
}) {
  const tenant = useTenant();
  const models = useMemo(() => tenantOptions(FURNITURE_TYPES, tenant, "model"), [tenant]);
  const componentOptions = tenantOptions(
    COMPONENT_CATALOG.map((d) => ({ ...d, id: `mod:${d.id}` })),
    tenant,
    "accessory",
  ).map((d) => ({ ...d, id: d.id.slice(4) }));
  const [tab, setTab] = useState<"moveis" | "componentes">("moveis");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FurnitureCategory | "todos">("todos");
  const [installation, setInstallation] = useState("todos");
  const currentCategory =
    FURNITURE_TYPES.find((def) => def.id === c.config.type)?.category ?? "guarda-roupa";
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const furniture = useMemo(
    () =>
      models.filter(
        (def) =>
          (category === "todos" || category === def.category) &&
          (installation === "todos" || installation === (def.installation ?? "piso")) &&
          (!normalized ||
            [def.label, CATEGORY_LABELS[def.category], def.description, ...(def.tags ?? [])]
              .join(" ")
              .toLocaleLowerCase("pt-BR")
              .includes(normalized)),
      ),
    [category, installation, normalized, models],
  );
  const components = componentOptions.filter(
    (def) =>
      def.allowed.includes(currentCategory) &&
      c.config.depth >= (def.minDepth ?? 0) &&
      (!normalized ||
        `${def.label} ${def.category}`.toLocaleLowerCase("pt-BR").includes(normalized)),
  );

  const add = (type: string) => {
    const success = c.addComponent(type, 0, c.config.height / 2);
    onMessage?.(
      success
        ? "Componente encaixado. Arraste no 3D para ajustar."
        : "Sem espaço livre para esse componente.",
    );
  };

  return (
    <section className="space-y-3" aria-label="Catálogo de móveis e componentes">
      <details
        className="rounded-lg border border-border bg-card p-3"
        open={Boolean(c.config.roomItems?.length)}
      >
        <summary className="cursor-pointer text-xs font-semibold">
          Móveis no cômodo ({1 + (c.config.roomItems?.length ?? 0)})
        </summary>
        <div className="mt-2 space-y-1">
          {[
            { id: c.config.activeFurnitureId ?? "primary", config: c.config },
            ...(c.config.roomItems ?? []),
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => c.selectFurniture(item.id)}
                className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left ${item.id === (c.config.activeFurnitureId ?? "primary") ? "bg-secondary font-semibold" : "hover:bg-secondary"}`}
              >
                {typeDef(item.config.type).label}
              </button>
              {1 + (c.config.roomItems?.length ?? 0) > 1 && (
                <button
                  type="button"
                  onClick={() => c.removeFurniture(item.id)}
                  aria-label={`Excluir ${typeDef(item.config.type).label}`}
                  className="rounded-md px-2 py-1.5 text-destructive hover:bg-destructive/10"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onMessage?.(
                c.duplicateFurniture() ? "Móvel duplicado no cômodo." : "Sem espaço para duplicar.",
              )
            }
            className="mt-1 rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-secondary"
          >
            Duplicar móvel selecionado
          </button>
        </div>
      </details>
      <div className="flex rounded-lg bg-secondary p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("moveis")}
          className={`flex-1 rounded-md px-2 py-2 ${tab === "moveis" ? "bg-card shadow-sm" : ""}`}
        >
          Móveis
        </button>
        <button
          type="button"
          onClick={() => setTab("componentes")}
          className={`flex-1 rounded-md px-2 py-2 ${tab === "componentes" ? "bg-card shadow-sm" : ""}`}
        >
          Componentes
        </button>
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar móveis e componentes"
          aria-label="Buscar móveis e componentes"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      {tab === "moveis" ? (
        <>
          <div className="flex gap-2">
            <select
              aria-label="Filtrar ambiente"
              value={category}
              onChange={(event) => setCategory(event.target.value as FurnitureCategory | "todos")}
              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-2 text-xs"
            >
              <option value="todos">Todos os ambientes</option>
              {(Object.keys(CATEGORY_LABELS) as FurnitureCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar instalação"
              value={installation}
              onChange={(event) => setInstallation(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-2 text-xs"
            >
              <option value="todos">Instalação</option>
              <option value="piso">Piso</option>
              <option value="parede">Parede</option>
              <option value="suspenso">Suspenso</option>
            </select>
          </div>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-auto pr-1">
            {furniture.map((def) => {
              const dimensions = def.defaults;
              return (
                <div
                  key={def.id}
                  className={`rounded-xl border p-2 ${c.config.type === def.id ? "border-primary bg-secondary" : "border-border bg-card"}`}
                >
                  <div className="flex items-center gap-2">
                    {hasDistinctGeometry(def) ? (
                      <DistinctThumbnail type={(def.baseType ?? def.id) as FurnitureType} />
                    ) : (
                      <Thumbnail
                        width={dimensions.width ?? 120}
                        height={dimensions.height ?? 100}
                        doors={dimensions.doors ?? 0}
                        shelves={dimensions.shelves ?? 0}
                        drawers={dimensions.drawers ?? 0}
                      />
                    )}
                    <span className="min-w-0 text-xs">
                      <strong className="block truncate text-sm">{def.label}</strong>
                      <span className="block text-muted-foreground">
                        {dimensions.width ?? c.config.width} × {dimensions.depth ?? c.config.depth}{" "}
                        × {dimensions.height ?? c.config.height} cm
                      </span>
                      <span className="block text-muted-foreground">
                        {CATEGORY_LABELS[def.category]} · {def.installation ?? "piso"}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => c.setType(def.id as FurnitureType)}
                      className="flex-1 rounded-md border border-border py-1.5 hover:bg-secondary"
                    >
                      Trocar selecionado
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onMessage?.(
                          c.addFurniture(def.id)
                            ? "Móvel adicionado ao cômodo."
                            : "Sem espaço para outro móvel.",
                        )
                      }
                      className="flex-1 rounded-md bg-primary px-1 py-1.5 text-primary-foreground hover:opacity-90"
                    >
                      Adicionar ao cômodo
                    </button>
                  </div>
                </div>
              );
            })}
            {!furniture.length && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nenhum móvel encontrado.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Clique para encaixar ou arraste até o móvel. Apenas peças compatíveis aparecem.
          </p>
          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-auto pr-1">
            {components.map((def) => (
              <button
                key={def.id}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-m3d-part", `mod:${def.id}`);
                  event.dataTransfer.setData(`application/x-m3d-mod-${def.id}`, "1");
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => add(def.id)}
                title={`Arrastar ${def.label} para o móvel`}
                className="flex min-h-16 flex-col justify-center rounded-xl border border-border bg-card p-2 text-left text-xs hover:border-primary"
              >
                <strong>{def.label}</strong>
                <span className="text-[10px] text-muted-foreground">{def.category}</span>
              </button>
            ))}
            {!components.length && (
              <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">
                Sem componentes compatíveis.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
