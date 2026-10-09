import type { FurnitureConfig } from "./types";
import { roomSize } from "./roomBounds";

export interface FurniturePose {
  x: number;
  z: number;
  elevation: number;
  rotation: number;
}
export const wrapRotation = (value: number) => ((value % 360) + 360) % 360;
export function footprint(config: FurnitureConfig, rotation: number) {
  const angle = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(angle)) * config.width + Math.abs(Math.sin(angle)) * config.depth,
    depth: Math.abs(Math.sin(angle)) * config.width + Math.abs(Math.cos(angle)) * config.depth,
  };
}
export function constrainPose(
  config: FurnitureConfig,
  roomConfig: FurnitureConfig,
  pose: FurniturePose,
  previous: FurniturePose,
  obstacles: { config: FurnitureConfig; position: [number, number] }[] = [],
): FurniturePose {
  const room = roomSize(roomConfig.width, roomConfig.depth, roomConfig.height);
  const rotation = Number.isFinite(pose.rotation) ? wrapRotation(pose.rotation) : previous.rotation;
  const size = footprint(config, rotation);
  if (size.width + 4 > room.w * 100 || size.depth + 4 > room.d * 100) return previous;
  const clamp = (v: number, low: number, high: number, fallback: number) =>
    low > high ? fallback : Math.max(low, Math.min(high, Number.isFinite(v) ? v : fallback));
  const next = {
    rotation,
    x: clamp(
      pose.x,
      -room.w * 50 + size.width / 2 + 2,
      room.w * 50 - size.width / 2 - 2,
      previous.x,
    ),
    z: clamp(
      pose.z,
      room.back * 100 + size.depth / 2 + 2,
      (room.back + room.d) * 100 - size.depth / 2 - 2,
      previous.z,
    ),
    elevation: clamp(pose.elevation, 0, room.h * 100 - config.height - 2, previous.elevation),
  };
  const collides = (candidate: FurniturePose) =>
    obstacles.some((item) => {
      const other = footprint(item.config, item.config.floorRotation ?? 0);
      const elevation = item.config.floorElevation ?? 0;
      return (
        Math.abs(candidate.x - item.position[0]) < (size.width + other.width) / 2 + 2 &&
        Math.abs(candidate.z - item.position[1]) < (size.depth + other.depth) / 2 + 2 &&
        candidate.elevation < elevation + item.config.height + 2 &&
        candidate.elevation + config.height + 2 > elevation
      );
    });
  if (!collides(next)) return next;
  if (rotation !== previous.rotation || next.elevation !== previous.elevation) return previous;
  const alongX = { ...next, z: previous.z };
  if (!collides(alongX)) return alongX;
  const alongZ = { ...next, x: previous.x };
  return collides(alongZ) ? previous : alongZ;
}
