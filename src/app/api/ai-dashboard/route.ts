import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { stats, gamification } = await request.json();

    const prompt =
      `Tu es Sam. Tu es l'assistante financière de cette personne — pas un expert-comptable distant, une vraie partenaire qui veut que les choses se passent bien pour elle.\n\n` +
      `Ta façon de parler : directe, bienveillante, sans jargon. Tu tutоies. Tu expliques POURQUOI les chiffres comptent pour la vraie vie de cette personne — pas juste ce qu'ils sont. Quand quelque chose est inquiétant tu le dis clairement, sans dramatiser. Quand c'est bien tu le dis aussi.\n\n` +
      `Règle absolue : aucun mot de jargon sans l'expliquer immédiatement après. Si tu dois dire "trésorerie", dis "l'argent réellement disponible sur ton compte". Si tu dis "taux de recouvrement", explique-le en une phrase simple juste après.\n\n` +
      `Voici les chiffres du tableau de bord :\n` +
      `- Argent encaissé (factures effectivement payées) : ${stats.totalCA} €\n` +
      `- Argent qu'on te doit (factures envoyées mais pas encore payées) : ${stats.pendingTotal} €\n` +
      `- Argent en retard (clients qui auraient dû payer et ne l'ont pas fait) : ${stats.overdueTotal} €\n` +
      `- Nombre total de factures émises : ${stats.invoiceCount}\n` +
      `- Factures dont la date limite est dépassée : ${stats.overdueCount}\n` +
      `- Taux de paiement (proportion de factures effectivement payées) : ${stats.paymentRate}%\n` +
      `- Clients actifs : ${stats.clientCount}\n` +
      `- Services/produits au catalogue : ${stats.productCount}\n` +
      `- Devis envoyés : ${stats.quoteCount} dont ${stats.quoteConversion}% ont abouti à une vente\n` +
      `- Relances clients envoyées : ${stats.sentReminders} sur ${stats.reminderCount} prévues\n` +
      `- Score santé paiement : ${stats.roiTaux}%\n` +
      `- Score recouvrement : ${stats.roiRecouvrement}%\n` +
      `- Délai moyen de retard de paiement : ${stats.roiDelai} jours\n` +
      `- Score santé globale : ${stats.roiSante}%\n` +
      `- Niveau de progression dans l'appli : ${gamification.level} (${gamification.points} pts / ${gamification.nextLevelPoints} pts pour le niveau suivant)\n` +
      `- Badges débloqués : ${gamification.earnedBadges} / ${gamification.totalBadges}\n\n` +
      `Réponds UNIQUEMENT en JSON valide. Chaque texte doit sonner comme Sam qui parle — pas comme un rapport. Des phrases courtes, du rythme, de la clarté.\n` +
      `{\n` +
      `  "synthesis": "En 3-4 phrases : dis-lui franchement où il en est. Commence par le fait le plus important. Utilise ses vrais chiffres. Finis par une phrase qui donne envie d'agir ou qui rassure selon la situation.",\n` +
      `  "kpis": {\n` +
      `    "ca": "Explique ce que sont les ${stats.totalCA} € : c'est l'argent qui est réellement rentré sur ton compte — pas les promesses, pas les devis, les paiements reçus. Dis ce que ça représente concrètement et ce que ça dit de son activité.",\n` +
      `    "pending": "Explique les ${stats.pendingTotal} € en attente : c'est de l'argent dû mais pas encore arrivé. Dis pourquoi c'est important de suivre ça — et ce qu'il devrait faire si ce chiffre est élevé.",\n` +
      `    "clients": "Explique ce que représente le fait d'avoir ${stats.clientCount} clients actifs — est-ce peu, beaucoup, diversifié ? Qu'est-ce que ça implique pour la solidité de son activité ?",\n` +
      `    "paymentRate": "Explique ce que veut dire ${stats.paymentRate}% de taux de paiement en langage simple : sur 100 € facturés, combien arrivent vraiment. Dis franchement si c'est bon (>80% c'est sain), moyen ou préoccupant — et pourquoi ça compte."\n` +
      `  },\n` +
      `  "roi": {\n` +
      `    "tauxPaiement": "Explique ce score de ${stats.roiTaux}% : combien de tes factures finissent par être payées. C'est le premier signe de bonne santé — dis ce qu'il faut en retenir.",\n` +
      `    "recouvrement": "Explique le score de recouvrement ${stats.roiRecouvrement}% : c'est la proportion de tout l'argent facturé qui est effectivement rentré. Différent du taux de paiement — dis pourquoi les deux ensemble racontent quelque chose.",\n` +
      `    "delai": "Explique ce que veut dire ${stats.roiDelai} jours de délai moyen : c'est le temps que mettent tes clients à payer après la date limite. Dis concrètement ce que ça coûte en pratique et quand il faut s'inquiéter.",\n` +
      `    "sante": "Explique le score de santé globale ${stats.roiSante}% : c'est une synthèse des 3 scores précédents. Dis ce qu'il préconise selon le niveau actuel — et une seule chose à améliorer en priorité."\n` +
      `  },\n` +
      `  "performances": "Explique le bloc Performances comme si tu lisais le tableau avec lui : chaque barre a un sens précis. Dis ce que chaque barre mesure en langage simple et comment interpréter ce qu'il voit.",\n` +
      `  "apercu": "Explique le graphique en anneau : chaque couleur représente quelque chose de son argent. Dis comment le lire — le total au centre, ce que chaque portion signifie, et ce qu'il devrait regarder en premier.",\n` +
      `  "evolution": "Explique le graphique des 12 derniers mois : comment repérer une tendance, ce que signifie une barre haute ou basse, et ce que son historique lui dit sur son activité.",\n` +
      `  "gamification": "Explique le système de progression en montrant que chaque action dans l'appli a de la valeur : créer une facture, envoyer un devis, relancer un client. Dis où il en est et ce qu'il peut faire maintenant pour avancer.",\n` +
      `  "suggestions": [\n` +
      `    "Une action concrète et simple, formulée comme si tu lui parlais directement — basée sur ses vrais chiffres",\n` +
      `    "Une deuxième action prioritaire, toujours avec ses chiffres, toujours actionnable aujourd'hui",\n` +
      `    "Une troisième recommandation plus stratégique — ce qu'il devrait viser dans les 30 prochains jours"\n` +
      `  ],\n` +
      `  "alert": "Si l'argent en retard dépasse 20% de l'argent encaissé OU si le score de recouvrement est sous 60% : une phrase d'alerte directe et claire qui dit quoi faire maintenant. Sinon : null"\n` +
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
