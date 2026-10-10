import type { FurnitureConfig } from "./types";

/** Room dimensions are in metres; furniture dimensions and stored position are in cm. */
export function roomSize(width: number, depth: number, height: number) {
  return {
    w: Math.max(9.2, width * 0.01 + 6.0),
    d: Math.max(8.0, depth * 0.01 + 7.0),
    h: Math.max(3.1, height * 0.01 + 0.75),
    back: -depth * 0.005 - 0.34,
    side: width * 0.005 + 1.1,
  };
}

export function clampFurnitureFloor(
  config: FurnitureConfig,
  position: [number, number],
): [number, number] {
  const { w, d, back } = roomSize(config.width, config.depth, config.height);
  const angle = ((config.floorRotation ?? 0) * Math.PI) / 180;
  const halfWidth =
    (Math.abs(Math.cos(angle)) * config.width + Math.abs(Math.sin(angle)) * config.depth) / 200;
  const halfDepth =
    (Math.abs(Math.sin(angle)) * config.width + Math.abs(Math.cos(angle)) * config.depth) / 200;
  const margin = 0.12;
  const clamp = (value: number, low: number, high: number) =>
    Math.max(low, Math.min(high, Number.isFinite(value) ? value / 100 : 0)) * 100;
  return [
    clamp(position[0], -w / 2 + halfWidth + margin, w / 2 - halfWidth - margin),
    clamp(position[1], back + halfDepth + margin, back + d - halfDepth - margin),
  ];
}
