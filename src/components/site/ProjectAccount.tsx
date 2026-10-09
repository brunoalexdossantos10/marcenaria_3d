import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function ProjectAccount({ onChange }: { onChange: () => void }) {
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setSignedIn(data.user?.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session?.user.email ?? null);
      onChange();
    });
    return () => subscription.unsubscribe();
  }, [onChange]);

  if (!supabase)
    return (
      <p className="text-sm text-destructive">
        O banco de dados ainda não foi configurado neste ambiente.
      </p>
    );
  const client = supabase;

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-5">
      {signedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Conectado como <strong>{signedIn}</strong>. Seus novos projetos são salvos na sua conta.
          </p>
          <button
            type="button"
            className="chip"
            onClick={async () => {
              await client.auth.signOut();
              setMessage("");
            }}
          >
            Sair
          </button>
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setMessage("");
            const { error } = await client.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo: `${window.location.origin}/meus-projetos`,
              },
            });
            setMessage(error ? error.message : "Enviamos um link de acesso para seu e-mail.");
            setBusy(false);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="min-w-56 flex-1 text-sm">
            Acesse seus projetos em qualquer dispositivo
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3"
            />
          </label>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Enviando…" : "Entrar por e-mail"}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
