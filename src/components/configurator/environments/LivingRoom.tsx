import { Box, FramedArt, palette, Plant, RoomShell, Rug, roomSize } from "./shared";
import type { RoomProps } from "./types";

export default function LivingRoom({ style, width, depth, height }: RoomProps) {
  const p = palette(style);
  const { side, back, h, w, d } = roomSize(width, depth, height);
  const windowZ = back + d * 0.67;
  const premium = style === "premium";
  const contemporary = style === "contemporaneo";
  return (
    <group>
      <RoomShell kind="sala" style={style} width={width} depth={depth} height={height} />
      {/* Sofa sits to the right of the configurator's clear central footprint. */}
      <group position={[side + 0.3, 0, 1.45]} rotation-y={-Math.PI / 2}>
        <Box
          size={[1.8, 0.22, 0.8]}
          position={[0, 0.43, 0]}
          color={p.textile}
          roughness={0.98}
          radius={0.085}
        />
        <Box
          size={[1.84, 0.7, 0.18]}
          position={[0, 0.76, -0.34]}
          color={p.textile}
          roughness={0.98}
          radius={0.07}
        />
        {[-1, 1].map((s) => (
          <Box
            key={s}
            size={[0.17, 0.48, 0.79]}
            position={[s * 0.83, 0.57, 0]}
            color={p.textile}
            roughness={0.97}
            radius={0.07}
          />
        ))}
        {[-0.46, 0.46].map((x) => (
          <Box
            key={x}
            size={[0.72, 0.13, 0.6]}
            position={[x, 0.59, 0.07]}
            color={premium ? "#bcb2a5" : "#d1cabe"}
            roughness={0.96}
            radius={0.06}
          />
        ))}
        <Box
          size={[0.4, 0.12, 0.38]}
          position={[-0.35, 0.79, -0.19]}
          color={p.accent}
          roughness={0.98}
          radius={0.05}
          rotation={[0, 0.25, 0]}
        />
      </group>
      <Rug
        position={[side + 0.02, 0, 1.65]}
        width={2.4}
        depth={1.9}
        color={premium ? "#847d73" : "#c4b8a8"}
      />
      <group position={[side - 0.4, 0, 2.25]}>
        {contemporary ? (
          <mesh castShadow position={[0, 0.39, 0]}>
            <cylinderGeometry args={[0.47, 0.47, 0.07, 24]} />
            <meshStandardMaterial color={p.stone} roughness={0.3} />
          </mesh>
        ) : (
          <Box
            size={[0.95, 0.075, 0.55]}
            position={[0, 0.39, 0]}
            color={premium ? p.stone : p.wood}
            roughness={premium ? 0.27 : 0.53}
            radius={0.035}
          />
        )}
        {[-0.3, 0.3].map((x) => (
          <Box
            key={x}
            size={[0.028, 0.35, 0.028]}
            position={[x, 0.18, 0]}
            color={p.metal}
            metalness={0.8}
            radius={0.008}
          />
        ))}
        <mesh position={[0.17, 0.46, -0.05]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 18]} />
          <meshStandardMaterial color="#e8dfce" roughness={0.55} />
        </mesh>
      </group>
      {/* A secondary media wall and low rack stay outside the furniture's width. */}
      <Box
        size={[1.65, 1.37, 0.08]}
        position={[side + 0.05, 1.25, back + 0.08]}
        color={premium ? p.wood : p.stone}
        roughness={0.64}
        radius={0.012}
      />
      <Box
        size={[1.07, 0.63, 0.025]}
        position={[side + 0.05, 1.38, back + 0.135]}
        color="#222729"
        roughness={0.22}
        metalness={0.18}
        radius={0.008}
      />
      <Box
        size={[1.65, 0.26, 0.33]}
        position={[side + 0.05, 0.22, back + 0.32]}
        color={p.wood}
        roughness={0.55}
        radius={0.018}
      />
      {premium &&
        Array.from({ length: 10 }, (_, i) => (
          <Box
            key={i}
            size={[0.027, h * 0.7, 0.04]}
            position={[-w / 2 + 0.55 + i * 0.11, h * 0.48, back + 0.05]}
            color={p.wood}
            roughness={0.58}
            radius={0.004}
          />
        ))}
      <FramedArt position={[-side - 0.4, h * 0.66, back + 0.05]} color={p.accent} />
      <Plant position={[-w / 2 + 0.52, 0, back + 1.1]} scale={1.3} />
      <pointLight
        position={[side + 0.05, 0.63, back + 0.3]}
        color="#ffd6a6"
        intensity={premium ? 5 : 2.5}
        distance={2}
        decay={2}
      />
      {/* Window treatments, side table and reading lamp. */}
      <Box
        size={[0.045, 1.92, 0.36]}
        position={[-w / 2 + 0.11, h * 0.56, windowZ - 1.02]}
        color={p.textile}
        roughness={0.94}
      />
      <Box
        size={[0.045, 1.92, 0.36]}
        position={[-w / 2 + 0.11, h * 0.56, windowZ + 1.02]}
        color={p.textile}
        roughness={0.94}
      />
      <Box
        size={[0.38, 0.045, 0.38]}
        position={[side + 0.81, 0.55, 2.4]}
        color={p.wood}
        roughness={0.58}
      />
      <Box
        size={[0.04, 0.52, 0.04]}
        position={[side + 0.81, 0.27, 2.4]}
        color={p.metal}
        metalness={0.75}
        roughness={0.3}
      />
      <Box
        size={[0.025, 1.5, 0.025]}
        position={[w / 2 - 0.35, 0.75, back + 2.7]}
        color={p.metal}
        metalness={0.78}
      />
      <mesh position={[w / 2 - 0.35, 1.48, back + 2.7]} castShadow>
        <cylinderGeometry args={[0.13, 0.24, 0.24, 24]} />
        <meshStandardMaterial color={p.textile} roughness={0.82} />
      </mesh>
      <pointLight
        position={[w / 2 - 0.35, 1.36, back + 2.7]}
        color="#ffdfb9"
        intensity={1.5}
        distance={2}
        decay={2}
      />
    </group>
  );
}
