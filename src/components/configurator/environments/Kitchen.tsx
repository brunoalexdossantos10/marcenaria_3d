import { Box, palette, Plant, RoomShell, roomSize, WallFinishPanel } from "./shared";
import type { RoomProps } from "./types";

export default function Kitchen({ style, width, depth, height }: RoomProps) {
  const p = palette(style);
  const { side, back, h, w } = roomSize(width, depth, height);
  const premium = style === "premium";
  const minimal = style === "minimalista";
  const counterX = side + 0.18;
  return (
    <group>
      <RoomShell kind="cozinha" style={style} width={width} depth={depth} height={height} />
      {/* Side run of cabinetry leaves a clear bay for the configured piece. */}
      <Box
        size={[1.86, 0.82, 0.54]}
        position={[counterX, 0.41, back + 0.43]}
        color={minimal ? "#e2ddd3" : p.wood}
        roughness={0.54}
        radius={0.009}
      />
      <Box
        size={[1.94, 0.05, 0.63]}
        position={[counterX, 0.85, back + 0.46]}
        color={p.stone}
        roughness={premium ? 0.19 : 0.35}
        radius={0.013}
      />
      <Box
        size={[1.87, 0.54, 0.38]}
        position={[counterX, h - 0.51, back + 0.3]}
        color={minimal ? "#e2ddd3" : p.wood}
        roughness={0.53}
        radius={0.01}
      />
      {[counterX - 0.49, counterX + 0.49].map((x) => (
        <Box
          key={x}
          size={[0.004, 0.62, 0.02]}
          position={[x, 0.42, back + 0.72]}
          color={p.metal}
          metalness={0.75}
          radius={0.002}
        />
      ))}
      <WallFinishPanel
        color={premium ? "#c2b9a7" : "#d7d3ca"}
        size={[1.88, 0.75]}
        position={[counterX, 1.28, back + 0.037]}
        tileSize={0.38}
      />
      <Box
        size={[1.84, 0.012, 0.018]}
        position={[counterX, h - 0.79, back + 0.51]}
        color="#fff2df"
        roughness={0.35}
      />
      {/* Undermount sink and a restrained curved faucet. */}
      <Box
        size={[0.51, 0.012, 0.34]}
        position={[counterX - 0.5, 0.882, back + 0.48]}
        color="#808b8b"
        roughness={0.25}
        metalness={0.8}
        radius={0.015}
      />
      <mesh castShadow position={[counterX - 0.52, 0.99, back + 0.31]}>
        <torusGeometry args={[0.115, 0.009, 8, 18, Math.PI]} />
        <meshStandardMaterial color={p.metal} roughness={0.24} metalness={0.86} />
      </mesh>
      {/* Integrated oven + fridge on the far side, scaled to the room. */}
      <Box
        size={[0.53, 1.86, 0.53]}
        position={[w / 2 - 0.42, 0.93, back + 1.18]}
        color={premium ? "#494441" : "#b7bbb9"}
        roughness={0.27}
        metalness={0.48}
        radius={0.016}
      />
      <Box
        size={[0.37, 0.42, 0.025]}
        position={[w / 2 - 0.42, 0.87, back + 1.462]}
        color="#252b2c"
        roughness={0.19}
        radius={0.007}
      />
      {/* Peninsula and pendant composition; distinct silhouettes across styles. */}
      <group position={[counterX, 0, 1.65]}>
        <Box
          size={[premium ? 1.64 : 1.36, 0.82, 0.75]}
          position={[0, 0.42, 0]}
          color={minimal ? "#dfddd7" : p.wood}
          roughness={0.55}
          radius={0.014}
        />
        <Box
          size={[premium ? 1.75 : 1.48, 0.055, 0.83]}
          position={[0, 0.86, 0]}
          color={p.stone}
          roughness={premium ? 0.2 : 0.39}
          radius={0.016}
        />
        {!minimal &&
          [-0.41, 0.41].map((x) => (
            <group key={x} position={[x, 0, 0.83]}>
              <Box
                size={[0.035, 0.64, 0.035]}
                position={[0, 0.32, 0]}
                color={p.metal}
                metalness={0.7}
              />
              <mesh castShadow position={[0, 0.65, 0]}>
                <cylinderGeometry args={[0.18, 0.15, 0.045, 18]} />
                <meshStandardMaterial color={p.textile} roughness={0.72} />
              </mesh>
            </group>
          ))}
      </group>
      {(premium ? [-0.42, 0.42] : [0]).map((shift) => (
        <group key={shift} position={[counterX + shift, h - 0.08, 1.65]}>
          <Box
            size={[0.008, 0.45, 0.008]}
            position={[0, -0.22, 0]}
            color={p.metal}
            metalness={0.7}
            radius={0.002}
          />
          <mesh position={[0, -0.46, 0]} castShadow>
            <cylinderGeometry args={[0.1, premium ? 0.24 : 0.17, 0.24, 24]} />
            <meshStandardMaterial
              color={premium ? p.metal : "#e4dbca"}
              metalness={premium ? 0.8 : 0.05}
              roughness={0.34}
            />
          </mesh>
          <pointLight
            position={[0, -0.6, 0]}
            color="#ffe0b7"
            intensity={3}
            distance={2.3}
            decay={2}
          />
        </group>
      ))}
      <Plant position={[-w / 2 + 0.5, 0, back + 1]} scale={0.75} />
      <pointLight
        position={[counterX, h - 0.86, back + 0.54]}
        color="#ffebcb"
        intensity={4}
        distance={2.3}
        decay={2}
      />
      {/* Cooktop, extractor and small appliances give the side run a working scale. */}
      <Box
        size={[0.58, 0.012, 0.37]}
        position={[counterX + 0.48, 0.888, back + 0.48]}
        color="#222729"
        roughness={0.18}
      />
      {[-0.16, 0.16].map((x) =>
        [-0.09, 0.09].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[counterX + 0.48 + x, 0.899, back + 0.48 + z]}
            rotation-x={-Math.PI / 2}
          >
            <ringGeometry args={[0.045, 0.049, 24]} />
            <meshStandardMaterial color="#777d7c" metalness={0.8} roughness={0.25} />
          </mesh>
        )),
      )}
      <Box
        size={[0.68, 0.045, 0.5]}
        position={[counterX + 0.48, h - 0.86, back + 0.48]}
        color={p.metal}
        metalness={0.7}
        roughness={0.29}
      />
      <Box
        size={[0.25, 0.35, 0.24]}
        position={[counterX + 0.48, h - 0.66, back + 0.34]}
        color={p.metal}
        metalness={0.62}
        roughness={0.33}
      />
      <Box
        size={[0.4, 0.28, 0.31]}
        position={[counterX + 0.55, 1.06, back + 0.5]}
        color="#d1d1cd"
        roughness={0.46}
        radius={0.01}
      />
      <Box
        size={[0.29, 0.17, 0.007]}
        position={[counterX + 0.55, 1.05, back + 0.66]}
        color="#2b3031"
        roughness={0.22}
      />
    </group>
  );
}
