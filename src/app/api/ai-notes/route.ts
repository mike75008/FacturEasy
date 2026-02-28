import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";

export const runtime = "nodejs";

const TYPE_LABELS: Record<string, string> = {
  facture: "facture",
  devis: "devis",
  avoir: "avoir / note de crédit",
  bon_livraison: "bon de livraison",
};

const TYPE_CONTEXT: Record<string, string> = {
  facture:
    "Rédige des conditions de paiement et mentions légales concises pour une facture française. " +
    "Inclus : délai de paiement, pénalités de retard (3x taux légal), indemnité forfaitaire 40€.",
  devis:
    "Rédige des conditions pour un devis français. " +
    "Inclus : durée de validité (30 jours), conditions d'acceptation, modalités de démarrage.",
  avoir:
    "Rédige une note explicative pour un avoir (note de crédit). " +
    "Inclus : référence à la facture d'origine si connue, motif du crédit, modalités de remboursement ou compensation.",
  bon_livraison:
    "Rédige des conditions pour un bon de livraison français. " +
    "Inclus : réserves à émettre en cas de litige, délai de réclamation (48h), acceptation par signature.",
};

export async function POST(request: NextRequest) {
  try {
    const { docType, clientName, lineDescriptions, docNumber } = await request.json();

    const typeLabel = TYPE_LABELS[docType] ?? docType;
    const context = TYPE_CONTEXT[docType] ?? TYPE_CONTEXT.facture;
    const linesStr = (lineDescriptions as string[])?.filter(Boolean).join(", ") || "prestations diverses";

    const prompt =
      `Tu es un expert juridique et comptable français spécialisé dans les documents commerciaux. ` +
      `${context}\n\n` +
      `Document : ${typeLabel} ${docNumber ? `N°${docNumber}` : ""}\n` +
      `Client : ${clientName || "Client"}\n` +
      `Prestations : ${linesStr}\n\n` +
      `Réponds avec du texte brut (pas de JSON, pas de markdown), 2-4 phrases maximum, ` +
      `ton professionnel et direct, adapté à un document commercial français.`;

    const response = await generateAIResponse(
      [
        { role: "system", content: "Tu es un expert en documents commerciaux français. Tu réponds en texte brut, sans markdown ni JSON." },
        { role: "user", content: prompt },
      ],
      { maxTokens: 200, temperature: 0.3 }
    );

    return NextResponse.json({ notes: response.content.trim() });
  } catch (error) {
    console.error("[AI Notes]", error);
    return NextResponse.json({ error: "Erreur génération notes" }, { status: 500 });
  }
}
