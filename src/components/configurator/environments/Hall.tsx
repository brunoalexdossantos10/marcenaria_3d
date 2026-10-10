import { Box, FramedArt, palette, Plant, RoomShell, roomSize } from "./shared";
import type { RoomProps } from "./types";

export default function Hall({ style, width, depth, height }: RoomProps) {
  const p = palette(style);
  const { back, side } = roomSize(width, depth, height);
  return (
    <group>
      <RoomShell kind="hall" style={style} width={width} depth={depth} height={height} />
      <Box
        size={[2.25, 0.82, 0.42]}
        position={[side + 1.1, 0.41, back + 0.78]}
        color={p.wood}
        radius={0.025}
      />
      <Box
        size={[2.3, 0.045, 0.46]}
        position={[side + 1.1, 0.85, back + 0.78]}
        color={p.stone}
        radius={0.012}
      />
      <FramedArt
        position={[side + 1.1, 1.95, back + 0.16]}
        color={p.accent}
        width={1.1}
        height={1.2}
      />
      <Plant position={[-side - 0.58, 0, back + 0.82]} scale={0.7} />
    </group>
  );
}
