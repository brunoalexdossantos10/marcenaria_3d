import type { FurnitureConfig } from "./types";
import { ACCESSORIES, HANDLE_FINISHES, HANDLE_MODELS, typeDef } from "./types";
import { material } from "./materials";
import type { PriceBreakdown } from "./pricing";
import { componentDef } from "./components";

export interface ProposalIdentity {
  name: string;
  logo?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  instagram?: string;
  primaryColor?: string;
}

export const proposalIdentity: ProposalIdentity = {
  name: "Sua Marcenaria",
  primaryColor: "#48382e",
};

export interface ProposalData {
  config: FurnitureConfig;
  price: PriceBreakdown;
  code: string;
  date: Date;
  customer?: { name?: string; phone?: string; email?: string; city?: string };
  conditions: {
    prazo?: string;
    validade?: string;
    pagamento?: string;
    observacoes?: string;
  };
  identity?: ProposalIdentity;
  image?: string;
}

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export async function createProposalPdf(data: ProposalData) {
  // Carregada somente quando a proposta é solicitada; não pesa no 3D inicial.
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const cfg = data.config;
  const identity = data.identity ?? proposalIdentity;
  const accent =
    identity.primaryColor && /^#[0-9a-f]{6}$/i.test(identity.primaryColor)
      ? identity.primaryColor
      : "#48382e";
  const rgb = (hex: string): [number, number, number] =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  const [r, g, b] = rgb(accent);
  let y = 21;
  const left = 23;
  const right = 187;
  const bottom = 275;

  const page = () => {
    pdf.addPage();
    y = 25;
  };
  const ensure = (height: number) => {
    if (y + height > bottom) page();
  };
  const label = (value: string, x = left, at = y) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(122, 115, 108);
    pdf.text(value.toUpperCase(), x, at);
  };
  const section = (title: string, minimumSpace = 23) => {
    ensure(minimumSpace);
    y += 12;
    pdf.setDrawColor(222, 216, 208);
    pdf.line(left, y - 7, right, y - 7);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(r, g, b);
    pdf.text(title.toUpperCase(), left, y);
    y += 11;
  };
  const row = (name: string, value: string) => {
    if (!value) return;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    const lines = pdf.splitTextToSize(value, 98) as string[];
    ensure(Math.max(8, lines.length * 5 + 2));
    label(name, left, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(45, 40, 37);
    pdf.text(lines, 89, y);
    y += Math.max(8, lines.length * 5 + 2);
  };

  pdf.setFillColor(r, g, b);
  pdf.rect(0, 0, 210, 5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(r, g, b);
  pdf.text(identity.name || "Sua Marcenaria", left, y);
  y += 22;
  label("Projeto sob medida");
  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(25);
  pdf.setTextColor(34, 29, 27);
  pdf.text("PROPOSTA COMERCIAL", left, y);
  y += 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 94, 88);
  pdf.text(`${data.code}   •   ${data.date.toLocaleDateString("pt-BR")}`, left, y);
  y += 8;
  if (data.customer?.name) row("Cliente", data.customer.name);

  section("Projeto");
  row("Móvel", typeDef(cfg.type).label);
  row("Largura", `${cfg.width} cm`);
  row("Altura", `${cfg.height} cm`);
  row("Profundidade", `${cfg.depth} cm`);
  if (cfg.roomItems?.length) {
    row("Móveis no cômodo", String(cfg.roomItems.length + 1));
    for (const item of cfg.roomItems) {
      row(
        typeDef(item.config.type).label,
        `${item.config.width} × ${item.config.height} × ${item.config.depth} cm · ${material(item.config.material).label}`,
      );
    }
  }
  if (data.image?.startsWith("data:image/")) {
    ensure(75);
    try {
      const properties = pdf.getImageProperties(data.image);
      const width = Math.min(164, (68 * properties.width) / properties.height);
      const height = Math.min(68, (164 * properties.height) / properties.width);
      pdf.addImage(
        data.image,
        "PNG",
        left + (164 - width) / 2,
        y + 1,
        width,
        height,
        undefined,
        "FAST",
      );
      y += 75;
    } catch {
      /* Uma captura inválida não deve impedir a proposta. */
    }
  }

  section("Configuração");
  row("Módulos", String(cfg.columns));
  if (cfg.doors)
    row(
      "Portas",
      `${cfg.doors} · ${cfg.doorStyle}${cfg.doorFace !== "padrao" ? ` · ${cfg.doorFace}` : ""}`,
    );
  if (cfg.drawers)
    row("Gavetas", `${cfg.drawers}${cfg.drawerGlassFront ? " · frente em vidro" : ""}`);
  if (cfg.shelves)
    row("Prateleiras", `${cfg.shelves}${cfg.shelfMaterial === "vidro" ? " · vidro" : ""}`);
  if (cfg.componentInstances?.length)
    row(
      "Componentes adicionados",
      cfg.componentInstances
        .map((instance) => componentDef(instance.type)?.label ?? instance.type)
        .join(", "),
    );
  const groups = (["estrutura", "portas", "interior", "fundo"] as const)
    .filter((key) => cfg.materials?.[key])
    .map((key) => `${key}: ${material(cfg.materials[key]).label}`);
  row("Materiais / acabamento", groups.length ? groups.join("; ") : material(cfg.material).label);
  if (cfg.doors && cfg.handle.model !== "nenhum") {
    row(
      "Puxadores",
      `${HANDLE_MODELS.find((m) => m.id === cfg.handle.model)?.label ?? cfg.handle.model} · ${HANDLE_FINISHES.find((f) => f.id === cfg.handle.finish)?.label ?? cfg.handle.finish}`,
    );
  }
  if (cfg.accessories?.length)
    row(
      "Acessórios",
      cfg.accessories.map((id) => ACCESSORIES.find((a) => a.id === id)?.label ?? id).join(", "),
    );
  if (cfg.mirror || cfg.mirrorInside || cfg.doorFace === "espelho")
    row(
      "Espelho",
      [
        cfg.mirror && "externo",
        cfg.mirrorInside && "interno",
        cfg.doorFace === "espelho" && "nas portas",
      ]
        .filter(Boolean)
        .join(", "),
    );
  if (cfg.doorFace === "vidro") row("Vidro", "Portas com vidro");
  if (cfg.led?.on) row("LED", "Iluminação integrada");

  section("Orçamento", 125);
  const costs: [string, number][] = [
    ["MDF", data.price.mdf],
    ["Portas", data.price.portas],
    ["Gavetas", data.price.gavetas],
    ["Ferragens", data.price.ferragens],
    ["Espelho", data.price.espelho],
    ["Vidro", data.price.vidro],
    ["Acessórios", data.price.acessorios],
    ["Iluminação", data.price.iluminacao],
    ["Mão de obra", data.price.maoDeObra],
    ["Montagem", data.price.montagem],
  ];
  for (const [name, value] of costs) if (value > 0) row(name, money(value));
  ensure(29);
  y += 5;
  pdf.setFillColor(r, g, b);
  pdf.roundedRect(left, y, right - left, 24, 2, 2, "F");
  pdf.setTextColor(241, 234, 224);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("VALOR ESTIMADO", left + 6, y + 9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(money(data.price.total), right - 6, y + 16, { align: "right" });
  y += 27;

  section("Condições");
  row("Prazo", data.conditions.prazo?.trim() || "A definir");
  row("Validade", data.conditions.validade?.trim() || "A definir");
  row("Pagamento", data.conditions.pagamento?.trim() || "A definir");
  row("Observações", data.conditions.observacoes?.trim() || "Nenhuma observação informada");

  const contact = [identity.phone, identity.whatsapp, identity.address, identity.instagram]
    .filter(Boolean)
    .join("   •   ");
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(222, 216, 208);
    pdf.line(left, 285, right, 285);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(122, 115, 108);
    pdf.text(contact || identity.name || "Sua Marcenaria", left, 290);
    pdf.text(`${i} / ${pages}`, right, 290, { align: "right" });
  }
  return pdf;
}
