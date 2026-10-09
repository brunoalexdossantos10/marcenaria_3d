import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { usePhotoTexture } from "../photoTextures";
import type { RoomKind, RoomProps, RoomStyle } from "./types";
import { environmentPreset } from "./presets";

import { roomSize } from "@/lib/furniture/roomBounds";
export { roomSize } from "@/lib/furniture/roomBounds";

const palettes: Record<
  RoomStyle,
  {
    wall: string;
    wallSide: string;
    floor: string;
    trim: string;
    wood: string;
    stone: string;
    textile: string;
    accent: string;
    metal: string;
  }
> = {
  moderno: {
    wall: "#e9e4da",
    wallSide: "#dfd8cd",
    floor: "#c7a879",
    trim: "#f5f1e9",
    wood: "#ae805a",
    stone: "#cec5b6",
    textile: "#c8c0b2",
    accent: "#56655d",
    metal: "#353a37",
  },
  contemporaneo: {
    wall: "#dedbd3",
    wallSide: "#cfcdc4",
    floor: "#b39c80",
    trim: "#e9e6df",
    wood: "#7e624e",
    stone: "#b4aca0",
    textile: "#9e9d94",
    accent: "#5d685d",
    metal: "#53483e",
  },
  minimalista: {
    wall: "#efede8",
    wallSide: "#e2e2dd",
    floor: "#cfc7b8",
    trim: "#faf9f5",
    wood: "#bba98d",
    stone: "#d9d7d0",
    textile: "#d6d0c6",
    accent: "#8b9689",
    metal: "#6e7271",
  },
  premium: {
    wall: "#cec8bf",
    wallSide: "#bfb9ae",
    floor: "#776552",
    trim: "#e4ded3",
    wood: "#513d32",
    stone: "#b8b0a4",
    textile: "#aca398",
    accent: "#947b59",
    metal: "#a68b63",
  },
};
export const palette = (style: RoomStyle) => palettes[style];

const textureCache = new Map<string, THREE.CanvasTexture>();
const unitBox = new THREE.BoxGeometry(1, 1, 1);
function surfaceTexture(
  kind: "wood" | "stone" | "fabric" | "plaster",
  color: string,
  repeatX: number,
  repeatY: number,
) {
  if (typeof document === "undefined") return null;
  const key = `${kind}-${color}-${repeatX.toFixed(1)}-${repeatY.toFixed(1)}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  let seed = 137;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  if (kind === "plaster") {
    for (let i = 0; i < 18000; i++) {
      const v = 145 + random() * 55;
      ctx.fillStyle = `rgba(${v},${v},${v},0.18)`;
      ctx.fillRect(random() * 256, random() * 256, 1, 1);
    }
  } else if (kind === "wood") {
    for (let y = 0; y < 256; y += 84) {
      ctx.fillStyle = `rgba(39,26,16,${0.035 + random() * 0.05})`;
      ctx.fillRect(0, y, 256, 83);
      ctx.strokeStyle = "rgba(48,33,23,.18)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, y, 256, 84);
      for (let i = 0; i < 28; i++) {
        const gy = y + random() * 83;
        ctx.strokeStyle = `rgba(66,44,27,${0.025 + random() * 0.055})`;
        ctx.lineWidth = 0.4 + random();
        ctx.beginPath();
        ctx.moveTo(0, gy);
        for (let x = 0; x <= 256; x += 48) ctx.lineTo(x, gy + Math.sin(x * 0.025 + gy) * 1.5);
        ctx.stroke();
      }
    }
  } else if (kind === "stone") {
    ctx.strokeStyle = "rgba(58,54,49,.09)";
    ctx.lineWidth = 2;
    for (let n = 0; n <= 256; n += 128) {
      ctx.beginPath();
      ctx.moveTo(n, 0);
      ctx.lineTo(n, 256);
      ctx.moveTo(0, n);
      ctx.lineTo(256, n);
      ctx.stroke();
    }
    for (let i = 0; i < 32; i++) {
      const x = random() * 256,
        y = random() * 256;
      ctx.strokeStyle = `rgba(80,76,70,${0.018 + random() * 0.045})`;
      ctx.lineWidth = 0.5 + random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 30, y + 10, x + 60, y - 12, x + 100, y + 15);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 2400; i++) {
      const v = random() > 0.5 ? 255 : 35;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.018 + random() * 0.03})`;
      ctx.fillRect(random() * 256, random() * 256, 1.5, 1.5);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 2;
  textureCache.set(key, texture);
  if (textureCache.size > 48) {
    const oldest = textureCache.keys().next().value;
    if (oldest) {
      textureCache.get(oldest)?.dispose();
      textureCache.delete(oldest);
    }
  }
  return texture;
}

export function TexturedSurface({
  kind,
  color,
  size,
  rotation,
  position,
  roughness = 0.8,
}: {
  kind: "wood" | "stone" | "fabric";
  color: string;
  size: [number, number];
  rotation?: [number, number, number];
  position: [number, number, number];
  roughness?: number;
}) {
  const [surfaceWidth, surfaceHeight] = size;
  const photo = usePhotoTexture(kind === "fabric" ? null : kind);
  const texture = useMemo(() => {
    if (kind === "fabric")
      return surfaceTexture(
        kind,
        color,
        Math.max(1, surfaceWidth / 1.7),
        Math.max(1, surfaceHeight / 1.7),
      );
    if (!photo) return null;
    const repeat = photo.clone();
    repeat.repeat.set(Math.max(1, surfaceWidth / 1.7), Math.max(1, surfaceHeight / 1.7));
    repeat.needsUpdate = true;
    return repeat;
  }, [kind, color, surfaceWidth, surfaceHeight, photo]);
  const detail = useMemo(
    () =>
      kind === "fabric"
        ? null
        : surfaceTexture(
            kind,
            "#999999",
            Math.max(1, surfaceWidth / 1.7),
            Math.max(1, surfaceHeight / 1.7),
          ),
    [kind, surfaceWidth, surfaceHeight],
  );
  useEffect(
    () => () => {
      if (texture && kind !== "fabric") texture.dispose();
    },
    [texture, kind],
  );
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={kind === "fabric" && texture ? "#ffffff" : color}
        map={texture}
        bumpMap={detail}
        bumpScale={kind === "stone" ? 0.0015 : 0.0025}
        roughness={roughness}
        metalness={kind === "stone" ? 0.04 : 0}
      />
    </mesh>
  );
}

export function Box({
  size,
  position,
  color,
  roughness = 0.7,
  metalness = 0,
  radius = 0.006,
  rotation,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  radius?: number;
  rotation?: [number, number, number];
}) {
  const material = (
    <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
  );
  if (radius >= 0.01)
    return (
      <RoundedBox
        args={size}
        radius={Math.min(radius, 0.025, ...size.map((v) => v / 4))}
        smoothness={2}
        position={position ?? [0, 0, 0]}
        rotation={rotation ?? [0, 0, 0]}
        castShadow
        receiveShadow
      >
        {material}
      </RoundedBox>
    );
  return (
    <mesh
      scale={size}
      position={position ?? [0, 0, 0]}
      rotation={rotation ?? [0, 0, 0]}
      castShadow
      receiveShadow
    >
      <primitive object={unitBox} attach="geometry" />
      {material}
    </mesh>
  );
}

/** Shared architectural system. Geometry is in metres; the configured furniture stays at floor centre. */
function Plaster({
  size,
  position,
  color,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
}) {
  const texture = useMemo(() => surfaceTexture("plaster", "#bdb9b2", 1, 1), []);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.92} bumpMap={texture} bumpScale={0.0025} />
    </mesh>
  );
}

function FloorJoints({
  width,
  depth,
  back,
  spacing,
  tile,
}: {
  width: number;
  depth: number;
  back: number;
  spacing: number;
  tile: boolean;
}) {
  const segments: number[] = [];
  for (let x = -width / 2; x <= width / 2 + 0.001; x += spacing) {
    segments.push(x, 0.008, back, x, 0.008, back + depth);
  }
  for (let z = back; z <= back + depth + 0.001; z += tile ? spacing : 1.45) {
    segments.push(-width / 2, 0.008, z, width / 2, 0.008, z);
  }
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(segments), 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={tile ? "#99958d" : "#715945"}
        transparent
        opacity={tile ? 0.19 : 0.14}
        depthWrite={false}
      />
    </lineSegments>
  );
}

export function WallFinishPanel({
  position,
  size,
  color,
  tileSize = 0.6,
}: {
  position: [number, number, number];
  size: [number, number];
  color: string;
  tileSize?: number;
}) {
  const [w, h] = size;
  const segments: number[] = [];
  for (let x = -w / 2; x <= w / 2 + 0.001; x += tileSize)
    segments.push(x, -h / 2, 0.005, x, h / 2, 0.005);
  for (let y = -h / 2; y <= h / 2 + 0.001; y += tileSize)
    segments.push(-w / 2, y, 0.005, w / 2, y, 0.005);
  return (
    <group position={position}>
      <TexturedSurface
        kind="stone"
        color={color}
        size={size}
        position={[0, 0, 0]}
        roughness={0.5}
      />
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array(segments), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8b847b" transparent opacity={0.2} />
      </lineSegments>
    </group>
  );
}

export function RoomShell({ kind, style, width, depth, height }: RoomProps & { kind: RoomKind }) {
  const { w, d, h, back, side } = roomSize(width, depth, height);
  const p = palette(style);
  const preset = environmentPreset(kind, style);
  const tile = preset.floor === "stone";
  const wallT = 0.16;
  const windowZ = back + d * 0.67;
  const windowW = preset.windowWidth,
    windowH = preset.windowHeight,
    windowY = kind === "banheiro" ? 2.05 : 1.72;
  const doorX = side + 0.61,
    doorW = 0.9,
    doorH = 2.18;
  const doorLeft = doorX - doorW / 2,
    doorRight = doorX + doorW / 2;
  const west = -w / 2;
  const glass = (
    <meshPhysicalMaterial
      color="#d8e4e8"
      metalness={0.08}
      roughness={0.08}
      transmission={0.78}
      thickness={0.012}
      transparent
      opacity={0.7}
      depthWrite={false}
    />
  );
  return (
    <group>
      {/* Structural slab and physically scaled finish. */}
      <Plaster
        size={[w + wallT * 2, 0.2, d + wallT * 2]}
        position={[0, -0.115, back + d / 2]}
        color="#a69d90"
      />
      <TexturedSurface
        kind={tile ? "stone" : "wood"}
        color={tile ? "#e4e1da" : "#d2b999"}
        size={[w, d]}
        position={[0, 0.003, back + d / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        roughness={tile ? 0.43 : 0.68}
      />
      <FloorJoints width={w} depth={d} back={back} spacing={preset.tileMetres} tile={tile} />
      {/* Back wall has a real opening, lintel, reveal and door. */}
      <Plaster
        size={[doorLeft + w / 2, h, wallT]}
        position={[(doorLeft - w / 2) / 2, h / 2, back - wallT / 2]}
        color={p.wall}
      />
      <Plaster
        size={[w / 2 - doorRight, h, wallT]}
        position={[(doorRight + w / 2) / 2, h / 2, back - wallT / 2]}
        color={p.wall}
      />
      <Plaster
        size={[doorW, h - doorH, wallT]}
        position={[doorX, (doorH + h) / 2, back - wallT / 2]}
        color={p.wall}
      />
      <Box
        size={[0.045, doorH, 0.11]}
        position={[doorLeft, doorH / 2, back + 0.012]}
        color={p.trim}
      />
      <Box
        size={[0.045, doorH, 0.11]}
        position={[doorRight, doorH / 2, back + 0.012]}
        color={p.trim}
      />
      <Box
        size={[doorW + 0.06, 0.05, 0.11]}
        position={[doorX, doorH, back + 0.012]}
        color={p.trim}
      />
      <Box
        size={[doorW - 0.08, doorH - 0.09, 0.045]}
        position={[doorX + 0.04, doorH / 2, back - 0.01]}
        color={kind === "banheiro" ? "#f0ede6" : p.wood}
        roughness={0.68}
      />
      <Box
        size={[0.012, 0.035, 0.08]}
        position={[doorX - doorW / 2 + 0.14, 1.02, back + 0.055]}
        color={p.metal}
        metalness={0.85}
        roughness={0.25}
      />
      {/* Window is an opening in a wall with thick reveals, glazed panes and a sill. */}
      <Plaster
        size={[wallT, h, windowZ - windowW / 2 - back]}
        position={[west - wallT / 2, h / 2, (back + windowZ - windowW / 2) / 2]}
        color={p.wallSide}
      />
      <Plaster
        size={[wallT, h, back + d - windowZ - windowW / 2]}
        position={[west - wallT / 2, h / 2, (windowZ + windowW / 2 + back + d) / 2]}
        color={p.wallSide}
      />
      <Plaster
        size={[wallT, windowY - windowH / 2, windowW]}
        position={[west - wallT / 2, (windowY - windowH / 2) / 2, windowZ]}
        color={p.wallSide}
      />
      <Plaster
        size={[wallT, h - windowY - windowH / 2, windowW]}
        position={[west - wallT / 2, (h + windowY + windowH / 2) / 2, windowZ]}
        color={p.wallSide}
      />
      <mesh position={[west - 0.02, windowY, windowZ]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[windowW - 0.08, windowH - 0.08]} />
        {glass}
      </mesh>
      <Box
        size={[0.08, windowH + 0.03, 0.035]}
        position={[west + 0.015, windowY, windowZ]}
        color={p.trim}
      />
      <Box
        size={[0.08, 0.035, windowW]}
        position={[west + 0.015, windowY, windowZ]}
        color={p.trim}
      />
      <Box
        size={[0.19, 0.045, windowW + 0.14]}
        position={[west + 0.065, windowY - windowH / 2 - 0.03, windowZ]}
        color={p.stone}
        roughness={0.47}
      />
      {[-w * 0.25, 0, w * 0.25].map((x) => (
        <group key={x} position={[x, h - 0.008, back + 0.33]} rotation-x={Math.PI / 2}>
          <mesh>
            <ringGeometry args={[0.065, 0.09, 24]} />
            <meshStandardMaterial
              color={p.metal}
              metalness={0.75}
              roughness={0.32}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position-z={0.003}>
            <circleGeometry args={[0.064, 24]} />
            <meshBasicMaterial color="#ffedcf" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Complete right and front walls and a structural ceiling. The camera stays inside. */}
      <Plaster
        size={[wallT, h, d]}
        position={[w / 2 + wallT / 2, h / 2, back + d / 2]}
        color={p.wallSide}
      />
      <Plaster
        size={[w + wallT * 2, h, wallT]}
        position={[0, h / 2, back + d + wallT / 2]}
        color={p.wall}
      />
      <Plaster
        size={[w + wallT * 2, 0.18, d + wallT * 2]}
        position={[0, h + 0.09, back + d / 2]}
        color={p.wall}
      />
      <Box size={[w - 0.12, 0.025, 0.035]} position={[0, h - 0.06, back + 0.035]} color={p.trim} />
      <Box
        size={[w - 0.12, 0.025, 0.035]}
        position={[0, h - 0.06, back + d - 0.035]}
        color={p.trim}
      />
      <Box
        size={[0.035, 0.025, d - 0.12]}
        position={[west + 0.035, h - 0.06, back + d / 2]}
        color={p.trim}
      />
      <Box
        size={[0.035, 0.025, d - 0.12]}
        position={[w / 2 - 0.035, h - 0.06, back + d / 2]}
        color={p.trim}
      />
      <Box
        size={[doorLeft + w / 2, 0.105, 0.025]}
        position={[(doorLeft - w / 2) / 2, 0.053, back + 0.02]}
        color={p.trim}
      />
      <Box
        size={[w / 2 - doorRight, 0.105, 0.025]}
        position={[(doorRight + w / 2) / 2, 0.053, back + 0.02]}
        color={p.trim}
      />
      <Box size={[0.025, 0.105, d]} position={[west + 0.02, 0.053, back + d / 2]} color={p.trim} />
      <Box size={[0.025, 0.105, d]} position={[w / 2 - 0.02, 0.053, back + d / 2]} color={p.trim} />
      <Box size={[w, 0.105, 0.025]} position={[0, 0.053, back + d - 0.02]} color={p.trim} />
    </group>
  );
}

export function RoomLighting({
  kind,
  style,
  width,
  depth,
  height,
  lightweight = false,
}: RoomProps & { kind: RoomKind; lightweight?: boolean }) {
  const { w, h, back, d } = roomSize(width, depth, height);
  const warm = style === "premium" ? "#ffe5c6" : "#fff1df";
  const preset = environmentPreset(kind, style);
  return (
    <>
      <hemisphereLight args={["#eaf2f5", "#a19a8d", 0.65]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[-w / 2 - 2.2, h + 3.1, back + d * 0.75]}
        color="#f8f2e8"
        intensity={preset.daylight}
        castShadow={!lightweight}
        shadow-mapSize={[lightweight ? 512 : 2048, lightweight ? 512 : 2048]}
        shadow-radius={3}
        shadow-bias={-0.00025}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <directionalLight position={[w / 2 + 1.5, h + 1, 2]} color="#dce6ed" intensity={0.4} />
      <spotLight
        position={[0, h - 0.2, back + 1.1]}
        color={warm}
        intensity={preset.artificial}
        distance={6}
        angle={0.68}
        penumbra={0.92}
        decay={2}
        castShadow={!lightweight && kind !== "sala"}
        shadow-mapSize={[512, 512]}
      />
      {(kind === "cozinha" || kind === "banheiro") && (
        <pointLight
          position={[width * 0.005 + 1.2, h - 0.55, back + 0.7]}
          color={warm}
          intensity={3.2}
          distance={3.1}
          decay={2}
        />
      )}
    </>
  );
}

export function Rug({
  position,
  width = 1.8,
  depth = 1.4,
  color,
}: {
  position: [number, number, number];
  width?: number;
  depth?: number;
  color: string;
}) {
  return (
    <group position={position}>
      <Box
        size={[width, 0.014, depth]}
        position={[0, 0.009, 0]}
        color={color}
        roughness={1}
        radius={0.008}
      />
      <TexturedSurface
        kind="fabric"
        color={color}
        size={[width * 0.96, depth * 0.96]}
        position={[0, 0.018, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        roughness={1}
      />
    </group>
  );
}

const leafShape = new THREE.Shape();
leafShape.moveTo(0, 0);
leafShape.quadraticCurveTo(-0.09, 0.13, -0.065, 0.26);
leafShape.quadraticCurveTo(-0.025, 0.4, 0, 0.47);
leafShape.quadraticCurveTo(0.025, 0.4, 0.065, 0.26);
leafShape.quadraticCurveTo(0.09, 0.13, 0, 0);
const leafGeometry = new THREE.ShapeGeometry(leafShape, 6);

export function Plant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.16, 0.115, 0.34, 24]} />
        <meshStandardMaterial color="#a79b88" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial color="#484a3b" roughness={1} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => {
        const a = i * 2.39996;
        const reach = 0.19 + (i % 4) * 0.025;
        return (
          <group
            key={i}
            position={[Math.cos(a) * 0.028, 0.35 + (i % 4) * 0.045, Math.sin(a) * 0.028]}
            rotation-y={a}
          >
            <mesh castShadow position={[0, 0.29, 0]} rotation-z={-0.18 - (i % 3) * 0.08}>
              <cylinderGeometry args={[0.002, 0.006, 0.58, 5]} />
              <meshStandardMaterial color="#465e3e" roughness={0.9} />
            </mesh>
            <mesh
              geometry={leafGeometry}
              castShadow
              receiveShadow
              position={[reach, 0.26, 0]}
              rotation={[0.15, 0, -0.48 - (i % 3) * 0.1]}
              scale={[0.85, 0.95 + (i % 3) * 0.16, 1]}
            >
              <meshStandardMaterial
                color={i % 3 ? "#52674a" : "#687957"}
                side={THREE.DoubleSide}
                roughness={0.84}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function FramedArt({
  position,
  color,
  width = 0.62,
  height = 0.84,
}: {
  position: [number, number, number];
  color: string;
  width?: number;
  height?: number;
}) {
  return (
    <group position={position}>
      <Box size={[width, height, 0.028]} color="#6c5d4d" radius={0.004} />
      <Box
        size={[width - 0.05, height - 0.05, 0.006]}
        position={[0, 0, 0.019]}
        color="#e8e4da"
        radius={0.002}
      />
      <Box
        size={[(width - 0.08) * 0.75, (height - 0.08) * 0.55, 0.005]}
        position={[-0.03, 0.07, 0.024]}
        color={color}
        radius={0.002}
      />
    </group>
  );
}
