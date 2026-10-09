import { lazy, Suspense, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { EnvironmentChoice, RoomProps } from "./types";
import { Box, palette, Plant, RoomLighting, RoomShell, roomSize } from "./shared";

const rooms = {
  sala: lazy(() => import("./LivingRoom")),
  cozinha: lazy(() => import("./Kitchen")),
  quarto: lazy(() => import("./Bedroom")),
  banheiro: lazy(() => import("./Bathroom")),
};

function RoomEntrance({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (group.current) group.current.scale.setScalar(0.985);
    invalidate();
  }, [invalidate]);
  useFrame((_, delta) => {
    if (!group.current) return;
    const scale = group.current.scale.x;
    if (scale < 0.9999) {
      group.current.scale.setScalar(scale + (1 - scale) * (1 - Math.exp(-5 * delta)));
      invalidate();
    }
  });
  return <group ref={group}>{children}</group>;
}

function CompactRoom({
  choice,
  width,
  depth,
  height,
}: Omit<RoomProps, "style"> & { choice: EnvironmentChoice }) {
  const p = palette(choice.style);
  const { back, side } = roomSize(width, depth, height);
  return (
    <group>
      <RoomShell
        kind={choice.room}
        style={choice.style}
        width={width}
        depth={depth}
        height={height}
      />
      {choice.room === "sala" && (
        <Box
          size={[1.15, 0.44, 0.58]}
          position={[side + 0.35, 0.34, back + 1.3]}
          color={p.textile}
          radius={0.04}
        />
      )}
      {choice.room === "cozinha" && (
        <Box
          size={[1.15, 0.82, 0.55]}
          position={[side + 0.35, 0.41, back + 0.6]}
          color={p.wood}
          radius={0.015}
        />
      )}
      {choice.room === "quarto" && (
        <Box
          size={[1.05, 0.37, 1.25]}
          position={[side + 0.35, 0.28, back + 1.3]}
          color={p.textile}
          radius={0.035}
        />
      )}
      {choice.room === "banheiro" && (
        <Box
          size={[1.05, 0.72, 0.45]}
          position={[side + 0.35, 0.36, back + 0.58]}
          color={p.stone}
          radius={0.015}
        />
      )}
      <Plant position={[-side - 0.5, 0, back + 0.8]} scale={0.7} />
    </group>
  );
}

export default function ShowroomEnvironment({
  choice,
  width,
  depth,
  height,
  lightweight = false,
}: Omit<RoomProps, "style"> & {
  choice: EnvironmentChoice;
  lightweight?: boolean;
}) {
  const Room = rooms[choice.room];
  return (
    <>
      <RoomLighting
        kind={choice.room}
        style={choice.style}
        width={width}
        depth={depth}
        height={height}
        lightweight={lightweight}
      />
      {lightweight ? (
        <CompactRoom choice={choice} width={width} depth={depth} height={height} />
      ) : (
        <Suspense fallback={null}>
          <RoomEntrance key={`${choice.room}-${choice.style}`}>
            <Room style={choice.style} width={width} depth={depth} height={height} />
          </RoomEntrance>
        </Suspense>
      )}
    </>
  );
}
