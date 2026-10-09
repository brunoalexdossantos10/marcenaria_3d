import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saas/AuthPage";
export const Route = createFileRoute("/nova-senha")({
  ssr: false,
  head: () => ({ meta: [{ title: "Modelador 3D · nova-senha" }] }),
  component: () => <AuthPage mode="senha" />,
});
