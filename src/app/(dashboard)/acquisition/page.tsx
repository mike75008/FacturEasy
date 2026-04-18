"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { PageTransition } from "@/components/premium/page-transition";
import { GlassCard } from "@/components/premium/glass-card";
import {
  Zap, Target, TrendingUp, Mail, Linkedin, MessageSquare,
  RefreshCw, Eye, Send, Check, X, ChevronRight, Sparkles,
  Building2, Users, AlertCircle, Clock, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = "email" | "linkedin" | "sms";
type SignalType = "avis_negatif" | "question_compta" | "offre_emploi" | "post_douleur";
type SignalSource = "linkedin" | "malt" | "trustpilot" | "reddit" | "facebook";
type ProspectStatus = "nouveau" | "contacte" | "positif" | "negatif" | "ignore";

interface Prospect {
  id: string;
  structure: string;
  secteur: string;
  decideur?: string;
  source: SignalSource;
  signalType: SignalType;
  outil_actuel?: string;
  clients_ae?: number;
  score: number;
  channel: Channel;
  detected_at: string;
  status: ProspectStatus;
  message?: string;
  replied_at?: string;
}

// ─── Données de démo ─────────────────────────────────────────────────────────

const DEMO_PROSPECTS: Prospect[] = [
  {
    id: "1",
    structure: "Cabinet Moreau & Associés",
    secteur: "Expertise comptable",
    decideur: "Claire Moreau",
    source: "linkedin",
    signalType: "post_douleur",
    outil_actuel: "Excel + Pennylane",
    clients_ae: 47,
    score: 94,
    channel: "linkedin",
    detected_at: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
    status: "nouveau",
  },
  {
    id: "2",
    structure: "Réseau FreelanceHub",
    secteur: "Plateforme freelance",
    decideur: "Thomas Berger",
    source: "trustpilot",
    signalType: "avis_negatif",
    outil_actuel: "Indy",
    clients_ae: 312,
    score: 88,
    channel: "email",
    detected_at: new Date(Date.now() - 1000 * 60 * 67).toISOString(),
    status: "contacte",
  },
  {
    id: "3",
    structure: "BGE Île-de-France",
    secteur: "Accompagnement création",
    source: "facebook",
    signalType: "question_compta",
    clients_ae: 89,
    score: 81,
    channel: "email",
    detected_at: new Date(Date.now() - 1000 * 60 * 142).toISOString(),
    status: "positif",
    replied_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "4",
    structure: "Franchise ServicePro",
    secteur: "Réseau franchise services",
    decideur: "Marc Duval",
    source: "linkedin",
    signalType: "offre_emploi",
    clients_ae: 58,
    score: 76,
    channel: "sms",
    detected_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    status: "contacte",
  },
  {
    id: "5",
    structure: "Cabinet Lefebvre",
    secteur: "Expertise comptable",
    source: "reddit",
    signalType: "question_compta",
    outil_actuel: "Henrri",
    clients_ae: 23,
    score: 72,
    channel: "email",
    detected_at: new Date(Date.now() - 1000 * 60 * 340).toISOString(),
    status: "nouveau",
  },
];

// ─── Génération messages — panneau, pas vendeur ───────────────────────────────

function generateMessage(p: Prospect, channel: Channel): string {
  const signalLabels: Record<SignalType, string> = {
    avis_negatif: "transition d'outil",
    question_compta: "gestion déclarative",
    offre_emploi: "automatisation comptable",
    post_douleur: "simplification compta",
  };
  const topic = signalLabels[p.signalType];

  if (channel === "linkedin") {
    if (p.score >= 90) {
      return `Bonjour ${p.decideur ?? ""},\n\nNous avons construit une solution pour les structures qui gèrent des indépendants — automatisation déclarative complète, alertes fiscales proactives, et un tableau de bord blanc personnalisable à votre marque.\n\nC'est peut-être ce que vous cherchez.\n\n— FacturEasy`;
    }
    return `Bonjour ${p.decideur ?? ""},\n\nNous proposons une plateforme de ${topic} pour les structures qui accompagnent des indépendants. Simple à déployer, adaptable à votre contexte.\n\nDispo pour en parler si c'est pertinent.\n\n— FacturEasy`;
  }

  if (channel === "sms") {
    return `FacturEasy — solution de facturation & compta pour vos indépendants. Automatisé, brandé à votre image. Répondez OUI si vous voulez voir.`;
  }

  // email
  const subject = p.score >= 85
    ? `Une solution pour vos ${p.clients_ae ?? "vos"} indépendants`
    : `${topic} — vous pourriez être intéressé`;

  return `Objet : ${subject}\n\nBonjour,\n\nNous aidons les structures comme la vôtre à gérer la facturation et les obligations déclaratives de leurs clients indépendants — de façon automatisée et sous votre marque.\n\nSi vous avez ce sujet en tête, on peut vous montrer en 15 minutes.\n\n— L'équipe FacturEasy`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 90) return "text-red-400 bg-red-400/10 border-red-400/20";
  if (score >= 80) return "text-gold-400 bg-gold-400/10 border-gold-400/20";
  return "text-amber-400 bg-amber-400/10 border-amber-400/20";
}

function scoreLabel(score: number) {
  if (score >= 90) return "Brûlant";
  if (score >= 80) return "Chaud";
  return "Tiède";
}

function channelIcon(channel: Channel) {
  if (channel === "linkedin") return <Linkedin className="w-3.5 h-3.5" />;
  if (channel === "sms") return <MessageSquare className="w-3.5 h-3.5" />;
  return <Mail className="w-3.5 h-3.5" />;
}

function channelLabel(channel: Channel) {
  if (channel === "linkedin") return "LinkedIn";
  if (channel === "sms") return "SMS";
  return "Email";
}

function signalLabel(type: SignalType, source: SignalSource) {
  if (type === "avis_negatif") return `Avis négatif sur ${source}`;
  if (type === "question_compta") return `Question compta sur ${source}`;
  if (type === "offre_emploi") return "Offre d'emploi détectée";
  return `Post douleur sur ${source}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

const LS_KEY = "acquisition_prospects";

function loadProspects(): Prospect[] {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : DEMO_PROSPECTS;
  } catch { return DEMO_PROSPECTS; }
}

function saveProspects(prospects: Prospect[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(prospects));
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AcquisitionPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [tab, setTab] = useState<"radar" | "pipeline">("radar");
  const [sending, setSending] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  useEffect(() => {
    const data = loadProspects();
    setProspects(data);
    const today = new Date().toDateString();
    const todayPositive = data.filter(p =>
      p.status === "positif" && p.replied_at &&
      new Date(p.replied_at).toDateString() === today
    ).length;
    setDailyCount(todayPositive);
  }, []);

  const updateStatus = useCallback((id: string, status: ProspectStatus, extra?: Partial<Prospect>) => {
    setProspects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, status, ...extra } : p);
      saveProspects(next);
      return next;
    });
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status, ...extra } : prev);
  }, [selected]);

  const handleSend = useCallback(async (p: Prospect) => {
    setSending(p.id);
    await new Promise(r => setTimeout(r, 1200));
    const message = generateMessage(p, p.channel);
    updateStatus(p.id, "contacte", { message });
    setSending(null);
  }, [updateStatus]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 2000));
    setScanning(false);
  }, []);

  const nouveaux = prospects.filter(p => p.status === "nouveau");
  const contactes = prospects.filter(p => p.status === "contacte");
  const positifs = prospects.filter(p => p.status === "positif");
  const taux = contactes.length + positifs.length > 0
    ? Math.round(positifs.length / (contactes.length + positifs.length) * 100)
    : 0;

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        <Topbar title="Acquisition" subtitle="Signaux actifs · Prospects qualifiés · Résultats" />

        <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">

          {/* Sam intro */}
          <GlassCard className="p-4 border-gold-400/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-sans text-white/80 leading-relaxed">
                  Je détecte les structures qui ont ce besoin — elles ne savent pas encore que tu existes.
                  Chaque signal capté est scoré, qualifié, et transformé en message sur le bon canal.
                  Toi tu valides. Moi je gère le reste.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Métriques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Signaux aujourd'hui", value: nouveaux.length, icon: Target, color: "text-gold-400" },
              { label: "Contacts envoyés", value: contactes.length, icon: Send, color: "text-blue-400" },
              { label: "Réponses positives", value: positifs.length, icon: Star, color: "text-green-400" },
              { label: "Taux de conversion", value: `${taux}%`, icon: TrendingUp, color: "text-purple-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <GlassCard key={label} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs font-sans text-atlantic-200/50 uppercase tracking-wider">{label}</span>
                </div>
                <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
              </GlassCard>
            ))}
          </div>

          {/* Tabs + Scan */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 p-1 rounded-xl bg-atlantic-800/40 border border-atlantic-600/20">
              {(["radar", "pipeline"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-sans font-medium transition-all ${
                    tab === t
                      ? "bg-gold-400/10 text-gold-400 border border-gold-400/20"
                      : "text-atlantic-200/50 hover:text-white"
                  }`}
                >
                  {t === "radar" ? `Radar (${nouveaux.length})` : `Pipeline (${contactes.length + positifs.length})`}
                </button>
              ))}
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/10 border border-gold-400/20 text-gold-400 hover:bg-gold-400/20 transition-all text-sm font-sans font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Analyse en cours…" : "Scanner maintenant"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Liste prospects */}
            <div className="space-y-3">
              {(tab === "radar" ? nouveaux : [...contactes, ...positifs])
                .sort((a, b) => b.score - a.score)
                .map(p => (
                  <GlassCard
                    key={p.id}
                    className={`p-4 cursor-pointer transition-all hover:border-gold-400/30 ${
                      selected?.id === p.id ? "border-gold-400/40 bg-gold-400/5" : ""
                    }`}
                    onClick={() => setSelected(p)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-atlantic-700/50 border border-atlantic-600/20 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-atlantic-200/50" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-sans font-semibold text-white truncate">{p.structure}</p>
                          <p className="text-xs font-sans text-atlantic-200/40 truncate">{p.secteur}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-sans text-atlantic-200/30">{signalLabel(p.signalType, p.source)}</span>
                            {p.clients_ae && (
                              <span className="flex items-center gap-1 text-[10px] font-sans text-atlantic-200/40">
                                <Users className="w-2.5 h-2.5" />
                                {p.clients_ae} AE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-xs font-sans font-bold px-2 py-0.5 rounded-full border ${scoreColor(p.score)}`}>
                          {p.score} · {scoreLabel(p.score)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-sans text-atlantic-200/30">
                          {channelIcon(p.channel)}
                          <span>{channelLabel(p.channel)}</span>
                        </div>
                        {p.status === "positif" && (
                          <span className="flex items-center gap-1 text-[10px] font-sans text-green-400">
                            <Check className="w-3 h-3" />
                            Positif
                          </span>
                        )}
                        {p.status === "contacte" && (
                          <span className="flex items-center gap-1 text-[10px] font-sans text-blue-400">
                            <Clock className="w-3 h-3" />
                            Envoyé
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-atlantic-600/10">
                      <span className="text-[10px] font-sans text-atlantic-200/25">{timeAgo(p.detected_at)}</span>
                      {p.status === "nouveau" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSend(p); }}
                          disabled={sending === p.id}
                          className="flex items-center gap-1.5 text-xs font-sans font-medium text-gold-400 hover:text-gold-300 px-3 py-1.5 rounded-lg bg-gold-400/10 border border-gold-400/20 hover:bg-gold-400/20 transition-all disabled:opacity-50"
                        >
                          {sending === p.id ? (
                            <><RefreshCw className="w-3 h-3 animate-spin" /> Envoi…</>
                          ) : (
                            <><Send className="w-3 h-3" /> Contacter</>
                          )}
                        </button>
                      )}
                      {p.status === "contacte" && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(p.id, "positif", { replied_at: new Date().toISOString() }); setDailyCount(c => c + 1); }}
                            className="flex items-center gap-1 text-xs font-sans text-green-400 px-2.5 py-1.5 rounded-lg bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 transition-all"
                          >
                            <Check className="w-3 h-3" /> Positif
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(p.id, "negatif"); }}
                            className="flex items-center gap-1 text-xs font-sans text-atlantic-200/30 px-2.5 py-1.5 rounded-lg bg-atlantic-700/30 border border-atlantic-600/20 hover:bg-atlantic-700/50 transition-all"
                          >
                            <X className="w-3 h-3" /> Négatif
                          </button>
                        </div>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-atlantic-200/20" />
                    </div>
                  </GlassCard>
                ))}

              {(tab === "radar" ? nouveaux : [...contactes, ...positifs]).length === 0 && (
                <GlassCard className="p-8 text-center">
                  <AlertCircle className="w-8 h-8 text-atlantic-200/20 mx-auto mb-3" />
                  <p className="text-sm font-sans text-atlantic-200/40">
                    {tab === "radar" ? "Aucun nouveau signal — lance un scan." : "Pipeline vide pour l'instant."}
                  </p>
                </GlassCard>
              )}
            </div>

            {/* Prévisualisation message */}
            <div className="space-y-4">
              {selected ? (
                <>
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gold-400" />
                        <span className="text-sm font-sans font-semibold text-white">Message généré</span>
                      </div>
                      <div className="flex gap-2">
                        {(["email", "linkedin", "sms"] as Channel[]).map(ch => (
                          <button
                            key={ch}
                            onClick={() => setSelected(prev => prev ? { ...prev, channel: ch } : prev)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              selected.channel === ch
                                ? "bg-gold-400/10 border-gold-400/20 text-gold-400"
                                : "border-atlantic-600/20 text-atlantic-200/30 hover:text-atlantic-200/60"
                            }`}
                          >
                            {channelIcon(ch)} {channelLabel(ch)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-atlantic-800/50 border border-atlantic-600/15">
                      <pre className="text-sm font-sans text-atlantic-200/70 leading-relaxed whitespace-pre-wrap">
                        {generateMessage(selected, selected.channel)}
                      </pre>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-5">
                    <p className="text-xs font-sans text-atlantic-200/40 uppercase tracking-wider mb-3">Profil prospect</p>
                    <div className="space-y-2">
                      {[
                        { label: "Structure", value: selected.structure },
                        { label: "Secteur", value: selected.secteur },
                        selected.decideur ? { label: "Décideur", value: selected.decideur } : null,
                        selected.outil_actuel ? { label: "Outil actuel", value: selected.outil_actuel } : null,
                        selected.clients_ae ? { label: "Clients AE estimés", value: `${selected.clients_ae}` } : null,
                        { label: "Score", value: `${selected.score}/100 — ${scoreLabel(selected.score)}` },
                        { label: "Signal", value: signalLabel(selected.signalType, selected.source) },
                        { label: "Détecté", value: timeAgo(selected.detected_at) },
                      ].filter(Boolean).map(item => item && (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-xs font-sans text-atlantic-200/35">{item.label}</span>
                          <span className="text-xs font-sans text-white/70">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </>
              ) : (
                <GlassCard className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <Zap className="w-10 h-10 text-gold-400/20 mb-4" />
                  <p className="text-sm font-sans text-atlantic-200/30">
                    Sélectionne un prospect pour voir le message généré
                  </p>
                </GlassCard>
              )}
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
