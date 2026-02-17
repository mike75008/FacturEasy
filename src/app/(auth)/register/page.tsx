"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Building2, UserPlus } from "lucide-react";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumInput } from "@/components/premium/premium-input";
import { PremiumButton } from "@/components/premium/premium-button";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
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
          Créer un compte
        </h2>
        <p className="text-atlantic-200/60 text-center text-sm font-sans mb-8">
          Démarrez votre facturation intelligente
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <PremiumInput
            label="Nom complet"
            type="text"
            placeholder="Jean Dupont"
            value={formData.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            icon={<User className="w-4 h-4" />}
            required
          />

          <PremiumInput
            label="Nom de l'entreprise"
            type="text"
            placeholder="Ma Société SAS"
            value={formData.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
            icon={<Building2 className="w-4 h-4" />}
            required
          />

          <PremiumInput
            label="Email"
            type="email"
            placeholder="votre@email.com"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          <PremiumInput
            label="Mot de passe"
            type="password"
            placeholder="Minimum 8 caractères"
            value={formData.password}
            onChange={(e) => updateField("password", e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          <PremiumInput
            label="Confirmer le mot de passe"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            icon={<Lock className="w-4 h-4" />}
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
            icon={<UserPlus className="w-4 h-4" />}
            className="w-full"
          >
            Créer mon compte
          </PremiumButton>
        </form>

        <p className="mt-6 text-center text-sm font-sans text-atlantic-200/50">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-gold-400 hover:text-gold-300 transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </PremiumCard>
  );
}
