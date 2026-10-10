import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import walnutTexture from "@/assets/textures/walnut.webp";

type Props = { cycle: number; reducedMotion?: boolean };

const W = 2.5;
const H = 2.2;
const D = 0.68;
const T = 0.08;
const DOOR_W = (W - T * 3) / 2;

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

function CabinetModel({ cycle, reducedMotion }: Props) {
  const wood = useTexture(walnutTexture);
  const { invalidate } = useThree();
  const leftDoor = useRef<THREE.Group>(null);
  const rightDoor = useRef<THREE.Group>(null);
  const drawers = useRef<THREE.Group>(null);
  const shelves = useRef<THREE.Group>(null);
  const progress = useRef(reducedMotion ? 1 : 0);
  const start = useRef(0);
  const previousCycle = useRef(cycle);

  useMemo(() => {
    wood.wrapS = THREE.RepeatWrapping;
    wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(2.2, 1.4);
    wood.colorSpace = THREE.SRGBColorSpace;
    wood.anisotropy = 2;
    wood.needsUpdate = true;
    return wood;
  }, [wood]);

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
    if (shelves.current) shelves.current.position.y = THREE.MathUtils.lerp(-0.16, 0, reveal);
    if (leftDoor.current) {
      leftDoor.current.position.x = THREE.MathUtils.lerp(-0.12, 0, doors);
      leftDoor.current.rotation.y = THREE.MathUtils.lerp(-0.18, 0, doors);
    }
    if (rightDoor.current) {
      rightDoor.current.position.x = THREE.MathUtils.lerp(0.12, 0, doors);
      rightDoor.current.rotation.y = THREE.MathUtils.lerp(0.18, 0, doors);
    }
    if (drawers.current) drawers.current.position.z = THREE.MathUtils.lerp(0.16, 0, drawer);
  });

  const woodMaterial = <Material wood={wood} />;
  const lightMaterial = <Material wood={wood} light />;
  return (
    <group position={[0, -H / 2, 0]}>
      <mesh position={[0, H / 2 - T / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, T, D]} />
        {lightMaterial}
      </mesh>
      <mesh position={[0, T / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, T, D]} />
        {woodMaterial}
      </mesh>
      <mesh position={[-W / 2 + T / 2, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[T, H, D]} />
        {woodMaterial}
      </mesh>
      <mesh position={[W / 2 - T / 2, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[T, H, D]} />
        {woodMaterial}
      </mesh>
      <mesh position={[0, H / 2, -D / 2 + 0.018]} receiveShadow>
        <boxGeometry args={[W - T * 2, H - T * 2, 0.04]} />
        <meshStandardMaterial color="#624734" roughness={0.72} />
      </mesh>
      <group ref={shelves}>
        {[0.72, 1.3, 1.78].map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[W - T * 2, 0.055, D - 0.025]} />
            {lightMaterial}
          </mesh>
        ))}
      </group>
      <group ref={leftDoor} position={[-DOOR_W / 2 - T / 2, H / 2, D / 2 + 0.026]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[DOOR_W, H - T * 2, 0.055]} />
          {woodMaterial}
        </mesh>
        <mesh position={[DOOR_W / 2 - 0.06, 0, 0.04]}>
          <boxGeometry args={[0.025, 0.32, 0.02]} />
          <meshStandardMaterial color="#c2a278" metalness={0.7} roughness={0.28} />
        </mesh>
      </group>
      <group ref={rightDoor} position={[DOOR_W / 2 + T / 2, H / 2, D / 2 + 0.026]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[DOOR_W, H - T * 2, 0.055]} />
          {woodMaterial}
        </mesh>
        <mesh position={[-DOOR_W / 2 + 0.06, 0, 0.04]}>
          <boxGeometry args={[0.025, 0.32, 0.02]} />
          <meshStandardMaterial color="#c2a278" metalness={0.7} roughness={0.28} />
        </mesh>
      </group>
      <group ref={drawers}>
        {[0.33, 0.54].map((y) => (
          <mesh key={y} position={[0, y, D / 2 + 0.025]} castShadow receiveShadow>
            <boxGeometry args={[W - T * 2, 0.16, 0.055]} />
            {woodMaterial}
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function MovaCabinetScene({ cycle, reducedMotion = false }: Props) {
  return (
    <Canvas
      shadows={!reducedMotion}
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [3.3, 2.25, 4.1], fov: 35 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <ambientLight intensity={1.1} color="#f4e9d6" />
      <directionalLight
        position={[-3, 4, 4]}
        intensity={3.2}
        color="#fff5e5"
        castShadow={!reducedMotion}
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[3, 1.8, 2]} intensity={1.3} color="#c6a27d" />
      <CabinetModel cycle={cycle} reducedMotion={reducedMotion} />
      <OrbitControls
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
