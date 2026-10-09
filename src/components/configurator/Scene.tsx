import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  Html,
  ContactShadows,
  MeshReflectorMaterial,
} from "@react-three/drei";
import * as THREE from "three";
import type { Part } from "@/lib/furniture/types";
import type { FurnitureConfig } from "@/lib/furniture/types";
import { material as materialDef } from "@/lib/furniture/materials";
import { HANDLE_FINISHES, typeDef } from "@/lib/furniture/types";
import { AccessoryModel } from "./AccessoryModel";
import { usePhotoTexture, type WoodSurface } from "./photoTextures";
import ShowroomEnvironment from "./environments";
import { roomSize } from "./environments/shared";
import { FurnitureGizmo } from "./FurnitureGizmo";
import { FurniturePlacement, type PlacementMode } from "./FurniturePlacement";
import type { FurniturePose } from "@/lib/furniture/positioning";
import type { EnvironmentChoice } from "./environments/types";
import { constrainPosition, isMovable } from "@/lib/furniture/placement";
import { findModularPlacement } from "@/lib/furniture/placement";
import { buildFurniture } from "@/lib/furniture/builder";
import type { ModularComponentType } from "@/lib/furniture/types";

const finishDef = (id?: string) => HANDLE_FINISHES.find((f) => f.id === id) ?? HANDLE_FINISHES[1]!;
const ledColor = (temp: number) => {
  const t = Math.max(2200, Math.min(6000, temp));
  const k = (t - 2200) / 3800;
  return new THREE.Color().setRGB(1, 0.72 + k * 0.24, 0.45 + k * 0.5);
};

const S = 0.01; // cm -> m
const WOOD_IDS = new Set<WoodSurface>([
  "carvalho",
  "carvalho-claro",
  "freijo",
  "nogueira",
  "amadeirado",
  "madeira-escura",
]);

function SceneCapture({ onReady }: { onReady: (capture: (() => string | null) | null) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    onReady(() => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    });
    return () => onReady(null);
  }, [gl, scene, camera, onReady]);
  return null;
}

function woodPanelGeometry(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute("uv");
  // BoxGeometry has four unique UV vertices per face: ±X, ±Y, ±Z.
  // One physical texture scale keeps the vein width consistent between panels.
  for (let face = 0; face < 6; face++) {
    const side = face < 2;
    const top = face >= 2 && face < 4;
    const uSize = side ? depth : width;
    const vSize = top ? depth : height;
    const uStart = ((side ? z : x) - uSize / 2) / 1.85;
    const vStart = ((top ? z : y) - vSize / 2) / 2.75;
    for (let vertex = 0; vertex < 4; vertex++) {
      const index = face * 4 + vertex;
      uv.setXY(
        index,
        uStart + (uv.getX(index) * uSize) / 1.85,
        vStart + (uv.getY(index) * vSize) / 2.75,
      );
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

/** The dev/build tooling injects `data-tsd-source` attributes into JSX.
 *  react-three-fiber walks them as `object.data.tsd.source` and throws when a
 *  level is missing. A self-nesting bag absorbs writes at any depth. */
function makeBag(): Record<string, unknown> {
  const target: Record<string, unknown> = {};
  return new Proxy(target, {
    get(t, key: string) {
      if (!(key in t)) t[key] = makeBag();
      return t[key];
    },
  });
}

if (!("data" in THREE.Object3D.prototype)) {
  const bag = {
    get(this: object) {
      const v = makeBag();
      Object.defineProperty(this, "data", {
        value: v,
        writable: true,
        configurable: true,
      });
      return v;
    },
    configurable: true,
  } as const;
  Object.defineProperty(THREE.Object3D.prototype, "data", bag);
  Object.defineProperty(THREE.Material.prototype, "data", bag);
  Object.defineProperty(THREE.BufferGeometry.prototype, "data", bag);
}

/** Realistic mirror: physical material, near-zero roughness, full metalness and
 *  a strong environment contribution so it reflects the scene HDRI. */
function MirrorMaterial({ lightweight }: { lightweight: boolean }) {
  return (
    <meshPhysicalMaterial
      color={lightweight ? "#dce6e8" : "#eef3f5"}
      roughness={lightweight ? 0.08 : 0.015}
      metalness={lightweight ? 0.3 : 1}
      envMapIntensity={lightweight ? 0 : 3.2}
      clearcoat={lightweight ? 0 : 1}
      clearcoatRoughness={0.02}
      reflectivity={lightweight ? 0.5 : 1}
    />
  );
}

function MirrorPanel({
  width,
  height,
  depth,
  lightweight,
}: {
  width: number;
  height: number;
  depth: number;
  lightweight: boolean;
}) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#aab5bb" metalness={0.65} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.002]}>
        <planeGeometry args={[Math.max(0.01, width - 0.018), Math.max(0.01, height - 0.018)]} />
        {lightweight ? (
          <MirrorMaterial lightweight />
        ) : (
          <MeshReflectorMaterial
            resolution={128}
            mirror={0.9}
            mixStrength={1.6}
            mixContrast={1.1}
            roughness={0.02}
            metalness={0.85}
            color="#e5edf1"
            depthScale={0}
          />
        )}
      </mesh>
    </group>
  );
}

/** Realistically thin clothes hanger built from slim bars. Sizes come from the
 *  builder, which derives them from the cabinet's inner space. */
function Hanger({ size }: { size: [number, number, number] }) {
  const [, hRaw, dRaw] = size.map((v) => v * S) as [number, number, number];
  const bar = 0.011; // 1.1 cm
  const shoulder = dRaw; // spans the depth axis
  const bodyH = hRaw * 0.55;
  const hookH = hRaw * 0.3;
  return (
    <group>
      {/* hook */}
      <mesh position={[0, bodyH / 2 + hookH / 2, 0]}>
        <cylinderGeometry args={[bar * 0.35, bar * 0.35, hookH, 8]} />
        <meshStandardMaterial color="#b9bec4" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* shoulders */}
      <mesh
        position={[0, bodyH * 0.18, shoulder * 0.25]}
        rotation={[Math.atan2(bodyH * 0.6, shoulder * 0.5), 0, 0]}
      >
        <boxGeometry args={[bar, bar, Math.hypot(bodyH * 0.6, shoulder * 0.5)]} />
        <meshStandardMaterial color="#8b6b47" roughness={0.6} />
      </mesh>
      <mesh
        position={[0, bodyH * 0.18, -shoulder * 0.25]}
        rotation={[-Math.atan2(bodyH * 0.6, shoulder * 0.5), 0, 0]}
      >
        <boxGeometry args={[bar, bar, Math.hypot(bodyH * 0.6, shoulder * 0.5)]} />
        <meshStandardMaterial color="#8b6b47" roughness={0.6} />
      </mesh>
      {/* bottom bar */}
      <mesh position={[0, -bodyH * 0.12, 0]}>
        <boxGeometry args={[bar * 0.8, bar * 0.8, shoulder]} />
        <meshStandardMaterial color="#8b6b47" roughness={0.6} />
      </mesh>
    </group>
  );
}

function PartMotion({
  group,
  part,
  manual,
  drag,
  openDoors,
  isSwing,
  isTilt,
  isSliding,
  isDrawer,
  invalidate,
}: {
  group: RefObject<THREE.Group | null>;
  part: Part;
  manual: MutableRefObject<number | null>;
  drag: MutableRefObject<{
    x: number;
    y: number;
    from: number;
    offset: [number, number, number];
    moved: boolean;
  } | null>;
  openDoors: boolean;
  isSwing: boolean;
  isTilt: boolean;
  isSliding: boolean;
  isDrawer: boolean;
  invalidate: () => void;
}) {
  useFrame((_, delta) => {
    const target = group.current;
    if (!target) return;
    const goal = manual.current ?? (openDoors ? 1 : 0);
    const k = drag.current ? 1 : 1 - Math.exp(-8 * Math.min(delta, 0.05));
    if (isSwing) {
      if (isTilt) {
        const open = ((part.openLimit ?? 85) * Math.PI) / 180;
        target.rotation.x += (-goal * open - target.rotation.x) * k;
      } else {
        const open = ((part.openLimit ?? 100) * Math.PI) / 180;
        const rotation = goal * (part.hinge === 1 ? open : -open);
        target.rotation.y += (rotation - target.rotation.y) * k;
      }
    } else if (isSliding) {
      const offset = goal * (((part.slideTo ?? part.pos[0]) - part.pos[0]) * S);
      target.position.x += (offset - target.position.x) * k;
    } else if (isDrawer) {
      const offset = goal * ((part.travel ?? part.size[2] * 0.85) * S);
      target.position.z += (offset - target.position.z) * k;
    }
    const settled = isTilt
      ? Math.abs(target.rotation.x + (goal * ((part.openLimit ?? 85) * Math.PI)) / 180) <= 0.001
      : isSwing
        ? Math.abs(
            target.rotation.y -
              (goal * (part.hinge === 1 ? 1 : -1) * ((part.openLimit ?? 100) * Math.PI)) / 180,
          ) <= 0.001
        : isSliding
          ? Math.abs(
              target.position.x - goal * (((part.slideTo ?? part.pos[0]) - part.pos[0]) * S),
            ) <= 0.001
          : Math.abs(target.position.z - goal * ((part.travel ?? part.size[2] * 0.85) * S)) <=
            0.001;
    if (!settled) invalidate();
  });
  return null;
}

function PartMesh({
  part,
  children,
  materialId,
  selected,
  selectedPart,
  onSelect,
  onAccessoryMove,
  onComponentMove,
  accessoryOffset,
  config,
  allParts,
  openDoors,
  lightweight,
  readOnly = false,
  furnitureId,
}: {
  part: Part;
  children?: Part[] | undefined;
  materialId: string;
  selected: boolean;
  selectedPart: string | null;
  onSelect: (id: string) => void;
  onAccessoryMove: (id: string, offset: [number, number, number]) => void;
  onComponentMove: (id: string, offset: [number, number, number]) => void;
  accessoryOffset: [number, number, number];
  config: FurnitureConfig;
  allParts: Part[];
  openDoors: boolean;
  lightweight: boolean;
  readOnly?: boolean;
  furnitureId?: string | undefined;
}) {
  const def = materialDef(part.material ?? materialId);
  const isMirror = part.kind === "espelho";
  const isRod = part.kind === "cabideiro";
  const isHanger = part.kind === "cabide";
  const woodId =
    def.finish === "madeira" &&
    WOOD_IDS.has(def.id as WoodSurface) &&
    !isMirror &&
    !["puxador", "acessorio", "cabide", "cabideiro", "led"].includes(part.kind)
      ? (def.id as WoodSurface)
      : null;
  const tex = usePhotoTexture(woodId);
  const normal = usePhotoTexture(woodId && !lightweight ? woodId : null, "normal");
  const rough = usePhotoTexture(woodId && !lightweight ? woodId : null, "rough");
  const group = useRef<THREE.Group>(null);
  const orbit = useThree((state) => state.controls) as unknown as {
    enabled: boolean;
  } | null;
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const [hover, setHover] = useState(false);

  const [w, h, d] = part.size.map((v) => v * S) as [number, number, number];
  const [x, y, z] = part.pos.map((v) => v * S) as [number, number, number];
  const panelGeometry = useMemo(
    () => (woodId ? woodPanelGeometry(w, h, d, x, y, z) : null),
    [woodId, x, y, z, w, h, d],
  );
  useEffect(() => () => panelGeometry?.dispose(), [panelGeometry]);
  const woodMaterials = useMemo(() => {
    if (!panelGeometry) return null;
    const face = new THREE.MeshStandardMaterial({
      color: def.color,
      map: tex,
      normalMap: normal,
      roughnessMap: rough,
      normalScale: new THREE.Vector2(0.12 + def.grain * 0.1, 0.12 + def.grain * 0.1),
      roughness: def.roughness,
      metalness: 0.02,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: def.color,
      map: tex,
      roughness: Math.min(0.85, def.roughness + 0.08),
      metalness: 0.02,
    });
    const broadAxis = w <= h && w <= d ? 0 : h <= d ? 1 : 2;
    return {
      face,
      edge,
      faces: Array.from({ length: 6 }, (_, index) =>
        Math.floor(index / 2) === broadAxis ? face : edge,
      ),
    };
  }, [panelGeometry, def.color, def.roughness, def.grain, tex, normal, rough, w, h, d]);
  useEffect(
    () => () => {
      woodMaterials?.face.dispose();
      woodMaterials?.edge.dispose();
    },
    [woodMaterials],
  );

  const isDoor = part.kind === "porta";
  const isSliding = isDoor && !!part.sliding;
  const isSwing = isDoor && !isSliding;
  const isDrawer = part.kind === "gaveta";

  const isTilt = isDoor && !!part.tilt;
  const interactive = isSwing || isSliding || isDrawer;
  // 0..1 opening driven either by the global toggle or by dragging with the mouse
  const manual = useRef<number | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    from: number;
    offset: [number, number, number];
    moved: boolean;
  } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    manual.current = null;
  }, [openDoors]);

  const onDragDown = (e: {
    stopPropagation: () => void;
    clientX: number;
    clientY: number;
    point: THREE.Vector3;
    shiftKey: boolean;
    ctrlKey: boolean;
  }) => {
    if (readOnly) return;
    if (e.ctrlKey || (!interactive && part.kind !== "acessorio" && !isMovable(part))) return;
    e.stopPropagation();
    onSelect(part.id);
    if (isMovable(part) && (!interactive || e.shiftKey)) {
      // Doors and drawers use a normal drag to open; Shift+drag repositions.\n      // R3F supplies the raycast hit. Project subsequent pointer rays onto a
      // fixed front plane, so perspective and the current camera are respected.
      const angle = ((config.floorRotation ?? 0) * Math.PI) / 180;
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)),
        e.point,
      );
      const origin = e.point.clone();
      const ray = new THREE.Raycaster();
      const hit = new THREE.Vector3();
      let moved = false;
      let last = config.componentOffsets?.[part.id] ?? [0, 0, 0];
      let moveFrame = 0;
      let pendingOffset: [number, number, number] | null = null;
      const flushOffset = () => {
        moveFrame = 0;
        if (!pendingOffset) return;
        onComponentMove(part.id, pendingOffset);
        pendingOffset = null;
      };
      if (orbit) orbit.enabled = false;
      const move = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return;
        const bounds = canvas.getBoundingClientRect();
        ray.setFromCamera(
          new THREE.Vector2(
            ((ev.clientX - bounds.left) / bounds.width) * 2 - 1,
            -((ev.clientY - bounds.top) / bounds.height) * 2 + 1,
          ),
          camera,
        );
        if (!ray.ray.intersectPlane(plane, hit)) return;
        moved = true;
        setGrabbing(true);
        const next = constrainPosition(config, allParts, part, [
          part.pos[0] +
            ((hit.x - origin.x) * Math.cos(angle) - (hit.z - origin.z) * Math.sin(angle)) * 100,
          part.pos[1] + (hit.y - origin.y) * 100,
          part.pos[2],
        ]);
        const home = part.homePos ?? part.pos;
        last = [next[0] - home[0], next[1] - home[1], 0];
        pendingOffset = last;
        if (!moveFrame) moveFrame = requestAnimationFrame(flushOffset);
        invalidate();
      };
      const up = () => {
        if (moveFrame) cancelAnimationFrame(moveFrame);
        flushOffset();
        if (moved) {
          const home = part.homePos ?? part.pos;
          const snapped = constrainPosition(config, allParts, part, [
            home[0] + Math.round(last[0] * 2) / 2,
            home[1] + Math.round(last[1] * 2) / 2,
            part.pos[2],
          ]);
          onComponentMove(part.id, [snapped[0] - home[0], snapped[1] - home[1], 0]);
        }
        setGrabbing(false);
        if (orbit) orbit.enabled = true;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        window.removeEventListener("blur", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      window.addEventListener("blur", up);
      return;
    }
    const from = manual.current ?? (openDoors ? 1 : 0);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      from,
      offset: accessoryOffset,
      moved: false,
    };
    let moveFrame = 0;
    let pendingOffset: [number, number, number] | null = null;
    const flushOffset = () => {
      moveFrame = 0;
      if (!pendingOffset) return;
      onAccessoryMove(part.id, pendingOffset);
      pendingOffset = null;
    };
    if (orbit) orbit.enabled = false;
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.x;
      const dy = ev.clientY - d.y;
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      setGrabbing(true);
      if (part.kind === "acessorio") {
        pendingOffset = [d.offset[0] + dx * 0.28, d.offset[1] - dy * 0.28, d.offset[2]];
        if (!moveFrame) moveFrame = requestAnimationFrame(flushOffset);
        return;
      }
      let v = d.from;
      if (isSwing) v = d.from + ((part.hinge === 1 ? -dx : dx) + (isTilt ? -dy : 0)) / 220;
      else if (isSliding) v = d.from + dx / 260;
      else v = d.from + (dy + dx * 0.3) / 190;
      manual.current = Math.max(0, Math.min(1, v));
      invalidate();
    };
    const up = () => {
      if (moveFrame) cancelAnimationFrame(moveFrame);
      flushOffset();
      drag.current = null;
      setGrabbing(false);
      if (orbit) orbit.enabled = true;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const emphasis = selected || hover;
  useEffect(() => {
    if (!woodMaterials) return;
    woodMaterials.face.color.set(def.color).offsetHSL(0, emphasis ? 0.05 : 0, emphasis ? 0.06 : 0);
    woodMaterials.face.emissive.set(selected ? "#c98a3c" : "#000000");
    woodMaterials.face.emissiveIntensity = selected ? 0.22 : 0;
  }, [woodMaterials, def.color, emphasis, selected]);

  const handlers = {
    userData: {
      type: part.id.startsWith("mod-")
        ? "component"
        : part.kind === "acessorio"
          ? "accessory"
          : "furniture-part",
      componentType: part.kind,
      instanceId: part.id,
      parentFurnitureId: furnitureId ?? config.activeFurnitureId ?? "primary",
    },
    onPointerDown: onDragDown,
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHover(true);
      if (
        (interactive || isMovable(part) || part.kind === "acessorio") &&
        typeof document !== "undefined"
      )
        document.body.style.cursor = readOnly ? "pointer" : "grab";
    },
    onPointerOut: () => {
      setHover(false);
      if (typeof document !== "undefined") document.body.style.cursor = "";
    },
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (grabbing) return;
      onSelect(part.id);
    },
    onDoubleClick: (e: { stopPropagation: () => void }) => {
      if (!interactive || readOnly) return;
      e.stopPropagation();
      manual.current = 1 - (manual.current ?? (openDoors ? 1 : 0));
      invalidate();
    },
  };

  if (isHanger) {
    return (
      <group position={[x, y, z]} {...handlers}>
        <Hanger size={part.size} />
      </group>
    );
  }

  if (part.kind === "acessorio")
    return (
      <group position={[x, y, z]} {...handlers}>
        <AccessoryModel part={part} selected={selected} />
      </group>
    );

  if (isMirror)
    return (
      <group position={[x, y, z]} {...handlers}>
        <MirrorPanel width={w} height={h} depth={d} lightweight={lightweight} />
      </group>
    );

  if (part.kind === "puxador") {
    const f = finishDef(part.handle?.finish);
    const model = part.handle?.model ?? "reto";
    const vertical = part.handle?.orientation === "vertical";
    const mat = (
      <meshStandardMaterial color={f.color} metalness={f.metalness} roughness={f.roughness} />
    );
    if (model === "botao")
      return (
        <mesh position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]} castShadow {...handlers}>
          <cylinderGeometry args={[0.016, 0.013, 0.03, 20]} />
          {mat}
        </mesh>
      );
    if (model === "cava" || model === "embutido")
      return (
        <mesh position={[x, y, z]} castShadow {...handlers}>
          <boxGeometry args={[vertical ? 0.02 : w, vertical ? h : 0.02, 0.012]} />
          {mat}
        </mesh>
      );
    const bar = 0.014;
    const off = model === "perfil" ? 0.008 : 0.028;
    return (
      <group position={[x, y, z]} {...handlers}>
        <mesh position={[0, 0, off]} castShadow>
          <boxGeometry
            args={[vertical ? bar : w, vertical ? h : bar, model === "perfil" ? 0.022 : bar]}
          />
          {mat}
        </mesh>
        {model !== "perfil" &&
          [-1, 1].map((s2) => (
            <mesh
              key={s2}
              position={[vertical ? 0 : (s2 * w) / 2.6, vertical ? (s2 * h) / 2.6 : 0, off / 2]}
            >
              <boxGeometry args={[bar * 0.7, bar * 0.7, off]} />
              {mat}
            </mesh>
          ))}
      </group>
    );
  }

  if (part.kind === "led") {
    const col = ledColor(part.led?.temp ?? 3000);
    const power = part.led?.intensity ?? 1;
    return (
      <group position={[x, y, z]} {...handlers}>
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={col}
            emissive={col}
            emissiveIntensity={1.4 * power}
            toneMapped={false}
          />
        </mesh>
        <pointLight
          color={col}
          intensity={power * 1.6}
          distance={1.5}
          decay={2}
          position={[0, -0.05, 0]}
        />
      </group>
    );
  }

  const reflectiveDoor = isDoor && (part.face === "espelho" || def.finish === "espelho");
  const mesh = (
    <mesh
      key={`${part.id}:${def.id}`}
      castShadow={!isMirror}
      receiveShadow
      {...handlers}
      {...(woodMaterials && panelGeometry
        ? {
            geometry: panelGeometry,
            material: woodMaterials.faces,
            dispose: null,
          }
        : {})}
    >
      {isRod ? (
        <cylinderGeometry args={[h / 2, h / 2, w, 16]} />
      ) : (
        !panelGeometry && <boxGeometry args={[w, h, d]} />
      )}
      {reflectiveDoor ? (
        <MirrorMaterial lightweight={lightweight} />
      ) : isRod ? (
        <meshStandardMaterial color="#b9bec4" roughness={0.25} metalness={0.9} />
      ) : def.finish === "vidro" ? (
        lightweight ? (
          <meshStandardMaterial
            color={def.color}
            transparent
            opacity={def.opacity ?? 0.4}
            depthWrite={false}
            roughness={def.roughness}
          />
        ) : (
          <meshPhysicalMaterial
            color={def.color}
            roughness={def.roughness}
            metalness={0}
            transmission={0.85}
            thickness={0.02}
            transparent
            opacity={def.opacity ?? 0.4}
            envMapIntensity={1.6}
          />
        )
      ) : !woodMaterials ? (
        <meshStandardMaterial
          color={emphasis ? new THREE.Color(def.color).offsetHSL(0, 0.05, 0.06) : def.color}
          map={tex ?? null}
          roughness={def.roughness}
          metalness={def.metalness ?? 0.04}
          emissive={selected ? "#c98a3c" : "#000000"}
          emissiveIntensity={selected ? 0.22 : 0}
        />
      ) : null}
    </mesh>
  );

  const mounted = children?.map((child) => (
    <MemoizedPartMesh
      key={child.id}
      part={child}
      materialId={materialId}
      selected={selectedPart === child.id}
      selectedPart={selectedPart}
      onSelect={onSelect}
      onAccessoryMove={onAccessoryMove}
      onComponentMove={onComponentMove}
      config={config}
      allParts={allParts}
      accessoryOffset={[0, 0, 0]}
      openDoors={openDoors}
      lightweight={lightweight}
      readOnly={readOnly}
      furnitureId={furnitureId}
    />
  ));
  const reflectiveFace = reflectiveDoor ? (
    <mesh position={[0, 0, d / 2 + 0.002]} {...handlers}>
      <planeGeometry args={[Math.max(0.01, w - 0.012), Math.max(0.01, h - 0.012)]} />
      {lightweight ? (
        <MirrorMaterial lightweight />
      ) : (
        <MeshReflectorMaterial
          resolution={128}
          mirror={0.9}
          mixStrength={1.6}
          roughness={0.02}
          metalness={0.85}
          color="#e5edf1"
          depthScale={0}
        />
      )}
    </mesh>
  ) : null;

  if (isRod) {
    return (
      <group position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
        {mesh}
      </group>
    );
  }

  if (isSwing && isTilt) {
    return (
      <group position={[x, y + h / 2, z - d / 2]} ref={group}>
        <PartMotion
          group={group}
          part={part}
          manual={manual}
          drag={drag}
          openDoors={openDoors}
          isSwing={isSwing}
          isTilt={isTilt}
          isSliding={isSliding}
          isDrawer={isDrawer}
          invalidate={invalidate}
        />
        <group position={[0, -h / 2, d / 2]}>
          {mesh}
          {reflectiveFace}
          {mounted}
        </group>
      </group>
    );
  }

  if (isSwing) {
    const hingeX = x + (part.hinge === 1 ? w / 2 : -w / 2);
    // pivot sits on the hinge edge, at the BACK face of the door so the leaf
    // sweeps in front of the carcass and never crosses it.
    return (
      <group position={[hingeX, y, z - d / 2]} ref={group}>
        <PartMotion
          group={group}
          part={part}
          manual={manual}
          drag={drag}
          openDoors={openDoors}
          isSwing={isSwing}
          isTilt={isTilt}
          isSliding={isSliding}
          isDrawer={isDrawer}
          invalidate={invalidate}
        />
        <group position={[part.hinge === 1 ? -w / 2 : w / 2, 0, d / 2]}>
          {mesh}
          {reflectiveFace}
          {mounted}
        </group>
      </group>
    );
  }

  if (isSliding) {
    return (
      <group position={[x, y, z]}>
        <group ref={group}>
          <PartMotion
            group={group}
            part={part}
            manual={manual}
            drag={drag}
            openDoors={openDoors}
            isSwing={isSwing}
            isTilt={isTilt}
            isSliding={isSliding}
            isDrawer={isDrawer}
            invalidate={invalidate}
          />
          {mesh}
          {reflectiveFace}
          {mounted}
        </group>
      </group>
    );
  }

  if (isDrawer) {
    const bodyDepth = Math.max(0.12, (part.travel ?? 35) * S * 0.9);
    return (
      <group position={[x, y, z]}>
        <group ref={group}>
          <PartMotion
            group={group}
            part={part}
            manual={manual}
            drag={drag}
            openDoors={openDoors}
            isSwing={isSwing}
            isTilt={isTilt}
            isSliding={isSliding}
            isDrawer={isDrawer}
            invalidate={invalidate}
          />
          {mesh}
          {mounted}
          <group position={[0, -h * 0.24, -bodyDepth / 2 - d / 2]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[Math.max(0.04, w - 0.035), 0.012, bodyDepth]} />
              <meshStandardMaterial color="#d7c6ad" roughness={0.65} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} castShadow position={[side * (w / 2 - 0.024), h * 0.18, 0]}>
                <boxGeometry args={[0.014, Math.max(0.04, h * 0.65), bodyDepth]} />
                <meshStandardMaterial color="#d7c6ad" roughness={0.65} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    );
  }

  return (
    <group position={[x, y, z]}>
      {mesh}
      {reflectiveFace}
      {mounted}
    </group>
  );
}

const MemoizedPartMesh = memo(
  PartMesh,
  (previous, next) =>
    previous.part === next.part &&
    previous.children === next.children &&
    previous.config === next.config &&
    previous.allParts === next.allParts &&
    previous.materialId === next.materialId &&
    previous.selected === next.selected &&
    previous.selectedPart === next.selectedPart &&
    previous.openDoors === next.openDoors &&
    previous.lightweight === next.lightweight &&
    previous.readOnly === next.readOnly &&
    previous.furnitureId === next.furnitureId &&
    previous.accessoryOffset[0] === next.accessoryOffset[0] &&
    previous.accessoryOffset[1] === next.accessoryOffset[1] &&
    previous.accessoryOffset[2] === next.accessoryOffset[2],
);

function Dimensions({ cfg }: { cfg: FurnitureConfig }) {
  const w = cfg.width * S;
  const h = cfg.height * S;
  const d = cfg.depth * S;
  const label = (text: string, pos: [number, number, number]) => (
    <Html position={pos} center distanceFactor={4} zIndexRange={[10, 0]}>
      <span className="dim-badge">{text}</span>
    </Html>
  );
  return (
    <group>
      {label(`${cfg.width} cm`, [0, -0.06, d / 2 + 0.12])}
      {label(`${cfg.height} cm`, [-w / 2 - 0.16, h / 2, d / 2])}
      {label(`${cfg.depth} cm`, [w / 2 + 0.14, 0.04, 0])}
      <lineSegments position={[0, 0.001, d / 2 + 0.08]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([-w / 2, 0, 0, w / 2, 0, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#c98a3c" />
      </lineSegments>
    </group>
  );
}

export type CameraView = "frente" | "lateral" | "topo" | "reset";

function interiorLimits(config: Pick<FurnitureConfig, "width" | "height" | "depth">) {
  const { w, d, h, back } = roomSize(config.width, config.depth, config.height);
  return {
    eyeMin: new THREE.Vector3(-w / 2 + 0.18, 0.18, back + 0.18),
    eyeMax: new THREE.Vector3(w / 2 - 0.18, h - 0.19, back + d - 0.18),
    targetMin: new THREE.Vector3(-w / 2 + 0.3, 0.12, back + 0.3),
    targetMax: new THREE.Vector3(w / 2 - 0.3, h - 0.3, back + d - 0.3),
  };
}

function CameraRig({
  view,
  size,
  config,
  lift,
  center,
}: {
  view: { name: CameraView; n: number };
  size: number;
  config: FurnitureConfig;
  lift: number;
  center: [number, number];
}) {
  const { camera } = useThree();
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  const goal = useRef<THREE.Vector3 | null>(null);
  const { width, height, depth } = config;
  const framing = useRef({ center, lift });
  framing.current = { center, lift };

  useEffect(() => {
    const {
      center: [centerX, centerZ],
      lift,
    } = framing.current;
    const r = size * S * 1.9 + 0.8;
    const bounds = interiorLimits({ width, height, depth });
    const map: Record<CameraView, THREE.Vector3> = {
      frente: new THREE.Vector3(0, lift + size * S * 0.55, r),
      lateral: new THREE.Vector3(r, lift + size * S * 0.55, 0.001),
      topo: new THREE.Vector3(0.001, r * 1.1, 0.001),
      reset: new THREE.Vector3(r * 0.32, lift + size * S * 0.7, r * 1.05),
    };
    goal.current = map[view.name]
      .add(new THREE.Vector3(centerX * S, 0, centerZ * S))
      .clamp(bounds.eyeMin, bounds.eyeMax);
    invalidate();
  }, [view, size, width, height, depth, invalidate]);

  useFrame((_, delta) => {
    if (!goal.current) return;
    const k = 1 - Math.exp(-6 * Math.min(delta, 0.05));
    camera.position.lerp(goal.current, k);
    if (camera.position.distanceTo(goal.current) < 0.01) goal.current = null;
    controls?.target.lerp(
      new THREE.Vector3(center[0] * S, lift + size * S * 0.45, center[1] * S),
      k,
    );
    controls?.update();
    if (goal.current) invalidate();
  });
  return null;
}

function CameraBounds({ config }: { config: FurnitureConfig }) {
  const { camera, controls } = useThree();
  useFrame(() => {
    const bounds = interiorLimits(config);
    camera.position.clamp(bounds.eyeMin, bounds.eyeMax);
    const orbit = controls as { target: THREE.Vector3 } | null;
    orbit?.target.clamp(bounds.targetMin, bounds.targetMax);
  });
  return null;
}

function NicheDropZone({
  config,
  parts,
  lift,
  center,
  onAddNiche,
  onAddComponent,
}: {
  config: FurnitureConfig;
  parts: Part[];
  lift: number;
  center: [number, number];
  onAddNiche: (x: number, y: number) => void;
  onAddComponent: (type: ModularComponentType, x: number, y: number) => void;
}) {
  const { gl, camera, invalidate } = useThree();
  const [preview, setPreview] = useState<{
    x: number;
    y: number;
    valid: boolean;
  } | null>(null);
  const lastPreview = useRef("");
  const { width, height, depth } = config;
  const rotation = ((config.floorRotation ?? 0) * Math.PI) / 180;
  useEffect(() => {
    const canvas = gl.domElement;
    const type = "application/x-m3d-part";
    const ray = new THREE.Raycaster();
    const point = new THREE.Vector3();
    const yaw = new THREE.Euler(0, rotation, 0);
    const origin = new THREE.Vector3(center[0] * S, lift, center[1] * S);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).applyEuler(yaw),
      new THREE.Vector3(0, 0, depth * S).applyEuler(yaw).add(origin),
    );
    const project = (event: DragEvent) => {
      const rect = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      if (!ray.ray.intersectPlane(plane, point)) return false;
      point.sub(origin).applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotation);
      return Math.abs(point.x * 100) <= width / 2 && point.y >= 0 && point.y * 100 <= height;
    };
    const over = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes(type)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      canvas.style.outline = "2px solid #9b7045";
      canvas.style.outlineOffset = "-2px";
      const modularType = Array.from(event.dataTransfer.types).find((entry) =>
        entry.startsWith("application/x-m3d-mod-"),
      );
      const data = modularType
        ? `mod:${modularType.slice("application/x-m3d-mod-".length)}`
        : "nicho";
      const validRegion = project(event);
      const x = Math.round(point.x * 20) * 5;
      const y = Math.round(point.y * 20) * 5;
      const key = `${data}:${x}:${y}:${validRegion}`;
      if (key === lastPreview.current) return;
      lastPreview.current = key;
      let valid = validRegion;
      let px = x;
      let py = y;
      if (valid && data.startsWith("mod:")) {
        const id = "mod-preview";
        const candidate = buildFurniture({
          ...config,
          componentInstances: [
            ...(config.componentInstances ?? []),
            { id, type: data.slice(4), position: [x, y, 0] },
          ],
        }).find((part) => part.id === id);
        const snapped = candidate && findModularPlacement(config, parts, candidate, x, y);
        valid = Boolean(snapped);
        if (snapped) {
          px = snapped[0];
          py = snapped[1];
        }
      }
      setPreview((previous) =>
        previous?.x === px && previous.y === py && previous.valid === valid
          ? previous
          : { x: px, y: py, valid },
      );
      invalidate();
    };
    const leave = () => {
      canvas.style.outline = "";
      canvas.style.outlineOffset = "";
      lastPreview.current = "";
      setPreview(null);
      invalidate();
    };
    const drop = (event: DragEvent) => {
      const data = event.dataTransfer?.getData(type);
      if (data !== "nicho" && !data?.startsWith("mod:")) return;
      event.preventDefault();
      leave();
      if (!project(event)) return;
      if (data === "nicho") onAddNiche(point.x * 100, point.y * 100);
      else onAddComponent(data!.slice(4), point.x * 100, point.y * 100);
    };
    canvas.addEventListener("dragover", over);
    canvas.addEventListener("dragleave", leave);
    canvas.addEventListener("drop", drop);
    return () => {
      leave();
      canvas.removeEventListener("dragover", over);
      canvas.removeEventListener("dragleave", leave);
      canvas.removeEventListener("drop", drop);
    };
  }, [
    gl,
    camera,
    width,
    height,
    depth,
    lift,
    center,
    config,
    parts,
    invalidate,
    onAddNiche,
    onAddComponent,
    rotation,
  ]);
  return preview ? (
    <mesh
      rotation={[0, rotation, 0]}
      position={[
        center[0] * S +
          preview.x * S * Math.cos(rotation) +
          (depth * S + 0.025) * Math.sin(rotation),
        lift + preview.y * S,
        center[1] * S -
          preview.x * S * Math.sin(rotation) +
          (depth * S + 0.025) * Math.cos(rotation),
      ]}
    >
      <planeGeometry args={[Math.min(config.width * S * 0.35, 0.6), 0.06]} />
      <meshBasicMaterial
        color={preview.valid ? "#4ad088" : "#e65e59"}
        transparent
        opacity={0.55}
        depthTest={false}
      />
    </mesh>
  ) : null;
}

export function Scene({
  parts,
  config,
  selected,
  onSelect,
  onAccessoryMove,
  onComponentMove,
  onAddNiche,
  onAddComponent,
  onSelectFurniture,
  onResize,
  view,
  environment,
  onCaptureReady,
  positioning = false,
  placementMode = "mover",
  sensitivity = 0.25,
  onPlace,
}: {
  parts: Part[];
  config: FurnitureConfig;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onAccessoryMove: (id: string, offset: [number, number, number]) => void;
  onComponentMove: (id: string, offset: [number, number, number]) => void;
  onAddNiche: (x: number, y: number) => void;
  onAddComponent: (type: ModularComponentType, x: number, y: number) => void;
  onSelectFurniture: (id: string) => void;
  onResize: (axis: "width" | "height" | "depth", value: number) => void;
  view: { name: CameraView; n: number };
  environment: EnvironmentChoice;
  onCaptureReady?: (capture: (() => string | null) | null) => void;
  positioning?: boolean;
  placementMode?: PlacementMode;
  sensitivity?: number;
  onPlace: (pose: FurniturePose) => void;
}) {
  // framing size follows every dimension so the furniture stays in frame
  const frame = Math.max(config.width, config.height, config.depth * 1.6);
  const installation = typeDef(config.type).installation ?? "piso";
  const lift =
    config.floorElevation ??
    (installation === "parede"
      ? Math.max(
          0.8,
          roomSize(config.width, config.depth, config.height).h - config.height * S - 0.35,
        )
      : installation === "suspenso"
        ? 0.45
        : 0);
  const center = config.floorPosition ?? [0, 0];
  const others = useMemo(
    () =>
      (config.roomItems ?? []).map((item) => {
        const parts = buildFurniture(item.config);
        const children = new Map<string, Part[]>();
        for (const part of parts)
          if (part.parent) children.set(part.parent, [...(children.get(part.parent) ?? []), part]);
        return {
          item,
          parts,
          roots: parts.filter((part) => !part.parent),
          children,
        };
      }),
    [config.roomItems],
  );
  const sceneWidth = Math.max(config.width, ...others.map(({ item }) => item.config.width));
  const sceneDepth = Math.max(config.depth, ...others.map(({ item }) => item.config.depth));
  const sceneHeight = Math.max(config.height, ...others.map(({ item }) => item.config.height));
  const roomConfig = {
    ...config,
    width: sceneWidth,
    depth: sceneDepth,
    height: sceneHeight,
  };
  const [furnitureSelected, setFurnitureSelected] = useState(false);
  const lightweight =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const childrenByParent = useMemo(() => {
    const grouped = new Map<string, Part[]>();
    for (const part of parts) {
      if (part.parent) {
        const children = grouped.get(part.parent) ?? [];
        children.push(part);
        grouped.set(part.parent, children);
      }
    }
    return grouped;
  }, [parts]);
  return (
    <Canvas
      shadows={!lightweight && { type: THREE.PCFSoftShadowMap }}
      frameloop="demand"
      dpr={lightweight ? 1 : [1, 1.5]}
      camera={{ position: [1.8, 1.7, 5.2], fov: 42 }}
      onPointerMissed={() => {
        onSelect(null);
        setFurnitureSelected(false);
      }}
      gl={{ antialias: !lightweight, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <color attach="background" args={["#efece6"]} />
      {onCaptureReady && <SceneCapture onReady={onCaptureReady} />}
      <fog attach="fog" args={["#efece6", 9, 22]} />
      {!lightweight && (
        <Environment resolution={128}>
          <Lightformer intensity={2.2} position={[0, 4, 1]} scale={[8, 8, 1]} />
          <Lightformer
            intensity={1}
            color="#cddbe6"
            position={[-5, 1.5, -1]}
            rotation-y={Math.PI / 2}
            scale={[16, 3, 1]}
          />
          <Lightformer
            intensity={0.8}
            color="#f6e2c6"
            position={[5, 1, 2]}
            rotation-y={-Math.PI / 2}
            scale={[16, 3, 1]}
          />
        </Environment>
      )}

      <FurniturePlacement
        config={config}
        roomConfig={roomConfig}
        pose={{ x: center[0], z: center[1], elevation: lift, rotation: config.floorRotation ?? 0 }}
        enabled={positioning}
        mode={placementMode}
        sensitivity={sensitivity}
        onCommit={onPlace}
      >
        <group onPointerDown={() => setFurnitureSelected(true)}>
          {furnitureSelected && !positioning && (
            <FurnitureGizmo config={config} onResize={onResize} />
          )}
          {parts
            .filter((p) => !p.parent)
            .map((p) => (
              <MemoizedPartMesh
                key={p.id}
                part={p}
                children={childrenByParent.get(p.id)}
                materialId={config.material}
                selected={selected === p.id}
                selectedPart={selected}
                onSelect={(id) => {
                  setFurnitureSelected(true);
                  onSelect(id);
                }}
                onAccessoryMove={onAccessoryMove}
                onComponentMove={onComponentMove}
                config={config}
                allParts={parts}
                accessoryOffset={config.accessoryOffsets?.[p.id] ?? [0, 0, 0]}
                openDoors={config.openDoors}
                lightweight={lightweight}
                furnitureId={config.activeFurnitureId ?? "primary"}
              />
            ))}
          {config.showDimensions && <Dimensions cfg={config} />}
        </group>
      </FurniturePlacement>

      {others.map(({ item, parts: otherParts, roots, children }) => {
        const placement = typeDef(item.config.type).installation;
        const itemLift =
          item.config.floorElevation ??
          (placement === "parede"
            ? Math.max(
                0.8,
                roomSize(sceneWidth, sceneDepth, sceneHeight).h - item.config.height * S - 0.35,
              )
            : placement === "suspenso"
              ? 0.45
              : 0);
        return (
          <group
            key={item.id}
            position={[item.position[0] * S, itemLift, item.position[1] * S]}
            rotation={[0, ((item.config.floorRotation ?? 0) * Math.PI) / 180, 0]}
          >
            {roots.map((part) => (
              <MemoizedPartMesh
                key={part.id}
                part={part}
                children={children.get(part.id)}
                materialId={item.config.material}
                selected={false}
                selectedPart={null}
                onSelect={() => onSelectFurniture(item.id)}
                onAccessoryMove={() => {}}
                onComponentMove={() => {}}
                config={item.config}
                allParts={otherParts}
                accessoryOffset={item.config.accessoryOffsets?.[part.id] ?? [0, 0, 0]}
                openDoors={item.config.openDoors}
                lightweight={lightweight}
                readOnly
                furnitureId={item.id}
              />
            ))}
          </group>
        );
      })}

      <ShowroomEnvironment
        choice={environment}
        width={sceneWidth}
        depth={sceneDepth}
        height={sceneHeight}
        lightweight={lightweight}
      />
      {!lightweight && !positioning && lift === 0 && (
        <ContactShadows
          key={`${environment.room}-${environment.style}-${config.width}-${config.depth}-${config.height}-${center[0]}-${center[1]}-${config.floorRotation ?? 0}`}
          position={[center[0] * S, 0.002, center[1] * S]}
          opacity={0.48}
          scale={Math.max(5, config.width * S * 1.7)}
          blur={2.3}
          far={3}
          resolution={512}
          frames={1}
        />
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={Math.max(0.6, frame * S * 0.5)}
        maxDistance={Math.max(6, frame * S * 5)}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI - 0.05}
        target={[center[0] * S, lift + (config.height * S) / 2, center[1] * S]}
      />
      <CameraRig view={view} size={frame} config={roomConfig} lift={lift} center={center} />
      <CameraBounds config={roomConfig} />
      {!positioning && (
        <NicheDropZone
          config={config}
          parts={parts}
          lift={lift}
          center={center}
          onAddNiche={onAddNiche}
          onAddComponent={onAddComponent}
        />
      )}
    </Canvas>
  );
}

export default Scene;
