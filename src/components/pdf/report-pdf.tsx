"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ─── Palette ──────────────────────────────────────────────────────────────────
const GOLD = "#d4af37";
const DARK = "#081525";
const DARK2 = "#0d1f35";
const WHITE = "#ffffff";
const MUTED = "#9fb9d8";
const LIGHT = "#e8f0f9";
const RED = "#f87171";
const GREEN = "#4ade80";

const s = StyleSheet.create({
  page: { backgroundColor: DARK, color: WHITE, fontFamily: "Helvetica", padding: 40, fontSize: 9 },
  // Barre dorée
  topBar: { height: 4, backgroundColor: GOLD, marginBottom: 28, borderRadius: 2 },
  bottomBar: { height: 2, backgroundColor: GOLD, marginTop: "auto", borderRadius: 2 },
  // En-tête
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  headerLeft: { flex: 1 },
  appName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1 },
  reportTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: WHITE, marginTop: 4 },
  reportSubtitle: { fontSize: 9, color: MUTED, marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  dateText: { fontSize: 8, color: MUTED },
  periodBadge: { backgroundColor: GOLD, color: DARK, fontSize: 8, fontFamily: "Helvetica-Bold", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4 },
  // Séparateur
  divider: { height: 1, backgroundColor: GOLD, opacity: 0.2, marginVertical: 16 },
  // Section
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 },
  // KPI grid
  kpiGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  kpiCard: { flex: 1, backgroundColor: DARK2, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)" },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 3 },
  kpiValueGold: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 3 },
  kpiLabel: { fontSize: 7, color: MUTED },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "rgba(212,175,55,0.1)", borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 2 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "rgba(212,175,55,0.05)" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "rgba(212,175,55,0.05)", backgroundColor: "rgba(255,255,255,0.02)" },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD },
  td: { fontSize: 8, color: LIGHT },
  tdMuted: { fontSize: 8, color: MUTED },
  tdGold: { fontSize: 8, color: GOLD, fontFamily: "Helvetica-Bold" },
  tdRed: { fontSize: 8, color: RED },
  tdGreen: { fontSize: 8, color: GREEN },
  // IA Commentary
  aiBox: { backgroundColor: "rgba(212,175,55,0.06)", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", borderRadius: 6, padding: 12, marginTop: 16 },
  aiLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 6, letterSpacing: 1 },
  aiText: { fontSize: 8, color: LIGHT, lineHeight: 1.6 },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bullet: { color: GOLD, marginRight: 5, fontSize: 8 },
  bulletText: { flex: 1, fontSize: 8, color: LIGHT, lineHeight: 1.5 },
  alertBox: { backgroundColor: "rgba(248,113,113,0.08)", borderWidth: 1, borderColor: "rgba(248,113,113,0.25)", borderRadius: 6, padding: 10, marginTop: 10, flexDirection: "row" },
  alertText: { fontSize: 8, color: RED, flex: 1 },
  // Risk badge
  riskLow: { backgroundColor: "rgba(74,222,128,0.15)", color: GREEN, fontSize: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  riskMedium: { backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  riskHigh: { backgroundColor: "rgba(248,113,113,0.15)", color: RED, fontSize: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  // Client info
  infoGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  infoBlock: { flex: 1, backgroundColor: DARK2, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.1)" },
  infoLabel: { fontSize: 7, color: MUTED, marginBottom: 3 },
  infoValue: { fontSize: 9, color: WHITE, fontFamily: "Helvetica-Bold" },
  // Footer
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  footerText: { fontSize: 7, color: MUTED },
});

function fCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

// ─── RAPPORT MENSUEL ──────────────────────────────────────────────────────────
export interface MonthlyReportData {
  period: string;
  companyName: string;
  totalCA: number;
  invoiceCount: number;
  paidCount: number;
  overdueAmount: number;
  newClients: number;
  topClients: { name: string; amount: number; invoices: number }[];
  overdueList: { number: string; client: string; amount: number; days: number }[];
  ai: {
    synthesis: string;
    highlights: string[];
    recommendations: string[];
    alert?: string | null;
  };
}

export function MonthlyReportDocument({ data }: { data: MonthlyReportData }) {
  const recoveryRate = data.invoiceCount > 0 ? Math.round((data.paidCount / data.invoiceCount) * 100) : 0;
  const generatedAt = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document title={`Rapport mensuel ${data.period}`} author={data.companyName} creator="FacturEasy">
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        {/* En-tête */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.appName}>FacturEasy</Text>
            <Text style={s.reportTitle}>Rapport d&apos;activité mensuel</Text>
            <Text style={s.reportSubtitle}>{data.companyName}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.dateText}>Généré le {generatedAt}</Text>
            <Text style={s.periodBadge}>{data.period}</Text>
          </View>
        </View>

        {/* KPIs */}
        <Text style={s.sectionTitle}>Performance du mois</Text>
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValueGold}>{fCurrency(data.totalCA)}</Text>
            <Text style={s.kpiLabel}>Chiffre d&apos;affaires</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.invoiceCount}</Text>
            <Text style={s.kpiLabel}>Factures émises</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={{ ...s.kpiValue, color: recoveryRate >= 80 ? GREEN : recoveryRate >= 50 ? "#fbbf24" : RED }}>
              {recoveryRate}%
            </Text>
            <Text style={s.kpiLabel}>Taux de recouvrement</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.newClients}</Text>
            <Text style={s.kpiLabel}>Nouveaux clients</Text>
          </View>
        </View>

        {/* Top clients */}
        {data.topClients.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Top clients du mois</Text>
            <View style={s.tableHeader}>
              <Text style={{ ...s.th, flex: 3 }}>Client</Text>
              <Text style={{ ...s.th, flex: 2, textAlign: "right" }}>CA</Text>
              <Text style={{ ...s.th, flex: 1, textAlign: "center" }}>Factures</Text>
            </View>
            {data.topClients.slice(0, 5).map((c, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={{ ...s.td, flex: 3 }}>{c.name}</Text>
                <Text style={{ ...s.tdGold, flex: 2, textAlign: "right" }}>{fCurrency(c.amount)}</Text>
                <Text style={{ ...s.tdMuted, flex: 1, textAlign: "center" }}>{c.invoices}</Text>
              </View>
            ))}
          </>
        )}

        {/* Impayés */}
        {data.overdueList.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Factures en retard — {fCurrency(data.overdueAmount)}</Text>
            <View style={s.tableHeader}>
              <Text style={{ ...s.th, flex: 1.5 }}>N° Facture</Text>
              <Text style={{ ...s.th, flex: 2.5 }}>Client</Text>
              <Text style={{ ...s.th, flex: 1.5, textAlign: "right" }}>Montant</Text>
              <Text style={{ ...s.th, flex: 1, textAlign: "center" }}>Retard</Text>
            </View>
            {data.overdueList.slice(0, 6).map((o, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={{ ...s.td, flex: 1.5 }}>{o.number}</Text>
                <Text style={{ ...s.td, flex: 2.5 }}>{o.client}</Text>
                <Text style={{ ...s.tdRed, flex: 1.5, textAlign: "right" }}>{fCurrency(o.amount)}</Text>
                <Text style={{ ...s.tdMuted, flex: 1, textAlign: "center" }}>{o.days}j</Text>
              </View>
            ))}
          </>
        )}

        {/* Analyse IA */}
        <View style={s.aiBox}>
          <Text style={s.aiLabel}>✦ Analyse IA — FacturEasy</Text>
          <Text style={s.aiText}>{data.ai.synthesis}</Text>
          {data.ai.highlights?.length > 0 && (
            <>
              <View style={{ ...s.divider, marginVertical: 8 }} />
              <Text style={{ ...s.aiLabel, marginBottom: 5 }}>Points forts</Text>
              {data.ai.highlights.map((h, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bullet}>▸</Text>
                  <Text style={s.bulletText}>{h}</Text>
                </View>
              ))}
            </>
          )}
          {data.ai.recommendations?.length > 0 && (
            <>
              <View style={{ ...s.divider, marginVertical: 8 }} />
              <Text style={{ ...s.aiLabel, marginBottom: 5 }}>Recommandations</Text>
              {data.ai.recommendations.map((r, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bullet}>→</Text>
                  <Text style={s.bulletText}>{r}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {data.ai.alert && (
          <View style={s.alertBox}>
            <Text style={{ ...s.alertText }}>⚠ {data.ai.alert}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.bottomBar} />
        <View style={s.footer}>
          <Text style={s.footerText}>FacturEasy — Rapport confidentiel</Text>
          <Text style={s.footerText}>{data.period}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── RAPPORT CLIENT ────────────────────────────────────────────────────────────
export interface ClientReportData {
  companyName: string;
  client: {
    name: string; email?: string; phone?: string; city?: string;
    siret?: string; sector?: string; type: string;
  };
  stats: {
    totalInvoiced: number; totalPaid: number; pendingAmount: number;
    invoiceCount: number; avgPaymentDays: number;
  };
  documents: { number: string; date: string; type: string; status: string; amount: number }[];
  ai: {
    synthesis: string;
    paymentBehavior: string;
    recommendations: string[];
    riskLevel: "faible" | "modéré" | "élevé";
  };
}

export function ClientReportDocument({ data }: { data: ClientReportData }) {
  const generatedAt = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const riskStyle = data.ai.riskLevel === "faible" ? s.riskLow : data.ai.riskLevel === "élevé" ? s.riskHigh : s.riskMedium;

  return (
    <Document title={`Rapport client — ${data.client.name}`} author={data.companyName} creator="FacturEasy">
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        {/* En-tête */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.appName}>FacturEasy</Text>
            <Text style={s.reportTitle}>Rapport client</Text>
            <Text style={s.reportSubtitle}>{data.companyName}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.dateText}>Généré le {generatedAt}</Text>
            <Text style={s.periodBadge}>{data.client.name}</Text>
          </View>
        </View>

        {/* Infos client */}
        <Text style={s.sectionTitle}>Informations client</Text>
        <View style={s.infoGrid}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Raison sociale / Nom</Text>
            <Text style={s.infoValue}>{data.client.name}</Text>
            {data.client.sector && <Text style={{ ...s.infoLabel, marginTop: 4 }}>{data.client.sector}</Text>}
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Contact</Text>
            {data.client.email && <Text style={s.infoValue}>{data.client.email}</Text>}
            {data.client.phone && <Text style={{ ...s.tdMuted, marginTop: 2 }}>{data.client.phone}</Text>}
            {data.client.city && <Text style={{ ...s.tdMuted, marginTop: 2 }}>{data.client.city}</Text>}
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Type</Text>
            <Text style={s.infoValue}>{data.client.type}</Text>
            {data.client.siret && (
              <>
                <Text style={{ ...s.infoLabel, marginTop: 4 }}>SIRET</Text>
                <Text style={{ ...s.tdMuted }}>{data.client.siret}</Text>
              </>
            )}
          </View>
        </View>

        {/* KPIs */}
        <View style={s.divider} />
        <Text style={s.sectionTitle}>Vue financière</Text>
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValueGold}>{fCurrency(data.stats.totalInvoiced)}</Text>
            <Text style={s.kpiLabel}>Total facturé</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={{ ...s.kpiValue, color: GREEN }}>{fCurrency(data.stats.totalPaid)}</Text>
            <Text style={s.kpiLabel}>Encaissé</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={{ ...s.kpiValue, color: data.stats.pendingAmount > 0 ? RED : GREEN }}>
              {fCurrency(data.stats.pendingAmount)}
            </Text>
            <Text style={s.kpiLabel}>En attente</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.stats.avgPaymentDays}j</Text>
            <Text style={s.kpiLabel}>Délai moyen</Text>
          </View>
        </View>

        {/* Documents */}
        {data.documents.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Historique des documents ({data.documents.length})</Text>
            <View style={s.tableHeader}>
              <Text style={{ ...s.th, flex: 1.5 }}>N°</Text>
              <Text style={{ ...s.th, flex: 1 }}>Date</Text>
              <Text style={{ ...s.th, flex: 1 }}>Type</Text>
              <Text style={{ ...s.th, flex: 1 }}>Statut</Text>
              <Text style={{ ...s.th, flex: 1.5, textAlign: "right" }}>Montant</Text>
            </View>
            {data.documents.slice(0, 10).map((doc, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={{ ...s.td, flex: 1.5 }}>{doc.number}</Text>
                <Text style={{ ...s.tdMuted, flex: 1 }}>{doc.date}</Text>
                <Text style={{ ...s.tdMuted, flex: 1 }}>{doc.type}</Text>
                <Text style={{ ...s.tdMuted, flex: 1 }}>{doc.status}</Text>
                <Text style={{ ...s.tdGold, flex: 1.5, textAlign: "right" }}>{fCurrency(doc.amount)}</Text>
              </View>
            ))}
          </>
        )}

        {/* Analyse IA */}
        <View style={s.aiBox}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={s.aiLabel}>✦ Analyse IA — FacturEasy</Text>
            <Text style={riskStyle}>Risque {data.ai.riskLevel}</Text>
          </View>
          <Text style={s.aiText}>{data.ai.synthesis}</Text>
          <View style={{ ...s.divider, marginVertical: 8 }} />
          <Text style={{ ...s.aiLabel, marginBottom: 4 }}>Comportement de paiement</Text>
          <Text style={s.aiText}>{data.ai.paymentBehavior}</Text>
          {data.ai.recommendations?.length > 0 && (
            <>
              <View style={{ ...s.divider, marginVertical: 8 }} />
              <Text style={{ ...s.aiLabel, marginBottom: 5 }}>Recommandations</Text>
              {data.ai.recommendations.map((r, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bullet}>→</Text>
                  <Text style={s.bulletText}>{r}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={s.bottomBar} />
        <View style={s.footer}>
          <Text style={s.footerText}>FacturEasy — Rapport confidentiel</Text>
          <Text style={s.footerText}>Généré le {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
