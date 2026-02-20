"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PageTransition } from "@/components/premium/page-transition";
import {
  Activity, ShieldCheck, AlertTriangle, Eye, RefreshCw,
  CheckCircle2, XCircle, FileText, Users, TrendingDown,
  Copy, Clock, Sparkles, Shield, Search,
} from "lucide-react";
import {
  runAnomalyDetection, getAnomalies, resolveAnomaly,
  getDocuments, getClients, getDashboardStats,
} from "@/lib/local-storage";
import type { LocalAnomaly } from "@/lib/local-storage";
import { formatCurrency, formatDateShort } from "@/lib/utils";

const SEVERITY_CONFIG = {
  info: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", icon: Eye },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: AlertTriangle },
  critical: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", icon: XCircle },
};

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  montant_anormal: { icon: TrendingDown, label: "Montant anormal" },
  doublon: { icon: Copy, label: "Doublon potentiel" },
  retard_paiement: { icon: Clock, label: "Retard critique" },
  degradation: { icon: Users, label: "Dégradation client" },
  sequence_gap: { icon: FileText, label: "Rupture séquence" },
};

export default function MonitoringPage() {
  const [anomalies, setAnomalies] = useState<LocalAnomaly[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [stats, setStats] = useState<ReturnType<typeof getDashboardStats> | null>(null);

  useEffect(() => {
    setAnomalies(getAnomalies());
    setStats(getDashboardStats());
  }, []);

  const filtered = useMemo(() => {
    let list = anomalies;
    if (filter === "active") list = list.filter((a) => !a.resolved);
    if (filter === "resolved") list = list.filter((a) => a.resolved);
    return list.sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });
  }, [anomalies, filter]);

  const activeCount = anomalies.filter((a) => !a.resolved).length;
  const criticalCount = anomalies.filter((a) => !a.resolved && a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => !a.resolved && a.severity === "warning").length;

  function handleScan() {
    setScanning(true);
    setTimeout(() => {
      const result = runAnomalyDetection();
      setAnomalies(result);
      setLastScan(new Date().toISOString());
      setScanning(false);
    }, 2000);
  }

  function handleResolve(id: string) {
    resolveAnomaly(id);
    setAnomalies(getAnomalies());
  }

  const systemStatus = criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "ok";

  return (
    <PageTransition>
      <Topbar
        title="Monitoring"
        subtitle={`${activeCount} alerte${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""}`}
      />

      <div className="p-6 space-y-6">
        {/* System Status Bar */}
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            systemStatus === "critical"
              ? "bg-red-400/[0.06] border-red-400/15"
              : systemStatus === "warning"
              ? "bg-amber-400/[0.06] border-amber-400/15"
              : "bg-emerald-400/[0.06] border-emerald-400/15"
          }`}
        >
          <div className="animate-pulse">
            {systemStatus === "critical" ? (
              <XCircle className="w-5 h-5 text-red-400" />
            ) : systemStatus === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-sans font-medium ${
              systemStatus === "critical" ? "text-red-400" : systemStatus === "warning" ? "text-amber-400" : "text-emerald-400"
            }`}>
              {systemStatus === "critical"
                ? `${criticalCount} alerte${criticalCount > 1 ? "s" : ""} critique${criticalCount > 1 ? "s" : ""} !`
                : systemStatus === "warning"
                ? `${warningCount} avertissement${warningCount > 1 ? "s" : ""} à examiner`
                : "Système opérationnel"}
            </p>
            <p className="text-xs font-sans text-atlantic-200/40">
              {lastScan
                ? `Dernière analyse : ${formatDateShort(lastScan)}`
                : "Lancez une analyse pour détecter les anomalies"}
            </p>
          </div>
          <PremiumButton
            size="sm"
            variant={systemStatus === "ok" ? "outline" : "primary"}
            icon={<RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />}
            onClick={handleScan}
            loading={scanning}
          >
            {scanning ? "Analyse..." : "Analyser"}
          </PremiumButton>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Alertes actives",
              value: activeCount,
              icon: AlertTriangle,
              color: activeCount > 0 ? "text-amber-400" : "text-emerald-400",
              bg: activeCount > 0 ? "bg-amber-400/10" : "bg-emerald-400/10",
            },
            {
              label: "Critiques",
              value: criticalCount,
              icon: XCircle,
              color: criticalCount > 0 ? "text-red-400" : "text-atlantic-200/30",
              bg: criticalCount > 0 ? "bg-red-400/10" : "bg-atlantic-800/30",
            },
            {
              label: "Résolues",
              value: anomalies.filter((a) => a.resolved).length,
              icon: CheckCircle2,
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
            },
            {
              label: "Score santé",
              value: stats ? (stats.overdueCount === 0 && stats.invoiceCount > 0 ? 100 : stats.invoiceCount > 0 ? Math.max(0, 100 - stats.overdueCount * 15 - criticalCount * 20) : 100) : 100,
              icon: Shield,
              color: "text-gold-400",
              bg: "bg-gold-400/10",
              suffix: "%",
            },
          ].map((stat) => (
            <GlassCard key={stat.label} className="!p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-white">
                    {stat.value}{stat.suffix || ""}
                  </p>
                  <p className="text-[10px] font-sans text-atlantic-200/40">{stat.label}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "Toutes", count: anomalies.length },
            { key: "active", label: "Actives", count: activeCount },
            { key: "resolved", label: "Résolues", count: anomalies.filter((a) => a.resolved).length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-2 rounded-lg text-xs font-sans font-medium transition-all ${
                filter === tab.key
                  ? "bg-gold-400/15 text-gold-400 border border-gold-400/20"
                  : "bg-atlantic-800/30 text-atlantic-200/50 border border-transparent hover:border-gold-400/10"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Anomalies List */}
        {filtered.length === 0 ? (
          <GlassCard hover={false} className="py-16">
            <div className="text-center">
              <div className="inline-block animate-float">
                <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6">
                  <Activity className="w-10 h-10 text-gold-400/40" />
                </div>
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">
                {filter === "resolved" ? "Aucune alerte résolue" : "Aucune anomalie détectée"}
              </h3>
              <p className="text-sm font-sans text-atlantic-200/40 max-w-md mx-auto mb-6">
                {anomalies.length === 0
                  ? "Lancez une analyse pour scanner vos factures à la recherche d'anomalies, doublons et comportements à risque."
                  : "Toutes les anomalies sont résolues."}
              </p>
              {anomalies.length === 0 && (
                <PremiumButton
                  icon={<Search className="w-4 h-4" />}
                  onClick={handleScan}
                  loading={scanning}
                >
                  Lancer l&apos;analyse
                </PremiumButton>
              )}
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filtered.map((anomaly) => {
              const severity = SEVERITY_CONFIG[anomaly.severity];
              const typeConf = TYPE_CONFIG[anomaly.type] || { icon: AlertTriangle, label: anomaly.type };
              const TypeIcon = typeConf.icon;
              const SeverityIcon = severity.icon;

              return (
                <GlassCard key={anomaly.id} className={`!p-4 ${anomaly.resolved ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${severity.bg} flex-shrink-0`}>
                      <SeverityIcon className={`w-5 h-5 ${severity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-sans font-medium text-white">{anomaly.title}</p>
                        <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${severity.bg} ${severity.color}`}>
                          {anomaly.severity}
                        </span>
                        <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-atlantic-700/30 text-atlantic-200/50 flex items-center gap-1">
                          <TypeIcon className="w-2.5 h-2.5" />
                          {typeConf.label}
                        </span>
                        {anomaly.resolved && (
                          <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Résolu
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-sans text-atlantic-200/50 leading-relaxed">{anomaly.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-[10px] font-sans text-atlantic-200/30">
                          {new Date(anomaly.created_at).toLocaleString("fr-FR")}
                        </p>
                        {anomaly.resolved && anomaly.resolved_at && (
                          <p className="text-[10px] font-sans text-emerald-400/50">
                            Résolu le {new Date(anomaly.resolved_at).toLocaleString("fr-FR")}
                          </p>
                        )}
                      </div>
                    </div>
                    {!anomaly.resolved && (
                      <PremiumButton
                        variant="outline"
                        size="sm"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => handleResolve(anomaly.id)}
                      >
                        Résoudre
                      </PremiumButton>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Monitoring features info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: AlertTriangle,
              label: "Détection d'anomalies",
              desc: "Montants inhabituels, doublons potentiels, écarts de séquence",
              color: "text-amber-400",
            },
            {
              icon: Eye,
              label: "Surveillance clients",
              desc: "Dégradation de paiement, risque d'impayé, comportements à risque",
              color: "text-blue-400",
            },
            {
              icon: Sparkles,
              label: "Alertes prédictives",
              desc: "Retards critiques, tendances négatives, actions recommandées",
              color: "text-violet-400",
            },
          ].map((feature) => (
            <GlassCard key={feature.label} className="!p-4">
              <feature.icon className={`w-6 h-6 ${feature.color} mb-3`} />
              <p className="text-xs font-sans font-medium text-atlantic-200/70 mb-1">{feature.label}</p>
              <p className="text-[10px] font-sans text-atlantic-200/30 leading-relaxed">{feature.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
