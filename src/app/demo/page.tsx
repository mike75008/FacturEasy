"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileText, Bell, CheckCircle2, ArrowRight, Sparkles,
  TrendingUp, Clock, Shield, ChevronRight,
} from "lucide-react";

// ─── Simulation live ──────────────────────────────────────────────────────────

const EVENTS = [
  { delay: 1200,  type: "facture",    text: "Facture #2024-089 générée",          amount: "2 400 €",  color: "text-gold-400" },
  { delay: 3500,  type: "relance",    text: "Relance automatique envoyée",         amount: "J+15",     color: "text-blue-400" },
  { delay: 6000,  type: "paiement",   text: "Paiement reçu · encaissé",            amount: "2 400 €",  color: "text-green-400" },
  { delay: 8800,  type: "declaration",text: "TVA du mois calculée",                amount: "480 €",    color: "text-amber-400" },
  { delay: 11500, type: "alerte",     text: "Déclaration URSSAF dans 4 jours",     amount: "847 €",    color: "text-red-400" },
  { delay: 14000, type: "facture",    text: "Devis #2024-090 envoyé au client",    amount: "5 100 €",  color: "text-gold-400" },
  { delay: 17000, type: "paiement",   text: "Devis accepté · converti en facture", amount: "5 100 €",  color: "text-green-400" },
];

const SAM_MESSAGES = [
  { delay: 2000,  text: "Ta facture vient de partir. La relance est déjà programmée si besoin." },
  { delay: 7000,  text: "Paiement encaissé. J'ai mis à jour ta comptabilité." },
  { delay: 12000, text: "Ta déclaration URSSAF arrive dans 4 jours. J'ai tout préparé — tu valides en 30 secondes." },
  { delay: 18000, text: "En un mois : 3 documents générés, 2 relances évitées, 0 déclaration manquée." },
];

// ─── Composants ───────────────────────────────────────────────────────────────

function LiveEvent({ text, amount, color }: { text: string; amount: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className={`w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")}`} />
        <span className="text-sm font-sans text-white/70">{text}</span>
      </div>
      <span className={`text-sm font-sans font-semibold ${color}`}>{amount}</span>
    </div>
  );
}

function SamBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-gold-400" />
      </div>
      <div className="flex-1 p-3 rounded-xl bg-gold-400/5 border border-gold-400/10">
        <p className="text-sm font-sans text-white/80 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [events, setEvents]       = useState<typeof EVENTS>([]);
  const [samMsgs, setSamMsgs]     = useState<typeof SAM_MESSAGES>([]);
  const [showCTA, setShowCTA]     = useState(false);
  const [started, setStarted]     = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const timers  = useRef<ReturnType<typeof setTimeout>[]>([]);

  function startDemo() {
    setStarted(true);
    setEvents([]);
    setSamMsgs([]);
    setShowCTA(false);

    EVENTS.forEach(ev => {
      timers.current.push(setTimeout(() => {
        setEvents(prev => [...prev, ev]);
        feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
      }, ev.delay));
    });

    SAM_MESSAGES.forEach(msg => {
      timers.current.push(setTimeout(() => {
        setSamMsgs(prev => [...prev, msg]);
      }, msg.delay));
    });

    timers.current.push(setTimeout(() => setShowCTA(true), 20000));
  }

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <h1 className="font-display text-xl font-bold">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">Factur</span>
          <span className="text-white">Easy</span>
        </h1>
        <Link
          href="/register"
          className="text-sm font-sans font-medium text-white/50 hover:text-white transition-colors"
        >
          Créer mon compte
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        {/* Headline */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold leading-tight">
            Regarde ce qui se passe<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">
              pendant que tu travailles.
            </span>
          </h2>
          <p className="text-base font-sans text-white/40 max-w-md mx-auto">
            Facturation, relances, déclarations — en temps réel, sans intervention.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: FileText,   label: "Documents",   value: "Auto-générés"    },
            { icon: Bell,       label: "Relances",     value: "Programmées"     },
            { icon: Shield,     label: "Déclarations", value: "Surveillées"     },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <Icon className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-sans text-white/30 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-sans font-semibold text-white/80 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Demo zone */}
        {!started ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-white/60 font-sans text-sm">Un cabinet. Un mois d&apos;activité.</p>
              <p className="text-white/30 font-sans text-xs mt-1">Lancez la simulation pour voir.</p>
            </div>
            <button
              onClick={startDemo}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-sans font-bold text-sm transition-all"
            >
              Lancer la démo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Feed événements */}
            <div
              ref={feedRef}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2 max-h-64 overflow-y-auto"
            >
              <p className="text-xs font-sans text-white/20 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Activité en cours
              </p>
              {events.length === 0 && (
                <p className="text-sm font-sans text-white/20 text-center py-4">Initialisation…</p>
              )}
              {events.map((ev, i) => (
                <LiveEvent key={i} text={ev.text} amount={ev.amount} color={ev.color} />
              ))}
            </div>

            {/* Messages Sam */}
            {samMsgs.length > 0 && (
              <div className="space-y-3">
                {samMsgs.map((msg, i) => (
                  <SamBubble key={i} text={msg.text} />
                ))}
              </div>
            )}

            {/* CTA — apparaît naturellement */}
            {showCTA && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-center space-y-4 animate-fade-in">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  <p className="text-sm font-sans font-semibold text-white/80">
                    C&apos;est ça, tous les mois.
                  </p>
                </div>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-sans font-bold text-sm transition-all"
                >
                  Commencer — 14 jours gratuits <ChevronRight className="w-4 h-4" />
                </Link>
                <p className="text-xs font-sans text-white/20">Sans carte bancaire · Résiliable à tout moment</p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
