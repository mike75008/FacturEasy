"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as AppUser } from "@/types/database";
import type { User as AuthUser } from "@supabase/supabase-js";

interface UseUserReturn {
  authUser: AuthUser | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
}

export function useUser(): UseUserReturn {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setLoading(false);
          return;
        }

        setAuthUser(user);

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        if (profileError) {
          setError(profileError.message);
        } else {
          setAppUser(profile);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return { authUser, appUser, loading, error };
}
