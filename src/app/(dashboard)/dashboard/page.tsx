"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { AnimatedCounter } from "@/components/premium/animated-counter";
import { PageTransition } from "@/components/premium/page-transition";
import {
  FileText, Users, TrendingUp, AlertTriangle, Clock, ArrowUpRight,
  Sparkles, BarChart3, CheckCircle2, XCircle, Package, Bell,
  Award, Shield, Crown, Zap, Trophy, Rocket, Star,
  Brain, X, RefreshCw,
} from "lucide-react";
import { getUserGamification } from "@/lib/local-storage";
import { useAppContext } from "@/lib/context/app-context";
import { formatCurrency, formatDate } from "@/lib/utils";

const LEVEL_COLORS = {
  bronze: { bg: "from-amber-700/20 to-amber-700/5", text: "text-amber-600", border: "border-amber-600/30" },
  argent: { bg: "from-slate-400/20 to-slate-400/5", text: "text-slate-300", border: "border-slate-300/30" },
  or: { bg: "from-gold-400/20 to-gold-400/5", text: "text-gold-400", border: "border-gold-400/30" },
  platine: { bg: "from-cyan-400/20 to-cyan-400/5", text: "text-cyan-300", border: "border-cyan-300/30" },
  diamant: { bg: "from-violet-400/20 to-violet-400/5", text: "text-violet-300", border: "border-violet-300/30" },
};

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Zap, Crown, Trophy, Package, Bell, Shield, TrendingUp, Rocket, CheckCircle2,
};

export default function DashboardPage() {
  const { documents, clients: clientsList, products: productsList, reminders, dataLoading: loading, appMode, setAppMode, userName } = useAppContext();
  const [gamification] = useState(() => getUserGamification());
  const [chartAnimated, setChartAnimated] = useState(false);
  const [roiIndex, setRoiIndex] = useState(0);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, unknown> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSamIntro, setShowSamIntro] = useState(false);
  const [lastLogin, setLastLogin] = useState<Date | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [samTyped, setSamTyped] = useState("");
  const [samDoneTyping, setSamDoneTyping] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const animationRunRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setChartAnimated(true), 200);
      return () => clearTimeout(t);
    }
  }, [loading]);

  useEffect(() => {
    const interval = setInterval(() => setRoiIndex((i) => (i + 1) % 4), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("last_login");
    const introduced = localStorage.getItem("sam_introduced");
    if (stored) setLastLogin(new Date(stored));
    if (!introduced) setShowSamIntro(true);
    localStorage.setItem("last_login", new Date().toISOString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (appMode !== "decouverte" || loading) {
      animationRunRef.current = false;
      setRevealStep(0);
      setSamTyped("");
      setSamDoneTyping(false);
      return;
    }
    if (animationRunRef.current) return;
    animationRunRef.current = true;

    const firstName = userName.split(" ")[0];
    let text = "";
    if (stats.overdueCount > 0) {
      text = `${firstName}, ${stats.overdueCount} facture${stats.overdueCount > 1 ? "s" : ""} en retard — ${formatCurrency(stats.overdueTotal)} en jeu. C'est la priorité. J'ai tout préparé.`;
    } else if (stats.pendingTotal > 0) {
      text = `Tout est à jour. ${formatCurrency(stats.pendingTotal)} sont en route. On surveille ensemble.`;
    } else {
      text = `Pas encore de facture ce mois-ci. C'est le bon moment — je t'accompagne.`;
    }

    setSamTyped("");
    setSamDoneTyping(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setSamTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setSamDoneTyping(true);
        [1, 2, 3, 4, 5, 6].forEach((step) => {
          setTimeout(() => setRevealStep(step), (step - 1) * 200);
        });
      }
    }, 22);
    return () => clearInterval(interval);
  }, [appMode, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const invoices = documents.filter((d) => d.type === "facture");
    const quotes = documents.filter((d) => d.type === "devis");
    const paidInvoices = invoices.filter((d) => d.status === "paye");
    const pendingInvoices = invoices.filter((d) => d.status === "envoye" || d.status === "valide");
    const overdueInvoices = invoices.filter(
      (d) => d.status !== "paye" && d.status !== "annule" && !!d.due_date && new Date(d.due_date) < now
    );

    const totalCA = paidInvoices.reduce((s, d) => s + d.total_ttc, 0);
    const pendingTotal = pendingInvoices.reduce((s, d) => s + d.total_ttc, 0);
    const overdueTotal = overdueInvoices.reduce((s, d) => s + d.total_ttc, 0);
    const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;

    const monthlyCA = Array(12).fill(0) as number[];
    paidInvoices.forEach((d) => {
      const date = new Date(d.date);
      const monthsAgo = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 12) monthlyCA[11 - monthsAgo] += d.total_ttc;
    });

    const convertedQuotes = quotes.filter(
      (d) => d.status === "paye" || d.status === "envoye" || d.status === "valide"
    );
    const quoteConversion = quotes.length > 0 ? Math.round((convertedQuotes.length / quotes.length) * 100) : 0;
    const sentRemindersCount = reminders.filter((r) => r.sent_at).length;

    return {
      totalCA: Math.round(totalCA * 100) / 100,
      invoiceCount: invoices.length,
      pendingTotal: Math.round(pendingTotal * 100) / 100,
      pendingCount: pendingInvoices.length,
      clientCount: clientsList.length,
      productCount: productsList.length,
      paymentRate: Math.round(paymentRate * 10) / 10,
      overdueCount: overdueInvoices.length,
      overdueTotal: Math.round(overdueTotal * 100) / 100,
      monthlyCA,
      sentReminders: sentRemindersCount,
      quoteCount: quotes.length,
      quoteConversion,
      reminderCount: reminders.length,
    };
  }, [documents, clientsList, productsList, reminders]);

  const recentDocs = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [documents]);

  const protectedBySam = useMemo(() => {
    const remindedDocIds = new Set(reminders.filter((r) => r.sent_at).map((r) => r.document_id));
    const docs = documents.filter((d) => d.type === "facture" && d.status === "paye" && remindedDocIds.has(d.id));
    return {
      total: Math.round(docs.reduce((s, d) => s + d.total_ttc, 0) * 100) / 100,
      docs,
    };
  }, [documents, reminders]);

  function roiColor(score: number): string {
    if (score >= 80) return "#34d399";
    if (score >= 60) return "#d4af37";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  }

  const roiMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Taux de paiement
    const tauxScore = Math.round(stats.paymentRate);

    // 2. Recouvrement — encaissé vs total émis
    const totalEmis = stats.totalCA + stats.pendingTotal + stats.overdueTotal;
    const recouvrementScore = totalEmis > 0 ? Math.round((stats.totalCA / totalEmis) * 100) : 0;

    // 3. Délai moyen — jours de retard moyen sur factures en retard
    const overdueInvoices = documents.filter(
      (d) => d.type === "facture" && d.status !== "paye" && d.status !== "annule" && d.due_date && new Date(d.due_date) < today
    );
    const avgDelay = overdueInvoices.length > 0
      ? Math.round(overdueInvoices.reduce((sum, d) => sum + Math.floor((today.getTime() - new Date(d.due_date!).getTime()) / 86400000), 0) / overdueInvoices.length)
      : 0;
    const delaiScore = Math.max(0, Math.round(100 - (avgDelay / 30) * 100));

    // 4. Santé globale — moyenne des 3 scores
    const santeScore = Math.round((tauxScore + recouvrementScore + delaiScore) / 3);

    return [
      { label: "Taux de paiement", value: tauxScore, display: `${tauxScore}%`, detail: `${stats.invoiceCount} facture${stats.invoiceCount > 1 ? "s" : ""}`, score: tauxScore },
      { label: "Recouvrement", value: recouvrementScore, display: `${recouvrementScore}%`, detail: `${formatCurrency(stats.totalCA)} encaissés`, score: recouvrementScore },
      { label: "Délai moyen", value: avgDelay, display: avgDelay === 0 ? "0 j" : `${avgDelay} j`, detail: `${overdueInvoices.length} facture${overdueInvoices.length > 1 ? "s" : ""} en retard`, score: delaiScore },
      { label: "Santé globale", value: santeScore, display: `${santeScore}%`, detail: "Score composite", score: santeScore },
    ];
  }, [documents, stats]);

  async function generateAIAnalysis() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats: {
            totalCA: stats.totalCA,
            pendingTotal: stats.pendingTotal,
            overdueTotal: stats.overdueTotal,
            invoiceCount: stats.invoiceCount,
            overdueCount: stats.overdueCount,
            paymentRate: stats.paymentRate,
            clientCount: stats.clientCount,
            productCount: stats.productCount,
            quoteCount: stats.quoteCount,
            quoteConversion: stats.quoteConversion,
            sentReminders: stats.sentReminders,
            reminderCount: stats.reminderCount,
            roiTaux: roiMetrics[0].score,
            roiRecouvrement: roiMetrics[1].score,
            roiDelai: roiMetrics[2].value,
            roiSante: roiMetrics[3].score,
          },
          gamification: {
            level: gamification.level,
            points: gamification.points,
            nextLevelPoints: gamification.nextLevelPoints,
            earnedBadges: gamification.badges.filter((b) => b.earned).length,
            totalBadges: gamification.badges.length,
          },
        }),
      });
      const data = await res.json();
      setAiAnalysis(data);
    } catch { /* ignore */ } finally {
      setAiLoading(false);
    }
  }

  function getClientName(clientId: string): string {
    const c = clientsList.find((cl) => cl.id === clientId);
    if (!c) return "—";
    return c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
  }

  if (loading) {
    return (
      <PageTransition>
        <Topbar title="Tableau de bord" subtitle="Chargement..." />
        <div className="p-6 flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  const kpis = [
    {
      label: "Chiffre d'affaires",
      value: stats.totalCA,
      suffix: " €",
      trend: "up" as const,
      change: `${stats.invoiceCount} factures`,
      icon: TrendingUp,
      color: "from-emerald-400/20 to-emerald-400/5",
      iconColor: "text-emerald-400",
    },
    {
      label: "En attente",
      value: stats.pendingTotal,
      suffix: " €",
      trend: stats.pendingCount > 0 ? "warning" as const : "up" as const,
      change: `${stats.pendingCount} facture${stats.pendingCount > 1 ? "s" : ""}`,
      icon: FileText,
      color: "from-gold-400/20 to-gold-400/5",
      iconColor: "text-gold-400",
    },
    {
      label: "Clients actifs",
      value: stats.clientCount,
      suffix: "",
      trend: "up" as const,
      change: `${stats.productCount} produits`,
      icon: Users,
      color: "from-blue-400/20 to-blue-400/5",
      iconColor: "text-blue-400",
    },
    {
      label: "Taux de paiement",
      value: stats.paymentRate,
      suffix: "%",
      trend: stats.paymentRate >= 80 ? "up" as const : stats.paymentRate >= 50 ? "warning" as const : "down" as const,
      change: stats.invoiceCount > 0 ? `${stats.overdueCount} en retard` : "Aucune facture",
      icon: CheckCircle2,
      color: "from-violet-400/20 to-violet-400/5",
      iconColor: "text-violet-400",
      decimals: 1,
    },
  ];

  const maxCA = Math.max(...stats.monthlyCA, 1);
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const currentMonth = new Date().getMonth();
  const displayMonths = [...Array(12)].map((_, i) => months[(currentMonth - 11 + i + 12) % 12]);

  const earnedBadges = gamification.badges.filter((b) => b.earned);
  const levelColors = LEVEL_COLORS[gamification.level];

  const gaugeRate = stats.invoiceCount > 0 ? Math.min(Math.round(stats.paymentRate), 100) : 0;

  // Donut — calculs prévisionnels
  const last3Avg = Math.round(stats.monthlyCA.slice(-3).reduce((a, b) => a + b, 0) / 3);
  const prev3Avg = Math.round(stats.monthlyCA.slice(-6, -3).reduce((a, b) => a + b, 0) / 3);
  const growthRate = prev3Avg > 0 ? (last3Avg - prev3Avg) / prev3Avg : 0;
  const previsionnel = last3Avg;
  const predictionIA = Math.max(0, Math.round(last3Avg * (1 + Math.max(-0.5, Math.min(0.5, growthRate)))));
  const donutSegments = [
    { label: "Encaissé", value: stats.totalCA, color: "#34d399" },
    { label: "En attente", value: stats.pendingTotal, color: "#f59e0b" },
    { label: "En retard", value: stats.overdueTotal, color: "#f97316" },
    { label: "Prévisionnel", value: previsionnel, color: "#a78bfa" },
    { label: "Prédiction IA", value: predictionIA, color: "#d4af37" },
  ];
  const donutTotal = donutSegments.reduce((s, d) => s + d.value, 0) || 1;
  const donutR = 38; const donutCx = 60; const donutCy = 60;
  const donutC = 2 * Math.PI * donutR;
  let cumulativeArc = 0;
  const donutArcs = donutSegments.map((seg) => {
    const segLen = (seg.value / donutTotal) * donutC;
    const dashOffset = -cumulativeArc;
    cumulativeArc += segLen;
    return { ...seg, segLen, dashOffset };
  });
  const circumference = 2 * Math.PI * 40;
  const gaugeOffset = circumference * (1 - gaugeRate / 100);

  return (
    <PageTransition>
      <Topbar
        title="Tableau de bord"
        subtitle={`${stats.invoiceCount} facture${stats.invoiceCount > 1 ? "s" : ""} • ${stats.clientCount} client${stats.clientCount > 1 ? "s" : ""}`}
        extra={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-atlantic-800/50 border border-atlantic-600/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-sans text-atlantic-200/40">temps réel</span>
          </div>
        }
        rightExtra={
          <div className="flex items-center gap-2">
            {/* Sélecteur de mode — test dev */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-atlantic-800/50 border border-white/5">
              {(["decouverte", "intermediaire", "expert"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setAppMode(m)}
                  className={`px-2 py-1 rounded-md text-[9px] font-sans font-semibold transition-all ${
                    appMode === m
                      ? "bg-gold-400/15 text-gold-400 border border-gold-400/20"
                      : "text-atlantic-200/30 hover:text-white"
                  }`}
                >
                  {m === "decouverte" ? "Découverte" : m === "intermediaire" ? "Pro" : "Expert"}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowAIPanel(true); if (!aiAnalysis) generateAIAnalysis(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans font-medium text-gold-400 bg-gold-400/10 border border-gold-400/20 hover:bg-gold-400/20 hover:border-gold-400/40 transition-all"
              title="Analyse IA du tableau de bord"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Analyse IA</span>
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">

        {/* ══ SAM — MODE DÉCOUVERTE ══ */}
        {appMode === "decouverte" && (
          <>
            {/* Modal intro Sam — première connexion */}
            {showSamIntro && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-atlantic-950/80 backdrop-blur-md p-6">
                <div className="w-full max-w-md rounded-2xl border border-amber-400/20 bg-atlantic-900 p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-display font-bold text-amber-300 text-xl flex-shrink-0">
                      S
                    </div>
                    <div>
                      <p className="text-base font-display font-bold text-amber-300">Je suis Sam</p>
                      <p className="text-xs font-sans text-atlantic-200/40">Ton assistante financière personnelle</p>
                    </div>
                  </div>
                  <p className="text-sm font-sans text-white leading-relaxed">
                    Bonjour {userName.split(" ")[0]} 👋 Je suis là pour surveiller tes finances pendant que tu te concentres sur ton activité. Je ne dors jamais, je ne rate rien.
                  </p>
                  <ul className="space-y-2.5">
                    {[
                      "Je surveille tes factures en temps réel",
                      "Je te préviens avant que ça devienne un problème",
                      "Je calcule ce que tu as gagné et ce que j'ai protégé pour toi",
                      "Je parle argent, jamais jargon",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs font-sans text-atlantic-200/60">
                        <span className="text-amber-300 mt-0.5 flex-shrink-0">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => { setShowSamIntro(false); localStorage.setItem("sam_introduced", "1"); }}
                    className="w-full py-3 rounded-xl bg-amber-400/15 border border-amber-400/20 text-amber-300 text-sm font-sans font-semibold hover:bg-amber-400/25 transition-all"
                  >
                    Compris, allons-y →
                  </button>
                </div>
              </div>
            )}

            {/* Bloc principal Sam */}
            {(() => {
              const firstName = userName.split(" ")[0];
              const daysSinceLogin = lastLogin
                ? Math.floor((new Date().getTime() - lastLogin.getTime()) / 86400000)
                : null;
              const sinceLabel = daysSinceLogin === null ? null
                : daysSinceLogin === 0 ? "aujourd'hui"
                : daysSinceLogin === 1 ? "hier"
                : `il y a ${daysSinceLogin} jours`;

              let samMsg: React.ReactNode;
              if (stats.overdueCount > 0) {
                samMsg = (
                  <>
                    {sinceLabel ? `${firstName}, depuis ${sinceLabel} ` : `${firstName}, `}
                    <span className="text-amber-300 font-semibold">{stats.overdueCount} facture{stats.overdueCount > 1 ? "s" : ""}</span>
                    {" "}sont en retard —{" "}
                    <span className="text-amber-300 font-semibold">{formatCurrency(stats.overdueTotal)}</span>
                    {" "}en jeu. C&apos;est la priorité. J&apos;ai tout préparé.
                  </>
                );
              } else if (stats.pendingTotal > 0) {
                samMsg = (
                  <>
                    Tout est à jour — aucun retard.{" "}
                    <span className="text-amber-300 font-semibold">{formatCurrency(stats.pendingTotal)}</span>
                    {" "}sont en route vers toi. On surveille ça ensemble.
                  </>
                );
              } else {
                samMsg = "Pas encore de facture envoyée ce mois-ci. C'est le bon moment pour commencer — je t'accompagne étape par étape.";
              }

              const total = (stats.totalCA + stats.pendingTotal + stats.overdueTotal) || 1;
              const sante = Math.round(stats.paymentRate);

              const now = new Date();
              const overdueList = documents.filter(
                (d) => d.type === "facture" && d.status !== "paye" && d.status !== "annule" && !!d.due_date && new Date(d.due_date) < now
              );
              const pendingList = documents.filter(
                (d) => d.type === "facture" && (d.status === "envoye" || d.status === "valide") && !(!!d.due_date && new Date(d.due_date) < now)
              );
              const paidList = documents.filter((d) => d.type === "facture" && d.status === "paye");

              const indicators = [
                {
                  key: "gained",
                  emoji: "💰",
                  label: "Ce que tu as gagné",
                  value: formatCurrency(stats.totalCA),
                  sub: `${paidList.length} facture${paidList.length > 1 ? "s" : ""} payée${paidList.length > 1 ? "s" : ""}`,
                  barColor: "bg-emerald-400",
                  barBg: "bg-emerald-400/15",
                  pct: Math.min(Math.round((stats.totalCA / total) * 100), 100),
                  textColor: "text-emerald-400",
                  docs: paidList,
                },
                {
                  key: "pending",
                  emoji: "⏳",
                  label: "Ce qu'on te doit",
                  value: formatCurrency(stats.pendingTotal),
                  sub: `${stats.pendingCount} facture${stats.pendingCount > 1 ? "s" : ""} en attente`,
                  barColor: "bg-gold-400",
                  barBg: "bg-gold-400/15",
                  pct: Math.min(Math.round((stats.pendingTotal / total) * 100), 100),
                  textColor: "text-gold-400",
                  docs: pendingList,
                },
                {
                  key: "overdue",
                  emoji: stats.overdueCount > 0 ? "🚨" : "✅",
                  label: "En retard",
                  value: stats.overdueCount > 0 ? formatCurrency(stats.overdueTotal) : "Rien",
                  sub: stats.overdueCount > 0
                    ? `${stats.overdueCount} facture${stats.overdueCount > 1 ? "s" : ""} impayée${stats.overdueCount > 1 ? "s" : ""}`
                    : "Tout est à jour",
                  barColor: stats.overdueCount > 0 ? "bg-red-400" : "bg-emerald-400",
                  barBg: stats.overdueCount > 0 ? "bg-red-400/15" : "bg-emerald-400/15",
                  pct: Math.min(Math.round((stats.overdueTotal / total) * 100), 100),
                  textColor: stats.overdueCount > 0 ? "text-red-400" : "text-emerald-400",
                  docs: overdueList,
                },
                {
                  key: "sante",
                  emoji: sante >= 80 ? "❤️" : sante >= 50 ? "🟡" : "🩺",
                  label: "Santé financière",
                  value: `${sante}%`,
                  sub: sante >= 80 ? "Excellente" : sante >= 50 ? "En progression" : "À surveiller",
                  barColor: sante >= 80 ? "bg-emerald-400" : sante >= 50 ? "bg-amber-400" : "bg-red-400",
                  barBg: sante >= 80 ? "bg-emerald-400/15" : sante >= 50 ? "bg-amber-400/15" : "bg-red-400/15",
                  pct: sante,
                  textColor: sante >= 80 ? "text-emerald-400" : sante >= 50 ? "text-amber-400" : "text-red-400",
                  docs: [] as typeof documents,
                },
              ];

              const activeDetail = indicators.find((i) => i.key === selectedMetric);

              return (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] overflow-hidden">

                  {/* En-tête Sam */}
                  <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-display font-bold text-amber-300 text-base flex-shrink-0">
                      S
                    </div>
                    <div>
                      <p className="text-sm font-sans font-bold text-amber-300">Sam</p>
                      <p className="text-[10px] font-sans text-atlantic-200/40">
                        {sinceLabel ? `Connectée ${sinceLabel}` : "Première connexion"}
                      </p>
                    </div>
                  </div>

                  {/* Message Sam — typewriter */}
                  <div className="px-5 pb-4 min-h-[2.5rem]">
                    {samDoneTyping ? (
                      <p className="text-sm font-sans text-white leading-relaxed">{samMsg}</p>
                    ) : (
                      <p className="text-sm font-sans text-white leading-relaxed">
                        {samTyped}
                        <span className="inline-block w-0.5 h-4 bg-amber-300/70 ml-0.5 animate-pulse align-middle rounded-full" />
                      </p>
                    )}
                  </div>

                  {/* 4 métriques — révélation séquentielle */}
                  <div className="grid grid-cols-2 gap-px bg-amber-400/10 border-t border-amber-400/10">
                    {indicators.map((ind, idx) => (
                      <button
                        key={ind.key}
                        onClick={() => setSelectedMetric(selectedMetric === ind.key ? null : ind.key)}
                        className={`bg-atlantic-900/40 px-4 py-4 space-y-2 text-left transition-all duration-500 ${revealStep >= idx + 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} ${selectedMetric === ind.key ? "bg-amber-400/[0.08]" : "hover:bg-amber-400/[0.04]"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{ind.emoji}</span>
                            <p className="text-[10px] font-sans text-atlantic-200/40">{ind.label}</p>
                          </div>
                          {(ind.docs.length > 0 || ind.key === "sante") && (
                            <span className="text-[9px] font-sans text-atlantic-200/20">
                              {selectedMetric === ind.key ? "▲" : "▼"}
                            </span>
                          )}
                        </div>
                        <p className={`text-xl font-display font-bold ${ind.textColor}`}>{ind.value}</p>
                        <div className={`h-1.5 rounded-full ${ind.barBg} overflow-hidden`}>
                          <div
                            className={`h-full rounded-full ${ind.barColor} transition-all duration-[1.5s] ease-out`}
                            style={{ width: `${ind.pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-sans text-atlantic-200/40">{ind.sub}</p>
                      </button>
                    ))}
                  </div>

                  {/* 5ème métrique — Protégé par Sam — arrive en dernier avec pulsation */}
                  <button
                    onClick={() => setSelectedMetric(selectedMetric === "protected" ? null : "protected")}
                    className={`w-full flex items-center justify-between px-4 py-3 border-t border-amber-400/10 transition-all duration-700 ${revealStep >= 5 ? "opacity-100" : "opacity-0"} ${selectedMetric === "protected" ? "bg-amber-400/[0.08]" : "hover:bg-amber-400/[0.04]"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <div className="text-left">
                        <p className="text-[10px] font-sans text-atlantic-200/40">Protégé par Sam</p>
                        <p className="text-sm font-display font-bold text-violet-400">{formatCurrency(protectedBySam.total)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-sans text-atlantic-200/30">
                        {protectedBySam.docs.length} facture{protectedBySam.docs.length > 1 ? "s" : ""} récupérée{protectedBySam.docs.length > 1 ? "s" : ""} grâce aux relances
                      </p>
                      <span className="text-[9px] font-sans text-atlantic-200/20">
                        {selectedMetric === "protected" ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {/* Détail de la métrique sélectionnée */}
                  {selectedMetric && (
                    <div className="border-t border-amber-400/10 bg-atlantic-950/30 px-5 py-4 space-y-2">
                      {selectedMetric === "sante" ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-sans text-atlantic-200/40 mb-3">Décomposition du score</p>
                          {[
                            { label: "Taux de paiement", val: `${Math.round(stats.paymentRate)}%` },
                            { label: "Recouvrement", val: `${stats.totalCA > 0 ? Math.round((stats.totalCA / (stats.totalCA + stats.pendingTotal + stats.overdueTotal)) * 100) : 0}%` },
                            { label: "Factures en retard", val: `${stats.overdueCount}` },
                          ].map((s) => (
                            <div key={s.label} className="flex items-center justify-between">
                              <p className="text-xs font-sans text-atlantic-200/50">{s.label}</p>
                              <p className="text-xs font-sans font-semibold text-white">{s.val}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] font-sans text-atlantic-200/40 mb-3">
                            {activeDetail?.docs.length
                              ? `${activeDetail.docs.length} document${activeDetail.docs.length > 1 ? "s" : ""}`
                              : (selectedMetric === "protected" ? `${protectedBySam.docs.length} document${protectedBySam.docs.length > 1 ? "s" : ""}` : "Aucun document")}
                          </p>
                          {(selectedMetric === "protected" ? protectedBySam.docs : (activeDetail?.docs ?? [])).slice(0, 6).map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between py-1.5 border-b border-amber-400/5 last:border-0">
                              <div>
                                <p className="text-xs font-sans font-medium text-white">{doc.number}</p>
                                <p className="text-[10px] font-sans text-atlantic-200/40">{getClientName(doc.client_id)}</p>
                              </div>
                              <p className="text-xs font-sans font-semibold text-gold-400">{formatCurrency(doc.total_ttc)}</p>
                            </div>
                          ))}
                          {(selectedMetric === "protected" ? protectedBySam.docs : (activeDetail?.docs ?? [])).length === 0 && (
                            <p className="text-xs font-sans text-atlantic-200/30 text-center py-2">Aucun document dans cette catégorie</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Sam */}
                  {stats.overdueCount > 0 && (
                    <div className="px-5 py-4 border-t border-amber-400/10 flex items-center justify-between gap-4">
                      <p className="text-xs font-sans text-atlantic-200/50">
                        J&apos;ai préparé {stats.overdueCount} relance{stats.overdueCount > 1 ? "s" : ""}. Tu valides et c&apos;est envoyé.
                      </p>
                      <a
                        href="/reminders"
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 text-xs font-sans font-semibold border border-amber-400/20 transition-all"
                      >
                        Voir les relances
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Sam niveau 2 — Insights prédictifs */}
            {(() => {
              const now = new Date();
              const insights: { emoji: string; text: React.ReactNode; action?: string; href?: string }[] = [];

              // 1. Concentration client
              const clientCA: Record<string, number> = {};
              documents.filter((d) => d.type === "facture" && d.status === "paye").forEach((d) => {
                clientCA[d.client_id] = (clientCA[d.client_id] || 0) + d.total_ttc;
              });
              const caEntries = Object.entries(clientCA).sort((a, b) => b[1] - a[1]);
              if (caEntries.length > 0 && stats.totalCA > 0) {
                const [topId, topAmount] = caEntries[0];
                const pct = Math.round((topAmount / stats.totalCA) * 100);
                if (pct >= 40) {
                  insights.push({
                    emoji: "⚠️",
                    text: (<><span className="font-semibold text-white">{getClientName(topId)}</span> représente <span className="text-amber-300 font-semibold">{pct}%</span> de ton CA. Si ce client ralentit, tu le sens tout de suite.</>),
                  });
                }
              }

              // 2. Tendance mensuelle
              const currentMonthCA = stats.monthlyCA[11];
              const prevMonths = stats.monthlyCA.slice(0, 11).filter((v) => v > 0);
              if (prevMonths.length >= 2) {
                const avg = prevMonths.reduce((a, b) => a + b, 0) / prevMonths.length;
                if (currentMonthCA < avg * 0.6 && avg > 0) {
                  insights.push({
                    emoji: "📉",
                    text: (<>Ce mois-ci tu es à <span className="text-amber-300 font-semibold">{formatCurrency(currentMonthCA)}</span>, en dessous de ta moyenne de <span className="font-semibold text-white">{formatCurrency(Math.round(avg))}</span>. C&apos;est le moment de facturer.</>),
                    action: "Créer une facture",
                    href: "/documents",
                  });
                } else if (currentMonthCA > avg * 1.3 && avg > 0) {
                  insights.push({
                    emoji: "📈",
                    text: (<>Excellent mois — <span className="text-emerald-400 font-semibold">{formatCurrency(currentMonthCA)}</span> encaissés, <span className="text-emerald-400 font-semibold">{Math.round(((currentMonthCA - avg) / avg) * 100)}%</span> au-dessus de ta moyenne.</>),
                  });
                }
              }

              // 3. Client avec plusieurs factures en retard
              const overdueByClient: Record<string, number> = {};
              documents.filter(
                (d) => d.type === "facture" && d.status !== "paye" && d.status !== "annule" && !!d.due_date && new Date(d.due_date) < now
              ).forEach((d) => { overdueByClient[d.client_id] = (overdueByClient[d.client_id] || 0) + 1; });
              const worstEntry = Object.entries(overdueByClient).sort((a, b) => b[1] - a[1])[0];
              if (worstEntry && worstEntry[1] >= 2) {
                insights.push({
                  emoji: "🔴",
                  text: (<><span className="font-semibold text-white">{getClientName(worstEntry[0])}</span> a <span className="text-red-400 font-semibold">{worstEntry[1]} factures</span> en retard. Ça mérite une relance directe.</>),
                  action: "Relancer",
                  href: "/reminders",
                });
              }

              // 4. Factures dues dans 7 jours (si pas déjà en retard)
              const in7 = new Date(); in7.setDate(in7.getDate() + 7);
              const upcoming = documents.filter(
                (d) => d.type === "facture" && d.status === "envoye" && !!d.due_date && new Date(d.due_date) >= now && new Date(d.due_date) <= in7
              );
              if (upcoming.length > 0 && stats.overdueCount === 0) {
                const upcomingTotal = upcoming.reduce((s, d) => s + d.total_ttc, 0);
                insights.push({
                  emoji: "⏰",
                  text: (<><span className="text-amber-300 font-semibold">{formatCurrency(upcomingTotal)}</span> arrivent à échéance dans 7 jours sur <span className="font-semibold text-white">{upcoming.length} facture{upcoming.length > 1 ? "s" : ""}</span>. Je surveille pour toi.</>),
                });
              }

              if (insights.length === 0) return null;

              return (
                <div className={`rounded-2xl border border-amber-400/10 bg-atlantic-900/20 overflow-hidden transition-all duration-700 ${revealStep >= 6 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-400/10">
                    <div className="w-5 h-5 rounded-md bg-amber-400/20 flex items-center justify-center font-display font-bold text-amber-300 text-[10px] flex-shrink-0">S</div>
                    <p className="text-[10px] font-sans font-semibold text-amber-300">Sam a remarqué</p>
                  </div>
                  <div className="divide-y divide-amber-400/5">
                    {insights.slice(0, 3).map((ins, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 px-5 py-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-sm flex-shrink-0 mt-0.5">{ins.emoji}</span>
                          <p className="text-xs font-sans text-atlantic-200/60 leading-relaxed">{ins.text}</p>
                        </div>
                        {ins.action && ins.href && (
                          <a href={ins.href} className="flex-shrink-0 text-[10px] font-sans font-semibold text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap">
                            {ins.action} →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Sam intermédiaire — bandeau compact */}
        {appMode === "intermediaire" && stats.overdueCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-400/[0.06] border border-amber-400/15">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-display font-bold text-amber-300 text-xs flex-shrink-0">S</div>
            <p className="text-xs font-sans text-white flex-1">
              <span className="text-amber-300 font-semibold">Sam · </span>
              {stats.overdueCount} relance{stats.overdueCount > 1 ? "s" : ""} prioritaire{stats.overdueCount > 1 ? "s" : ""} — {formatCurrency(stats.overdueTotal)} en jeu. Je les ai préparées.
            </p>
            <a href="/reminders" className="flex-shrink-0 text-[10px] font-sans font-semibold text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap">
              Voir →
            </a>
          </div>
        )}

        {/* Overdue alert — Expert uniquement */}
        {appMode === "expert" && stats.overdueCount > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-400/[0.06] border border-red-400/15">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-sans font-medium text-red-400">{stats.overdueCount} facture{stats.overdueCount > 1 ? "s" : ""} en retard</p>
              <p className="text-xs font-sans text-atlantic-200/40">Total impayé : {formatCurrency(stats.overdueTotal)}</p>
            </div>
          </div>
        )}

        {/* KPI Cards — masquées en Découverte (Sam les remplace) */}
        {appMode !== "decouverte" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <GlassCard key={kpi.label} className="group relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-sans font-medium text-atlantic-200/50 uppercase tracking-wider">{kpi.label}</p>
                  <div className="text-3xl font-display font-bold text-white mt-2">
                    <AnimatedCounter target={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals || 0} duration={1.5} />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {kpi.trend === "up" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    ) : kpi.trend === "warning" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={`text-xs font-sans ${kpi.trend === "up" ? "text-emerald-400" : kpi.trend === "warning" ? "text-amber-400" : "text-red-400"}`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-atlantic-700/50 group-hover:bg-atlantic-700/80 transition-colors">
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        )}

        {/* Ligne 1 : Performances + Donut + Documents récents — masqués en Découverte sauf Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rectangle 1 — Lignes de performance — Expert/Intermédiaire uniquement */}
          {appMode !== "decouverte" && (
          <div className="h-full">
            <GlassCard hover={false} className="h-full">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-gold-400" />
                <h3 className="text-lg font-display font-semibold">Performances</h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: "ROI", value: gaugeRate, display: `${gaugeRate}%`, color: "#d4af37" },
                  { label: "Estimation", value: donutTotal > 0 ? Math.min(Math.round((previsionnel / donutTotal) * 100), 100) : 0, display: formatCurrency(previsionnel), color: "#f9a8d4" },
                  { label: "Prédiction IA", value: donutTotal > 0 ? Math.min(Math.round((predictionIA / donutTotal) * 100), 100) : 0, display: formatCurrency(predictionIA), color: "#93c5fd" },
                  { label: "CA encaissé", value: donutTotal > 0 ? Math.min(Math.round((stats.totalCA / donutTotal) * 100), 100) : 0, display: formatCurrency(stats.totalCA), color: "#f5f0e8" },
                  { label: "Clients actifs", value: Math.min(stats.clientCount * 10, 100), display: `${stats.clientCount} clients`, color: "#92400e" },
                ].map(({ label, value, display, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-sans text-atlantic-200/60">{label}</span>
                      <span className="text-xs font-sans font-semibold" style={{ color }}>{display}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-atlantic-800/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-[1.5s] ease-out"
                        style={{ width: `${value}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
          )}

          {/* Rectangle 2 — Donut — Expert/Intermédiaire uniquement */}
          {appMode !== "decouverte" && (
          <div className="h-full">
            <GlassCard hover={false} className="h-full">
              {(() => {
                const dData = [
                  { label: "CA encaissé", value: Math.max(stats.totalCA, 0.01), display: formatCurrency(stats.totalCA), color: "#a78bfa" },
                  { label: "En attente", value: Math.max(stats.pendingTotal, 0.01), display: formatCurrency(stats.pendingTotal), color: "#d4af37" },
                  { label: "Clients actifs", value: Math.max(stats.clientCount * 150, 0.01), display: `${stats.clientCount} clients`, color: "#93c5fd" },
                  { label: "Taux paiement", value: Math.max(stats.paymentRate * 40, 0.01), display: `${Math.round(stats.paymentRate)}%`, color: "#34d399" },
                ];
                const dTotal = dData.reduce((s, d) => s + d.value, 0) || 1;
                const R = 50; const CX = 64; const CY = 64;
                const CIRC = 2 * Math.PI * R;
                let cum = 0;
                const arcs = dData.map((seg) => {
                  const len = (seg.value / dTotal) * CIRC;
                  const off = -cum;
                  cum += len;
                  return { ...seg, len, off };
                });
                return (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-gold-400" />
                      <h3 className="text-lg font-display font-semibold">Aperçu</h3>
                    </div>
                    <div className="flex justify-center mb-5">
                      <div className="relative w-36 h-36">
                        <svg className="w-36 h-36" style={{transform: "rotate(45deg)"}} viewBox="0 0 128 128">
                          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14" />
                          {arcs.map((seg) => (
                            <circle key={seg.label} cx={CX} cy={CY} r={R} fill="none"
                              stroke={seg.color} strokeWidth="14" strokeLinecap="butt"
                              strokeDasharray={`${seg.len} ${CIRC - seg.len}`}
                              strokeDashoffset={seg.off}
                              className="transition-all duration-[1.5s] ease-out"
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-[9px] font-sans text-atlantic-200/40">total</p>
                          <p className="text-xs font-display font-bold text-gold-400">{formatCurrency(stats.totalCA + stats.pendingTotal)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dData.map((seg) => (
                        <div key={seg.label} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                          <span className="text-[10px] font-sans text-atlantic-200/50 flex-1">{seg.label}</span>
                          <span className="text-[10px] font-sans font-semibold text-white">{seg.display}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </GlassCard>
          </div>
          )}

          {/* Documents récents */}
          <div className="flex flex-col gap-6">
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-gold-400" />
                <h3 className="text-lg font-display font-semibold">Documents récents</h3>
              </div>
              {recentDocs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-sans text-atlantic-200/30">Aucun document</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentDocs.map((doc) => {
                    const statusColors: Record<string, string> = {
                      brouillon: "text-atlantic-200/50",
                      valide: "text-blue-400",
                      envoye: "text-amber-400",
                      paye: "text-emerald-400",
                      annule: "text-red-400",
                      refuse: "text-red-400",
                    };
                    return (
                      <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-atlantic-700/30 transition-colors">
                        <FileText className={`w-4 h-4 flex-shrink-0 ${statusColors[doc.status] || "text-atlantic-200/50"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-sans text-atlantic-200/70 truncate">
                            {doc.number} • {getClientName(doc.client_id)}
                          </p>
                          <p className="text-[10px] font-sans text-atlantic-200/30">{doc.status}</p>
                        </div>
                        <p className="text-xs font-sans font-medium text-gold-400">{formatCurrency(doc.total_ttc)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
            <GlassCard hover={false} className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-gold-400" />
                <h3 className="text-lg font-display font-semibold">Suggestions & Prédictions IA</h3>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Ligne 2 : CA Chart + ROI — Expert/Intermédiaire uniquement */}
        {appMode !== "decouverte" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CA Chart — 2/3 */}
          <div className="lg:col-span-2">
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gold-400" />
                  <h3 className="text-lg font-display font-semibold">Évolution du CA</h3>
                </div>
                <span className="text-xs font-sans text-atlantic-200/40 px-3 py-1 rounded-full bg-atlantic-800/50">12 derniers mois</span>
              </div>

              {/* Graphique toujours visible — animation en cascade */}
              <div className="relative">
                <div className="absolute inset-x-0 top-0 h-48 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="border-t border-atlantic-700/20 w-full" />
                  ))}
                </div>
                <div className="flex items-end gap-1.5 h-48 relative">
                  {stats.monthlyCA.map((val, i) => {
                    const heightPct = maxCA > 0 ? (val / maxCA) * 100 : 0;
                    const isCurrentMonth = i === 11;
                    const animatedHeight = chartAnimated ? val > 0 ? `${heightPct}%` : "3%" : "0%";
                    return (
                      <div key={i} className="flex-1 h-full relative group flex items-end">
                        <div
                          className={`w-full rounded-t-md transition-colors duration-300 ${
                            isCurrentMonth
                              ? "bg-gradient-to-t from-gold-400/70 to-gold-400/25 group-hover:from-gold-400/90 group-hover:to-gold-400/40"
                              : "bg-gradient-to-t from-gold-400/40 to-gold-400/10 group-hover:from-gold-400/60 group-hover:to-gold-400/20"
                          }`}
                          style={{
                            height: animatedHeight,
                            transition: `height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 45}ms`,
                          }}
                        />
                        {val > 0 && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-atlantic-800 border border-gold-400/20 text-gold-400 text-xs font-sans px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                            {formatCurrency(val)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 mt-2">
                  {displayMonths.map((m, i) => (
                    <div key={i} className={`flex-1 text-center text-[10px] font-sans ${i === 11 ? "text-gold-400/60 font-semibold" : "text-atlantic-200/30"}`}>{m}</div>
                  ))}
                </div>
                {stats.monthlyCA.every((v) => v === 0) && (
                  <p className="text-center text-xs font-sans text-atlantic-200/20 mt-3">
                    Les données CA apparaîtront avec vos premiers paiements
                  </p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* ROI — 4 indicateurs switchables */}
          <div>
            <GlassCard glow className="relative overflow-hidden h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-atlantic-800/20 to-transparent" />
              <div className="relative flex flex-col h-full gap-4">

                {/* Titre + 4 dots */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gold-400" />
                    <h3 className="text-lg font-display font-semibold">ROI FacturEasy</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {roiMetrics.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => setRoiIndex(i)}
                        className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i === roiIndex ? roiColor(m.score) : "rgba(255,255,255,0.15)", transform: i === roiIndex ? "scale(1.4)" : "scale(1)" }}
                        title={m.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Indicateur actif */}
                {(() => {
                  const active = roiMetrics[roiIndex];
                  const color = roiColor(active.score);
                  const pulseSpeed = active.score >= 80 ? "3s" : active.score >= 50 ? "2s" : "1s";
                  const bagFilter = active.score >= 80
                    ? "drop-shadow(0 0 18px rgba(52,211,153,0.5))"
                    : active.score >= 60
                    ? "drop-shadow(0 0 18px rgba(212,175,55,0.5))"
                    : active.score >= 40
                    ? "drop-shadow(0 0 18px rgba(245,158,11,0.5))"
                    : "drop-shadow(0 0 18px rgba(239,68,68,0.5))";
                  const bagColor1 = active.score >= 80 ? "#6ee7b7" : active.score >= 60 ? "#e6c252" : active.score >= 40 ? "#fbbf24" : "#fca5a5";
                  const bagColor2 = active.score >= 80 ? "#34d399" : active.score >= 60 ? "#d4af37" : active.score >= 40 ? "#f59e0b" : "#ef4444";
                  const bagColor3 = active.score >= 80 ? "#059669" : active.score >= 60 ? "#c9a84c" : active.score >= 40 ? "#d97706" : "#dc2626";

                  return (
                    <div className="flex flex-col items-center gap-2 flex-1 justify-center">
                      {/* Label */}
                      <p className="text-xs font-sans uppercase tracking-widest" style={{ color }}>{active.label}</p>

                      {/* Sac + halo pulsant */}
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-28 h-28 rounded-full opacity-15 animate-ping" style={{ backgroundColor: color, animationDuration: pulseSpeed }} />
                        <svg width="110" height="110" viewBox="0 0 80 80" style={{ filter: bagFilter, transition: "filter 1s ease" }}>
                          <path d="M20 35C18 45 15 55 16 62C17 70 25 75 40 75C55 75 63 70 64 62C65 55 62 45 60 35C58 28 52 25 40 25C28 25 22 28 20 35Z" fill={`url(#bagGrad-${roiIndex})`} stroke={bagColor3} strokeWidth="1.5" />
                          <path d="M30 25C30 25 33 20 40 20C47 20 50 25 50 25" fill="none" stroke={bagColor3} strokeWidth="2" strokeLinecap="round" />
                          <ellipse cx="40" cy="18" rx="6" ry="4" fill={bagColor2} stroke={bagColor3} strokeWidth="1" />
                          <path d="M36 15C38 10 42 10 44 15" fill="none" stroke={bagColor3} strokeWidth="1.5" strokeLinecap="round" />
                          <text x="40" y="55" textAnchor="middle" fill="#1e3a5f" fontSize="22" fontWeight="bold" fontFamily="serif">€</text>
                          <ellipse cx="30" cy="40" rx="4" ry="8" fill="rgba(255,255,255,0.15)" transform="rotate(-15 30 40)" />
                          <defs>
                            <linearGradient id={`bagGrad-${roiIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={bagColor1} />
                              <stop offset="50%" stopColor={bagColor2} />
                              <stop offset="100%" stopColor={bagColor3} />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-white animate-bounce" style={{ backgroundColor: color, borderColor: bagColor1 }}>
                          {active.display}
                        </div>
                      </div>

                      {/* Détail */}
                      <p className="text-[10px] font-sans text-atlantic-200/40 text-center">{active.detail}</p>

                      {/* Barre animée */}
                      <div className="w-full h-1.5 rounded-full bg-atlantic-800/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-[1.5s] ease-out" style={{ width: `${active.score}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Stats fixes en bas */}
                <div className="flex justify-between pt-2 border-t border-gold-400/10">
                  <div>
                    <p className="text-[9px] font-sans text-atlantic-200/30 uppercase tracking-wider">Encaissé</p>
                    <p className="text-xs font-sans font-semibold text-emerald-400">{formatCurrency(stats.totalCA)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-sans text-atlantic-200/30 uppercase tracking-wider">En attente</p>
                    <p className="text-xs font-sans font-semibold text-amber-400">{formatCurrency(stats.pendingTotal)}</p>
                  </div>
                </div>

              </div>
            </GlassCard>
          </div>
        </div>
        )}

        {/* Gamification Section — Expert/Intermédiaire uniquement */}
        {appMode !== "decouverte" && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-400" />
              <h3 className="text-lg font-display font-semibold">Votre progression</h3>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${levelColors.bg} border ${levelColors.border}`}>
              <Crown className={`w-3.5 h-3.5 ${levelColors.text}`} />
              <span className={`text-xs font-sans font-semibold uppercase tracking-wider ${levelColors.text}`}>
                {gamification.level}
              </span>
            </div>
          </div>

          {/* Points + Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-sans text-atlantic-200/60">
                <span className="text-2xl font-display font-bold text-white">{gamification.points}</span> points
              </p>
              <p className="text-xs font-sans text-atlantic-200/40">
                Prochain : {gamification.nextLevelPoints} pts
              </p>
            </div>
            <div className="h-3 bg-atlantic-800/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-400/60 to-gold-400 transition-all duration-[1.5s] ease-out"
                style={{ width: `${gamification.progress}%` }}
              />
            </div>
          </div>

          {/* Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {gamification.badges.map((badge) => {
              const IconComp = BADGE_ICONS[badge.icon] || Star;
              return (
                <div
                  key={badge.id}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    badge.earned
                      ? "bg-gold-400/[0.06] border-gold-400/20 hover:border-gold-400/40"
                      : "bg-atlantic-800/20 border-atlantic-600/10 opacity-40"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${badge.earned ? "bg-gold-400/15" : "bg-atlantic-700/30"}`}>
                    <IconComp className={`w-4 h-4 ${badge.earned ? "text-gold-400" : "text-atlantic-200/30"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-sans font-medium ${badge.earned ? "text-white" : "text-atlantic-200/30"}`}>
                      {badge.name}
                    </p>
                    <p className="text-[9px] font-sans text-atlantic-200/30 leading-tight mt-0.5">{badge.description}</p>
                  </div>
                  {badge.earned && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
        )}

        {/* Quick Stats Row — Expert/Intermédiaire uniquement */}
        {appMode !== "decouverte" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Devis", value: stats.quoteCount, icon: FileText, desc: `${stats.quoteConversion}% conversion` },
            { label: "Produits", value: stats.productCount, icon: Package, desc: "dans le catalogue" },
            { label: "Relances", value: stats.reminderCount, icon: Bell, desc: `${stats.sentReminders} envoyées` },
            { label: "Badges", value: earnedBadges.length, icon: Trophy, desc: `/ ${gamification.badges.length} disponibles` },
          ].map((stat) => (
            <GlassCard key={stat.label} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold-400/10">
                  <stat.icon className="w-4 h-4 text-gold-400/60" />
                </div>
                <div>
                  <p className="text-xl font-display font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] font-sans text-atlantic-200/40">{stat.label} • {stat.desc}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        )}

      </div>

      {/* ═══ PANNEAU IA ═══ */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAIPanel(false)} />
          <div className="relative w-[500px] max-w-[95vw] h-full bg-atlantic-900/98 border-l border-gold-400/15 flex flex-col shadow-2xl overflow-hidden">

            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gold-400/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-gold-400" />
                <h2 className="text-base font-display font-semibold text-white">Analyse IA</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateAIAnalysis()}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-xs font-sans text-atlantic-200/50 hover:text-gold-400 px-2.5 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors disabled:opacity-40"
                  title="Rafraîchir l'analyse"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                  Rafraîchir
                </button>
                <button onClick={() => setShowAIPanel(false)} className="p-1.5 rounded-lg text-atlantic-200/40 hover:text-white hover:bg-atlantic-700/50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-8 h-8 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
                  <p className="text-sm font-sans text-atlantic-200/40">Analyse de votre tableau de bord en cours...</p>
                </div>
              )}

              {!aiLoading && !aiAnalysis && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <Brain className="w-12 h-12 text-gold-400/20" />
                  <p className="text-sm font-sans text-atlantic-200/40">Cliquez sur Rafraîchir pour lancer l&apos;analyse</p>
                </div>
              )}

              {!aiLoading && aiAnalysis && (() => {
                const a = aiAnalysis as {
                  synthesis?: string;
                  kpis?: { ca?: string; pending?: string; clients?: string; paymentRate?: string };
                  roi?: { tauxPaiement?: string; recouvrement?: string; delai?: string; sante?: string };
                  performances?: string;
                  apercu?: string;
                  evolution?: string;
                  gamification?: string;
                  suggestions?: string[];
                  alert?: string | null;
                };
                return (
                  <>
                    {/* Alerte critique */}
                    {a.alert && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-400/[0.07] border border-red-400/20">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-sans text-red-300 leading-relaxed">{a.alert}</p>
                      </div>
                    )}

                    {/* Synthèse globale */}
                    <div className="p-4 rounded-xl bg-gold-400/[0.05] border border-gold-400/15">
                      <p className="text-[10px] font-sans font-semibold text-gold-400/70 uppercase tracking-wider mb-2">Vue d&apos;ensemble</p>
                      <p className="text-sm font-sans text-atlantic-200/80 leading-relaxed">{a.synthesis}</p>
                    </div>

                    {/* KPIs */}
                    <div>
                      <p className="text-[10px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Indicateurs clés
                      </p>
                      <div className="space-y-3">
                        {[
                          { key: "ca", label: `Chiffre d'affaires — ${stats.totalCA.toFixed(0)} €`, color: "text-emerald-400", text: a.kpis?.ca },
                          { key: "pending", label: `En attente — ${stats.pendingTotal.toFixed(0)} €`, color: "text-amber-400", text: a.kpis?.pending },
                          { key: "clients", label: `Clients actifs — ${stats.clientCount}`, color: "text-blue-400", text: a.kpis?.clients },
                          { key: "paymentRate", label: `Taux de paiement — ${stats.paymentRate.toFixed(1)}%`, color: "text-violet-400", text: a.kpis?.paymentRate },
                        ].map((item) => (
                          <div key={item.key} className="p-3 rounded-lg bg-atlantic-800/30 border border-gold-400/5">
                            <p className={`text-xs font-sans font-semibold mb-1.5 ${item.color}`}>{item.label}</p>
                            <p className="text-xs font-sans text-atlantic-200/65 leading-relaxed">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ROI */}
                    <div>
                      <p className="text-[10px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> ROI FacturEasy — 4 indicateurs
                      </p>
                      <div className="space-y-3">
                        {[
                          { label: `Taux de paiement — ${roiMetrics[0].score}%`, text: a.roi?.tauxPaiement, score: roiMetrics[0].score },
                          { label: `Recouvrement — ${roiMetrics[1].score}%`, text: a.roi?.recouvrement, score: roiMetrics[1].score },
                          { label: `Délai moyen — ${roiMetrics[2].value} j`, text: a.roi?.delai, score: roiMetrics[2].score },
                          { label: `Santé globale — ${roiMetrics[3].score}%`, text: a.roi?.sante, score: roiMetrics[3].score },
                        ].map((item, i) => {
                          const c = item.score >= 80 ? "#34d399" : item.score >= 60 ? "#d4af37" : item.score >= 40 ? "#f59e0b" : "#ef4444";
                          return (
                            <div key={i} className="p-3 rounded-lg bg-atlantic-800/30 border border-gold-400/5">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-sans font-semibold text-white">{item.label}</p>
                                <div className="w-16 h-1.5 rounded-full bg-atlantic-700/50 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: c }} />
                                </div>
                              </div>
                              <p className="text-xs font-sans text-atlantic-200/65 leading-relaxed">{item.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Graphiques */}
                    <div>
                      <p className="text-[10px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5" /> Graphiques
                      </p>
                      <div className="space-y-3">
                        {[
                          { label: "Bloc Performances (barres)", text: a.performances },
                          { label: "Aperçu (graphique en anneau)", text: a.apercu },
                          { label: "Évolution du CA (12 mois)", text: a.evolution },
                        ].map((item, i) => (
                          <div key={i} className="p-3 rounded-lg bg-atlantic-800/30 border border-gold-400/5">
                            <p className="text-xs font-sans font-semibold text-gold-400/80 mb-1.5">{item.label}</p>
                            <p className="text-xs font-sans text-atlantic-200/65 leading-relaxed">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gamification */}
                    <div>
                      <p className="text-[10px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Award className="w-3.5 h-3.5" /> Progression & Gamification
                      </p>
                      <div className="p-3 rounded-lg bg-atlantic-800/30 border border-gold-400/5">
                        <p className="text-xs font-sans text-atlantic-200/65 leading-relaxed">{a.gamification}</p>
                      </div>
                    </div>

                    {/* Suggestions */}
                    {a.suggestions && a.suggestions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-gold-400" /> Actions recommandées
                        </p>
                        <div className="space-y-2">
                          {a.suggestions.map((s, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gold-400/[0.05] border border-gold-400/10">
                              <span className="w-5 h-5 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                              <p className="text-xs font-sans text-atlantic-200/75 leading-relaxed">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
