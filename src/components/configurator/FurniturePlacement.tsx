import { useEffect, useRef, type ReactNode } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { FurnitureConfig } from "@/lib/furniture/types";
import { constrainPose, type FurniturePose } from "@/lib/furniture/positioning";

export type PlacementMode = "mover" | "girar" | "altura";
export function FurniturePlacement({
  config,
  roomConfig,
  pose,
  enabled,
  mode,
  sensitivity,
  onCommit,
  children,
}: {
  config: FurnitureConfig;
  roomConfig: FurnitureConfig;
  pose: FurniturePose;
  enabled: boolean;
  mode: PlacementMode;
  sensitivity: number;
  onCommit: (pose: FurniturePose) => void;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const { camera, gl, controls, invalidate } = useThree();
  useEffect(() => () => cleanup.current?.(), []);
  useEffect(() => {
    if (!enabled) cleanup.current?.();
  }, [enabled]);
  const begin = (event: ThreeEvent<PointerEvent>) => {
    if (!enabled || event.button !== 0 || !group.current) return;
    event.stopPropagation();
    cleanup.current?.();
    const orbit = controls as { enabled: boolean } | null;
    const wasEnabled = orbit?.enabled ?? true;
    if (orbit) orbit.enabled = false;
    const canvas = gl.domElement;
    const oldTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    const normal =
      mode === "altura"
        ? camera.getWorldDirection(new THREE.Vector3())
        : new THREE.Vector3(0, 1, 0);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, event.point);
    const ray = new THREE.Raycaster(),
      hit = new THREE.Vector3(),
      origin = event.point.clone();
    const centre = new THREE.Vector3(pose.x / 100, origin.y, pose.z / 100);
    const startAngle = Math.atan2(origin.x - centre.x, origin.z - centre.z);
    let last = pose,
      pending: PointerEvent | null = null,
      frame = 0,
      moved = false;
    const apply = () => {
      frame = 0;
      if (!pending || !group.current) return;
      const e = pending;
      pending = null;
      if (Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY) < 5 && !moved) return;
      const bounds = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((e.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const speed = Math.max(0.1, Math.min(1, sensitivity)) * (e.shiftKey ? 0.25 : 1);
      const angle = Math.atan2(hit.x - centre.x, hit.z - centre.z) - startAngle;
      const next = {
        ...pose,
        ...(mode === "mover"
          ? {
              x: pose.x + (hit.x - origin.x) * 100 * speed,
              z: pose.z + (hit.z - origin.z) * 100 * speed,
            }
          : {}),
        ...(mode === "altura"
          ? { elevation: pose.elevation + (hit.y - origin.y) * 100 * speed }
          : {}),
        ...(mode === "girar"
          ? {
              rotation:
                pose.rotation +
                ((Math.atan2(Math.sin(angle), Math.cos(angle)) * 180) / Math.PI) * speed,
            }
          : {}),
      };
      last = constrainPose(config, roomConfig, next, last, config.roomItems ?? []);
      group.current.position.set(last.x / 100, last.elevation / 100, last.z / 100);
      group.current.rotation.y = (last.rotation * Math.PI) / 180;
      moved = true;
      invalidate();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      pending = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const finish = (commit: boolean) => {
      if (commit) apply();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      if (orbit) orbit.enabled = wasEnabled;
      canvas.style.touchAction = oldTouchAction;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        /* Capture may already have ended. */
      }
      cleanup.current = null;
      if (commit && moved)
        onCommit({
          ...last,
          x: Math.round(last.x * 10) / 10,
          z: Math.round(last.z * 10) / 10,
          elevation: Math.round(last.elevation * 10) / 10,
        });
      else if (group.current) {
        group.current.position.set(pose.x / 100, pose.elevation / 100, pose.z / 100);
        group.current.rotation.y = (pose.rotation * Math.PI) / 180;
      }
      invalidate();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === event.pointerId) finish(true);
    };
    const cancel = () => finish(false);
    cleanup.current = cancel;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* Window events still finish the drag. */
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
  };
  return (
    <group
      ref={group}
      position={[pose.x / 100, pose.elevation / 100, pose.z / 100]}
      rotation={[0, (pose.rotation * Math.PI) / 180, 0]}
    >
      {children}
      {enabled && (
        <mesh
          position={[0, config.height / 200, 0]}
          onPointerDown={begin}
          onPointerOver={(e) => {
            e.stopPropagation();
            gl.domElement.style.cursor = "grab";
          }}
          onPointerOut={() => {
            gl.domElement.style.cursor = "";
          }}
        >
          <boxGeometry
            args={[
              config.width / 100 + 0.025,
              config.height / 100 + 0.025,
              config.depth / 100 + 0.025,
            ]}
          />
          <meshBasicMaterial color="#ba8754" transparent opacity={0.06} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
