"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, MessageSquare, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("Utilisateur");
  const [userEmail, setUserEmail] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "Utilisateur";
        setUserName(name);
        setUserEmail(session.user.email || "");
      }
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
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

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gold-400/10 bg-atlantic-900/40 backdrop-blur-xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm font-sans text-atlantic-200/40 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-200">
          <Search className="w-5 h-5" />
        </button>
        <button className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-200 relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
        </button>
        <button className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-200 relative">
          <Bell className="w-5 h-5" />
        </button>

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
  );
}
