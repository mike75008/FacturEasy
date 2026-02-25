"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, FileText, Users, Package, Maximize2, Minimize2 } from "lucide-react";
import { getDocuments, getClients, getProducts, computeNotifications } from "@/lib/supabase/data";
import type { Document as Doc, Client, Product, AppNotification, NotificationColor } from "@/lib/supabase/data";
import { useRouter } from "next/navigation";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const COLOR_DOT: Record<NotificationColor, string> = {
  green:  "bg-emerald-400",
  red:    "bg-red-400",
  orange: "bg-orange-400",
  blue:   "bg-blue-400",
  yellow: "bg-yellow-400",
  pink:   "bg-violet-400",
};

const DEFAULT = { x: 200, y: 120, w: 680, h: 480 };
const MIN = { w: 380, h: 300 };

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Window state
  const [pos, setPos] = useState({ x: DEFAULT.x, y: DEFAULT.y });
  const [size, setSize] = useState({ w: DEFAULT.w, h: DEFAULT.h });
  const [maximized, setMaximized] = useState(false);
  const [prevState, setPrevState] = useState({ pos: { x: DEFAULT.x, y: DEFAULT.y }, size: { w: DEFAULT.w, h: DEFAULT.h } });

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data once
  useEffect(() => {
    if (open && !loaded) {
      Promise.all([getDocuments(), getClients(), getProducts(), computeNotifications()])
        .then(([docs, cls, prods, notifs]) => {
          setDocuments(docs);
          setClients(cls);
          setProducts(prods);
          setNotifications(notifs);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, loaded]);

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Drag — title bar
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (maximized) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      setPos({
        x: Math.max(0, dragRef.current.origX + ev.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.origY + ev.clientY - dragRef.current.startY),
      });
    }
    function onUp() {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [maximized, pos]);

  // Resize — bottom-right corner
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };

    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      setSize({
        w: Math.max(MIN.w, resizeRef.current.origW + ev.clientX - resizeRef.current.startX),
        h: Math.max(MIN.h, resizeRef.current.origH + ev.clientY - resizeRef.current.startY),
      });
    }
    function onUp() {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [size]);

  function toggleMaximize() {
    if (maximized) {
      setPos(prevState.pos);
      setSize(prevState.size);
      setMaximized(false);
    } else {
      setPrevState({ pos, size });
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
      setMaximized(true);
    }
  }

  // Notification dot for a document
  function getDocNotif(docId: string): NotificationColor | null {
    const n = notifications.find((n) => n.documentId === docId);
    return n ? n.color : null;
  }

  // Filter results
  const q = query.toLowerCase().trim();
  const filteredDocs = q
    ? documents.filter((d) =>
        d.number.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  const filteredClients = q
    ? clients.filter((c) =>
        (c.company_name || "").toLowerCase().includes(q) ||
        (c.first_name || "").toLowerCase().includes(q) ||
        (c.last_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const filteredProducts = q
    ? products.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const hasResults = filteredDocs.length > 0 || filteredClients.length > 0 || filteredProducts.length > 0;

  if (!open) return null;

  const windowStyle = maximized
    ? { top: 0, left: 0, width: "100vw", height: "100vh" }
    : { top: pos.y, left: pos.x, width: size.w, height: size.h };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop transparent — on voit le contenu derrière */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />

      {/* Fenêtre redimensionnable */}
      <div
        className="absolute flex flex-col rounded-xl border border-gold-400/15 bg-atlantic-900/98 backdrop-blur-xl shadow-2xl overflow-hidden pointer-events-auto"
        style={windowStyle}
      >
        {/* Barre de titre — drag zone */}
        <div
          onMouseDown={onDragStart}
          className="flex items-center gap-3 px-4 py-3 border-b border-gold-400/10 bg-gradient-to-r from-gold-400/[0.05] to-transparent select-none cursor-move"
        >
          <Search className="w-4 h-4 text-gold-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un document, client, produit..."
            className="flex-1 bg-transparent text-sm font-sans text-white placeholder-atlantic-200/30 outline-none cursor-text"
            onMouseDown={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMaximize}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-colors"
            >
              {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-atlantic-200/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Résultats */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {!q && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
              <Search className="w-10 h-10 text-gold-400/20" />
              <p className="text-sm font-sans text-atlantic-200/40">Tapez pour rechercher</p>
              <p className="text-xs font-sans text-atlantic-200/25">Documents · Clients · Produits</p>
            </div>
          )}

          {q && !hasResults && loaded && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <p className="text-sm font-sans text-atlantic-200/40">Aucun résultat pour &quot;{query}&quot;</p>
            </div>
          )}

          {/* Documents */}
          {filteredDocs.length > 0 && (
            <div>
              <p className="text-[10px] font-sans font-semibold text-atlantic-200/30 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-3 h-3" /> Documents
              </p>
              <div className="space-y-1">
                {filteredDocs.map((doc) => {
                  const notifColor = getDocNotif(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => { router.push("/documents"); onClose(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gold-400/5 border border-transparent hover:border-gold-400/10 transition-all text-left"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        doc.type === "facture" ? "bg-emerald-400/10 text-emerald-400" :
                        doc.type === "devis" ? "bg-blue-400/10 text-blue-400" :
                        "bg-amber-400/10 text-amber-400"
                      }`}>
                        {doc.type === "facture" ? "FAC" : doc.type === "devis" ? "DEV" : "AVO"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans font-medium text-white truncate">{doc.number}</p>
                        <p className="text-[10px] font-sans text-atlantic-200/40 capitalize">{doc.type} · {doc.status}</p>
                      </div>
                      {notifColor && notifColor !== "green" && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${COLOR_DOT[notifColor]}`} />
                      )}
                      <p className="text-xs font-sans font-semibold text-gold-400 flex-shrink-0">
                        {doc.total_ttc.toFixed(2)} €
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clients */}
          {filteredClients.length > 0 && (
            <div>
              <p className="text-[10px] font-sans font-semibold text-atlantic-200/30 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" /> Clients
              </p>
              <div className="space-y-1">
                {filteredClients.map((client) => {
                  const name = client.company_name || `${client.first_name || ""} ${client.last_name || ""}`.trim();
                  return (
                    <button
                      key={client.id}
                      onClick={() => { router.push("/clients"); onClose(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gold-400/5 border border-transparent hover:border-gold-400/10 transition-all text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gold-400/10 flex items-center justify-center text-[10px] font-bold text-gold-400 flex-shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans font-medium text-white truncate">{name}</p>
                        <p className="text-[10px] font-sans text-atlantic-200/40 truncate">{client.email || "Pas d'email"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Produits */}
          {filteredProducts.length > 0 && (
            <div>
              <p className="text-[10px] font-sans font-semibold text-atlantic-200/30 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Package className="w-3 h-3" /> Produits
              </p>
              <div className="space-y-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => { router.push("/products"); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gold-400/5 border border-transparent hover:border-gold-400/10 transition-all text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-atlantic-700/50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-3.5 h-3.5 text-atlantic-200/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans font-medium text-white truncate">{product.name}</p>
                      <p className="text-[10px] font-sans text-atlantic-200/40">{product.unit_price.toFixed(2)} € / {product.unit}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Poignée de redimensionnement — coin bas-droite */}
        {!maximized && (
          <div
            onMouseDown={onResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
            style={{
              background: "linear-gradient(135deg, transparent 50%, rgba(212,175,55,0.3) 50%)",
            }}
          />
        )}
      </div>
    </div>
  );
}
