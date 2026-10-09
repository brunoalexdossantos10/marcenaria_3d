import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saas/AuthPage";
export const Route = createFileRoute("/cadastro")({
  ssr: false,
  head: () => ({ meta: [{ title: "Modelador 3D · cadastro" }] }),
  component: () => <AuthPage mode="cadastro" />,
});
