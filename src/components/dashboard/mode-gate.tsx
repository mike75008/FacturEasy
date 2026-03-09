"use client";

import { createContext, useContext, useState } from "react";
import { useAppContext } from "@/lib/context/app-context";
import type { AppMode } from "@/lib/context/app-context";
import { Lock } from "lucide-react";

interface ModeGateProps {
  children: React.ReactNode;
  requiredMode: AppMode;        // mode minimum pour accéder
  featureName: string;          // nom de la fonctionnalité
  samMessage: string;           // ce que Sam dit avec les données réelles
  benefits: string[];           // ce que l'utilisateur gagne en passant au plan supérieur
}

const MODE_LABELS: Record<AppMode, string> = {
  decouverte: "Découverte",
  intermediaire: "Pro",
  expert: "Expert",
};

const MODE_ORDER: Record<AppMode, number> = {
  decouverte: 0,
  intermediaire: 1,
  expert: 2,
};

// Contexte pour signaler aux composants enfants qu'ils sont en mode aperçu
interface ModePreviewValue {
  isPreview: boolean;
}

const ModePreviewContext = createContext<ModePreviewValue>({ isPreview: false });

export function useModePreview() {
  return useContext(ModePreviewContext);
}

export function ModeGate({ children, requiredMode, featureName, samMessage, benefits }: ModeGateProps) {
  const { appMode } = useAppContext();
  const [showPreview, setShowPreview] = useState(false);

  const hasAccess = MODE_ORDER[appMode] >= MODE_ORDER[requiredMode];

  // Accès réel → enfants normaux, sans contexte preview
  if (hasAccess) return <>{children}</>;

  const targetLabel = MODE_LABELS[requiredMode];

  // Mode aperçu : le contenu est visible mais les actions sont verrouillées
  if (showPreview) {
    return (
      <ModePreviewContext.Provider value={{ isPreview: true }}>
        {/* Bandeau aperçu fixe en haut */}
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 bg-atlantic-900/95 backdrop-blur-md border-b border-gold-400/20">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-gold-400/70" />
            <p className="text-xs font-sans text-atlantic-200/60">
              Aperçu <span className="text-gold-400 font-semibold">{featureName}</span> — Plan {targetLabel} requis pour créer ou modifier
            </p>
          </div>
          <button
            onClick={() => setShowPreview(false)}
            className="text-[10px] font-sans text-atlantic-200/40 hover:text-atlantic-200/70 transition-colors"
          >
            ← Retour
          </button>
        </div>
        {children}
      </ModePreviewContext.Provider>
    );
  }

  // Écran de verrouillage par défaut
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center max-w-lg mx-auto">

      {/* Sam parle en premier */}
      <div className="w-full rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 mb-8 text-left">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-display font-bold text-amber-300 text-sm flex-shrink-0">
            S
          </div>
          <p className="text-xs font-sans font-bold text-amber-300">Sam</p>
        </div>
        <p className="text-sm font-sans text-white leading-relaxed">{samMessage}</p>
      </div>

      {/* Ce que tu gagnes */}
      <div className="w-full rounded-xl border border-gold-400/10 bg-atlantic-800/20 p-5 mb-6 text-left">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-gold-400/60" />
          <p className="text-xs font-sans font-semibold text-white">
            {featureName} — disponible en plan <span className="text-gold-400">{targetLabel}</span>
          </p>
        </div>
        <ul className="space-y-2">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs font-sans text-atlantic-200/60">
              <span className="text-gold-400 mt-0.5 flex-shrink-0">→</span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Aperçu sans actions */}
      <button
        onClick={() => setShowPreview(true)}
        className="w-full py-3 rounded-xl bg-gold-400/10 border border-gold-400/20 text-gold-400 text-sm font-sans font-semibold hover:bg-gold-400/20 transition-all mb-3"
      >
        Voir un aperçu →
      </button>
      <p className="text-[10px] font-sans text-atlantic-200/30">
        Mode aperçu — les actions restent verrouillées jusqu&apos;au passage en plan {targetLabel}
      </p>
    </div>
  );
}
