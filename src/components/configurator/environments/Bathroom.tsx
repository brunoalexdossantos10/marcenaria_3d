import { Box, palette, Plant, RoomShell, Rug, roomSize, WallFinishPanel } from "./shared";
import type { RoomProps } from "./types";

export default function Bathroom({ style, width, depth, height }: RoomProps) {
  const p = palette(style);
  const { side, back, h, w } = roomSize(width, depth, height);
  const premium = style === "premium";
  const minimal = style === "minimalista";
  const vanityX = side + 0.22;
  return (
    <group>
      <RoomShell kind="banheiro" style={style} width={width} depth={depth} height={height} />
      <WallFinishPanel
        color={premium ? "#b6a99a" : "#e4e0d9"}
        size={[1.85, h * 0.76]}
        position={[vanityX, h * 0.55, back + 0.024]}
        tileSize={premium ? 0.85 : 0.6}
      />
      <Box
        size={[1.72, 0.43, 0.52]}
        position={[vanityX, 0.67, back + 0.43]}
        color={minimal ? "#e9e6df" : p.wood}
        roughness={0.59}
        radius={0.014}
      />
      <Box
        size={[1.79, 0.045, 0.57]}
        position={[vanityX, 0.91, back + 0.43]}
        color={p.stone}
        roughness={premium ? 0.2 : 0.39}
        radius={0.014}
      />
      <mesh position={[vanityX, 0.976, back + 0.43]} castShadow>
        <cylinderGeometry args={[0.23, 0.18, 0.1, 28]} />
        <meshStandardMaterial color="#f4f1eb" roughness={0.26} />
      </mesh>
      <mesh position={[vanityX, 1.16, back + 0.21]} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.14, 0.012, 8, 18, Math.PI]} />
        <meshStandardMaterial color={p.metal} roughness={0.21} metalness={0.86} />
      </mesh>
      {/* Mirror and its soft perimeter lighting create the bathroom focal glow. */}
      <Box
        size={[0.92, 0.98, 0.04]}
        position={[vanityX, 1.77, back + 0.095]}
        color={premium ? p.metal : "#a9b0ad"}
        metalness={0.7}
        roughness={0.25}
        radius={premium ? 0.12 : 0.02}
      />
      <mesh position={[vanityX, 1.77, back + 0.123]}>
        <planeGeometry args={[0.85, 0.9]} />
        <meshPhysicalMaterial
          color="#dce5e8"
          metalness={1}
          roughness={0.045}
          envMapIntensity={2.8}
        />
      </mesh>
      <pointLight
        position={[vanityX, 1.8, back + 0.28]}
        color={premium ? "#ffdcad" : "#fff2dc"}
        intensity={4}
        distance={2.4}
        decay={2}
      />
      {/* Glass shower occupies the far side, leaving the configured furniture clear. */}
      <group position={[w / 2 - 0.75, 0, back + 2.05]}>
        <Box
          size={[1.3, 0.06, 1.3]}
          position={[0, 0.035, 0]}
          color={p.stone}
          roughness={0.33}
          radius={0.01}
        />
        <mesh position={[-0.62, 1.01, 0]}>
          <boxGeometry args={[0.018, 1.96, 1.28]} />
          <meshPhysicalMaterial
            color="#c5dadc"
            transparent
            opacity={0.26}
            roughness={0.06}
            metalness={0.05}
            depthWrite={false}
          />
        </mesh>
        <Box
          size={[0.025, 1.99, 0.025]}
          position={[-0.62, 1.01, 0.62]}
          color={p.metal}
          metalness={0.85}
        />
        <Box
          size={[0.025, 1.99, 0.025]}
          position={[-0.62, 1.01, -0.62]}
          color={p.metal}
          metalness={0.85}
        />
        <Box
          size={[0.035, 0.54, 0.035]}
          position={[-0.57, 1.05, 0.2]}
          color={p.metal}
          metalness={0.8}
        />
        <mesh position={[0.5, 1.86, -0.43]}>
          <cylinderGeometry args={[0.16, 0.16, 0.026, 20]} />
          <meshStandardMaterial color={p.metal} metalness={0.9} roughness={0.19} />
        </mesh>
        <Box
          size={[0.025, 0.5, 0.025]}
          position={[0.5, 2.08, -0.43]}
          color={p.metal}
          metalness={0.85}
        />
        <Box
          size={[0.44, 0.23, 0.13]}
          position={[0.48, 1.16, -0.62]}
          color={p.stone}
          roughness={0.42}
        />
      </group>
      {!minimal && (
        <Box
          size={[0.66, 0.028, 0.18]}
          position={[-side - 0.35, 1.27, back + 0.19]}
          color={p.wood}
          roughness={0.6}
        />
      )}
      {premium && (
        <Box
          size={[0.82, 0.6, 0.024]}
          position={[-side - 0.3, 1.8, back + 0.1]}
          color={p.stone}
          roughness={0.32}
        />
      )}
      <Rug
        position={[vanityX, 0, 1.54]}
        width={0.72}
        depth={0.95}
        color={premium ? "#a18d79" : "#cfcec7"}
      />
      <Plant position={[-w / 2 + 0.5, 0, back + 1.1]} scale={0.7} />
      {/* Toilet and towel rail remain clear of the central configurable piece. */}
      <Box
        size={[0.37, 0.34, 0.58]}
        position={[-side - 0.3, 0.27, back + 1.8]}
        color="#f2f0ea"
        roughness={0.3}
        radius={0.018}
      />
      <mesh position={[-side - 0.3, 0.48, back + 1.88]} castShadow>
        <cylinderGeometry args={[0.23, 0.19, 0.08, 28]} />
        <meshStandardMaterial color="#f3f0e9" roughness={0.26} />
      </mesh>
      <Box
        size={[0.39, 0.47, 0.14]}
        position={[-side - 0.3, 0.65, back + 1.54]}
        color="#eeeae3"
        roughness={0.31}
      />
      <Box
        size={[0.61, 0.022, 0.035]}
        position={[-side - 0.25, 1.25, back + 0.18]}
        color={p.metal}
        metalness={0.86}
        roughness={0.25}
      />
      <Box
        size={[0.5, 0.3, 0.04]}
        position={[-side - 0.25, 1.06, back + 0.2]}
        color={premium ? "#b5a796" : "#e1ded7"}
        roughness={0.96}
      />
    </group>
  );
}
