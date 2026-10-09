import { createFileRoute } from "@tanstack/react-router";
import { ConfiguradorPage } from "@/components/configurator/ConfiguratorPage";
export const Route = createFileRoute("/configurador")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configurador 3D de móveis sob medida | Modelador 3D" },
      {
        name: "description",
        content:
          "Monte seu móvel sob medida em 3D: escolha dimensões, portas, gavetas, prateleiras e acabamentos em MDF com preço estimado em tempo real.",
      },
      { property: "og:title", content: "Configurador 3D de móveis sob medida" },
      {
        property: "og:description",
        content: "Personalize dimensões, peças e acabamentos e veja o preço na hora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfiguradorPage,
});
