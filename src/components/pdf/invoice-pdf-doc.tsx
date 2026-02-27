// Composant PDF pur — pas de "use client" pour pouvoir tourner côté serveur (API route)
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Document as Doc, DocumentLine, Organization, Client } from "@/types/database";

const GOLD = "#d4af37";
const DARK = "#081525";
const DARK2 = "#0e1f35";
const DARK3 = "#162d4a";
const WHITE = "#ffffff";
const MUTED = "#9fb9d8";

const s = StyleSheet.create({
  page: {
    backgroundColor: DARK,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    color: WHITE,
    fontSize: 10,
  },
  topBar: { height: 3, backgroundColor: GOLD, marginBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  companyName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GOLD, marginBottom: 4 },
  companyInfo: { fontSize: 9, color: MUTED, lineHeight: 1.5 },
  docType: { fontSize: 26, fontFamily: "Helvetica-Bold", color: GOLD, textAlign: "right" },
  docNumber: { fontSize: 12, fontFamily: "Helvetica-Bold", color: WHITE, textAlign: "right", marginTop: 4 },
  docMeta: { fontSize: 9, color: MUTED, textAlign: "right", marginTop: 3, lineHeight: 1.5 },
  separator: { height: 1, backgroundColor: GOLD, marginVertical: 16, opacity: 0.6 },
  clientBlock: { backgroundColor: DARK2, padding: 12, marginBottom: 20, borderLeftWidth: 2, borderLeftColor: GOLD, borderLeftStyle: "solid" },
  clientLabel: { fontSize: 7, color: GOLD, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5, fontFamily: "Helvetica-Bold" },
  clientName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  clientInfo: { fontSize: 9, color: MUTED, lineHeight: 1.5 },
  tableHeader: { flexDirection: "row", backgroundColor: GOLD, paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: DARK3, borderBottomStyle: "solid" },
  tableRowAlt: { backgroundColor: DARK2 },
  tableCell: { fontSize: 9, color: WHITE },
  tableCellMuted: { fontSize: 9, color: MUTED },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTva: { flex: 0.8, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  totalsContainer: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  totalsBox: { width: 210 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  totalLabel: { fontSize: 9, color: MUTED },
  totalValue: { fontSize: 9, color: WHITE },
  totalDiscount: { fontSize: 9, color: "#f87171" },
  grandSeparator: { height: 1, backgroundColor: GOLD, marginVertical: 6, opacity: 0.6 },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD },
  grandTotalValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GOLD },
  notesBlock: { marginTop: 20, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: DARK3, borderTopStyle: "solid" },
  notesLabel: { fontSize: 7, color: GOLD, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  notesText: { fontSize: 9, color: MUTED, lineHeight: 1.6 },
  ribBlock: { marginTop: 16, backgroundColor: DARK2, padding: 10, borderLeftWidth: 2, borderLeftColor: GOLD, borderLeftStyle: "solid" },
  ribLabel: { fontSize: 7, color: GOLD, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  ribText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },
  footer: { marginTop: 24, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: DARK3, borderTopStyle: "solid" },
  footerText: { fontSize: 7, color: "#4276b0", textAlign: "center", lineHeight: 1.6 },
  bottomBar: { height: 3, backgroundColor: GOLD, marginTop: 20 },
});

function fCurrency(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fDate(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR");
}

const TYPE_LABELS: Record<string, string> = {
  facture: "FACTURE",
  devis: "DEVIS",
  avoir: "AVOIR",
  bon_livraison: "BON DE LIVRAISON",
};

export function InvoicePDFDocument({
  doc,
  lines,
  organization,
  client,
}: {
  doc: Doc;
  lines: DocumentLine[];
  organization: Organization;
  client: Client | null;
}) {
  const clientName = client?.company_name ||
    `${client?.first_name || ""} ${client?.last_name || ""}`.trim() ||
    "Client";

  return (
    <Document title={doc.number} author={organization.name} creator="FacturEasy">
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{organization.name}</Text>
            {organization.address && <Text style={s.companyInfo}>{organization.address}</Text>}
            {(organization.postal_code || organization.city) && (
              <Text style={s.companyInfo}>{organization.postal_code} {organization.city}</Text>
            )}
            {organization.phone && <Text style={s.companyInfo}>Tél : {organization.phone}</Text>}
            {organization.email && <Text style={s.companyInfo}>{organization.email}</Text>}
            {organization.siret && <Text style={s.companyInfo}>SIRET : {organization.siret}</Text>}
            {organization.tva_number && <Text style={s.companyInfo}>TVA : {organization.tva_number}</Text>}
          </View>
          <View>
            <Text style={s.docType}>{TYPE_LABELS[doc.type] || "DOCUMENT"}</Text>
            <Text style={s.docNumber}>{doc.number}</Text>
            <Text style={s.docMeta}>Date : {fDate(doc.date)}</Text>
            {doc.due_date && <Text style={s.docMeta}>Échéance : {fDate(doc.due_date)}</Text>}
          </View>
        </View>

        <View style={s.separator} />

        <View style={s.clientBlock}>
          <Text style={s.clientLabel}>Destinataire</Text>
          <Text style={s.clientName}>{clientName}</Text>
          {client?.address && <Text style={s.clientInfo}>{client.address}</Text>}
          {(client?.postal_code || client?.city) && (
            <Text style={s.clientInfo}>{client?.postal_code} {client?.city}</Text>
          )}
          {client?.email && <Text style={s.clientInfo}>{client.email}</Text>}
          {client?.siret && <Text style={s.clientInfo}>SIRET : {client.siret}</Text>}
          {client?.tva_number && <Text style={s.clientInfo}>TVA : {client.tva_number}</Text>}
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qté</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>P.U. HT</Text>
          <Text style={[s.tableHeaderText, s.colTva]}>TVA</Text>
          <Text style={[s.tableHeaderText, s.colTotal]}>Total HT</Text>
        </View>

        {lines.map((line, i) => (
          <View key={line.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCell, s.colDesc]}>{line.description}</Text>
            <Text style={[s.tableCellMuted, s.colQty]}>{line.quantity} {line.unit}</Text>
            <Text style={[s.tableCellMuted, s.colPrice]}>{fCurrency(line.unit_price)}</Text>
            <Text style={[s.tableCellMuted, s.colTva]}>{line.tva_rate}%</Text>
            <Text style={[s.tableCell, s.colTotal]}>{fCurrency(line.total_ht)}</Text>
          </View>
        ))}

        <View style={s.totalsContainer}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total HT</Text>
              <Text style={s.totalValue}>{fCurrency(doc.total_ht)}</Text>
            </View>
            {doc.discount_amount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Remise ({doc.discount_percent}%)</Text>
                <Text style={s.totalDiscount}>-{fCurrency(doc.discount_amount)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TVA</Text>
              <Text style={s.totalValue}>{fCurrency(doc.total_tva)}</Text>
            </View>
            <View style={s.grandSeparator} />
            <View style={s.totalRow}>
              <Text style={s.grandTotalLabel}>Total TTC</Text>
              <Text style={s.grandTotalValue}>{fCurrency(doc.total_ttc)}</Text>
            </View>
          </View>
        </View>

        {doc.notes && (
          <View style={s.notesBlock}>
            <Text style={s.notesLabel}>Notes / Conditions</Text>
            <Text style={s.notesText}>{doc.notes}</Text>
          </View>
        )}

        {(organization.rib_iban || organization.rib_bic) && (
          <View style={s.ribBlock}>
            <Text style={s.ribLabel}>Coordonnées bancaires</Text>
            {organization.rib_iban && <Text style={s.ribText}>IBAN : {organization.rib_iban}</Text>}
            {organization.rib_bic && <Text style={s.ribText}>BIC : {organization.rib_bic}</Text>}
            {organization.rib_bank && <Text style={s.ribText}>Banque : {organization.rib_bank}</Text>}
          </View>
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>
            {organization.name}
            {organization.legal_form ? ` — ${organization.legal_form}` : ""}
            {organization.capital ? ` au capital de ${organization.capital} €` : ""}
            {organization.rcs ? ` — RCS ${organization.rcs}` : ""}
          </Text>
          {organization.siret && (
            <Text style={s.footerText}>
              SIRET {organization.siret}
              {organization.tva_number ? ` — TVA ${organization.tva_number}` : ""}
            </Text>
          )}
          <Text style={s.footerText}>
            En cas de retard de paiement, une pénalité de 3x le taux d&apos;intérêt légal sera
            appliquée, ainsi qu&apos;une indemnité forfaitaire de 40 € pour frais de recouvrement.
          </Text>
        </View>

        <View style={s.bottomBar} />
      </Page>
    </Document>
  );
}
