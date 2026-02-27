// ─── Générateur XML Factur-X (profil EN 16931) ───────────────────────────────
// Norme européenne CEN/EN 16931 — embarqué dans le PDF pour facturation électronique

import type { Document as Doc, DocumentLine, Organization, Client } from "@/types/database";

// Type code selon le type de document
const TYPE_CODES: Record<string, string> = {
  facture: "380",
  avoir: "381",
  devis: "315",
  bon_livraison: "380",
};

function fDate(dateStr: string): string {
  // Format YYYYMMDD requis par Factur-X
  return dateStr.replace(/-/g, "");
}

function fAmount(n: number): string {
  return n.toFixed(2);
}

// Regroupe les lignes par taux de TVA pour le résumé fiscal
function groupByTVA(lines: DocumentLine[]): { rate: number; base: number; tva: number }[] {
  const map = new Map<number, { base: number; tva: number }>();
  for (const line of lines) {
    const rate = line.tva_rate ?? 0;
    const base = line.total_ht ?? 0;
    const tva = base * (rate / 100);
    const existing = map.get(rate) ?? { base: 0, tva: 0 };
    map.set(rate, { base: existing.base + base, tva: existing.tva + tva });
  }
  return Array.from(map.entries()).map(([rate, { base, tva }]) => ({ rate, base, tva }));
}

export function generateFacturXML({
  doc,
  lines,
  organization,
  client,
}: {
  doc: Doc;
  lines: DocumentLine[];
  organization: Organization;
  client: Client | null;
}): string {
  const typeCode = TYPE_CODES[doc.type] ?? "380";
  const tvaGroups = groupByTVA(lines);
  const clientName = client?.company_name ||
    `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim() ||
    "Client";

  const linesXML = lines.map((line, i) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${i + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXML(line.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${fAmount(line.unit_price)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${escapeXML(line.unit ?? "C62")}">${fAmount(line.quantity)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${fAmount(line.tva_rate ?? 0)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${fAmount(line.total_ht ?? 0)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join("");

  const tvaXML = tvaGroups.map((g) => `
    <ram:ApplicableTradeTax>
      <ram:CalculatedAmount>${fAmount(g.tva)}</ram:CalculatedAmount>
      <ram:TypeCode>VAT</ram:TypeCode>
      <ram:BasisAmount>${fAmount(g.base)}</ram:BasisAmount>
      <ram:CategoryCode>S</ram:CategoryCode>
      <ram:RateApplicablePercent>${fAmount(g.rate)}</ram:RateApplicablePercent>
    </ram:ApplicableTradeTax>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escapeXML(doc.number)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${fDate(doc.date)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    ${linesXML}

    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXML(organization.name)}</ram:Name>
        ${organization.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${escapeXML(organization.siret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ""}
        <ram:PostalTradeAddress>
          ${organization.address ? `<ram:LineOne>${escapeXML(organization.address)}</ram:LineOne>` : ""}
          ${organization.postal_code ? `<ram:PostcodeCode>${escapeXML(organization.postal_code)}</ram:PostcodeCode>` : ""}
          ${organization.city ? `<ram:CityName>${escapeXML(organization.city)}</ram:CityName>` : ""}
          <ram:CountryID>${escapeXML(organization.country ?? "FR")}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${organization.tva_number ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXML(organization.tva_number)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ""}
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        <ram:Name>${escapeXML(clientName)}</ram:Name>
        ${client?.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${escapeXML(client.siret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ""}
        <ram:PostalTradeAddress>
          ${client?.address ? `<ram:LineOne>${escapeXML(client.address)}</ram:LineOne>` : ""}
          ${client?.postal_code ? `<ram:PostcodeCode>${escapeXML(client.postal_code)}</ram:PostcodeCode>` : ""}
          ${client?.city ? `<ram:CityName>${escapeXML(client.city)}</ram:CityName>` : ""}
          <ram:CountryID>${escapeXML(client?.country ?? "FR")}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${client?.tva_number ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXML(client.tva_number)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ""}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery />

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${tvaXML}
      ${doc.due_date ? `<ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${fDate(doc.due_date)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>` : ""}
      ${organization.rib_iban ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${escapeXML(organization.rib_iban)}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${organization.rib_bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${escapeXML(organization.rib_bic)}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ""}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ""}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${fAmount(doc.total_ht)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${fAmount(doc.total_ht)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${fAmount(doc.total_tva)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${fAmount(doc.total_ttc)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${fAmount(doc.total_ttc)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
