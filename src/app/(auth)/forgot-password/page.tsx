"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumInput } from "@/components/premium/premium-input";
import { PremiumButton } from "@/components/premium/premium-button";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumCard glow>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-display font-bold text-center mb-2">
          Mot de passe oublié
        </h2>
        <p className="text-atlantic-200/60 text-center text-sm font-sans mb-8">
          Recevez un lien de réinitialisation par email
        </p>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
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
          </motion.div>
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

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-sm font-sans text-center"
              >
                {error}
              </motion.p>
            )}

            <PremiumButton
              type="submit"
              loading={loading}
              icon={<Send className="w-4 h-4" />}
              className="w-full"
            >
              Envoyer le lien
            </PremiumButton>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-gold-400/70 hover:text-gold-400 transition-colors text-sm font-sans inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </PremiumCard>
  );
}
