"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumInput } from "@/components/premium/premium-input";
import { PremiumButton } from "@/components/premium/premium-button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <PremiumCard glow>
      <div>
        <h2 className="text-2xl font-display font-bold text-center mb-2">
          Mot de passe oublié
        </h2>
        <p className="text-atlantic-200/60 text-center text-sm font-sans mb-8">
          Recevez un lien de réinitialisation par email
        </p>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold-400/20 flex items-center justify-center mx-auto">
              <Send className="w-8 h-8 text-gold-400" />
            </div>
            <p className="text-white font-sans">
              Un email de réinitialisation a été envoyé à{" "}
              <span className="text-gold-400 font-medium">{email}</span>
            </p>
            <p className="text-atlantic-200/50 text-sm font-sans">
              Vérifiez également vos spams
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <PremiumInput
              label="Email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
            />
            {error && <p className="text-red-400 text-sm font-sans text-center">{error}</p>}
            <PremiumButton type="submit" loading={loading} icon={<Send className="w-4 h-4" />} className="w-full">
              Envoyer le lien
            </PremiumButton>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-gold-400/70 hover:text-gold-400 transition-colors text-sm font-sans inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour à la connexion
          </Link>
        </div>
      </div>
    </PremiumCard>
  );
}
