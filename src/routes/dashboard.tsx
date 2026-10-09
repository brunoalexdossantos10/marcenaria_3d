import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/saas/Dashboard";
export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Painel · Modelador 3D" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardLayout,
});
