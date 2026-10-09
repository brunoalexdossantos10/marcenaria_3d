import { useMemo } from "react";
import * as THREE from "three";
import type { Part } from "@/lib/furniture/types";
import { material } from "@/lib/furniture/materials";

const S = 0.01;

/** Small but identifiable fittings, built in the same centimetre space as the cabinet. */
export function AccessoryModel({ part, selected }: { part: Part; selected: boolean }) {
  const [w, h, d] = part.size.map((v) => v * S) as [number, number, number];
  const wood = material(part.material ?? "carvalho").color;
  const metal = "#a8afb4";
  const dark = "#303438";
  const accent = selected ? "#c98a3c" : wood;
  const slats = useMemo(() => Math.max(2, Math.min(32, Math.floor(w / 0.075))), [w]);
  const box = (width: number, height: number, depth: number, color = accent) => (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={color}
        roughness={0.45}
        metalness={color === metal ? 0.75 : 0.02}
      />
    </mesh>
  );

  if (part.id.startsWith("acc-sapateira"))
    return (
      <group rotation-x={-0.24}>
        {box(w, 0.016, d)}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * (w / 2 - 0.012), 0.018, 0]}>
            {box(0.018, 0.05, d, metal)}
          </group>
        ))}
        <group position={[0, 0.025, d / 2 - 0.018]}>{box(w, 0.04, 0.018, metal)}</group>
      </group>
    );

  if (part.id.includes("calceiro") || part.id.includes("cabideiro-retratil"))
    return (
      <group>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.012, 0.012, w, 12]} />
          <meshStandardMaterial color={metal} metalness={0.8} roughness={0.25} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * (w / 2 - 0.03), -0.035, 0]}>
            {box(0.03, 0.07, 0.045, dark)}
          </group>
        ))}
      </group>
    );

  if (part.id.includes("ripado"))
    return (
      <group>
        {Array.from({ length: slats }, (_, i) => (
          <group key={i} position={[-w / 2 + ((i + 0.5) * w) / slats, 0, 0]}>
            {box((w / slats) * 0.67, h, d, accent)}
          </group>
        ))}
      </group>
    );

  if (part.id.includes("lixeira"))
    return (
      <group>
        <mesh castShadow position={[0, -h * 0.04, 0]}>
          <cylinderGeometry args={[Math.min(w, d) * 0.43, Math.min(w, d) * 0.38, h * 0.82, 24]} />
          <meshStandardMaterial color={dark} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0, h * 0.39, 0]}>
          <cylinderGeometry args={[Math.min(w, d) * 0.48, Math.min(w, d) * 0.48, 0.018, 24]} />
          <meshStandardMaterial color={metal} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    );

  if (part.id.includes("tomadas"))
    return (
      <group>
        {box(w, h, d, dark)}
        {[-0.25, 0.25].map((n) => (
          <mesh key={n} position={[0, h * n, d / 2 + 0.001]}>
            <circleGeometry args={[w * 0.22, 16]} />
            <meshStandardMaterial color={metal} />
          </mesh>
        ))}
      </group>
    );

  if (part.id.includes("cabos"))
    return (
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[w * 0.28, w * 0.48, 24]} />
        <meshStandardMaterial color={dark} side={THREE.DoubleSide} roughness={0.55} />
      </mesh>
    );

  if (part.id.includes("suporte-tv"))
    return (
      <group>
        {box(w * 0.7, h * 0.06, d, dark)}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * w * 0.33, 0, d / 2]}>
            {box(0.03, h * 0.9, 0.025, metal)}
          </group>
        ))}
        <group position={[0, 0, d / 2 + 0.04]}>{box(w * 0.25, h * 0.25, 0.08, dark)}</group>
      </group>
    );

  if (part.id.includes("monitor"))
    return (
      <group>
        <group position={[0, -h / 2 + 0.012, 0]}>{box(w * 0.6, 0.024, d, dark)}</group>
        <group position={[0, 0, 0]}>{box(0.03, h, 0.03, metal)}</group>
        <group position={[0, h / 2 - 0.02, 0]}>{box(w * 0.65, 0.04, 0.03, metal)}</group>
      </group>
    );

  if (part.id.includes("divisoria")) return box(w, h, d);

  // Open-top tray with base and walls for internal drawers, organizers and spices.
  const wall = Math.min(0.016, Math.max(0.008, h * 0.12));
  return (
    <group>
      <group position={[0, -h / 2 + wall / 2, 0]}>{box(w, wall, d)}</group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (w / 2 - wall / 2), 0, 0]}>
          {box(wall, h, d)}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`end-${side}`} position={[0, 0, side * (d / 2 - wall / 2)]}>
          {box(w, h, wall)}
        </group>
      ))}
      {part.id.includes("organizador") && (
        <group position={[0, 0, 0]}>{box(wall, h * 0.7, d - 2 * wall)}</group>
      )}
    </group>
  );
}
