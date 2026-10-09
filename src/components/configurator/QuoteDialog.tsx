import { apiError } from "@/lib/saas/api";
import { useTenant } from "@/lib/saas/context";
import { submitQuote } from "@/lib/saas/api";
import { useState } from "react";
import { X, Check, Download } from "lucide-react";
import type { Configurator, SavedProject } from "@/lib/furniture/store";
import { nextProjectCode, persistProject } from "@/lib/furniture/store";
import { typeDef } from "@/lib/furniture/types";
import { material } from "@/lib/furniture/materials";
import { brl } from "@/lib/furniture/pricing";

type Step = "form" | "resumo" | "enviado";

export function QuoteDialog({
  c,
  onClose,
  captureImage,
}: {
  c: Configurator;
  onClose: () => void;
  captureImage?: () => string | null;
}) {
  const tenant = useTenant();
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    notes: "",
  });
  const [code, setCode] = useState("");
  const [saveError, setSaveError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [pdfSuccess, setPdfSuccess] = useState("");
  const [generating, setGenerating] = useState(false);
  const [proposalCode] = useState(nextProjectCode);
  const [conditions, setConditions] = useState({
    prazo: "",
    validade: "",
    pagamento: "",
    observacoes: "",
  });

  const downloadProposal = async () => {
    setGenerating(true);
    setPdfError("");
    setPdfSuccess("");
    try {
      const { createProposalPdf } = await import("@/lib/furniture/proposalPdf");
      const image = captureImage?.();
      const pdf = await createProposalPdf({
        ...(tenant
          ? {
              identity: {
                name: tenant.organization.name,
                primaryColor: tenant.organization.primary_color,
                ...(tenant.organization.logo ? { logo: tenant.organization.logo } : {}),
                ...(tenant.organization.phone ? { phone: tenant.organization.phone } : {}),
                ...(tenant.organization.whatsapp ? { whatsapp: tenant.organization.whatsapp } : {}),
              },
            }
          : {}),
        config: c.config,
        price: c.price,
        code: code || proposalCode,
        date: new Date(),
        customer: form,
        conditions: {
          ...conditions,
          observacoes: conditions.observacoes || form.notes,
        },
        ...(image ? { image } : {}),
      });
      pdf.save(`proposta-${(code || proposalCode).toLowerCase().replace(/[^a-z0-9-]/g, "-")}.pdf`);
      setPdfSuccess("Proposta gerada. O download do PDF foi iniciado.");
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
    } finally {
      setGenerating(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        required={Boolean(tenant) && (key === "name" || key === "phone")}
        minLength={key === "name" ? 2 : key === "phone" ? 8 : undefined}
        maxLength={key === "name" || key === "city" ? 120 : key === "phone" ? 30 : 254}
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="h-11 w-full rounded-lg border border-border bg-card px-3 outline-none focus:border-ring"
      />
    </label>
  );

  const send = async () => {
    const project: SavedProject = {
      id: crypto.randomUUID(),
      code: proposalCode,
      createdAt: new Date().toISOString(),
      config: c.config,
      price: c.price.total,
      customer: form,
      status: "Orçamento",
    };
    setSending(true);
    setSaveError("");
    try {
      if (tenant) {
        const result = await submitQuote(tenant, c.config, form, proposalCode);
        setCode(result.code);
        setStep("enviado");
        return;
      }
      await persistProject(project);
      setCode(project.code);
      setStep("enviado");
    } catch (error) {
      setSaveError(apiError(error));
    } finally {
      setSending(false);
    }
  };

  const summary = [
    ["Tipo", typeDef(c.config.type).label],
    ["Móveis no cômodo", String(1 + (c.config.roomItems?.length ?? 0))],
    ["Dimensões", `${c.config.width} × ${c.config.height} × ${c.config.depth} cm`],
    ["Material", material(c.config.material).label],
    ["Portas", String(c.config.doors)],
    ["Gavetas", String(c.config.drawers)],
    ["Prateleiras", String(c.config.shelves)],
    ["Preço estimado", brl(c.price.total)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-background p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-display text-2xl">
            {step === "form"
              ? "Solicitar orçamento"
              : step === "resumo"
                ? "Seu projeto"
                : "Projeto enviado"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="step-btn">
            <X className="size-4" />
          </button>
        </div>

        {step === "form" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("resumo");
            }}
          >
            {field("name", "Nome")}
            {field("phone", "Telefone", "tel")}
            {field("email", "E-mail", "email")}
            {field("city", "Cidade")}
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Observações
              </span>
              <textarea
                rows={3}
                maxLength={3000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-border bg-card p-3 outline-none focus:border-ring"
              />
            </label>
            <button type="submit" className="btn-primary w-full">
              Ver resumo do projeto
            </button>
            {pdfError && (
              <p role="alert" className="text-sm text-destructive">
                {pdfError}
              </p>
            )}
            {pdfSuccess && (
              <p role="status" className="text-sm text-primary">
                {pdfSuccess}
              </p>
            )}
            <button
              type="button"
              onClick={downloadProposal}
              disabled={generating}
              className="btn-ghost flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="size-4" /> {generating ? "Gerando PDF…" : "Gerar proposta PDF"}
            </button>
          </form>
        )}

        {step === "resumo" && (
          <div className="space-y-4">
            <dl className="divide-y divide-border rounded-xl border border-border bg-card">
              {summary.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Condições da proposta</h3>
              <p className="text-xs text-muted-foreground">
                Campos em branco aparecem como “A definir” no PDF.
              </p>
              {(
                [
                  ["prazo", "Prazo"],
                  ["validade", "Validade"],
                  ["pagamento", "Forma de pagamento"],
                ] as const
              ).map(([key, title]) => (
                <label key={key} className="block text-xs text-muted-foreground">
                  {title}
                  <input
                    value={conditions[key]}
                    onChange={(e) => setConditions({ ...conditions, [key]: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring"
                  />
                </label>
              ))}
              <label className="block text-xs text-muted-foreground">
                Observações
                <textarea
                  rows={2}
                  value={conditions.observacoes}
                  onChange={(e) =>
                    setConditions({
                      ...conditions,
                      observacoes: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-ring"
                />
              </label>
            </div>
            {pdfError && (
              <p role="alert" className="text-sm text-destructive">
                {pdfError}
              </p>
            )}
            {pdfSuccess && (
              <p role="status" className="text-sm text-primary">
                {pdfSuccess}
              </p>
            )}
            <button
              type="button"
              onClick={downloadProposal}
              disabled={generating}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="size-4" /> {generating ? "Gerando PDF…" : "Gerar proposta PDF"}
            </button>
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}
            <button type="button" onClick={send} disabled={sending} className="btn-primary w-full">
              {sending
                ? "Enviando…"
                : tenant
                  ? "Enviar orçamento à marcenaria"
                  : "Salvar solicitação de orçamento"}
            </button>
            <button type="button" onClick={() => setStep("form")} className="btn-ghost w-full">
              Voltar
            </button>
          </div>
        )}

        {step === "enviado" && (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
              <Check className="size-7" />
            </span>
            <p className="text-sm text-muted-foreground">
              Seu projeto <strong className="text-foreground">{code}</strong>{" "}
              {tenant
                ? "foi enviado à marcenaria com sua configuração e contato."
                : "foi salvo. A solicitação ainda não foi enviada à marcenaria."}
            </p>
            {tenant?.organization.whatsapp && (
              <a
                className="btn-ghost inline-flex w-full justify-center"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${tenant.organization.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Enviei o projeto ${code} e gostaria de conversar sobre o orçamento.`)}`}
              >
                Conversar no WhatsApp
              </a>
            )}
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Continuar editando
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuoteDialog;
