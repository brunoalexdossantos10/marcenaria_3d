import { apiError } from "@/lib/saas/api";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { client, createOrganization, slugify } from "@/lib/saas/api";
import { useAuth } from "@/lib/saas/context";
export function AuthPage({ mode }: { mode: "login" | "cadastro" | "recuperar" | "senha" }) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    slug: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();
  useEffect(() => {
    if (auth.user && mode === "login") void navigate({ to: "/dashboard" });
  }, [auth.user, mode, navigate]);
  const title = {
    login: "Bem-vindo de volta.",
    cadastro: "Seu próximo projeto começa aqui.",
    recuperar: "Recupere seu acesso.",
    senha: "Defina sua nova senha.",
  }[mode];
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label className="block text-sm">
      {label}
      <input
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4"
        type={type}
        required
        minLength={key === "password" ? 8 : key === "slug" ? 3 : 2}
        maxLength={key === "slug" ? 64 : 254}
        autoComplete={
          key === "password"
            ? mode === "login"
              ? "current-password"
              : "new-password"
            : key === "email"
              ? "email"
              : undefined
        }
        value={form[key]}
        onChange={(e) =>
          setForm({
            ...form,
            [key]: e.target.value,
            ...(key === "company" ? { slug: slugify(e.target.value) } : {}),
          })
        }
      />
    </label>
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const c = client();
      if (mode === "cadastro") {
        const { data, error } = await c.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${location.origin}/dashboard`,
            data: {
              name: form.name,
              company: form.company,
              company_slug: form.slug,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          await createOrganization(form.company, form.slug, form.name);
          await navigate({ to: "/dashboard" });
        } else
          setMessage(
            "Confirme seu e-mail para entrar. Depois da confirmação, conclua a criação da marcenaria no painel.",
          );
      } else if (mode === "login") {
        const { error } = await c.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        await navigate({ to: "/dashboard" });
      } else if (mode === "recuperar") {
        const { error } = await c.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${location.origin}/nova-senha`,
        });
        if (error) throw error;
        setMessage(
          "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.",
        );
      } else {
        if (!auth.user) throw new Error("Abra o link de recuperação enviado ao seu e-mail.");
        const { error } = await c.auth.updateUser({ password: form.password });
        if (error) throw error;
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-[#252e2b] p-14 text-[#f5f1e9] lg:flex">
        <Link to="/" className="text-xl font-semibold tracking-tight">
          Modelador 3D<span className="text-[#bca787]"> /</span>
        </Link>
        <div>
          <p className="mb-5 text-xs uppercase tracking-[.25em] text-[#bca787]">
            Da ideia ao móvel
          </p>
          <h2 className="font-display text-5xl leading-tight">
            Sua marcenaria.
            <br />
            Uma nova dimensão.
          </h2>
          <p className="mt-6 max-w-sm text-white/60">
            O configurador que aproxima seus clientes do próximo projeto.
          </p>
        </div>
        <span className="text-xs text-white/40">Catálogo · Projetos · Experiência 3D</span>
      </aside>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm font-semibold">
            Modelador 3D
          </Link>
          <h1 className="mb-8 mt-8 font-display text-3xl">{title}</h1>
          <form onSubmit={submit} className="space-y-5">
            {mode === "cadastro" && (
              <>
                {field("name", "Seu nome")}
                {field("company", "Nome da marcenaria")}
                {field("slug", "Endereço do configurador: /m/")}
              </>
            )}
            {mode !== "senha" && field("email", "E-mail", "email")}
            {mode !== "recuperar" && field("password", "Senha", "password")}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-sm text-primary">
                {message}
              </p>
            )}
            <button disabled={busy} className="btn-primary w-full disabled:opacity-50">
              {busy
                ? "Aguarde…"
                : {
                    login: "Entrar",
                    cadastro: "Criar minha conta",
                    recuperar: "Enviar link",
                    senha: "Salvar senha",
                  }[mode]}
            </button>
          </form>
          {mode === "login" && (
            <>
              <Link to="/recuperar-senha" className="mt-4 block text-center text-sm">
                Esqueci minha senha
              </Link>
              <button
                className="btn-ghost mt-5 w-full"
                onClick={async () => {
                  try {
                    const { error } = await client().auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: `${location.origin}/dashboard` },
                    });
                    if (error) throw error;
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Google indisponível.");
                  }
                }}
              >
                Continuar com Google
              </button>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Ainda não possui conta?{" "}
                <Link to="/cadastro" className="text-primary">
                  Criar conta
                </Link>
              </p>
            </>
          )}
          {mode !== "login" && (
            <Link to="/login" className="mt-6 block text-center text-sm">
              Voltar para o login
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
