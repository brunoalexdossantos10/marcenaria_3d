import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TenantConfig } from "./api";
import { setLocalProjectOwner } from "@/lib/furniture/store";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
}>({
  user: null,
  loading: true,
  error: "",
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError("Supabase não configurado.");
      return;
    }
    let live = true;
    let authRevision = 0;
    supabase.auth
      .getUser()
      .then(({ data, error: authError }) => {
        if (!live || authRevision !== 0) return;
        setLocalProjectOwner(data.user?.id ?? null);
        setUser(data.user);
        setLoading(false);
        if (authError && authError.name !== "AuthSessionMissingError") setError(authError.message);
      })
      .catch((err) => {
        if (live && authRevision === 0) {
          setLoading(false);
          setError(String(err));
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION") authRevision++;
      if (event === "SIGNED_OUT") qc.clear();
      setLocalProjectOwner(session?.user.id ?? null);
      setUser(session?.user ?? null);
      setLoading(false);
      setError("");
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, [qc]);
  return <AuthContext.Provider value={{ user, loading, error }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
export const TenantContext = createContext<TenantConfig | null>(null);
export const useTenant = () => useContext(TenantContext);
export function tenantOptions<T extends { id: string; label: string }>(
  defaults: T[],
  tenant: TenantConfig | null,
  kind: "model" | "material" | "handle" | "accessory",
): T[] {
  const entries = tenant?.catalog.filter((entry) => entry.kind === kind) ?? [];
  if (!entries.length) return defaults;
  return defaults.flatMap((def) => {
    const entry = entries.find((e) => e.source_id === def.id);
    return entry?.active ? [{ ...def, label: entry.name }] : [];
  });
}
