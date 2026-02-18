"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { AnimatedCounter } from "@/components/premium/animated-counter";
import { PageTransition } from "@/components/premium/page-transition";
import {
  FileText,
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const stats = [
  {
    label: "Chiffre d'affaires",
    value: 24850,
    prefix: "",
    suffix: " \u20ac",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    color: "from-emerald-400/20 to-emerald-400/5",
    iconColor: "text-emerald-400",
  },
  {
    label: "Factures en cours",
    value: 18,
    prefix: "",
    suffix: "",
    change: "3 en retard",
    trend: "warning",
    icon: FileText,
    color: "from-gold-400/20 to-gold-400/5",
    iconColor: "text-gold-400",
  },
  {
    label: "Clients actifs",
    value: 42,
    prefix: "",
    suffix: "",
    change: "+5 ce mois",
    trend: "up",
    icon: Users,
    color: "from-blue-400/20 to-blue-400/5",
    iconColor: "text-blue-400",
  },
  {
    label: "Taux de paiement",
    value: 94.2,
    prefix: "",
    suffix: "%",
    change: "+2.1%",
    trend: "up",
    icon: TrendingUp,
    color: "from-violet-400/20 to-violet-400/5",
    iconColor: "text-violet-400",
    decimals: 1,
  },
];

const recentActivity = [
  { type: "payment", text: "Paiement re\u00e7u - Facture FAC-2026-00042", time: "Il y a 2h", icon: CheckCircle2, color: "text-emerald-400" },
  { type: "invoice", text: "Facture FAC-2026-00043 envoy\u00e9e \u00e0 Martin SARL", time: "Il y a 4h", icon: FileText, color: "text-blue-400" },
  { type: "reminder", text: "Relance IA envoy\u00e9e - Dupont & Fils", time: "Il y a 6h", icon: Sparkles, color: "text-gold-400" },
  { type: "overdue", text: "Facture FAC-2026-00038 en retard (15j)", time: "Il y a 1j", icon: XCircle, color: "text-red-400" },
  { type: "quote", text: "Devis DEV-2026-00015 accept\u00e9 par Sophie L.", time: "Il y a 1j", icon: CheckCircle2, color: "text-emerald-400" },
];

const monthlyData = [35, 42, 38, 55, 48, 65, 72, 68, 85, 78, 92, 88];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function DashboardPage() {
  const maxData = Math.max(...monthlyData);

  return (
    <PageTransition>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activit\u00e9"
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <GlassCard className="group relative overflow-hidden">
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-sans font-medium text-atlantic-200/50 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <div className="text-3xl font-display font-bold text-white mt-2">
                      <AnimatedCounter
                        target={stat.value}
                        suffix={stat.suffix}
                        prefix={stat.prefix}
                        decimals={stat.decimals || 0}
                        duration={1.5}
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      ) : stat.trend === "warning" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className={`text-xs font-sans ${
                        stat.trend === "up" ? "text-emerald-400" :
                        stat.trend === "warning" ? "text-amber-400" : "text-red-400"
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-atlantic-700/50 group-hover:bg-atlantic-700/80 transition-colors">
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* ROI Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard glow className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gold-400/[0.05] to-transparent" />
            <div className="relative flex items-center gap-6">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="p-4 rounded-2xl bg-gold-gradient shadow-premium-lg"
              >
                <DollarSign className="w-10 h-10 text-atlantic-900" />
              </motion.div>
              <div className="flex-1">
                <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                  ROI FacturePro
                  <Sparkles className="w-4 h-4 text-gold-400" />
                </h3>
                <p className="text-sm font-sans text-atlantic-200/50 mt-1">
                  Temps \u00e9conomis\u00e9 gr\u00e2ce \u00e0 l&apos;automatisation et l&apos;IA
                </p>
              </div>

              {/* Gauge */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-4xl font-display font-bold animated-gold-text">
                    <AnimatedCounter target={12.5} suffix="h" decimals={1} duration={2} />
                  </div>
                  <p className="text-xs font-sans text-atlantic-200/40">/ mois \u00e9conomis\u00e9es</p>
                </div>
                <div className="w-20 h-20 relative">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth="6" />
                    <motion.circle
                      cx="40" cy="40" r="34" fill="none" stroke="url(#gold-grad)" strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 34 * 0.25 }}
                      transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c9a84c" />
                        <stop offset="100%" stopColor="#e6c252" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-sans font-bold text-gold-400">75%</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Charts + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mini chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gold-400" />
                  <h3 className="text-lg font-display font-semibold">
                    \u00c9volution du CA
                  </h3>
                </div>
                <span className="text-xs font-sans text-atlantic-200/40 px-3 py-1 rounded-full bg-atlantic-800/50">
                  12 derniers mois
                </span>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-2 h-48">
                {monthlyData.map((val, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 relative group"
                    initial={{ height: 0 }}
                    animate={{ height: `${(val / maxData) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.6 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="absolute inset-0 rounded-t-md bg-gradient-to-t from-gold-400/40 to-gold-400/10 group-hover:from-gold-400/60 group-hover:to-gold-400/20 transition-colors duration-300" />
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-atlantic-800 text-gold-400 text-xs font-sans px-2 py-1 rounded whitespace-nowrap">
                      {val}k\u20ac
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] font-sans text-atlantic-200/30">{m}</div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard hover={false} className="h-full">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-gold-400" />
                <h3 className="text-lg font-display font-semibold">
                  Activit\u00e9 r\u00e9cente
                </h3>
              </div>
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-atlantic-700/30 transition-colors cursor-pointer group"
                  >
                    <a.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-sans text-atlantic-200/70 group-hover:text-white transition-colors leading-relaxed truncate">
                        {a.text}
                      </p>
                      <p className="text-[10px] font-sans text-atlantic-200/30 mt-0.5">
                        {a.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
