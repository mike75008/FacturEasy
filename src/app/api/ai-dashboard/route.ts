import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { stats, gamification } = await request.json();

    const prompt =
      `Tu es un expert-comptable et conseiller financier pour PME et indépendants français. ` +
      `Analyse ce tableau de bord et explique chaque section de façon claire, précise et pédagogique — ` +
      `comme si tu parlais à quelqu'un qui découvre la gestion financière. ` +
      `Sois concret, utilise les chiffres fournis, et donne des explications complètes sans raccourcis.\n\n` +
      `Données actuelles :\n` +
      `- CA encaissé (factures payées) : ${stats.totalCA} €\n` +
      `- Montant en attente (factures émises non payées) : ${stats.pendingTotal} €\n` +
      `- Montant en retard (échéances dépassées) : ${stats.overdueTotal} €\n` +
      `- Nombre total de factures : ${stats.invoiceCount}\n` +
      `- Factures en retard : ${stats.overdueCount}\n` +
      `- Taux de paiement : ${stats.paymentRate}%\n` +
      `- Nombre de clients actifs : ${stats.clientCount}\n` +
      `- Produits/services au catalogue : ${stats.productCount}\n` +
      `- Devis émis : ${stats.quoteCount} (${stats.quoteConversion}% convertis)\n` +
      `- Relances : ${stats.sentReminders} envoyées sur ${stats.reminderCount} programmées\n` +
      `- ROI — Taux de paiement : ${stats.roiTaux}%\n` +
      `- ROI — Taux de recouvrement : ${stats.roiRecouvrement}%\n` +
      `- ROI — Délai moyen de retard : ${stats.roiDelai} jours\n` +
      `- ROI — Santé globale : ${stats.roiSante}%\n` +
      `- Gamification : niveau ${gamification.level}, ${gamification.points} pts / ${gamification.nextLevelPoints} pts\n` +
      `- Badges débloqués : ${gamification.earnedBadges} / ${gamification.totalBadges}\n\n` +
      `Réponds UNIQUEMENT en JSON valide :\n` +
      `{\n` +
      `  "synthesis": "Synthèse globale de l'état financier en 3-4 phrases complètes — bilan honnête et précis",\n` +
      `  "kpis": {\n` +
      `    "ca": "Explication complète du CA encaissé : ce que ce chiffre représente, comment il est calculé (uniquement les factures marquées Payées), ce qu'il dit de l'activité",\n` +
      `    "pending": "Explication de 'En attente' : ce sont les factures envoyées ou validées mais non encore payées — montant et risques pour la trésorerie, quoi faire",\n` +
      `    "clients": "Ce que représente le nombre de clients actifs, comment interpréter ce chiffre selon l'activité",\n` +
      `    "paymentRate": "Explication complète du taux de paiement : définition exacte (factures payées / total factures), benchmark (>=80% = sain, <50% = alerte), interprétation du score actuel"\n` +
      `  },\n` +
      `  "roi": {\n` +
      `    "tauxPaiement": "Ce que mesure exactement le taux de paiement dans le ROI, pourquoi il est central à la santé financière",\n` +
      `    "recouvrement": "Définition du taux de recouvrement (CA encaissé / total émis) : différence avec le taux de paiement, ce qu'il révèle sur l'efficacité de facturation",\n` +
      `    "delai": "Explication du délai moyen de retard en jours : impact sur la trésorerie, seuils d'alerte (>15j = action immédiate, >30j = procédure de recouvrement)",\n` +
      `    "sante": "Comment le score de santé globale est calculé (moyenne des 3 autres scores), ce qu'il préconise selon le niveau actuel"\n` +
      `  },\n` +
      `  "performances": "Explication du bloc Performances avec ses 5 barres : ROI (% de factures payées), Estimation (CA prévisionnel du mois), Prédiction IA (projection basée sur la tendance), CA encaissé (part du total), Clients actifs",\n` +
      `  "apercu": "Explication du graphique en anneau : chaque couleur représente une catégorie — violet (CA encaissé), or (en attente), bleu (clients), vert (taux paiement). Le total au centre est la somme CA + attente",\n` +
      `  "evolution": "Explication du graphique Évolution CA sur 12 mois : comment le lire (chaque barre = un mois), la barre dorée = mois en cours, comment identifier tendances et saisonnalité",\n` +
      `  "gamification": "Explication complète du système : les points se gagnent en créant des documents, en payant des factures, en relançant des clients. Les niveaux (Bronze → Argent → Or → Platine → Diamant) débloquent des badges qui récompensent la régularité et la croissance",\n` +
      `  "suggestions": [\n` +
      `    "Action concrète prioritaire basée sur les données actuelles",\n` +
      `    "Deuxième action concrète et mesurable",\n` +
      `    "Troisième recommandation stratégique"\n` +
      `  ],\n` +
      `  "alert": "Alerte critique si le montant en retard dépasse 20% du CA ou si le taux de recouvrement est inférieur à 60%, sinon null"\n` +
      `}`;

    const response = await generateAIResponse(
      [
        { role: "system", content: "Tu es un expert financier et comptable français. Tu réponds UNIQUEMENT en JSON valide, en français, avec des explications complètes et pédagogiques." },
        { role: "user", content: prompt },
      ],
      { maxTokens: 2000, temperature: 0.3 }
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse IA invalide");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("[AI Dashboard]", error);
    return NextResponse.json({ error: "Erreur génération analyse" }, { status: 500 });
  }
}
