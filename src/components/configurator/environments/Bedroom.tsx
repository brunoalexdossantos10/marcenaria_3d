import {
  Box,
  FramedArt,
  palette,
  Plant,
  RoomShell,
  Rug,
  roomSize,
  TexturedSurface,
} from "./shared";
import type { RoomProps } from "./types";

export default function Bedroom({ style, width, depth, height }: RoomProps) {
  const p = palette(style);
  const { side, back, h, w, d } = roomSize(width, depth, height);
  const windowZ = back + d * 0.67;
  const premium = style === "premium";
  const minimal = style === "minimalista";
  return (
    <group>
      <RoomShell kind="quarto" style={style} width={width} depth={depth} height={height} />
      {/* The configured wardrobe or bedside piece stays in the central display bay. */}
      <group position={[side + 0.32, 0, 1.52]} rotation-y={-Math.PI / 2}>
        <Rug
          position={[0, 0, 0.08]}
          width={2.45}
          depth={2.1}
          color={premium ? "#80766d" : "#bdb5a9"}
        />
        <Box
          size={[1.63, 0.26, 1.95]}
          position={[0, 0.31, 0]}
          color={p.wood}
          roughness={0.63}
          radius={0.04}
        />
        <Box
          size={[1.59, 0.22, 1.89]}
          position={[0, 0.55, 0]}
          color={premium ? "#ded5c8" : "#eee9df"}
          roughness={0.98}
          radius={0.065}
        />
        <TexturedSurface
          kind="fabric"
          color={premium ? "#ded5c8" : "#eee9df"}
          size={[1.48, 1.74]}
          position={[0, 0.664, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          roughness={1}
        />
        <Box
          size={[1.72, premium ? 1.06 : 0.82, 0.12]}
          position={[0, premium ? 0.8 : 0.72, -1]}
          color={premium ? p.textile : p.wood}
          roughness={0.82}
          radius={0.036}
        />
        {[-0.42, 0.42].map((x) => (
          <Box
            key={x}
            size={[0.62, 0.13, 0.43]}
            position={[x, 0.73, -0.55]}
            color="#f4efe6"
            roughness={1}
            radius={0.06}
          />
        ))}
        <Box
          size={[1.53, 0.06, 0.54]}
          position={[0, 0.675, 0.58]}
          color={p.accent}
          roughness={0.95}
          radius={0.02}
        />
      </group>
      <Box
        size={[0.43, 0.46, 0.41]}
        position={[w / 2 - 0.44, 0.23, back + 1]}
        color={p.wood}
        roughness={0.62}
        radius={0.018}
      />
      <mesh position={[w / 2 - 0.44, 0.65, back + 1]}>
        <cylinderGeometry args={[0.15, 0.24, 0.27, 16]} />
        <meshStandardMaterial color={premium ? "#bfae91" : "#e4d8c4"} roughness={0.8} />
      </mesh>
      <pointLight
        position={[w / 2 - 0.44, 0.7, back + 1]}
        color="#ffdbad"
        intensity={premium ? 3 : 1.6}
        distance={2}
        decay={2}
      />
      {/* Curtains, artwork and wall detail are composed for each style. */}
      <Box
        size={[0.04, 1.9, 0.38]}
        position={[-w / 2 + 0.11, h * 0.58, windowZ - 0.79]}
        color={premium ? "#a99a86" : "#d5c8b7"}
        roughness={1}
      />
      <Box
        size={[0.04, 1.9, 0.38]}
        position={[-w / 2 + 0.11, h * 0.58, windowZ + 0.79]}
        color={premium ? "#a99a86" : "#d5c8b7"}
        roughness={1}
      />
      {!minimal && (
        <FramedArt
          position={[-side - 0.35, h * 0.63, back + 0.05]}
          color={p.accent}
          width={0.75}
          height={0.92}
        />
      )}
      {premium &&
        Array.from({ length: 8 }, (_, i) => (
          <Box
            key={i}
            size={[0.034, h * 0.58, 0.04]}
            position={[w / 2 - 1.05 + i * 0.13, h * 0.63, back + 0.04]}
            color={p.wood}
            radius={0.005}
          />
        ))}
      {minimal && (
        <Box size={[0.85, 0.018, 0.2]} position={[-side, 1.05, back + 0.17]} color={p.wood} />
      )}
      <Plant position={[-w / 2 + 0.53, 0, back + 1.08]} scale={1.1} />
      {/* Wall mirror, sockets and a restrained bedside reading light. */}
      <Box
        size={[0.56, 1.42, 0.035]}
        position={[side + 0.86, 1.27, back + 0.08]}
        color={p.wood}
        roughness={0.56}
      />
      <mesh position={[side + 0.86, 1.27, back + 0.104]}>
        <planeGeometry args={[0.5, 1.35]} />
        <meshPhysicalMaterial
          color="#dce5e5"
          metalness={0.92}
          roughness={0.055}
          envMapIntensity={2.2}
        />
      </mesh>
      {[-side - 0.4, side + 0.35].map((x) => (
        <group key={x} position={[x, 0.34, back + 0.09]}>
          <Box size={[0.08, 0.08, 0.018]} color="#e8e5df" roughness={0.73} />
          <Box size={[0.025, 0.008, 0.005]} position={[0, 0, 0.012]} color="#77746d" />
        </group>
      ))}
      <Box
        size={[0.12, 0.22, 0.12]}
        position={[w / 2 - 0.44, 0.94, back + 1]}
        color={p.metal}
        metalness={0.7}
        roughness={0.3}
      />
    </group>
  );
}
