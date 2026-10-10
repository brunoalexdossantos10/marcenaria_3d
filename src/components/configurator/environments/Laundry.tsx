import { Box, palette, Plant, RoomShell, roomSize } from "./shared";
import type { RoomProps } from "./types";

export default function Laundry({ style, width, depth, height }: RoomProps) {
  const p = palette(style);
  const { back, side } = roomSize(width, depth, height);
  return (
    <group>
      <RoomShell kind="lavanderia" style={style} width={width} depth={depth} height={height} />
      <Box
        size={[2.5, 0.1, 0.62]}
        position={[side + 1.35, 0.92, back + 1.35]}
        color={p.stone}
        radius={0.02}
      />
      <Box
        size={[0.92, 0.88, 0.58]}
        position={[side + 0.52, 0.45, back + 1.35]}
        color={p.wood}
        radius={0.018}
      />
      <Box
        size={[0.8, 0.88, 0.58]}
        position={[side + 1.45, 0.45, back + 1.35]}
        color={p.textile}
        radius={0.04}
      />
      <Box
        size={[0.7, 1.1, 0.58]}
        position={[side + 2.25, 0.55, back + 1.35]}
        color={p.wood}
        radius={0.018}
      />
      <Plant position={[-side - 0.55, 0, back + 0.95]} scale={0.62} />
    </group>
  );
}
