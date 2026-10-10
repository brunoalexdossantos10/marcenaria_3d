import { useEffect, useState } from "react";
import * as THREE from "three";
import woodFloor from "@/assets/textures/wood-floor.webp";
import woodFloorHigh from "@/assets/textures/wood-floor-high.webp";
import marble from "@/assets/textures/marble.webp";
import marbleHigh from "@/assets/textures/marble-high.webp";
import oak from "@/assets/textures/oak.webp";
import oakHigh from "@/assets/textures/oak-high.webp";
import oakLight from "@/assets/textures/oak-light.webp";
import oakLightHigh from "@/assets/textures/oak-light-high.webp";
import freijo from "@/assets/textures/cabinet-wood.webp";
import freijoHigh from "@/assets/textures/cabinet-wood-high.webp";
import walnut from "@/assets/textures/walnut.webp";
import walnutHigh from "@/assets/textures/walnut-high.webp";
import timber from "@/assets/textures/timber.webp";
import timberHigh from "@/assets/textures/timber-high.webp";
import darkWood from "@/assets/textures/dark-wood.webp";
import darkWoodHigh from "@/assets/textures/dark-wood-high.webp";
import oakNormal from "@/assets/textures/oak-normal.webp";
import oakRough from "@/assets/textures/oak-rough.webp";
import oakLightNormal from "@/assets/textures/oak-light-normal.webp";
import oakLightRough from "@/assets/textures/oak-light-rough.webp";
import freijoNormal from "@/assets/textures/cabinet-wood-normal.webp";
import freijoRough from "@/assets/textures/cabinet-wood-rough.webp";
import walnutNormal from "@/assets/textures/walnut-normal.webp";
import walnutRough from "@/assets/textures/walnut-rough.webp";
import timberNormal from "@/assets/textures/timber-normal.webp";
import timberRough from "@/assets/textures/timber-rough.webp";
import darkWoodNormal from "@/assets/textures/dark-wood-normal.webp";
import darkWoodRough from "@/assets/textures/dark-wood-rough.webp";

export type WoodSurface =
  "carvalho" | "carvalho-claro" | "freijo" | "nogueira" | "amadeirado" | "madeira-escura";
type Surface = "wood" | "stone" | WoodSurface;
type TextureKind = "color" | "normal" | "rough";
type Resolution = "standard" | "high";
const urls: Record<Surface, Record<Resolution, string>> = {
  wood: { standard: woodFloor, high: woodFloorHigh },
  stone: { standard: marble, high: marbleHigh },
  carvalho: { standard: oak, high: oakHigh },
  "carvalho-claro": { standard: oakLight, high: oakLightHigh },
  freijo: { standard: freijo, high: freijoHigh },
  nogueira: { standard: walnut, high: walnutHigh },
  amadeirado: { standard: timber, high: timberHigh },
  "madeira-escura": { standard: darkWood, high: darkWoodHigh },
};
const detailUrls: Record<WoodSurface, { normal: string; rough: string }> = {
  carvalho: { normal: oakNormal, rough: oakRough },
  "carvalho-claro": { normal: oakLightNormal, rough: oakLightRough },
  freijo: { normal: freijoNormal, rough: freijoRough },
  nogueira: { normal: walnutNormal, rough: walnutRough },
  amadeirado: { normal: timberNormal, rough: timberRough },
  "madeira-escura": { normal: darkWoodNormal, rough: darkWoodRough },
};
const loaded = new Map<string, THREE.Texture>();
const pending = new Map<string, Promise<THREE.Texture>>();
const textureUsers = new Map<THREE.Texture, number>();
function releaseUnusedTextures() {
  const idle = [...loaded.entries()].filter(([, texture]) => !(textureUsers.get(texture) ?? 0));
  for (const [key, texture] of idle.slice(0, Math.max(0, idle.length - 4))) {
    loaded.delete(key);
    texture.dispose();
    textureUsers.delete(texture);
  }
}

function preferredResolution(): Resolution {
  if (typeof navigator === "undefined") return "standard";
  const device = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (
    device.connection?.saveData ||
    (device.deviceMemory !== undefined && device.deviceMemory <= 2)
  )
    return "standard";
  if (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) return "standard";
  return "high";
}

function load(surface: Surface, kind: TextureKind, resolution: Resolution): Promise<THREE.Texture> {
  const key = `${surface}:${kind}:${resolution}`;
  const cached = loaded.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(key);
  if (existing) return existing;
  const url =
    kind === "color" ? urls[surface][resolution] : detailUrls[surface as WoodSurface]?.[kind];
  if (!url) return Promise.reject(new Error("Texture unavailable"));
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = kind === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = kind === "color" && resolution === "high" ? 4 : 2;
        loaded.set(key, texture);
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
  pending.set(key, promise);
  void promise.finally(() => pending.delete(key)).catch(() => {});
  return promise;
}

/** Solid color is visible immediately. Only the chosen finish's maps are fetched. */
export function usePhotoTexture(surface: Surface | null, kind: TextureKind = "color") {
  const [preferred] = useState(preferredResolution);
  const resolution = kind === "color" ? preferred : "standard";
  const key = surface ? `${surface}:${kind}:${resolution}` : null;
  const [current, setCurrent] = useState<{
    key: string;
    texture: THREE.Texture;
  } | null>(() => (key && loaded.has(key) ? { key, texture: loaded.get(key)! } : null));
  useEffect(() => {
    if (!surface || !key) return;
    let mounted = true;
    const cached = loaded.get(key);
    if (cached) {
      setCurrent({ key, texture: cached });
      return;
    }
    void load(surface, kind, resolution)
      .catch(() =>
        resolution === "high"
          ? load(surface, kind, "standard")
          : Promise.reject(new Error("Texture unavailable")),
      )
      .then((value) => {
        if (mounted) setCurrent({ key, texture: value });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [surface, kind, resolution, key]);
  const texture = current?.key === key ? current.texture : null;
  useEffect(() => {
    if (!texture) return;
    textureUsers.set(texture, (textureUsers.get(texture) ?? 0) + 1);
    return () => {
      textureUsers.set(texture, Math.max(0, (textureUsers.get(texture) ?? 1) - 1));
      releaseUnusedTextures();
    };
  }, [texture]);
  return texture;
}
