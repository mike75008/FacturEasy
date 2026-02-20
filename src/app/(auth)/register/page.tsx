"use client";

import { useState } from "react";
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

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
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
      setLoading(false);
      return;
    }

    // Compte créé — avec ou sans confirmation email on entre
    if (data.user) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setError("Vérifiez votre email pour confirmer votre compte");
    setLoading(false);
  }

  return (
    <PremiumCard glow>
      <div>
        <h2 className="text-2xl font-display font-bold text-center mb-2">
          Créer un compte
        </h2>
        <p className="text-atlantic-200/60 text-center text-sm font-sans mb-8">
          Démarrez votre facturation intelligente
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <PremiumInput label="Nom complet" type="text" placeholder="Jean Dupont" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} icon={<User className="w-4 h-4" />} required />
          <PremiumInput label="Nom de l'entreprise" type="text" placeholder="Ma Société SAS" value={formData.companyName} onChange={(e) => updateField("companyName", e.target.value)} icon={<Building2 className="w-4 h-4" />} required />
          <PremiumInput label="Email" type="email" placeholder="votre@email.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} icon={<Mail className="w-4 h-4" />} required />
          <PremiumInput label="Mot de passe" type="password" placeholder="Minimum 8 caractères" value={formData.password} onChange={(e) => updateField("password", e.target.value)} icon={<Lock className="w-4 h-4" />} required />
          <PremiumInput label="Confirmer le mot de passe" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} icon={<Lock className="w-4 h-4" />} required />

          {error && <p className="text-red-400 text-sm font-sans text-center">{error}</p>}

          <PremiumButton type="submit" loading={loading} icon={<UserPlus className="w-4 h-4" />} className="w-full">
            Créer mon compte
          </PremiumButton>
        </form>

        <p className="mt-6 text-center text-sm font-sans text-atlantic-200/50">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-gold-400 hover:text-gold-300 transition-colors">Se connecter</Link>
        </p>
      </div>
    </PremiumCard>
  );
}
