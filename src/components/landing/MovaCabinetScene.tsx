import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import walnutTexture from "@/assets/textures/walnut.webp";
import type { FurnitureConfig } from "@/lib/furniture/types";

type Props = { cycle: number; reducedMotion?: boolean; config: FurnitureConfig };

function Material({ wood, light = false }: { wood: THREE.Texture; light?: boolean }) {
  return (
    <meshStandardMaterial
      map={wood}
      color={light ? "#cdb293" : "#8d6548"}
      roughness={0.48}
      metalness={0.02}
    />
  );
}

function CabinetModel({ cycle, reducedMotion, config }: Props) {
  const wood = useTexture(walnutTexture);
  const { invalidate } = useThree();
  const width = config.width / 100;
  const height = config.height / 100;
  const depth = config.depth / 100;
  const thickness = Math.max(0.025, config.panelThickness / 100);
  const doorCount = Math.max(1, Math.min(4, config.doors));
  const doorWidth = (width - thickness * (doorCount + 1)) / doorCount;
  const leftDoors = useRef<THREE.Group[]>([]);
  const drawers = useRef<THREE.Group>(null);
  const shelves = useRef<THREE.Group>(null);
  const progress = useRef(reducedMotion ? 1 : 0);
  const start = useRef(0);
  const previousCycle = useRef(cycle);

  useMemo(() => {
    wood.wrapS = THREE.RepeatWrapping;
    wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(Math.max(1.5, width * 1.2), Math.max(1.1, height * 0.7));
    wood.colorSpace = THREE.SRGBColorSpace;
    wood.anisotropy = 4;
    wood.needsUpdate = true;
    return wood;
  }, [wood, width, height]);

  useEffect(() => {
    if (previousCycle.current !== cycle) {
      previousCycle.current = cycle;
      progress.current = reducedMotion ? 1 : 0;
      start.current = performance.now();
      invalidate();
    }
  }, [cycle, invalidate, reducedMotion]);

  useFrame(() => {
    if (reducedMotion) return;
    if (progress.current < 1) {
      progress.current = Math.min(1, (performance.now() - start.current) / 2400);
      invalidate();
    }
    const p = progress.current;
    const ease = (value: number) => {
      const x = Math.max(0, Math.min(1, value));
      return x * x * (3 - 2 * x);
    };
    const reveal = ease(p);
    const doors = ease((p - 0.22) / 0.5);
    const drawer = ease((p - 0.58) / 0.32);
    if (shelves.current) shelves.current.position.y = THREE.MathUtils.lerp(-0.08, 0, reveal);
    for (const [index, door] of leftDoors.current.entries()) {
      if (!door) continue;
      const side = index % 2 === 0 ? -1 : 1;
      door.position.x = THREE.MathUtils.lerp(side * 0.06, 0, doors);
      door.rotation.y = THREE.MathUtils.lerp(side * 0.12, 0, doors);
    }
    if (drawers.current) drawers.current.position.z = THREE.MathUtils.lerp(0.12, 0, drawer);
  });

  const woodMaterial = <Material wood={wood} />;
  const lightMaterial = <Material wood={wood} light />;
  const shelfCount = Math.max(1, Math.min(5, config.shelves));
  const shelfPositions = Array.from(
    { length: shelfCount },
    (_, index) => thickness + ((height - thickness * 2) * (index + 1)) / (shelfCount + 1),
  );
  const drawerCount = Math.max(0, Math.min(4, config.drawers));
  const drawerHeight = Math.min(0.2, Math.max(0.12, (height * 0.34) / Math.max(drawerCount, 1)));

  return (
    <group>
      <mesh position={[0, height - thickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, thickness, depth]} />
        {lightMaterial}
      </mesh>
      <mesh position={[0, thickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, thickness, depth]} />
        {woodMaterial}
      </mesh>
      <mesh position={[-width / 2 + thickness / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        {woodMaterial}
      </mesh>
      <mesh position={[width / 2 - thickness / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        {woodMaterial}
      </mesh>
      <mesh position={[0, height / 2, -depth / 2 + 0.018]} receiveShadow>
        <boxGeometry args={[width - thickness * 2, height - thickness * 2, 0.04]} />
        <meshStandardMaterial color="#624734" roughness={0.72} />
      </mesh>
      <group ref={shelves}>
        {shelfPositions.map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[width - thickness * 2, 0.055, depth - 0.025]} />
            {lightMaterial}
          </mesh>
        ))}
      </group>
      {Array.from({ length: doorCount }, (_, index) => {
        const x = -width / 2 + thickness + doorWidth / 2 + index * (doorWidth + thickness);
        const side = index % 2 === 0 ? -1 : 1;
        return (
          <group
            key={`door-${index}`}
            ref={(node) => {
              if (node) leftDoors.current[index] = node;
            }}
            position={[x, height / 2, depth / 2 + 0.026]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[doorWidth, height - thickness * 2, 0.055]} />
              {woodMaterial}
            </mesh>
            <mesh position={[side * (doorWidth / 2 - 0.06), 0, 0.04]}>
              <boxGeometry args={[0.022, 0.34, 0.018]} />
              <meshStandardMaterial color="#8c6239" metalness={0.72} roughness={0.28} />
            </mesh>
          </group>
        );
      })}
      <group ref={drawers}>
        {Array.from({ length: drawerCount }, (_, index) => (
          <mesh
            key={`drawer-${index}`}
            position={[
              0,
              thickness + drawerHeight / 2 + index * (drawerHeight + 0.025),
              depth / 2 + 0.025,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width - thickness * 2, drawerHeight, 0.055]} />
            {woodMaterial}
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function MovaCabinetScene({ cycle, reducedMotion = false, config }: Props) {
  const targetY = config.height / 200;
  return (
    <Canvas
      shadows={!reducedMotion}
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [3.1, 2.6, 4.2], fov: 35 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <ambientLight intensity={1.05} color="#f4e9d6" />
      <directionalLight
        position={[-3, 4, 4]}
        intensity={3.2}
        color="#fff5e5"
        castShadow={!reducedMotion}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[3, 1.8, 2]} intensity={1.3} color="#c6a27d" />
      <CabinetModel cycle={cycle} reducedMotion={reducedMotion} config={config} />
      <OrbitControls
        target={[0, targetY, 0]}
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={3.1}
        maxDistance={5.8}
        minPolarAngle={0.65}
        maxPolarAngle={1.65}
      />
    </Canvas>
  );
}
