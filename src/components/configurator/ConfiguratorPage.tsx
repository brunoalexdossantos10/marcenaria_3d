import { Link } from "@tanstack/react-router";
import { Component, lazy, Suspense, useState, useRef, useCallback } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { ArrowLeft, RotateCcw, SlidersHorizontal, Share2, Download, ScanLine } from "lucide-react";
import {
  useConfigurator,
  BASE_CONFIG,
  nextProjectCode,
  persistProject,
} from "@/lib/furniture/store";
import ControlPanel from "@/components/configurator/ControlPanel";
import QuoteDialog from "@/components/configurator/QuoteDialog";
import ARPreview from "@/components/configurator/ARPreview";
import type { CameraView } from "@/components/configurator/Scene";
import { normalizeConfig } from "@/lib/furniture/builder";
import {
  encodeConfiguration,
  decodeConfiguration,
  isConfigurationAllowed,
} from "@/lib/furniture/configValidation";
import { FURNITURE_TYPES, HANDLE_MODELS, type FurnitureConfig } from "@/lib/furniture/types";
import { useTenant, tenantOptions } from "@/lib/saas/context";
import { saveOrganizationProject, client } from "@/lib/saas/api";
import { MATERIALS } from "@/lib/furniture/materials";
import { constrainPose, footprint, type FurniturePose } from "@/lib/furniture/positioning";
import { roomSize } from "@/lib/furniture/roomBounds";
import { typeDef } from "@/lib/furniture/types";
import type { PlacementMode } from "@/components/configurator/FurniturePlacement";
import EnvironmentPicker from "@/components/configurator/environments/EnvironmentPicker";
import type { EnvironmentChoice } from "@/components/configurator/environments/types";

const Scene = lazy(() => import("@/components/configurator/Scene"));

class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha ao inicializar o modelador 3D", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-lg font-semibold">Não foi possível iniciar o ambiente 3D</p>
        <p className="max-w-md text-sm text-muted-foreground">
          O restante do configurador continua disponível. Verifique a aceleração gráfica e tente
          carregar a cena novamente.
        </p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
        <details className="max-w-md text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer">Detalhes técnicos</summary>
          <p className="mt-1 break-words">{this.state.error.message || this.state.error.name}</p>
        </details>
      </div>
    );
  }
}

const VIEWS: { key: CameraView; label: string }[] = [
  { key: "frente", label: "Frente" },
  { key: "lateral", label: "Lateral" },
  { key: "topo", label: "Topo" },
];

export function ConfiguradorPage({ projectConfig }: { projectConfig?: FurnitureConfig } = {}) {
  const tenant = useTenant();
  const [initialConfig] = useState<FurnitureConfig | undefined>(() => {
    if (projectConfig) return normalizeConfig(projectConfig);
    if (typeof window === "undefined") return undefined;
    const encoded = new URLSearchParams(window.location.search).get("c");
    const defaults = () => {
      if (!tenant) return undefined;
      const models = tenantOptions(FURNITURE_TYPES, tenant, "model");
      const mat = tenantOptions(MATERIALS, tenant, "material").find(
        (m) => m.finish === "madeira" || m.finish === "mdf",
      );
      const handle = tenantOptions(HANDLE_MODELS, tenant, "handle")[0];
      const model = models[0];
      return normalizeConfig({
        ...BASE_CONFIG,
        ...(model?.defaults ?? {}),
        type: model?.id ?? BASE_CONFIG.type,
        ...(mat
          ? {
              material: mat.id,
              materials: {
                estrutura: mat.id,
                portas: mat.id,
                interior: mat.id,
                fundo: mat.id,
              },
            }
          : {}),
        ...(handle ? { handle: { ...BASE_CONFIG.handle, model: handle.id } } : {}),
        accessories: [],
      });
    };
    if (!encoded || encoded.length > 32000) return defaults();
    try {
      const value = decodeConfiguration(encoded);
      if (!value || !FURNITURE_TYPES.some((type) => type.id === value.type)) return defaults();
      if (
        ![value.width, value.height, value.depth].every(
          (n) => typeof n === "number" && Number.isFinite(n) && n > 0 && n < 1000,
        )
      )
        return defaults();
      const normalized = normalizeConfig(value as FurnitureConfig);
      if (tenant && !isConfigurationAllowed(normalized, tenant.catalog)) return defaults();
      return normalized;
    } catch {
      return defaults();
    }
  });
  const c = useConfigurator(initialConfig);
  const captureRef = useRef<(() => string | null) | null>(null);
  const registerCapture = useCallback((capture: (() => string | null) | null) => {
    captureRef.current = capture;
  }, []);
  const [webglAvailable] = useState(() => {
    if (typeof document === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      const available = Boolean(context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
      return available;
    } catch {
      return false;
    }
  });
  const [view, setView] = useState<{ name: CameraView; n: number }>({
    name: "reset",
    n: 0,
  });
  const [environment, setEnvironment] = useState<EnvironmentChoice>({
    room: "quarto",
    style: "moderno",
  });
  const [drafts, setDrafts] = useState<
    { id: string; config: FurnitureConfig; createdAt: string }[] | null
  >(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [positioning, setPositioning] = useState(false);
  const [placementMode, setPlacementMode] = useState<PlacementMode>("mover");
  const [sensitivity, setSensitivity] = useState(0.25);
  const place = (pose: FurniturePose) =>
    c.setConfig((current) => ({
      ...current,
      floorPosition: [pose.x, pose.z],
      floorRotation: pose.rotation,
      floorElevation: pose.elevation,
    }));
  const roomConfig = {
    ...c.config,
    width: Math.max(c.config.width, ...(c.config.roomItems ?? []).map((item) => item.config.width)),
    depth: Math.max(c.config.depth, ...(c.config.roomItems ?? []).map((item) => item.config.depth)),
    height: Math.max(
      c.config.height,
      ...(c.config.roomItems ?? []).map((item) => item.config.height),
    ),
  };
  const room = roomSize(roomConfig.width, roomConfig.depth, roomConfig.height);
  const installation = typeDef(c.config.type).installation;
  const pose: FurniturePose = {
    x: c.config.floorPosition?.[0] ?? 0,
    z: c.config.floorPosition?.[1] ?? 0,
    rotation: c.config.floorRotation ?? 0,
    elevation:
      c.config.floorElevation ??
      (installation === "parede"
        ? Math.max(80, room.h * 100 - c.config.height - 35)
        : installation === "suspenso"
          ? 45
          : 0),
  };
  const changePose = (next: FurniturePose) =>
    place(constrainPose(c.config, roomConfig, next, pose, c.config.roomItems ?? []));
  const [toast, setToast] = useState<string | null>(null);
  const [arOpen, setArOpen] = useState(false);
  const openAR = () => setArOpen(true);

  const go = (name: CameraView) => setView((v) => ({ name, n: v.n + 1 }));

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const addNiche = (x: number, y: number) => {
    notify(
      c.addNicheAt(x, y)
        ? "Nicho adicionado ao móvel."
        : "Não há espaço livre para outro nicho nesta posição.",
    );
  };
  const addComponent = (type: string, x: number, y: number) => {
    const entries = tenant?.catalog.filter((e) => e.kind === "accessory") ?? [];
    if (entries.length && !entries.some((e) => e.source_id === `mod:${type}` && e.active)) {
      notify("Componente indisponível nesta marcenaria.");
      return;
    }
    notify(
      c.addComponent(type, x, y)
        ? "Componente encaixado no móvel."
        : "Não há espaço compatível para esse componente.",
    );
  };

  const save = async () => {
    try {
      if (tenant) {
        const {
          data: { user },
        } = await client().auth.getUser();
        const membership = user
          ? await client()
              .from("organization_members")
              .select("role")
              .eq("organization_id", tenant.organization.id)
              .eq("user_id", user.id)
              .maybeSingle()
          : null;
        if (!user || !membership?.data || membership.data.role === "CUSTOMER") {
          const key = `modelador3d.drafts.${tenant.organization.id}`;
          const draft = {
            id: crypto.randomUUID(),
            config: c.config,
            price: c.price.total,
            createdAt: new Date().toISOString(),
          };
          let drafts: unknown[] = [];
          try {
            drafts = JSON.parse(localStorage.getItem(key) ?? "[]");
          } catch {
            /* Restore a damaged draft list. */
          }
          localStorage.setItem(key, JSON.stringify([draft, ...drafts].slice(0, 30)));
          notify("Rascunho salvo neste navegador. Solicite orçamento para enviar à marcenaria.");
          return;
        }
        const code = await saveOrganizationProject(tenant.organization, c.config, c.price.total);
        notify(`${code} salvo na marcenaria.`);
        return;
      }
      const { project, cloud } = await persistProject({
        id: crypto.randomUUID(),
        code: nextProjectCode(),
        createdAt: new Date().toISOString(),
        config: c.config,
        price: c.price.total,
        status: "Novo projeto",
      });
      notify(`${project.code} salvo ${cloud ? "na sua conta" : "neste navegador"}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar o projeto.");
    }
  };

  const share = async () => {
    let url: string;
    try {
      url = `${window.location.origin}${tenant ? `/m/${tenant.organization.slug}` : "/configurador"}?c=${encodeURIComponent(encodeConfiguration(c.config))}`;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível compartilhar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      notify("Link do projeto copiado.");
    } catch {
      notify(url);
    }
  };

  const download = () => {
    const blob = new Blob(
      [JSON.stringify({ config: c.config, price: c.price, parts: c.parts }, null, 2)],
      {
        type: "application/json",
      },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "projeto-marcenaria.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main
      style={
        tenant
          ? ({
              "--primary": tenant.organization.primary_color,
              "--ring": tenant.organization.primary_color,
              "--secondary": tenant.organization.secondary_color,
            } as React.CSSProperties)
          : undefined
      }
      className="flex h-[100dvh] flex-col overflow-hidden bg-background lg:flex-row"
    >
      <section className="relative min-h-0 flex-1">
        {arOpen ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Visualização no ambiente aberta
          </div>
        ) : webglAvailable ? (
          <SceneErrorBoundary>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Preparando o ambiente 3D…
                </div>
              }
            >
              <Scene
                parts={c.parts}
                config={c.config}
                selected={c.selected}
                onSelect={c.setSelected}
                onAccessoryMove={c.moveAccessory}
                onComponentMove={c.moveComponent}
                onAddNiche={addNiche}
                onAddComponent={addComponent}
                onSelectFurniture={c.selectFurniture}
                onResize={(axis, value) => c.set(axis, value)}
                positioning={positioning}
                placementMode={placementMode}
                sensitivity={sensitivity}
                onPlace={place}
                view={view}
                environment={environment}
                onCaptureReady={registerCapture}
              />
            </Suspense>
          </SceneErrorBoundary>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-lg font-semibold">Prévia 3D indisponível neste navegador</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Ative a aceleração gráfica ou abra o configurador em um navegador com WebGL. Você
              ainda pode ajustar as medidas e acabamentos no painel.
            </p>
          </div>
        )}

        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
          <a
            href={
              tenant?.organization.website && /^https?:\/\//.test(tenant.organization.website)
                ? tenant.organization.website
                : tenant
                  ? `#`
                  : `/`
            }
            onClick={(event) => {
              if (tenant && !tenant.organization.website) event.preventDefault();
            }}
            className="btn-ghost pointer-events-auto h-10 max-w-[45%] truncate"
          >
            {tenant?.organization.logo ? (
              <img src={tenant.organization.logo} alt="" className="h-7 max-w-20 object-contain" />
            ) : (
              <ArrowLeft className="size-4" />
            )}{" "}
            {tenant?.organization.name ?? "Início"}
          </a>
          <div className="pointer-events-auto flex gap-2">
            {tenant && (
              <button
                type="button"
                className="btn-ghost h-10 px-3 text-xs"
                onClick={() => {
                  try {
                    const value = JSON.parse(
                      localStorage.getItem(`modelador3d.drafts.${tenant.organization.id}`) ?? "[]",
                    );
                    setDrafts(Array.isArray(value) ? value : []);
                  } catch {
                    setDrafts([]);
                  }
                }}
              >
                Rascunhos
              </button>
            )}
            <button
              type="button"
              onClick={share}
              className="btn-ghost h-10 px-3"
              aria-label="Compartilhar projeto"
            >
              <Share2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={openAR}
              className="btn-primary h-10 px-3"
              aria-label="Ver no meu ambiente"
            >
              <ScanLine className="size-4" />
              <span className="hidden xl:inline">Ver no ambiente</span>
            </button>
            <button
              type="button"
              onClick={download}
              className="btn-ghost h-10 px-3"
              aria-label="Baixar projeto"
            >
              <Download className="size-4" />
            </button>
          </div>
        </header>

        <div className="absolute left-4 top-20 z-10 max-w-60 rounded-xl border border-border bg-card/95 p-2 shadow-soft backdrop-blur">
          <button
            type="button"
            onClick={() => {
              setEditing((current) => !current);
              setPositioning(false);
            }}
            className="flex w-full items-center justify-center rounded-lg bg-secondary px-3 py-2 text-xs font-semibold hover:bg-primary/20"
          >
            {editing ? "Concluir edição" : "Personalizar móvel"}
          </button>
          <button
            type="button"
            aria-pressed={positioning}
            onClick={() => {
              setPositioning((value) => !value);
              setEditing(false);
            }}
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold"
          >
            {positioning ? "Fixar móvel · concluir" : "Posicionar móvel"}
          </button>
          {positioning && (
            <div className="mt-3 space-y-3 px-1">
              <div className="flex gap-1">
                {(["mover", "girar", "altura"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={placementMode === mode}
                    onClick={() => setPlacementMode(mode)}
                    className={`chip text-xs ${placementMode === mode ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {mode === "mover" ? "Mover" : mode === "girar" ? "Girar" : "Altura"}
                  </button>
                ))}
              </div>
              <label className="block text-xs">
                Sensibilidade · {Math.round(sensitivity * 100)}%
                <input
                  aria-label="Sensibilidade do movimento"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={sensitivity}
                  onChange={(event) => setSensitivity(Number(event.target.value))}
                  className="mt-2 w-full"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="chip text-xs"
                  onClick={() => changePose({ ...pose, rotation: pose.rotation - 5 })}
                >
                  Girar −5°
                </button>
                <button
                  type="button"
                  className="chip text-xs"
                  onClick={() => changePose({ ...pose, rotation: pose.rotation + 5 })}
                >
                  Girar +5°
                </button>
              </div>
              <label className="block text-xs">
                Rotação (graus)
                <input
                  aria-label="Rotação do móvel"
                  type="number"
                  step="1"
                  value={Math.round(pose.rotation)}
                  onChange={(event) =>
                    changePose({ ...pose, rotation: Number(event.target.value) })
                  }
                  className="mt-1 w-full rounded border border-border bg-background p-1"
                />
              </label>
              <label className="block text-xs">
                Altura do chão (cm)
                <input
                  aria-label="Altura do móvel acima do chão"
                  type="number"
                  min="0"
                  max={Math.floor(room.h * 100 - c.config.height - 2)}
                  step="1"
                  value={pose.elevation}
                  onChange={(event) =>
                    changePose({ ...pose, elevation: Number(event.target.value) })
                  }
                  className="mt-1 w-full rounded border border-border bg-background p-1"
                />
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="chip text-xs"
                  onClick={() => changePose({ ...pose, elevation: 0 })}
                >
                  No piso
                </button>
                <button
                  type="button"
                  className="chip text-xs"
                  onClick={() =>
                    changePose({
                      ...pose,
                      z: room.back * 100 + footprint(c.config, pose.rotation).depth / 2 + 2,
                    })
                  }
                >
                  Encostar no fundo
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Arraste o móvel na cena. Shift reduz ainda mais a sensibilidade. Conclua para usar
                portas e gavetas.
              </p>
            </div>
          )}
          {editing && !positioning && (
            <>
              <p className="px-2 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Arraste para encaixar
              </p>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {(
                  [
                    ["prateleira", "Prateleira"],
                    ["gaveta", "Gaveta"],
                    ["nicho", "Nicho"],
                    ["cabideiro", "Cabideiro"],
                  ] as const
                )
                  .filter(
                    ([type]) =>
                      !tenant?.catalog.some((e) => e.kind === "accessory") ||
                      tenant.catalog.some(
                        (e) => e.kind === "accessory" && e.source_id === `mod:${type}` && e.active,
                      ),
                  )
                  .map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      draggable={webglAvailable}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/x-m3d-part", `mod:${type}`);
                        event.dataTransfer.setData(`application/x-m3d-mod-${type}`, "1");
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => addComponent(type, 0, c.config.height / 2)}
                      className="rounded-lg px-2 py-2 text-left text-xs hover:bg-secondary"
                      title={`Arraste ${label} para o móvel`}
                    >
                      ＋ {label}
                    </button>
                  ))}
              </div>
              <p className="max-w-52 px-2 pt-2 text-xs text-muted-foreground">
                Móvel fixo. Arraste as peças no 3D; Shift move portas e gavetas.
              </p>
            </>
          )}
        </div>

        <EnvironmentPicker value={environment} onChange={setEnvironment} />

        <div className="absolute inset-x-0 bottom-20 flex flex-wrap justify-center gap-2 px-4 lg:bottom-6">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => go(v.key)}
              className="chip bg-card/85 backdrop-blur"
            >
              {v.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go("reset")}
            className="chip bg-card/85 backdrop-blur"
          >
            <RotateCcw className="mr-1.5 inline size-3.5" /> Resetar câmera
          </button>
        </div>

        {toast && (
          <div className="absolute inset-x-4 top-20 mx-auto max-w-sm rounded-xl border border-border bg-card px-4 py-3 text-center text-sm shadow-soft">
            {toast}
          </div>
        )}

        <button
          type="button"
          onClick={openAR}
          className="btn-primary absolute bottom-16 right-4 z-10 lg:hidden"
          aria-label="Ver no meu ambiente"
        >
          <ScanLine className="size-4" /> AR
        </button>

        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="btn-primary absolute inset-x-4 bottom-4 lg:hidden"
        >
          <SlidersHorizontal className="size-4" /> Personalizar móvel
        </button>
      </section>

      <aside className="hidden w-[380px] shrink-0 border-l border-border bg-background lg:block">
        <ControlPanel c={c} onQuote={() => setQuoteOpen(true)} onSave={save} onMessage={notify} />
      </aside>

      {panelOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-foreground/30 backdrop-blur-sm lg:hidden">
          <div className="h-[82vh] rounded-t-2xl border-t border-border bg-background">
            <div className="flex items-center justify-between px-5 pt-4">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Personalizar
              </span>
              <button type="button" className="btn-ghost h-9" onClick={() => setPanelOpen(false)}>
                Ver em 3D
              </button>
            </div>
            <div className="h-[calc(82vh-3.5rem)]">
              <ControlPanel
                c={c}
                onQuote={() => setQuoteOpen(true)}
                onSave={save}
                onMessage={notify}
              />
            </div>
          </div>
        </div>
      )}

      {drafts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-background p-6">
            <h2 className="font-display text-2xl">Rascunhos neste aparelho</h2>
            {drafts.length ? (
              drafts.map((draft) => (
                <button
                  type="button"
                  key={draft.id}
                  className="mt-3 block w-full rounded-xl border border-border p-3 text-left text-sm"
                  onClick={() => {
                    c.setConfig(normalizeConfig(draft.config));
                    setDrafts(null);
                  }}
                >
                  {FURNITURE_TYPES.find((d) => d.id === draft.config.type)?.label ?? "Projeto"} ·{" "}
                  {new Date(draft.createdAt).toLocaleDateString("pt-BR")}
                </button>
              ))
            ) : (
              <p className="my-4 text-sm text-muted-foreground">
                Salve um projeto para continuar depois neste aparelho.
              </p>
            )}
            <button type="button" onClick={() => setDrafts(null)} className="btn-ghost mt-4">
              Fechar
            </button>
          </div>
        </div>
      )}
      {quoteOpen && (
        <QuoteDialog
          c={c}
          captureImage={() => captureRef.current?.() ?? null}
          onClose={() => setQuoteOpen(false)}
        />
      )}
      {arOpen && (
        <ARPreview
          config={c.config}
          webglAvailable={webglAvailable}
          onClose={() => setArOpen(false)}
        />
      )}
      <div
        id="ar-dom-overlay"
        className="pointer-events-none fixed inset-0 z-[110] bg-transparent"
      />
    </main>
  );
}
