import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { X } from "lucide-react";
import type { FurnitureConfig, Part } from "@/lib/furniture/types";
import { createFurnitureScene } from "@/lib/furniture/usdz";
import {
  cameraErrorMessage,
  clampScale,
  gestureMetrics,
  gestureTransform,
  INITIAL_TRANSFORM,
} from "@/lib/furniture/arInteraction";
import type { PreviewTransform, TouchPoint } from "@/lib/furniture/arInteraction";

/** Camera-only preview: no ARCore, spatial tracking or asserted real-world scale. */
export default function CameraPreview({
  parts,
  config,
  onClose,
  onBack,
}: {
  parts: Part[];
  config: FurnitureConfig;
  onClose: () => void;
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const modelRef = useRef<THREE.Group | null>(null);
  const dimensionsRef = useRef({ height: 0, perPixel: 0.001 });
  const transformRef = useRef<PreviewTransform>({ ...INITIAL_TRANSFORM });
  const pointers = useRef(new Map<number, TouchPoint>());
  const gesture = useRef<{
    metrics: NonNullable<ReturnType<typeof gestureMetrics>>;
    base: PreviewTransform;
  } | null>(null);
  const [transform, setTransform] = useState({ ...INITIAL_TRANSFORM });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [opening, setOpening] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  useEffect(
    () => () => {
      requestRef.current++;
      stopCamera();
    },
    [],
  );

  const startCamera = async (selectedId = deviceId) => {
    if (busyRef.current) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("A câmera precisa de HTTPS e de um navegador compatível. Abra este link no Chrome.");
      return;
    }
    const request = ++requestRef.current;
    busyRef.current = true;
    setOpening(true);
    setError("");
    setPlaying(false);
    setStream(null);
    stopCamera();
    try {
      let next: MediaStream;
      try {
        next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(selectedId
              ? { deviceId: { exact: selectedId } }
              : { facingMode: { ideal: "environment" } }),
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 30 },
          },
        });
      } catch (err) {
        if (
          !(err instanceof Error) ||
          !["OverconstrainedError", "NotFoundError"].includes(err.name) ||
          selectedId
        )
          throw err;
        next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
      }
      if (request !== requestRef.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = next;
      setStream(next);
      setDeviceId(next.getVideoTracks()[0]?.getSettings().deviceId ?? "");
      // Device labels become available only after the user grants permission.
      void navigator.mediaDevices
        .enumerateDevices()
        .then((list) => {
          if (request === requestRef.current)
            setDevices(list.filter((device) => device.kind === "videoinput"));
        })
        .catch(() => {});
    } catch (err) {
      if (request === requestRef.current) setError(cameraErrorMessage(err));
    } finally {
      if (request === requestRef.current) {
        busyRef.current = false;
        setOpening(false);
      }
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    let alive = true;
    void video.play().catch((err) => {
      if (alive) setError(cameraErrorMessage(err));
    });
    const timer = window.setTimeout(() => {
      if (alive && video.readyState < 2) {
        setError(
          "A câmera abriu, mas não enviou imagem. Feche outros apps que usam a câmera e tente outra câmera abaixo.",
        );
      }
    }, 8000);
    return () => {
      alive = false;
      clearTimeout(timer);
      video.pause();
      video.srcObject = null;
    };
  }, [stream]);

  const apply = useCallback((next: PreviewTransform) => {
    const bounded = {
      ...next,
      scale: clampScale(next.scale),
      x: Math.max(-window.innerWidth * 0.45, Math.min(window.innerWidth * 0.45, next.x)),
      y: Math.max(-window.innerHeight * 0.4, Math.min(window.innerHeight * 0.4, next.y)),
    };
    transformRef.current = bounded;
    const model = modelRef.current;
    if (model) {
      model.scale.setScalar(bounded.scale);
      model.rotation.y = bounded.rotation;
      model.position.set(
        bounded.x * dimensionsRef.current.perPixel,
        -dimensionsRef.current.height / 2 - bounded.y * dimensionsRef.current.perPixel,
        0,
      );
    }
    setTransform(bounded);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !stream) return;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let lastFrame = -Infinity;
    const resize = () => {
      if (!renderer || !scene || !modelRef.current) return;
      const camera = cameraRef;
      const aspect = host.clientWidth / Math.max(1, host.clientHeight);
      camera.aspect = aspect;
      const height = dimensionsRef.current.height;
      const distance =
        (Math.max(height, objectWidth / aspect) /
          (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) *
        1.35;
      camera.position.z = distance;
      camera.updateProjectionMatrix();
      dimensionsRef.current.perPixel =
        (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
        Math.max(1, host.clientHeight);
      renderer.setSize(host.clientWidth, host.clientHeight);
      apply(transformRef.current);
    };
    const cameraRef = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    let objectWidth = 1;
    const contextLost = (event: Event) => {
      event.preventDefault();
      setError(
        "O aparelho interrompeu o 3D para liberar memória. Toque em Reabrir câmera para tentar novamente.",
      );
    };
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      host.appendChild(renderer.domElement);
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      scene = createFurnitureScene(parts, config);
      const model = new THREE.Group();
      const contents = new THREE.Group();
      for (const child of [...scene.children]) contents.add(child);
      const box = new THREE.Box3().setFromObject(contents);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      contents.position.set(-center.x, -box.min.y, -center.z);
      model.add(contents);
      scene.add(model);
      modelRef.current = model;
      dimensionsRef.current.height = Math.max(0.01, size.y);
      objectWidth = Math.max(size.x, size.z, 0.01);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x827264, 2.2));
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(3, 5, 4);
      scene.add(light);
      resize();
      const activeRenderer = renderer;
      const activeScene = scene;
      activeRenderer.setAnimationLoop((time) => {
        if (document.hidden || time - lastFrame < 1000 / 30) return;
        lastFrame = time;
        activeRenderer.render(activeScene, cameraRef);
      });
      window.addEventListener("resize", resize);
    } catch {
      setError(
        "A câmera está disponível, mas este navegador não conseguiu abrir o móvel 3D. Feche outros aplicativos e tente no Chrome.",
      );
    }
    return () => {
      window.removeEventListener("resize", resize);
      renderer?.setAnimationLoop(null);
      renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
      scene?.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(
            (material) => material.dispose(),
          );
        }
      });
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
      modelRef.current = null;
    };
    // Transforms update the group directly; they never rebuild the furniture.
  }, [stream, parts, config, apply]);

  const rebase = () => {
    const metrics = gestureMetrics([...pointers.current.values()]);
    gesture.current = metrics ? { metrics, base: { ...transformRef.current } } : null;
  };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    rebase();
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const next = gestureMetrics([...pointers.current.values()]);
    if (next && gesture.current)
      apply(gestureTransform(gesture.current.metrics, next, gesture.current.base));
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    rebase();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Prévia do móvel pela câmera"
      className="fixed inset-0 z-[120] bg-neutral-900 text-white"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onPlaying={() => setPlaying(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div ref={hostRef} className="pointer-events-none absolute inset-0" />
      {playing && (
        <div
          className="absolute inset-0 touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        />
      )}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="rounded-xl bg-black/70 p-3">
          <h2 className="text-sm font-medium">Prévia pela câmera</h2>
          <p className="mt-1 max-w-xs text-xs text-white/80">
            Alinhamento manual, sem rastreamento do chão. O tamanho é aproximado.
          </p>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-black/70"
          aria-label="Fechar câmera"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="absolute inset-x-4 bottom-4 max-h-[55dvh] overflow-y-auto rounded-2xl bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && (
          <p role="alert" className="mb-3 text-sm text-amber-200">
            {error}
          </p>
        )}
        {!stream && (
          <>
            <p className="mb-3 text-sm">
              Use a câmera traseira para visualizar o móvel, mesmo sem ARCore. A câmera fica somente
              neste aparelho.
            </p>
            <button
              disabled={opening}
              onClick={() => void startCamera()}
              className="w-full rounded-xl bg-white p-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
            >
              {opening
                ? "Permita a câmera na mensagem do navegador…"
                : "Permitir câmera e visualizar"}
            </button>
          </>
        )}
        {stream && !playing && !error && (
          <p role="status" className="text-sm">
            Aguardando imagem da câmera…
          </p>
        )}
        {playing && (
          <>
            <p className="mb-3 text-xs text-white/80">
              Arraste com um dedo. Use dois dedos para aumentar e girar.
            </p>
            <label className="flex items-center gap-3 text-xs">
              Tamanho {Math.round(transform.scale * 100)}%
              <input
                className="min-w-0 flex-1"
                aria-label="Tamanho do móvel na prévia"
                type="range"
                min="25"
                max="250"
                value={Math.round(transform.scale * 100)}
                onChange={(e) =>
                  apply({
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
                  apply({
                    ...transformRef.current,
                    rotation: transformRef.current.rotation - Math.PI / 12,
                  })
                }
              >
                Girar à esquerda
              </button>
              <button
                className="flex-1 rounded-lg border border-white/30 p-2 text-xs"
                onClick={() =>
                  apply({
                    ...transformRef.current,
                    rotation: transformRef.current.rotation + Math.PI / 12,
                  })
                }
              >
                Girar à direita
              </button>
              <button
                className="rounded-lg border border-white/30 p-2 text-xs"
                onClick={() => apply({ ...INITIAL_TRANSFORM })}
              >
                Reiniciar
              </button>
            </div>
          </>
        )}
        {devices.length > 1 && (
          <label className="mt-3 block text-xs">
            Câmera
            <select
              className="mt-1 w-full rounded-lg bg-neutral-800 p-2"
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value);
                void startCamera(e.target.value);
              }}
              disabled={opening}
            >
              {devices.map((device, i) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Câmera ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
        {stream && error && (
          <button
            onClick={() => void startCamera()}
            className="mt-3 w-full rounded-lg bg-white p-2 text-sm text-neutral-900"
          >
            Reabrir câmera
          </button>
        )}
        <button onClick={onBack} className="mt-3 w-full p-2 text-xs underline">
          Voltar às opções de realidade aumentada
        </button>
      </div>
    </div>
  );
}
