import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saas/AuthPage";
export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Modelador 3D · login" }] }),
  component: () => <AuthPage mode="login" />,
});
