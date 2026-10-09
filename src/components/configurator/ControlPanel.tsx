import { useTenant, tenantOptions } from "@/lib/saas/context";
import {
  Minus,
  Plus,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  AlertTriangle,
  Ruler,
  DoorOpen,
} from "lucide-react";
import { CatalogBrowser } from "./CatalogBrowser";
import type { Configurator } from "@/lib/furniture/store";
import {
  typeDef,
  HANDLE_MODELS,
  HANDLE_FINISHES,
  ACCESSORIES,
  type DoorStyle,
  type AccessoryId,
} from "@/lib/furniture/types";
import { MATERIALS } from "@/lib/furniture/materials";
import { WOOD_SWATCHES } from "@/lib/furniture/woodSwatches";
import { brl } from "@/lib/furniture/pricing";

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {min}–{max} {suffix}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="step-btn"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="h-10 w-full rounded-lg border border-border bg-card text-center text-base font-medium tabular-nums outline-none focus:border-ring"
        />
        <button
          type="button"
          className="step-btn"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="range-wood"
      />
    </div>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="step-btn size-9"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Menos ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center text-base font-medium tabular-nums">{value}</span>
        <button
          type="button"
          className="step-btn size-9"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Mais ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
    {children}
  </h3>
);

export function ControlPanel({
  c,
  onQuote,
  onSave,
  onMessage,
}: {
  c: Configurator;
  onQuote: () => void;
  onSave: () => void;
  onMessage?: (message: string) => void;
}) {
  const tenant = useTenant();
  const materials = tenantOptions(MATERIALS, tenant, "material");
  const handles = tenantOptions(HANDLE_MODELS, tenant, "handle");
  const accessories = tenantOptions(ACCESSORIES, tenant, "accessory");
  const def = typeDef(c.config.type);
  const selectedPart = c.parts.find((p) => p.id === c.selected);
  const errors = c.issues.filter((i) => i.level === "error");

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={c.undo}
            disabled={!c.canUndo}
            className="chip disabled:opacity-40"
          >
            <Undo2 className="mr-1 size-3.5" /> Desfazer
          </button>
          <button
            type="button"
            onClick={c.redo}
            disabled={!c.canRedo}
            className="chip disabled:opacity-40"
          >
            <Redo2 className="mr-1 size-3.5" /> Refazer
          </button>
        </div>
        <CatalogBrowser c={c} onMessage={onMessage} />

        <section className="space-y-5">
          <SectionTitle>Tamanho do móvel</SectionTitle>
          <Stepper
            label="Qual a largura?"
            suffix="cm"
            value={c.config.width}
            min={def.limits.width[0]}
            max={def.limits.width[1]}
            onChange={(v) => c.set("width", v)}
          />
          <Stepper
            label="Qual a altura?"
            suffix="cm"
            value={c.config.height}
            min={def.limits.height[0]}
            max={def.limits.height[1]}
            onChange={(v) => c.set("height", v)}
          />
          <Stepper
            label="Qual a profundidade?"
            suffix="cm"
            value={c.config.depth}
            min={def.limits.depth[0]}
            max={def.limits.depth[1]}
            onChange={(v) => c.set("depth", v)}
          />
          <p className="text-xs text-muted-foreground">
            O móvel permanece fixo no cômodo. Puxe as alças para mudar medidas; Shift mantém
            proporções e Alt permite passos de 0,1 cm.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className={`chip ${c.config.showDimensions ? "chip-active" : ""}`}
              onClick={() => c.set("showDimensions", !c.config.showDimensions)}
            >
              <Ruler className="mr-1.5 inline size-3.5" /> Mostrar medidas
            </button>
            <button
              type="button"
              className={`chip ${c.config.openDoors ? "chip-active" : ""}`}
              onClick={() => c.set("openDoors", !c.config.openDoors)}
            >
              <DoorOpen className="mr-1.5 inline size-3.5" /> Abrir portas e gavetas
            </button>
          </div>
        </section>

        <section>
          <SectionTitle>Peças do móvel</SectionTitle>
          <div className="rounded-xl border border-border bg-card px-4 py-2">
            <Counter
              label="Módulos (divisórias)"
              value={c.config.columns}
              min={1}
              max={8}
              onChange={(v) => c.set("columns", v)}
            />
            <Counter
              label="Portas"
              value={c.config.doors}
              min={0}
              max={10}
              onChange={(v) => c.set("doors", v)}
            />
            <Counter
              label="Gavetas"
              value={c.config.drawers}
              min={0}
              max={12}
              onChange={(v) => c.set("drawers", v)}
            />
            <Counter
              label="Prateleiras"
              value={c.config.shelves}
              min={0}
              max={20}
              onChange={(v) => c.set("shelves", v)}
            />
            <Counter
              label="Nichos"
              value={c.config.niches}
              min={0}
              max={6}
              onChange={(v) => c.set("niches", v)}
            />
            <div className="flex items-center justify-between gap-3 border-t border-border py-2.5">
              <span className="text-sm">Cabideiro</span>
              <button
                type="button"
                className={`chip ${c.config.hanger ? "chip-active" : ""}`}
                onClick={() => c.set("hanger", !c.config.hanger)}
              >
                {c.config.hanger ? "Incluído" : "Adicionar"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border py-2.5">
              <span className="text-sm">Espelho</span>
              <button
                type="button"
                className={`chip ${c.config.mirror ? "chip-active" : ""}`}
                onClick={() => c.set("mirror", !c.config.mirror)}
              >
                {c.config.mirror ? "Incluído" : "Adicionar"}
              </button>
            </div>
          </div>
        </section>

        {c.config.doors > 0 && (
          <section>
            <SectionTitle>Tipo de porta</SectionTitle>
            <div className="flex gap-2">
              {(["simples", "dupla", "correr"] as DoorStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip flex-1 capitalize ${c.config.doorStyle === s ? "chip-active" : ""}`}
                  onClick={() => c.set("doorStyle", s)}
                >
                  {s === "correr" ? "De correr" : s}
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Puxadores</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {handles.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`chip ${c.config.handle.model === m.id ? "chip-active" : ""}`}
                onClick={() => c.set("handle", { ...c.config.handle, model: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
          {c.config.handle.model !== "nenhum" && (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {HANDLE_FINISHES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    title={f.label}
                    aria-label={f.label}
                    onClick={() => c.set("handle", { ...c.config.handle, finish: f.id })}
                    className={`size-8 rounded-full border-2 transition ${c.config.handle.finish === f.id ? "border-primary" : "border-border"}`}
                    style={{ background: f.color }}
                  />
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                {(["vertical", "horizontal"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`chip flex-1 capitalize ${c.config.handle.orientation === o ? "chip-active" : ""}`}
                    onClick={() => c.set("handle", { ...c.config.handle, orientation: o })}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <SectionTitle>Acessórios e ferragens</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {accessories
              .filter((a) => a.categories.includes(def.category))
              .map((a) => {
                const on = c.config.accessories.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`chip ${on ? "chip-active" : ""}`}
                    onClick={() =>
                      c.set(
                        "accessories",
                        (on
                          ? c.config.accessories.filter((x) => x !== a.id)
                          : [...c.config.accessories, a.id]) as AccessoryId[],
                      )
                    }
                  >
                    {a.label}
                  </button>
                );
              })}
          </div>
        </section>

        <section>
          <SectionTitle>Iluminação LED</SectionTitle>
          <button
            type="button"
            className={`chip ${c.config.led.on ? "chip-active" : ""}`}
            onClick={() => c.set("led", { ...c.config.led, on: !c.config.led.on })}
          >
            {c.config.led.on ? "Ligada" : "Desligada"}
          </button>
          {c.config.led.on && (
            <div className="mt-4 space-y-4">
              <Stepper
                label="Intensidade"
                value={Math.round(c.config.led.intensity * 100)}
                min={20}
                max={200}
                step={10}
                suffix="%"
                onChange={(v) => c.set("led", { ...c.config.led, intensity: v / 100 })}
              />
              <Stepper
                label="Cor da luz"
                value={c.config.led.temp}
                min={2200}
                max={6000}
                step={100}
                suffix="K"
                onChange={(v) => c.set("led", { ...c.config.led, temp: v })}
              />
            </div>
          )}
        </section>

        <section>
          <SectionTitle>Acabamento (MDF)</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {materials
              .filter((m) => m.finish === "madeira" || m.finish === "mdf")
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => c.set("material", m.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2 text-left text-xs transition ${
                    c.config.material === m.id
                      ? "border-primary bg-secondary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span
                    className="size-8 shrink-0 rounded-lg border border-black/10"
                    style={{
                      backgroundColor: m.color,
                      backgroundImage: WOOD_SWATCHES[m.id]
                        ? `url(${WOOD_SWATCHES[m.id]})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundBlendMode: "multiply",
                    }}
                  />
                  <span>
                    <span className="block font-medium leading-tight">{m.label}</span>
                    <span className="text-muted-foreground">{brl(m.pricePerM2)}/m²</span>
                  </span>
                </button>
              ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Padrões ilustrativos; confirme cor e textura na amostra física da marcenaria.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["estrutura", "Estrutura"],
                ["portas", "Portas e gavetas"],
                ["interior", "Interior"],
                ["fundo", "Fundo"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-muted-foreground">
                {label}
                <select
                  value={c.config.materials[key]}
                  onChange={(event) =>
                    c.set("materials", {
                      ...c.config.materials,
                      [key]: event.target.value,
                    })
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                >
                  {materials
                    .filter((m) => key === "portas" || m.finish === "madeira" || m.finish === "mdf")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        {selectedPart && (
          <section>
            <SectionTitle>Peça selecionada</SectionTitle>
            <div className="rounded-xl border border-primary/40 bg-secondary p-4">
              <p className="font-medium">{selectedPart.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedPart.size.map((v) => Math.round(v)).join(" × ")} cm · {selectedPart.kind}
              </p>
              {selectedPart.kind === "acessorio" && !selectedPart.id.startsWith("mod-") && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Arraste a peça no 3D ou ajuste sua posição aqui.
                  </p>
                  {(["X", "Y", "Profundidade"] as const).map((axis, index) => (
                    <Stepper
                      key={axis}
                      label={axis}
                      suffix="cm"
                      min={index === 1 ? -80 : -50}
                      max={index === 1 ? 80 : 50}
                      value={Math.round(
                        (c.config.accessoryOffsets?.[selectedPart.id] ?? [0, 0, 0])[index] ?? 0,
                      )}
                      onChange={(value) => {
                        const offset = [
                          ...(c.config.accessoryOffsets?.[selectedPart.id] ?? [0, 0, 0]),
                        ] as [number, number, number];
                        offset[index] = value;
                        c.moveAccessory(selectedPart.id, offset);
                      }}
                    />
                  ))}
                </div>
              )}
              {selectedPart.id.startsWith("mod-") && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Mover: arraste no 3D. Para portas e gavetas, segure Shift durante o arraste.
                  </p>
                  {([0, 1] as const).map((axis) => (
                    <Stepper
                      key={axis}
                      label={axis === 0 ? "Posição horizontal" : "Altura"}
                      suffix="cm"
                      min={axis === 0 ? -Math.round(c.config.width / 2) : 0}
                      max={axis === 0 ? Math.round(c.config.width / 2) : c.config.height}
                      value={Math.round(selectedPart.pos[axis])}
                      onChange={(value) => {
                        const home = selectedPart.homePos ?? selectedPart.pos;
                        const offset = [
                          ...(c.config.componentOffsets?.[selectedPart.id] ?? [0, 0, 0]),
                        ] as [number, number, number];
                        offset[axis] = value - home[axis];
                        c.moveComponent(selectedPart.id, offset);
                      }}
                    />
                  ))}
                  <label className="block text-xs text-muted-foreground">
                    Material da peça
                    <select
                      value={
                        c.config.componentInstances?.find(
                          (instance) => instance.id === selectedPart.id,
                        )?.material ??
                        selectedPart.material ??
                        c.config.material
                      }
                      onChange={(event) =>
                        c.setComponentMaterial(selectedPart.id, event.target.value)
                      }
                      className="mt-1 block h-9 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                    >
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onMessage?.(
                        c.duplicateComponent(selectedPart.id)
                          ? "Peça duplicada."
                          : "Não há espaço para duplicar a peça.",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    <Copy className="size-3.5" /> Duplicar peça
                  </button>
                </div>
              )}
              {selectedPart.removable && (
                <button
                  type="button"
                  onClick={() => c.removePart(selectedPart.id)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" /> Excluir peça
                </button>
              )}
            </div>
          </section>
        )}

        {c.issues.length > 0 && (
          <section className="space-y-2">
            {c.issues.map((i, idx) => (
              <p
                key={idx}
                className={`flex gap-2 rounded-lg px-3 py-2 text-xs ${i.level === "error" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {i.message}
              </p>
            ))}
          </section>
        )}

        <section>
          <SectionTitle>Estimativa</SectionTitle>
          <dl className="space-y-1.5 text-sm">
            {[
              ["MDF", c.price.mdf],
              ["Portas", c.price.portas],
              ["Gavetas", c.price.gavetas],
              ["Ferragens", c.price.ferragens],
              ["Espelho", c.price.espelho],
              ["Mão de obra", c.price.maoDeObra],
              ["Montagem", c.price.montagem],
            ]
              .filter(([, v]) => (v as number) > 0)
              .map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-muted-foreground">
                  <dt>{k as string}</dt>
                  <dd className="tabular-nums">{brl(v as number)}</dd>
                </div>
              ))}
            <div className="flex items-baseline justify-between border-t border-border pt-2.5">
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                Estimativa
              </dt>
              <dd className="font-display text-2xl tabular-nums">{brl(c.price.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {c.price.areaM2} m² de MDF · {c.parts.length} peças
          </p>
        </section>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-card/80 p-4 backdrop-blur">
        <button
          type="button"
          onClick={onQuote}
          disabled={errors.length > 0}
          className="btn-primary w-full disabled:opacity-40"
        >
          Solicitar orçamento · {brl(c.price.total)}
        </button>
        <button type="button" onClick={onSave} className="btn-ghost w-full">
          Salvar projeto
        </button>
      </div>
    </div>
  );
}

export default ControlPanel;
