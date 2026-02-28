"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, MessageSquare, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/context/app-context";
import type { NotificationColor } from "@/lib/supabase/data";

interface TopbarProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  rightExtra?: React.ReactNode;
}

export function Topbar({ title, subtitle, extra, rightExtra }: TopbarProps) {
  const router = useRouter();
  const { userName, userEmail, notifications } = useAppContext();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const PRIORITY: NotificationColor[] = ["red", "orange", "yellow", "blue", "pink", "green"];
  const topColor: NotificationColor = notifications.reduce<NotificationColor>((acc, n) => {
    return PRIORITY.indexOf(n.color) < PRIORITY.indexOf(acc) ? n.color : acc;
  }, "green");

  const COLOR_MAP: Record<NotificationColor, { bell: string; dot: string; bg: string; text: string }> = {
    green:  { bell: "text-emerald-400", dot: "bg-emerald-400", bg: "bg-emerald-400/10", text: "text-emerald-400" },
    red:    { bell: "text-red-400",     dot: "bg-red-400",     bg: "bg-red-400/10",     text: "text-red-400" },
    orange: { bell: "text-orange-400",  dot: "bg-orange-400",  bg: "bg-orange-400/10",  text: "text-orange-400" },
    blue:   { bell: "text-blue-400",    dot: "bg-blue-400",    bg: "bg-blue-400/10",    text: "text-blue-400" },
    yellow: { bell: "text-yellow-400",  dot: "bg-yellow-400",  bg: "bg-yellow-400/10",  text: "text-yellow-400" },
    pink:   { bell: "text-violet-400",  dot: "bg-violet-400",  bg: "bg-violet-400/10",  text: "text-violet-400" },
  };

  const alertCount = notifications.filter((n) => n.color !== "green").length;

  const EMOJI_MAP: Record<NotificationColor, string> = {
    red: "🔴", orange: "🟠", yellow: "🟡", blue: "🔵", pink: "🟣", green: "✅",
  };

  const topNotif = notifications.find((n) => n.color === topColor);

  const criticalNotifs = notifications
    .filter((n) => n.color !== "green")
    .sort((a, b) => PRIORITY.indexOf(a.color) - PRIORITY.indexOf(b.color))
    .slice(0, 5);

  const tickerList = criticalNotifs.length > 0 ? criticalNotifs : (topNotif ? [topNotif] : []);

  useEffect(() => {
    if (tickerList.length <= 1) return;
    const interval = setInterval(() => setTickerIndex((i) => (i + 1) % tickerList.length), 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerList.length]);

  const activeNotif = tickerList[tickerIndex % Math.max(tickerList.length, 1)];

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gold-400/10 bg-atlantic-900/40 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm font-sans text-atlantic-200/40 mt-0.5">{subtitle}</p>
          )}
        </div>
        {extra && <div className="ml-2">{extra}</div>}
      </div>

      {activeNotif && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gold-400/20 bg-atlantic-800/30 max-w-sm overflow-hidden">
          <span className="text-sm flex-shrink-0">{EMOJI_MAP[activeNotif.color]}</span>
          <span className={`text-xs font-sans font-medium flex-shrink-0 ${COLOR_MAP[activeNotif.color].text}`}>{activeNotif.title}</span>
          {activeNotif.message && (
            <span className="text-xs font-sans text-atlantic-200/40 hidden lg:block truncate">— {activeNotif.message}</span>
          )}
          {tickerList.length > 1 && (
            <span className="text-[9px] font-sans text-atlantic-200/30 flex-shrink-0">{tickerIndex % tickerList.length + 1}/{tickerList.length}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {rightExtra}
        <button
          onClick={() => (window as unknown as Record<string, unknown>).__openSearch?.()}
          className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-200"
          title="Recherche (Ctrl+K)"
        >
          <Search className="w-5 h-5" />
        </button>
        <button className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-200 relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
        </button>
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className={`p-2.5 rounded-xl transition-all duration-200 relative hover:bg-white/5 ${COLOR_MAP[topColor].bell}`}
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className={`absolute top-1 right-1 w-4 h-4 rounded-full ${COLOR_MAP[topColor].dot} flex items-center justify-center text-[9px] font-bold text-white`}>
                {alertCount}
              </span>
            )}
            {alertCount === 0 && (
              <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${COLOR_MAP[topColor].dot}`} />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gold-400/10 bg-atlantic-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gold-400/10 flex items-center justify-between">
                <p className="text-sm font-sans font-semibold text-white">Notifications</p>
                {alertCount > 0 && (
                  <span className={`text-xs font-sans px-2 py-0.5 rounded-full ${COLOR_MAP[topColor].bg} ${COLOR_MAP[topColor].text}`}>
                    {alertCount} alerte{alertCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-gold-400/5 hover:bg-white/5 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${COLOR_MAP[n.color].dot}`} />
                    <div>
                      <p className={`text-xs font-sans font-semibold ${COLOR_MAP[n.color].text}`}>{n.title}</p>
                      <p className="text-xs font-sans text-atlantic-200/50 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-gold-400/10 mx-1" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gold-400/5 transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center text-atlantic-900 font-sans font-bold text-sm shadow-premium">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-sans font-medium text-white leading-tight">{userName}</p>
              <p className="text-[10px] font-sans text-atlantic-200/40 truncate max-w-[140px]">{userEmail || "Propriétaire"}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-atlantic-200/30 transition-transform hidden md:block ${showMenu ? "rotate-180" : ""}`} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-gold-400/10 bg-atlantic-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gold-400/10">
                <p className="text-xs font-sans font-medium text-white truncate">{userName}</p>
                <p className="text-[10px] font-sans text-atlantic-200/40 truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-sans text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    </>
  );
}
