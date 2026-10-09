import { useState } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { FurnitureConfig } from "@/lib/furniture/types";
import { typeDef } from "@/lib/furniture/types";

type Axis = "width" | "height" | "depth";
const S = 0.01;
const round = (value: number, free: boolean) =>
  Math.round(value / (free ? 0.1 : 1)) * (free ? 0.1 : 1);

/** Handles change the parametric dimensions, never the render group's scale. */
export function FurnitureGizmo({
  config,
  onResize,
}: {
  config: FurnitureConfig;
  onResize: (axis: Axis, value: number) => void;
}) {
  const { camera, gl, controls } = useThree();
  const [active, setActive] = useState<Axis | null>(null);
  const [value, setValue] = useState(0);
  const w = config.width * S,
    h = config.height * S,
    d = config.depth * S;
  const limits = typeDef(config.type).limits;
  const handles: { axis: Axis; sign: number; pos: [number, number, number]; label: string }[] = [
    { axis: "width", sign: -1, pos: [-w / 2, h / 2, 0], label: "Largura esquerda" },
    { axis: "width", sign: 1, pos: [w / 2, h / 2, 0], label: "Largura direita" },
    { axis: "height", sign: 1, pos: [0, h, 0], label: "Altura superior" },
    { axis: "height", sign: -1, pos: [0, 0.025, 0], label: "Altura inferior" },
    { axis: "depth", sign: 1, pos: [0, h / 2, d / 2], label: "Profundidade frontal" },
    { axis: "depth", sign: -1, pos: [0, h / 2, -d / 2], label: "Profundidade traseira" },
  ];
  const begin = (
    event: { stopPropagation: () => void; point: THREE.Vector3 },
    axis: Axis,
    sign: number,
  ) => {
    event.stopPropagation();
    const orbit = controls as { enabled: boolean } | null;
    if (orbit) orbit.enabled = false;
    const start: Record<Axis, number> = {
      width: config.width,
      height: config.height,
      depth: config.depth,
    };
    const point = event.point.clone() as THREE.Vector3;
    const normal = camera.getWorldDirection(new THREE.Vector3()).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
    const direction =
      axis === "width"
        ? new THREE.Vector3(1, 0, 0)
        : axis === "height"
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, 1);
    direction.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      ((config.floorRotation ?? 0) * Math.PI) / 180,
    );
    const ray = new THREE.Raycaster();
    const hit = new THREE.Vector3();
    const rect = gl.domElement;
    setActive(axis);
    setValue(start[axis]);
    const move = (ev: PointerEvent) => {
      const bounds = rect.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((ev.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((ev.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const delta = hit.clone().sub(point).dot(direction) * 100 * sign;
      const proposed = round(start[axis] + delta * (axis === "height" ? 1 : 2), ev.altKey);
      const next = Math.max(limits[axis][0], Math.min(limits[axis][1], proposed));
      onResize(axis, next);
      setValue(next);
      if (ev.shiftKey) {
        const ratio = next / start[axis];
        for (const other of ["width", "height", "depth"] as Axis[]) {
          if (other === axis) continue;
          onResize(
            other,
            Math.max(
              limits[other][0],
              Math.min(limits[other][1], round(start[other] * ratio, ev.altKey)),
            ),
          );
        }
      }
    };
    const up = () => {
      setActive(null);
      if (orbit) orbit.enabled = true;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
  };
  return (
    <group>
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#bd8145" transparent opacity={0.8} depthTest={false} />
      </lineSegments>
      {handles.map(({ axis, sign, pos, label }) => (
        <group key={label} position={pos}>
          <mesh
            onPointerDown={(e) => begin(e, axis, sign)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "ew-resize";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
            renderOrder={10}
          >
            <sphereGeometry args={[0.042, 12, 12]} />
            <meshBasicMaterial color={active === axis ? "#f2b463" : "#9b7045"} depthTest={false} />
          </mesh>
          {active === axis && (
            <Html center position={[0, 0.1, 0]}>
              <span className="dim-badge">{value} cm</span>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
