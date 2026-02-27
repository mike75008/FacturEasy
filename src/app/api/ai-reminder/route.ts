import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { docNumber, amount, clientName, daysOverdue, existingRemindersCount, channel } =
      await request.json();

    const tone =
      existingRemindersCount >= 2
        ? "mise en demeure formelle et ferme"
        : existingRemindersCount >= 1
        ? "ferme mais courtois"
        : "amical et professionnel";

    const channelLabel =
      channel === "sms"
        ? "SMS (160 caractères maximum, soyez très concis)"
        : channel === "appel"
        ? "script d'appel téléphonique (points clés à aborder)"
        : "email professionnel";

    const messages = [
      {
        role: "system" as const,
        content:
          "Tu es un expert en gestion financière et relances clients pour des entreprises françaises. " +
          "Tu rédiges des messages de relance professionnels, adaptés au ton et au canal demandés. " +
          "Tu réponds directement avec le texte du message, sans introduction ni explication.",
      },
      {
        role: "user" as const,
        content:
          `Rédige une relance de paiement en français avec un ton ${tone}.\n\n` +
          `Contexte :\n` +
          `- Facture n° ${docNumber}\n` +
          `- Montant TTC : ${amount} €\n` +
          `- Client : ${clientName}\n` +
          `- Retard : ${daysOverdue} jour(s)\n` +
          `- Relances précédentes : ${existingRemindersCount}\n` +
          `- Canal : ${channelLabel}\n` +
          (existingRemindersCount >= 2
            ? "\nMentionne les pénalités de retard (art. L.441-10 Code de commerce) et le recours au recouvrement.\n"
            : "") +
          "\nRédige uniquement le corps du message, prêt à envoyer.",
      },
    ];

    const response = await generateAIResponse(messages, { maxTokens: 400, temperature: 0.75 });

    return NextResponse.json({ content: response.content });
  } catch (error) {
    console.error("[AI Reminder]", error);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
