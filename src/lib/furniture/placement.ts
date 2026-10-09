import type { FurnitureConfig, Part } from "./types.ts";

export type MovableKind = "porta" | "gaveta" | "prateleira" | "nicho";
export const isMovable = (part: Part) =>
  part.id.startsWith("mod-") ||
  part.kind === "porta" ||
  part.kind === "gaveta" ||
  part.kind === "prateleira" ||
  part.kind === "nicho";
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const overlaps = (a: number, aSize: number, b: number, bSize: number) =>
  Math.abs(a - b) < (aSize + bSize) / 2 - 0.05;

/** A modular part searches nearby free anchors inside the same cabinet. The
 * result is in local furniture coordinates, independent of the room camera. */
export function findModularPlacement(
  config: FurnitureConfig,
  parts: Part[],
  candidate: Part,
  x: number,
  y: number,
): Part["pos"] | null {
  const t = config.panelThickness;
  const cols = Math.max(1, Math.round(config.columns));
  const colW = (config.width - 2 * t - (cols - 1) * t) / cols;
  const centers = Array.from(
    { length: cols },
    (_, i) => -(config.width - 2 * t) / 2 + colW / 2 + i * (colW + t),
  );
  const optionsX = centers.sort((a, b) => Math.abs(a - x) - Math.abs(b - x));
  const margin = candidate.kind === "porta" || candidate.kind === "divisoria" ? 0 : 0.4;
  const minY = t + candidate.size[1] / 2 + margin;
  const rawMaxY = config.height - t - candidate.size[1] / 2 - margin;
  if (minY > rawMaxY + 0.000001) return null;
  const maxY = Math.max(minY, rawMaxY);
  const fixedY = candidate.kind === "porta" || candidate.kind === "divisoria";
  const desiredY = fixedY ? config.height / 2 : clamp(y, minY, maxY);
  const occupied = parts.filter(
    (other) =>
      other.id !== candidate.id &&
      !other.parent &&
      ["porta", "gaveta", "prateleira", "nicho", "divisoria", "cabideiro", "acessorio"].includes(
        other.kind,
      ),
  );
  const free = (cx: number, cy: number) =>
    occupied.every((other) => {
      // The front rail is distinct from the interior; doors cannot collide with shelves.
      if (candidate.kind === "porta" || other.kind === "porta")
        return (
          candidate.kind !== "porta" ||
          other.kind !== "porta" ||
          !overlaps(cx, candidate.size[0], other.pos[0], other.size[0]) ||
          !overlaps(cy, candidate.size[1], other.pos[1], other.size[1])
        );
      return (
        !overlaps(cx, candidate.size[0], other.pos[0], other.size[0]) ||
        !overlaps(cy, candidate.size[1], other.pos[1], other.size[1])
      );
    });
  for (const cx of optionsX) {
    for (let delta = 0; delta <= (fixedY ? 0 : maxY - minY); delta += 1) {
      for (const sign of delta ? [1, -1] : [1]) {
        const cy = clamp(Math.round(desiredY * 2) / 2 + delta * sign, minY, maxY);
        if (free(cx, cy)) return [cx, cy, candidate.pos[2]];
      }
    }
  }
  return null;
}

/** Find the nearest free slot for a niche panel in the column under the cursor. */
export function findNichePlacement(
  config: FurnitureConfig,
  parts: Part[],
  niche: Part,
  x: number,
  y: number,
): Part["pos"] | null {
  const t = config.panelThickness;
  const cols = Math.max(1, Math.round(config.columns));
  const colW = (config.width - 2 * t - (cols - 1) * t) / cols;
  const center = (i: number) => -(config.width - 2 * t) / 2 + colW / 2 + i * (colW + t);
  const column = clamp(Math.round((x - center(0)) / (colW + t)), 0, cols - 1);
  const targetX = center(column);
  const low = t + niche.size[1] / 2 + 0.25;
  const high = config.height - t - niche.size[1] / 2 - 0.25;
  if (low > high) return null;
  const desiredY = clamp(y, low, high);
  const fits = (candidate: number) =>
    parts.every(
      (other) =>
        other.id === niche.id ||
        !["gaveta", "prateleira", "nicho", "cabideiro"].includes(other.kind) ||
        !overlaps(targetX, niche.size[0], other.pos[0], other.size[0]) ||
        Math.abs(candidate - other.pos[1]) >= (niche.size[1] + other.size[1]) / 2 + 0.25,
    );
  for (let distance = 0; distance <= Math.ceil((high - low) * 2); distance++) {
    for (const sign of distance === 0 ? [1] : [1, -1]) {
      const candidate = clamp(Math.round(desiredY * 2) / 2 + (sign * distance) / 2, low, high);
      if (fits(candidate)) return [targetX, candidate, niche.pos[2]];
    }
  }
  return null;
}

/** Restrict a component to its aperture and the nearest components it cannot cross. Units are cm. */
export function constrainPosition(
  config: FurnitureConfig,
  parts: Part[],
  part: Part,
  desired: Part["pos"],
): Part["pos"] {
  if (!isMovable(part)) return part.pos;
  if (part.id.startsWith("mod-"))
    return findModularPlacement(config, parts, part, desired[0], desired[1]) ?? part.pos;
  if (part.kind === "nicho")
    return findNichePlacement(config, parts, part, desired[0], desired[1]) ?? part.pos;
  const t = config.panelThickness;
  const gap = 0.25;
  let minY = t + part.size[1] / 2 + gap;
  let maxY = config.height - t - part.size[1] / 2 - gap;
  let minX = -config.width / 2 + part.size[0] / 2 + 0.05;
  let maxX = config.width / 2 - part.size[0] / 2 - 0.05;

  if (part.kind === "porta") {
    // The existing builder divides the front into door apertures. Keep each
    // leaf in its current aperture instead of passing through its neighbour.
    const home = part.homePos ?? part.pos;
    minX = Math.max(minX, home[0] - 0.15);
    maxX = Math.min(maxX, home[0] + 0.15);
    minY = Math.max(part.size[1] / 2 + 0.05, home[1] - 0.15);
    maxY = Math.min(config.height - part.size[1] / 2 - 0.05, home[1] + 0.15);
    if (part.sliding) {
      minX = -config.width / 2 + part.size[0] / 2;
      maxX = config.width / 2 - part.size[0] / 2;
    }
    for (const other of parts) {
      if (
        other.id === part.id ||
        other.kind !== "porta" ||
        !overlaps(part.pos[1], part.size[1], other.pos[1], other.size[1])
      )
        continue;
      // Sliding leaves can overlap on distinct rails; never block one against
      // a leaf on the other rail.
      if (part.sliding && Math.abs(other.pos[2] - part.pos[2]) > part.size[2]) continue;
      const clearance = part.sliding ? -2 : gap;
      if (other.pos[0] < part.pos[0])
        minX = Math.max(minX, other.pos[0] + (other.size[0] + part.size[0]) / 2 + clearance);
      else maxX = Math.min(maxX, other.pos[0] - (other.size[0] + part.size[0]) / 2 - clearance);
    }
  } else {
    // Both types stay in their existing column. Shelves cannot cross drawers,
    // other shelves or niches; drawer fronts cannot cross adjacent fronts.
    for (const other of parts) {
      if (
        other.id === part.id ||
        !["gaveta", "prateleira", "nicho", "cabideiro"].includes(other.kind) ||
        !overlaps(part.pos[0], part.size[0], other.pos[0], other.size[0])
      )
        continue;
      if (part.kind === "gaveta" && (other.kind === "nicho" || other.kind === "cabideiro"))
        continue;
      const clearance = (other.size[1] + part.size[1]) / 2 + gap;
      if (other.pos[1] < part.pos[1]) minY = Math.max(minY, other.pos[1] + clearance);
      else maxY = Math.min(maxY, other.pos[1] - clearance);
    }
  }

  // A changed cabinet size can leave no legal interval. Its base position is
  // still the safest fallback; never force a component outside the cabinet.
  if (minY > maxY || (part.kind === "porta" && minX > maxX)) return part.pos;
  const x = part.kind === "porta" ? clamp(desired[0], minX, maxX) : part.pos[0];
  const y = clamp(desired[1], minY, maxY);
  return [x, y, part.pos[2]];
}
