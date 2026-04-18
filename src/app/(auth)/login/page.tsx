"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, LogIn } from "lucide-react";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumInput } from "@/components/premium/premium-input";
import { PremiumButton } from "@/components/premium/premium-button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      const msg = authError.message.includes("Invalid login credentials")
        ? "Email ou mot de passe incorrect"
        : authError.message.includes("Email not confirmed")
        ? "Confirmez votre email avant de vous connecter"
        : authError.message;
      setError(msg);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <PremiumCard glow>
      <div>
        <h2 className="text-2xl font-display font-bold text-center mb-2">
          Connexion
        </h2>
        <p className="text-atlantic-200/60 text-center text-sm font-sans mb-8">
          Accédez à votre espace de facturation
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <PremiumInput
            label="Email"
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />
          <PremiumInput
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          {error && (
            <p className="text-red-400 text-sm font-sans text-center">{error}</p>
          )}

          <PremiumButton
            type="submit"
            loading={loading}
            icon={<LogIn className="w-4 h-4" />}
            className="w-full"
          >
            Se connecter
          </PremiumButton>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm font-sans">
          <Link href="/forgot-password" className="text-gold-400/70 hover:text-gold-400 transition-colors block">
            Mot de passe oublié ?
          </Link>
          <p className="text-atlantic-200/50">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-gold-400 hover:text-gold-300 transition-colors">
              Créer un compte
            </Link>
          </p>
          <Link href="/demo" className="text-atlantic-200/30 hover:text-atlantic-200/60 transition-colors block pt-1">
            Voir la démo →
          </Link>
        </div>
      </div>
    </PremiumCard>
  );
}
