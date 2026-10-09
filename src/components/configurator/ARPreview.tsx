import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { X, ScanLine, Smartphone } from "lucide-react";
import type { FurnitureConfig, Part } from "@/lib/furniture/types";
import { createFurnitureScene, exportFurnitureUSDZ } from "@/lib/furniture/usdz";
import CameraPreview from "./CameraPreview";
import {
  clampScale,
  gestureMetrics,
  gestureTransform,
  INITIAL_TRANSFORM,
} from "@/lib/furniture/arInteraction";
import type { PreviewTransform, TouchPoint } from "@/lib/furniture/arInteraction";
import type { PointerEvent as ReactPointerEvent } from "react";
import { encodeConfiguration } from "@/lib/furniture/configValidation";

type ARStatus = "preparing" | "ready" | "starting" | "placing" | "placed" | "unsupported" | "error";
type XRSessionLike = XRSession;

type Props = {
  parts: Part[];
  config: FurnitureConfig;
  webglAvailable: boolean;
  onClose: () => void;
};

export default function ARPreview({ parts, config, webglAvailable, onClose }: Props) {
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  const [status, setStatus] = useState<ARStatus>("preparing");
  const [errorText, setErrorText] = useState("");
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mode, setMode] = useState<"xr" | "camera">("xr");
  const [xrSupported, setXrSupported] = useState<boolean | null>(null);
  const [transform, setTransform] = useState({ ...INITIAL_TRANSFORM });
  const transformRef = useRef<PreviewTransform>({ ...INITIAL_TRANSFORM });
  const pointers = useRef(new Map<number, TouchPoint>());
  const gesture = useRef<{
    metrics: NonNullable<ReturnType<typeof gestureMetrics>>;
    base: PreviewTransform;
    position: THREE.Vector3;
    origin: THREE.Vector3 | null;
  } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sessionRef = useRef<XRSessionLike | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const furnitureRef = useRef<THREE.Group | null>(null);
  const reticleRef = useRef<THREE.Group | null>(null);
  const hitSourceRef = useRef<XRHitTestSource | null>(null);
  const localSpaceRef = useRef<XRReferenceSpace | null>(null);
  const placedRef = useRef(false);
  const mountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isIOS) return;
    let alive = true;
    const xr = navigator.xr;
    const timeout = window.setTimeout(() => {
      if (alive) {
        setXrSupported(false);
        setStatus("unsupported");
      }
    }, 4000);
    if (!webglAvailable || !xr) {
      setXrSupported(false);
      setStatus("unsupported");
      clearTimeout(timeout);
    } else
      void xr
        .isSessionSupported("immersive-ar")
        .then((supported) => {
          if (!alive) return;
          clearTimeout(timeout);
          setXrSupported(supported);
          if (!supported) setStatus("unsupported");
        })
        .catch(() => {
          if (alive) {
            clearTimeout(timeout);
            setXrSupported(false);
            setStatus("unsupported");
          }
        });
    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, [isIOS, webglAvailable]);

  useEffect(() => {
    if (!isIOS) return;
    let cancelled = false;
    let url: string | null = null;
    void exportFurnitureUSDZ(parts, config)
      .then((data) => {
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([data], { type: "model/vnd.usdz+zip" }));
        setUsdzUrl(url);
        setStatus("ready");
      })
      .catch((error) => {
        console.error("Quick Look export error", error);
        if (!cancelled) {
          setErrorText("Não foi possível preparar o modelo para o Quick Look.");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isIOS, parts, config]);

  useEffect(() => {
    if (isIOS || mode !== "xr" || xrSupported !== true) return undefined;
    mountedRef.current = true;
    if (!webglAvailable || !hostRef.current || !(navigator as Navigator & { xr?: unknown }).xr) {
      setStatus("unsupported");
      return undefined;
    }
    const host = hostRef.current;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(1);
      const activeRenderer = renderer;
      renderer.setClearColor(0x000000, 0);
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType("local");
      renderer.setSize(window.innerWidth, window.innerHeight);
      host.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = createFurnitureScene(parts, config);
      scene.background = null;
      const furniture = new THREE.Group();
      for (const child of [...scene.children]) furniture.add(child);
      furniture.visible = false;
      scene.add(furniture);
      furnitureRef.current = furniture;
      sceneRef.current = scene;
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(2, 5, 2);
      scene.add(light);

      const reticle = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.1, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      reticle.add(ring);
      reticle.visible = false;
      reticle.matrixAutoUpdate = false;
      scene.add(reticle);
      reticleRef.current = reticle;
      const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.01,
        100,
      );
      const resize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        activeRenderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", resize);
      const preventUIPlacement = (event: Event) => {
        if ((event.target as HTMLElement)?.closest?.("[data-ar-ui]")) event.preventDefault();
      };
      const overlay = document.getElementById("ar-dom-overlay");
      overlay?.addEventListener("beforexrselect", preventUIPlacement);

      renderer.setAnimationLoop((_, frame) => {
        if (!frame) return;
        if (frame && hitSourceRef.current && localSpaceRef.current && !placedRef.current) {
          const hit = frame.getHitTestResults(hitSourceRef.current)[0];
          const pose = hit?.getPose(localSpaceRef.current);
          reticle.visible = Boolean(pose);
          if (pose) reticle.matrix.fromArray(pose.transform.matrix);
        }
        activeRenderer.render(scene, camera);
      });
      setStatus("ready");

      return () => {
        mountedRef.current = false;
        window.removeEventListener("resize", resize);
        overlay?.removeEventListener("beforexrselect", preventUIPlacement);
        hitSourceRef.current?.cancel?.();
        hitSourceRef.current = null;
        void sessionRef.current?.end().catch(() => {});
        activeRenderer.setAnimationLoop(null);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material))
              object.material.forEach((material) => material.dispose());
            else object.material.dispose();
          }
        });
        activeRenderer.dispose();
        activeRenderer.forceContextLoss();
        activeRenderer.domElement.remove();
        rendererRef.current = null;
      };
    } catch (error) {
      console.error("WebXR renderer setup error", error);
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
      setErrorText("Não foi possível preparar o ambiente 3D neste navegador.");
      setStatus("error");
      return undefined;
    }
  }, [isIOS, mode, xrSupported, webglAvailable, parts, config]);

  const applyTransform = (next: PreviewTransform) => {
    const bounded = { ...next, scale: clampScale(next.scale) };
    transformRef.current = bounded;
    furnitureRef.current?.scale.setScalar(bounded.scale);
    if (furnitureRef.current) furnitureRef.current.rotation.y = bounded.rotation;
    setTransform(bounded);
  };
  const planePoint = (x: number, y: number) => {
    const model = furnitureRef.current;
    const renderer = rendererRef.current;
    if (!model || !renderer?.xr.isPresenting) return null;
    const xrCamera = renderer.xr.getCamera();
    const camera = xrCamera.cameras[0];
    if (!camera) return null;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1),
      camera,
    );
    return ray.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -model.position.y),
      new THREE.Vector3(),
    );
  };
  const rebaseGesture = () => {
    const metrics = gestureMetrics([...pointers.current.values()]);
    gesture.current =
      metrics && furnitureRef.current
        ? {
            metrics,
            base: { ...transformRef.current },
            position: furnitureRef.current.position.clone(),
            origin: planePoint(metrics.x, metrics.y),
          }
        : null;
  };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    rebaseGesture();
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const next = gestureMetrics([...pointers.current.values()]);
    const initial = gesture.current;
    if (!next || !initial) return;
    applyTransform(gestureTransform(initial.metrics, next, initial.base));
    const hit = planePoint(next.x, next.y);
    if (hit && initial.origin && furnitureRef.current) {
      const movement = hit.sub(initial.origin);
      movement.y = 0;
      movement.clampLength(0, 3);
      furnitureRef.current.position.copy(initial.position).add(movement);
    }
  };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    rebaseGesture();
  };

  const place = () => {
    const reticle = reticleRef.current;
    const furniture = furnitureRef.current;
    if (!reticle?.visible || !furniture || placedRef.current) return;
    furniture.position.setFromMatrixPosition(reticle.matrix);
    furniture.visible = true;
    reticle.visible = false;
    placedRef.current = true;
    setStatus("placed");
  };

  const startAR = async () => {
    const xr = (
      navigator as Navigator & {
        xr?: {
          requestSession: (mode: string, options: object) => Promise<XRSessionLike>;
        };
      }
    ).xr;
    const renderer = rendererRef.current;
    if (!xr || !renderer || status !== "ready") return;
    setStatus("starting");
    let session: XRSessionLike | null = null;
    let started = false;
    try {
      const overlay = document.getElementById("ar-dom-overlay");
      // requestSession runs directly in this button's user gesture.
      const openedSession = await xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "local"],
        ...(overlay ? { optionalFeatures: ["dom-overlay"], domOverlay: { root: overlay } } : {}),
      });
      session = openedSession;
      if (!mountedRef.current) {
        await openedSession.end();
        return;
      }
      sessionRef.current = openedSession;
      openedSession.addEventListener("end", () => {
        if (started && mountedRef.current) onCloseRef.current();
      });
      openedSession.addEventListener("select", place);
      await renderer.xr.setSession(openedSession);
      const [localSpace, viewerSpace] = await Promise.all([
        openedSession.requestReferenceSpace("local"),
        openedSession.requestReferenceSpace("viewer"),
      ]);
      localSpaceRef.current = localSpace;
      if (!openedSession.requestHitTestSource) throw new Error("Hit test unavailable");
      hitSourceRef.current =
        (await openedSession.requestHitTestSource({ space: viewerSpace })) ?? null;
      if (!hitSourceRef.current) throw new Error("Hit test unavailable");
      started = true;
      if (mountedRef.current) setStatus("placing");
    } catch (error) {
      console.error("WebXR session error", error);
      if (session) void session.end().catch(() => {});
      if (!mountedRef.current) return;
      const name = error instanceof DOMException ? error.name : "";
      setErrorText(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Permita o acesso à câmera e à realidade aumentada nas configurações do Chrome e tente novamente."
          : name === "NotSupportedError"
            ? "Este aparelho ou navegador não oferece ARCore/WebXR com rastreamento do ambiente."
            : "Não foi possível iniciar a RA. Verifique os Serviços do Google Play para RA e tente novamente.",
      );
      setStatus("error");
    }
  };

  const close = () => {
    void sessionRef.current?.end().catch(() => {});
    onClose();
  };

  const copyToPhone = async () => {
    let url: string;
    try {
      url = `${window.location.origin}${window.location.pathname}?c=${encodeConfiguration(config)}`;
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Não foi possível criar o link.");
      setStatus("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
    } catch {
      window.prompt("Copie o link para abrir no celular:", url);
    }
  };

  const statusText = {
    preparing: "Preparando o modelo 3D…",
    ready: "O móvel está pronto. Toque para abrir a câmera em RA.",
    starting: "Aguardando a permissão de realidade aumentada…",
    placing: "Aponte para o chão e toque para posicionar o móvel.",
    placed: "Móvel posicionado em tamanho real.",
    unsupported: "Este navegador não oferece WebXR/ARCore para posicionar o móvel no ambiente.",
    error: errorText,
  }[status];

  const controls = (
    <>
      {status === "placed" && (
        <div
          data-ar-ui
          className="pointer-events-auto absolute inset-0 touch-none"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onLostPointerCapture={pointerUp}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-4 text-white">
        <div
          data-ar-ui
          className="pointer-events-auto max-w-[calc(100%-60px)] rounded-2xl bg-black/70 px-4 py-3"
        >
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <ScanLine className="size-4" /> Ver no meu ambiente
          </div>
          <p className="text-xs leading-5 text-white/85">
            {isIOS ? "Abra o móvel no Quick Look da Apple." : statusText}
          </p>
        </div>
        <button
          data-ar-ui
          type="button"
          onClick={close}
          className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-black/70"
          aria-label="Fechar AR"
        >
          <X className="size-5" />
        </button>
      </div>
      {isIOS ? (
        <div
          data-ar-ui
          className="pointer-events-auto absolute inset-x-5 bottom-8 rounded-2xl bg-white p-5 text-center shadow-2xl"
        >
          <Smartphone className="mx-auto mb-3 size-7 text-neutral-700" />
          <p className="text-sm font-medium text-neutral-900">Realidade aumentada no iPhone</p>
          {usdzUrl && (
            <a
              rel="ar"
              href={usdzUrl}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
            >
              <img
                src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                alt=""
                className="size-4"
              />
              Abrir no meu ambiente
            </a>
          )}
          {!usdzUrl && (
            <p className="mt-4 text-xs text-neutral-500">{errorText || "Preparando o móvel…"}</p>
          )}
          <button
            type="button"
            onClick={close}
            className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-900"
          >
            Voltar ao configurador
          </button>
        </div>
      ) : status === "ready" ||
        status === "starting" ||
        status === "unsupported" ||
        status === "error" ? (
        <div
          data-ar-ui
          className="pointer-events-auto absolute inset-x-5 bottom-8 rounded-2xl bg-white p-5 text-center shadow-2xl"
        >
          <Smartphone className="mx-auto mb-3 size-7 text-neutral-700" />
          <p className="text-sm font-medium text-neutral-900">
            {status === "ready" || status === "starting"
              ? "Posicionar no ambiente"
              : "AR indisponível"}
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{statusText}</p>
          {status === "ready" && (
            <button
              type="button"
              onClick={() => void startAR()}
              className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
            >
              Iniciar RA e permitir câmera
            </button>
          )}
          <button
            type="button"
            disabled={status === "starting"}
            onClick={() => setMode("camera")}
            className="mt-3 w-full rounded-xl border border-neutral-400 px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
          >
            Usar prévia pela câmera — sem ARCore
          </button>
          {(status === "error" || status === "unsupported") && (
            <button
              type="button"
              onClick={() => void copyToPhone()}
              className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
            >
              {linkCopied ? "Link copiado" : "Copiar projeto para outro aparelho"}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-900"
          >
            Voltar ao configurador
          </button>
        </div>
      ) : status === "placing" ? (
        <div
          data-ar-ui
          className="pointer-events-auto absolute inset-x-5 bottom-8 rounded-xl bg-black/75 p-4 text-center text-white"
        >
          <p className="text-xs">Aponte para uma área bem iluminada e mova o celular devagar.</p>
          <button
            className="mt-3 rounded-lg bg-white px-4 py-2 text-sm text-neutral-900"
            onClick={place}
          >
            Colocar móvel no chão
          </button>
          <button className="mt-3 block w-full text-xs underline" onClick={() => setMode("camera")}>
            Usar prévia pela câmera
          </button>
        </div>
      ) : status === "placed" ? (
        <div
          data-ar-ui
          className="pointer-events-auto absolute inset-x-4 bottom-5 rounded-2xl bg-black/80 p-4 text-white"
        >
          <p className="mb-3 text-xs">Arraste para mover. Use dois dedos para aumentar e girar.</p>
          <label className="flex items-center gap-3 text-xs">
            Escala {Math.round(transform.scale * 100)}%
            <input
              className="min-w-0 flex-1"
              type="range"
              aria-label="Escala do móvel em RA"
              min="25"
              max="250"
              value={Math.round(transform.scale * 100)}
              onChange={(e) =>
                applyTransform({
                  ...transformRef.current,
                  scale: Number(e.target.value) / 100,
                })
              }
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-lg border border-white/30 p-2 text-xs"
              onClick={() =>
                applyTransform({
                  ...transformRef.current,
                  rotation: transformRef.current.rotation - Math.PI / 12,
                })
              }
            >
              Girar −15°
            </button>
            <button
              className="flex-1 rounded-lg border border-white/30 p-2 text-xs"
              onClick={() =>
                applyTransform({
                  ...transformRef.current,
                  rotation: transformRef.current.rotation + Math.PI / 12,
                })
              }
            >
              Girar +15°
            </button>
            <button
              className="flex-1 rounded-lg border border-white/30 p-2 text-xs"
              onClick={() => applyTransform({ ...INITIAL_TRANSFORM })}
            >
              Tamanho real
            </button>
          </div>
          <button
            className="mt-3 w-full text-xs underline"
            onClick={() => {
              placedRef.current = false;
              if (furnitureRef.current) furnitureRef.current.visible = false;
              pointers.current.clear();
              setStatus("placing");
            }}
          >
            Reposicionar no chão
          </button>
        </div>
      ) : null}
    </>
  );

  const overlay =
    !isIOS && typeof document !== "undefined" ? document.getElementById("ar-dom-overlay") : null;
  if (mode === "camera")
    return (
      <CameraPreview parts={parts} config={config} onClose={onClose} onBack={() => setMode("xr")} />
    );
  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {!isIOS && <div ref={hostRef} className="absolute inset-0" />}
      {overlay ? createPortal(controls, overlay) : controls}
    </div>
  );
}
