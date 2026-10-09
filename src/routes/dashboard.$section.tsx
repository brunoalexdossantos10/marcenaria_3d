import { createFileRoute } from "@tanstack/react-router";
import { DashboardSection } from "@/components/saas/Dashboard";
export const Route = createFileRoute("/dashboard/$section")({
  component: Page,
});
function Page() {
  const { section } = Route.useParams();
  return <DashboardSection key={section} section={section} />;
}
