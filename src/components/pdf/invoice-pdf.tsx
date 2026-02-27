"use client";

export { InvoicePDFDocument } from "./invoice-pdf-doc";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "./invoice-pdf-doc";
import type { Document as Doc, DocumentLine, Organization, Client } from "@/types/database";

export async function downloadInvoicePDF({
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
  // 1. Générer le PDF visuel dans le navigateur (React-PDF fonctionne ici)
  const blob = await pdf(
    <InvoicePDFDocument doc={doc} lines={lines} organization={organization} client={client} />
  ).toBlob();

  // 2. Préparer les bytes PDF pour l'envoi au serveur
  const formData = new FormData();
  formData.append("pdf", blob, "invoice.pdf");
  formData.append("data", JSON.stringify({ doc, lines, organization, client }));

  // 3. Le serveur se charge uniquement de l'embedding Factur-X (pdf-lib Node.js)
  const response = await fetch("/api/pdf", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error ?? "Erreur lors de la génération du PDF");
  }

  // 4. Télécharger le PDF enrichi retourné par le serveur
  const finalBlob = await response.blob();
  const url = URL.createObjectURL(finalBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${doc.number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
