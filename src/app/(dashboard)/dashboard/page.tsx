"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { AnimatedCounter } from "@/components/premium/animated-counter";
import { PageTransition } from "@/components/premium/page-transition";
import {
  FileText, Users, TrendingUp, AlertTriangle, Clock, ArrowUpRight,
  Sparkles, BarChart3, CheckCircle2, XCircle, Package, Bell, Send,
  Award, Shield, Crown, Zap, Trophy, Rocket, Star,
} from "lucide-react";
import {
  getUserGamification,
  getDocuments as getDocumentsLS,
  getClients as getClientsLS,
  getProducts as getProductsLS,
  getReminders as getRemindersLS,
} from "@/lib/local-storage";
import {
  getDocuments as getDocumentsDB,
  getClients as getClientsDB,
  getProducts as getProductsDB,
  getReminders as getRemindersDB,
} from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Document as Doc, Client, Product, Reminder } from "@/types/database";

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
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamification] = useState(() => getUserGamification());
  const [chartAnimated, setChartAnimated] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  async function loadData() {
    try {
      const [docsData, clientsData, productsData, remindersData] = await Promise.all([
        getDocumentsDB(),
        getClientsDB(),
        getProductsDB(),
        getRemindersDB(),
      ]);
      setDocuments(docsData.length > 0 ? docsData : getDocumentsLS());
      setClientsList(clientsData.length > 0 ? clientsData : getClientsLS());
      setProductsList(productsData.length > 0 ? productsData : getProductsLS());
      setReminders(remindersData.length > 0 ? remindersData : getRemindersLS());
    } catch {
      setDocuments(getDocumentsLS());
      setClientsList(getClientsLS());
      setProductsList(getProductsLS());
      setReminders(getRemindersLS());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Supabase Realtime — écoute chaque changement sur documents
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => {
          // Rechargement des documents uniquement (stats recalculées auto)
          getDocumentsDB().then((docs) => {
            if (docs.length > 0) setDocuments(docs);
          });
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setChartAnimated(true), 200);
      return () => clearTimeout(t);
    }
  }, [loading]);

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
            <div className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? "bg-emerald-400 animate-pulse" : "bg-atlantic-400/30"}`} />
            <span className="text-[10px] font-sans text-atlantic-200/40">{realtimeConnected ? "temps réel" : "connexion..."}</span>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Overdue alert */}
        {stats.overdueCount > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-400/[0.06] border border-red-400/15">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-sans font-medium text-red-400">{stats.overdueCount} facture{stats.overdueCount > 1 ? "s" : ""} en retard</p>
              <p className="text-xs font-sans text-atlantic-200/40">Total impayé : {formatCurrency(stats.overdueTotal)}</p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
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

        {/* Ligne 1 : VIDE 2/3 + Documents récents 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rectangle 1 — Lignes de performance */}
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

          {/* Rectangle 2 — Donut */}
          <div className="h-full">
            <GlassCard hover={false} className="h-full">
              {(() => {
                const dData = [
                  { label: "CA encaissé", value: Math.max(stats.totalCA, 0.01), display: formatCurrency(stats.totalCA), color: "#34d399" },
                  { label: "En attente", value: Math.max(stats.pendingTotal, 0.01), display: formatCurrency(stats.pendingTotal), color: "#d4af37" },
                  { label: "Clients actifs", value: Math.max(stats.clientCount * 150, 0.01), display: `${stats.clientCount} clients`, color: "#93c5fd" },
                  { label: "Taux paiement", value: Math.max(stats.paymentRate * 40, 0.01), display: `${Math.round(stats.paymentRate)}%`, color: "#a78bfa" },
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
                        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
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

          {/* Documents récents + rectangle vide */}
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

        {/* Ligne 2 : CA Chart 2/3 + ROI 1/3 */}
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

          {/* ROI — dimensions originales de Documents récents */}
          <div>
            <GlassCard glow className="relative overflow-hidden h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-gold-400/[0.05] to-transparent" />
              <div className="relative">
                {/* Titre centré */}
                <div className="flex items-center gap-2 mb-20">
                  <Sparkles className="w-5 h-5 text-gold-400" />
                  <h3 className="text-lg font-display font-semibold">ROI FacturePro</h3>
                </div>
                {/* Contenu : sac | % | cercle */}
                <div className="flex items-center justify-between gap-3">
                  {/* Money Bag */}
                  <div className="relative flex-shrink-0 animate-float">
                    <svg width="120" height="120" viewBox="0 0 80 80" className="drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                      <path d="M20 35C18 45 15 55 16 62C17 70 25 75 40 75C55 75 63 70 64 62C65 55 62 45 60 35C58 28 52 25 40 25C28 25 22 28 20 35Z" fill="url(#bagGradient)" stroke="#c9a84c" strokeWidth="1.5" />
                      <path d="M30 25C30 25 33 20 40 20C47 20 50 25 50 25" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" />
                      <ellipse cx="40" cy="18" rx="6" ry="4" fill="#d4af37" stroke="#c9a84c" strokeWidth="1" />
                      <path d="M36 15C38 10 42 10 44 15" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
                      <text x="40" y="55" textAnchor="middle" fill="#1e3a5f" fontSize="22" fontWeight="bold" fontFamily="serif">€</text>
                      <ellipse cx="30" cy="40" rx="4" ry="8" fill="rgba(255,255,255,0.15)" transform="rotate(-15 30 40)" />
                      <defs>
                        <linearGradient id="bagGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#e6c252" />
                          <stop offset="50%" stopColor="#d4af37" />
                          <stop offset="100%" stopColor="#c9a84c" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold-400 border border-gold-300 flex items-center justify-center text-[8px] font-bold text-atlantic-900 animate-bounce">€</div>
                  </div>
                  {/* % */}
                  <div className="text-center flex-1">
                    <div className="text-5xl font-display font-bold animated-gold-text">
                      <AnimatedCounter target={gaugeRate} suffix="%" duration={2} />
                    </div>
                    <p className="text-[10px] font-sans text-atlantic-200/40 mt-1">
                      {stats.totalCA > 0 ? `${formatCurrency(stats.totalCA)} encaissés` : "aucun encaissement"}
                    </p>
                  </div>
                  {/* Cercle */}
                  <div className="w-28 h-28 relative flex-shrink-0">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth="7" />
                      <circle cx="48" cy="48" r="40" fill="none" stroke="url(#gaugeGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={gaugeOffset} className="transition-all duration-[2s] ease-out" />
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="40%" stopColor="#f59e0b" />
                          <stop offset="70%" stopColor="#c9a84c" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Star className="w-4 h-4 text-gold-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Gamification Section */}
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

        {/* Quick Stats Row */}
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
      </div>
    </PageTransition>
  );
}
