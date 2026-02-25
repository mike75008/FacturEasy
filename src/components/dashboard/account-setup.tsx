"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Promesse globale de setup ────────────────────────────────────────────────
// Permet aux autres composants d'attendre que le compte soit prêt avant
// d'effectuer des opérations Supabase qui dépendent de public.users.

let _resolveSetup: () => void;

export const accountSetupReady: Promise<void> = new Promise((resolve) => {
  _resolveSetup = resolve;
});

// ─── Composant ────────────────────────────────────────────────────────────────

export function AccountSetup() {
  useEffect(() => {
    async function setup() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Pas de session : on résout quand même pour ne pas bloquer indéfiniment
        _resolveSetup();
        return;
      }

      const user = session.user;

      // Vérifier d'abord si la ligne existe déjà pour éviter un appel inutile
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (existingUser) {
        // La ligne existe déjà — setup déjà effectué
        _resolveSetup();
        return;
      }

      // La ligne n'existe pas : appel de setup_new_account et ATTENTE du résultat
      const { error } = await supabase.rpc("setup_new_account", {
        p_auth_id: user.id,
        p_email: user.email ?? "",
        p_full_name: user.user_metadata?.full_name ?? user.email ?? "",
        p_company_name: user.user_metadata?.company_name ?? "Mon Entreprise",
      });

      if (error) {
        console.error("[AccountSetup] erreur setup_new_account:", error.message, error);
        // On résout malgré l'erreur pour ne pas bloquer l'UI indéfiniment.
        // La logique de retry dans data.ts prendra le relais si nécessaire.
        _resolveSetup();
      } else {
        console.log("[AccountSetup] setup_new_account terminé avec succès");
        _resolveSetup();
      }
    }

    setup().catch((err) => {
      console.error("[AccountSetup] erreur inattendue:", err);
      _resolveSetup(); // résoudre quand même pour ne pas bloquer l'UI
    });
  }, []);

  return null;
}
