// Module dépenses — Supabase en priorité, localStorage en fallback
import {
  getDepensesDB,
  saveDepenseDB,
  deleteDepenseDB,
} from "@/lib/supabase/data";
import type { Depense } from "@/types/database";

export type { Depense };

export const CATEGORIES = [
  { code: "601", lib: "Achats matières premières" },
  { code: "604", lib: "Achats d'études et prestations" },
  { code: "606", lib: "Fournitures et petit équipement" },
  { code: "611", lib: "Sous-traitance générale" },
  { code: "613", lib: "Locations et charges locatives" },
  { code: "615", lib: "Entretien et réparations" },
  { code: "616", lib: "Assurances" },
  { code: "622", lib: "Honoraires (experts, avocats)" },
  { code: "623", lib: "Publicité et communication" },
  { code: "624", lib: "Transports et livraisons" },
  { code: "625", lib: "Déplacements et missions" },
  { code: "626", lib: "Frais télécom et internet" },
  { code: "627", lib: "Services bancaires et frais financiers" },
  { code: "628", lib: "Autres charges de gestion courante" },
];

export const TVA_RATES = [0, 2.1, 5.5, 10, 20];

// ── Fallback localStorage ────────────────────────────────────────────────────
const LS_KEY = "depenses_comptabilite_v1";

function getDepensesLS(): Depense[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}

function saveDepenseLS(d: Depense): void {
  if (typeof window === "undefined") return;
  const all = getDepensesLS();
  const idx = all.findIndex((x) => x.id === d.id);
  if (idx >= 0) all[idx] = d; else all.unshift(d);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

function deleteDepenseLS(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(getDepensesLS().filter((d) => d.id !== id)));
}

// ── Fonctions publiques (Supabase-first) ─────────────────────────────────────

export async function getDepenses(): Promise<Depense[]> {
  try { return await getDepensesDB(); } catch { return getDepensesLS(); }
}

export async function saveDepense(d: Depense): Promise<void> {
  try { await saveDepenseDB(d); } catch { saveDepenseLS(d); }
}

export async function deleteDepense(id: string): Promise<void> {
  try { await deleteDepenseDB(id); } catch { deleteDepenseLS(id); }
}
