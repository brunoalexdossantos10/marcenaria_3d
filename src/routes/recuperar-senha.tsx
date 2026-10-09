import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saas/AuthPage";
export const Route = createFileRoute("/recuperar-senha")({
  ssr: false,
  head: () => ({ meta: [{ title: "Modelador 3D · recuperar-senha" }] }),
  component: () => <AuthPage mode="recuperar" />,
});
