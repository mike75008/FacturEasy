"use client";

import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PageTransition } from "@/components/premium/page-transition";
import { MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function MessagesPage() {
  return (
    <PageTransition>
      <div className="flex flex-col h-screen">
        <Topbar
          title="Messages"
          subtitle="Canal de communication"
        />

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-6">

            {/* Illustration */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-3xl bg-atlantic-800/60 border border-gold-400/10 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-gold-400/40" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center space-y-2">
              <h2 className="text-lg font-sans font-bold text-white">Messagerie client</h2>
              <p className="text-sm font-sans text-atlantic-200/50 leading-relaxed">
                Ce canal sera dédié à la communication directe avec tes clients —
                devis commentés, demandes, échanges en temps réel.
              </p>
              <p className="text-xs font-sans text-atlantic-200/30">
                En cours de développement.
              </p>
            </div>

            {/* Lien vers support si besoin */}
            <GlassCard hover={false}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-sans font-semibold text-white mb-0.5">
                    Tickets support
                  </p>
                  <p className="text-[10px] font-sans text-atlantic-200/40">
                    Les incidents Helena sont dans la section Support
                  </p>
                </div>
                <Link
                  href="/support"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-400/10 text-violet-300 hover:bg-violet-400/20 text-[11px] font-sans font-medium transition-all flex-shrink-0"
                >
                  Support
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </GlassCard>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
