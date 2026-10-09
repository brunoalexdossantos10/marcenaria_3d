export interface TouchPoint {
  x: number;
  y: number;
}
export interface PreviewTransform {
  scale: number;
  rotation: number;
  x: number;
  y: number;
}
export const INITIAL_TRANSFORM: PreviewTransform = {
  scale: 1,
  rotation: 0,
  x: 0,
  y: 0,
};
export const clampScale = (value: number) => Math.max(0.25, Math.min(2.5, value));

export function gestureMetrics(points: TouchPoint[]) {
  const a = points[0];
  if (!a) return null;
  const b = points[1];
  return b
    ? {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        distance: Math.hypot(b.x - a.x, b.y - a.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        count: 2,
      }
    : { x: a.x, y: a.y, distance: 0, angle: 0, count: 1 };
}

export function gestureTransform(
  start: NonNullable<ReturnType<typeof gestureMetrics>>,
  next: NonNullable<ReturnType<typeof gestureMetrics>>,
  base: PreviewTransform,
): PreviewTransform {
  const angle = Math.atan2(Math.sin(next.angle - start.angle), Math.cos(next.angle - start.angle));
  const pinch = start.count === 2 && next.count === 2 && start.distance > 8;
  return {
    scale: pinch ? clampScale((base.scale * next.distance) / start.distance) : base.scale,
    rotation: pinch ? base.rotation + angle : base.rotation,
    x: base.x + next.x - start.x,
    y: base.y + next.y - start.y,
  };
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Permita a câmera nas configurações do navegador e tente novamente. Abra o link no Chrome, fora do navegador do WhatsApp ou Instagram.";
  if (name === "NotFoundError") return "Nenhuma câmera disponível foi encontrada neste aparelho.";
  if (name === "NotReadableError")
    return "A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.";
  if (name === "OverconstrainedError")
    return "Esta câmera não aceitou a configuração solicitada. Tente outra câmera.";
  return "Não foi possível abrir a câmera. Tente novamente no Chrome com uma conexão HTTPS.";
}
