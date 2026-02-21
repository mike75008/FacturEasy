"use client";

import { useState, useEffect } from "react";
import { SearchModal } from "./search-modal";

export function DashboardOverlays() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Expose open function globally so topbar can call it
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__openSearch = () => setSearchOpen(true);
    return () => { delete (window as unknown as Record<string, unknown>).__openSearch; };
  }, []);

  return (
    <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
  );
}
