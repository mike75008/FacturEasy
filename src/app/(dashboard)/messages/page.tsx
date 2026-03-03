"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PageTransition } from "@/components/premium/page-transition";
import { Sparkles, CheckCheck, CreditCard, FileText, Bell, AlertTriangle, Inbox } from "lucide-react";
import {
  getNotifications,
  markNotifRead,
  markAllNotifsRead,
  getUnreadNotifCount,
  type AppNotification,
  type NotificationCategory,
} from "@/lib/notifications";

const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; icon: React.ElementType; color: string; dot: string }> = {
  paiement:    { label: "Paiements",   icon: CreditCard,     color: "text-emerald-400", dot: "bg-emerald-400" },
  commercial:  { label: "Commercial",  icon: FileText,       color: "text-blue-400",    dot: "bg-blue-400"    },
  relance:     { label: "Relances",    icon: Bell,           color: "text-amber-400",   dot: "bg-amber-400"   },
  alerte:      { label: "Alertes",     icon: AlertTriangle,  color: "text-red-400",     dot: "bg-red-400"     },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export default function MessagesPage() {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | "all">("all");

  function reload() {
    setNotifs(getNotifications());
  }

  useEffect(() => {
    reload();
    window.addEventListener("notifications-updated", reload);
    return () => window.removeEventListener("notifications-updated", reload);
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const filtered = activeCategory === "all"
    ? notifs
    : notifs.filter((n) => n.category === activeCategory);

  const categories = (["all", "paiement", "commercial", "relance", "alerte"] as const);

  function handleRead(id: string) {
    markNotifRead(id);
    reload();
  }

  function handleReadAll() {
    markAllNotifsRead();
    reload();
  }

  return (
    <PageTransition>
      <Topbar
        title="Messages"
        subtitle={unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? "s" : ""}` : "Tout est à jour"}
      />
      <div className="p-6 space-y-4">

        {/* Sam — bannière si non lus */}
        {unreadCount > 0 && (
          <GlassCard hover={false} className="border-gold-400/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gold-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans font-semibold text-gold-400 mb-0.5">Sam</p>
                <p className="text-sm font-sans text-atlantic-200/70">
                  {unreadCount === 1
                    ? "Tu as 1 nouveau message. Voilà ce qui s'est passé."
                    : `Tu as ${unreadCount} nouveaux messages. Voilà ce qui s'est passé.`}
                </p>
              </div>
              <button
                onClick={handleReadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlantic-700/50 border border-atlantic-500/20 text-atlantic-200/60 text-xs font-sans hover:text-white hover:border-atlantic-400/40 transition-colors flex-shrink-0"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout lire
              </button>
            </div>
          </GlassCard>
        )}

        {/* Filtres par écurie */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const isAll = cat === "all";
            const cfg = isAll ? null : CATEGORY_CONFIG[cat];
            const count = isAll
              ? notifs.filter((n) => !n.read).length
              : notifs.filter((n) => n.category === cat && !n.read).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium border transition-colors ${
                  activeCategory === cat
                    ? "bg-gold-400/15 border-gold-400/30 text-gold-400"
                    : "bg-atlantic-800/40 border-atlantic-600/20 text-atlantic-200/50 hover:text-white hover:border-atlantic-400/30"
                }`}
              >
                {cfg && <cfg.icon className={`w-3 h-3 ${cfg.color}`} />}
                {isAll ? "Tout" : cfg?.label}
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-gold-400/20 text-gold-400 text-[9px] flex items-center justify-center font-bold">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        {filtered.length === 0 ? (
          <GlassCard hover={false} className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-gold-400/30" />
              </div>
              <p className="text-sm font-sans font-medium text-white mb-1">Aucun message</p>
              <p className="text-xs font-sans text-atlantic-200/40">
                Les notifications apparaîtront ici au fil de tes actions.
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => {
              const cfg = CATEGORY_CONFIG[notif.category];
              const Icon = cfg.icon;
              return (
                <GlassCard
                  key={notif.id}
                  hover={false}
                  className={`!p-4 cursor-pointer transition-all ${!notif.read ? "border-gold-400/15" : "opacity-70"}`}
                  onClick={() => !notif.read && handleRead(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icône catégorie */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      notif.category === "paiement"   ? "bg-emerald-400/10" :
                      notif.category === "commercial" ? "bg-blue-400/10"    :
                      notif.category === "relance"    ? "bg-amber-400/10"   :
                      "bg-red-400/10"
                    }`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Titre + heure */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-sm font-sans font-semibold ${notif.read ? "text-atlantic-200/60" : "text-white"}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] font-sans text-atlantic-200/30 flex-shrink-0">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>

                      {/* Body */}
                      <p className="text-xs font-sans text-atlantic-200/50 mb-2">{notif.body}</p>

                      {/* Voix de Sam */}
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-gold-400/60 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-sans text-gold-400/70 italic">{notif.samVoice}</p>
                      </div>
                    </div>

                    {/* Point non lu */}
                    {!notif.read && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
