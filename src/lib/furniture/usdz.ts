import * as THREE from "three";
import { buildFurniture } from "./builder";
import type { FurnitureConfig, Part } from "./types";
import { material as materialDef } from "./materials";

const metre = 0.01;

/** The same configuration-derived physical scene is used by camera, WebXR and USDZ. */
export function createFurnitureScene(config: FurnitureConfig): THREE.Scene {
  const parts = buildFurniture(config);
  const scene = new THREE.Scene();
  const byParent = new Map<string, Part[]>();
  for (const part of parts) {
    const key = part.parent ?? "";
    byParent.set(key, [...(byParent.get(key) ?? []), part]);
  }

  const addPart = (part: Part, parent: THREE.Object3D) => {
    const node = new THREE.Group();
    node.name = part.label;
    node.position.set(...(part.pos.map((n) => n * metre) as [number, number, number]));
    parent.add(node);
    const [w, h, d] = part.size.map((n) => Math.max(n * metre, 0.006)) as [number, number, number];
    const def = materialDef(part.material ?? config.material);
    let color = def.color;
    let metalness = def.metalness ?? 0.02;
    let roughness = def.roughness;
    if (part.kind === "puxador") {
      color =
        ({ dourado: "#d5a74d", bronze: "#815a3b", preto: "#222222" } as Record<string, string>)[
          part.handle?.finish ?? ""
        ] ?? "#bfc5ca";
      metalness = 0.8;
      roughness = 0.3;
    } else if (part.kind === "cabideiro" || part.kind === "cabide") {
      color = "#aeb5bc";
      metalness = 0.8;
    } else if (part.kind === "espelho" || part.face === "espelho") {
      color = "#eef3f5";
      metalness = 1;
      roughness = 0.02;
    }
    const finish = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      side: THREE.DoubleSide,
    });
    const box = (
      width: number,
      height: number,
      depth: number,
      x = 0,
      y = 0,
      z = 0,
      surface = finish,
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), surface);
      mesh.position.set(x, y, z);
      node.add(mesh);
    };
    if (part.kind === "cabideiro") {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.max(h / 2, 0.008), Math.max(h / 2, 0.008), w, 16),
        finish,
      );
      rod.rotation.z = Math.PI / 2;
      node.add(rod);
    } else if (part.kind === "acessorio") {
      const id = part.id;
      const metal = new THREE.MeshStandardMaterial({
        color: "#a8afb4",
        metalness: 0.75,
        roughness: 0.3,
      });
      if (id.includes("ripado")) {
        const count = Math.max(2, Math.min(32, Math.floor(w / 0.075)));
        for (let i = 0; i < count; i++)
          box((w / count) * 0.67, h, d, -w / 2 + ((i + 0.5) * w) / count);
      } else if (id.includes("calceiro") || id.includes("cabideiro-retratil")) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w, 12), metal);
        rod.rotation.z = Math.PI / 2;
        node.add(rod);
        for (const side of [-1, 1]) box(0.03, 0.07, 0.045, side * (w / 2 - 0.03), -0.035, 0, metal);
      } else if (id.includes("lixeira")) {
        node.add(
          new THREE.Mesh(
            new THREE.CylinderGeometry(Math.min(w, d) * 0.43, Math.min(w, d) * 0.38, h * 0.82, 24),
            finish,
          ),
        );
        box(w * 0.85, 0.018, d * 0.85, 0, h * 0.4, 0, metal);
      } else if (id.includes("sapateira")) {
        node.rotation.x = -0.24;
        box(w, 0.016, d);
        for (const side of [-1, 1]) box(0.018, 0.05, d, side * (w / 2 - 0.012), 0.018, 0, metal);
        box(w, 0.04, 0.018, 0, 0.025, d / 2 - 0.018, metal);
      } else if (id.includes("divisoria") || id.includes("tomadas")) {
        box(w, h, d);
      } else {
        const wall = Math.min(0.016, Math.max(0.008, h * 0.12));
        box(w, wall, d, 0, -h / 2 + wall / 2);
        for (const side of [-1, 1]) {
          box(wall, h, d, side * (w / 2 - wall / 2));
          box(w, h, wall, 0, 0, side * (d / 2 - wall / 2));
        }
      }
    } else {
      box(w, h, d);
    }
    for (const child of byParent.get(part.id) ?? []) addPart(child, node);
  };
  for (const root of byParent.get("") ?? []) addPart(root, scene);
  scene.updateMatrixWorld(true);
  return scene;
}

/** Quick Look expects geometry in metres with its base on the horizontal plane. */
export async function exportFurnitureUSDZ(
  config: FurnitureConfig,
): Promise<Uint8Array<ArrayBuffer>> {
  const { USDZExporter } = await import("three/addons/exporters/USDZExporter.js");
  const scene = createFurnitureScene(config);
  try {
    return await new USDZExporter().parseAsync(scene, {
      quickLookCompatible: true,
    });
  } finally {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose());
        else object.material.dispose();
      }
    });
  }
}
