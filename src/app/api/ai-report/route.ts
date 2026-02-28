import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    let prompt = "";

    if (type === "monthly") {
      const { period, totalCA, invoiceCount, recoveryRate, newClients, overdueAmount, topClients,
              devisCount, devisPipeline, avoirsCount, avoirsAmount } = data;
      prompt =
        `Tu es un analyste financier expert pour PME et indépendants français. ` +
        `Rédige un commentaire de gestion synthétique et percutant pour ce rapport mensuel.\n\n` +
        `Données de la période ${period} :\n` +
        `- CA encaissé (factures payées) : ${totalCA} €\n` +
        `- Factures émises : ${invoiceCount}\n` +
        `- Taux de recouvrement : ${recoveryRate}%\n` +
        `- Nouveaux clients : ${newClients}\n` +
        `- Montant impayé : ${overdueAmount} €\n` +
        `- Top clients : ${topClients}\n` +
        `- Devis émis : ${devisCount ?? 0} (pipeline potentiel : ${devisPipeline ?? 0} €)\n` +
        `- Avoirs émis : ${avoirsCount ?? 0} (impact : -${avoirsAmount ?? 0} €)\n\n` +
        `Fournis une analyse en 3 parties (JSON) :\n` +
        `{\n` +
        `  "synthesis": "2-3 phrases résumant la performance du mois en incluant les devis et avoirs si pertinents",\n` +
        `  "highlights": ["point fort 1", "point fort 2", "point fort 3"],\n` +
        `  "recommendations": ["action concrète 1", "action concrète 2", "action concrète 3"],\n` +
        `  "alert": "une alerte critique si applicable, sinon null"\n` +
        `}`;
    } else {
      const { clientName, totalInvoiced, totalPaid, pendingAmount, invoiceCount, avgPaymentDays, lastInvoiceDate } = data;
      prompt =
        `Tu es un analyste financier expert pour PME et indépendants français. ` +
        `Rédige une analyse de la relation client pour ce rapport.\n\n` +
        `Client : ${clientName}\n` +
        `- Total facturé : ${totalInvoiced} €\n` +
        `- Total encaissé : ${totalPaid} €\n` +
        `- En attente : ${pendingAmount} €\n` +
        `- Nombre de factures : ${invoiceCount}\n` +
        `- Délai moyen de paiement : ${avgPaymentDays} jours\n` +
        `- Dernière facture : ${lastInvoiceDate}\n\n` +
        `Fournis une analyse en JSON :\n` +
        `{\n` +
        `  "synthesis": "2-3 phrases sur la qualité de la relation commerciale",\n` +
        `  "paymentBehavior": "évaluation du comportement de paiement",\n` +
        `  "recommendations": ["recommandation 1", "recommandation 2"],\n` +
        `  "riskLevel": "faible | modéré | élevé"\n` +
        `}`;
    }

    const response = await generateAIResponse(
      [
        { role: "system", content: "Tu es un expert financier. Tu réponds UNIQUEMENT en JSON valide." },
        { role: "user", content: prompt },
      ],
      { maxTokens: 600, temperature: 0.4 }
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse IA invalide");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("[AI Report]", error);
    return NextResponse.json({ error: "Erreur génération rapport" }, { status: 500 });
  }
}
