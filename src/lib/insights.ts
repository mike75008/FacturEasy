// ─── Moteur d'insights proactifs ──────────────────────────────────────────────
// Calcule les "pensées" financières à partir des données réelles.
// Logique pure, pas d'appel IA. Résultats toujours ancrés en euros.

import type { Document, Client, Organization, Depense, DeclarationTVA } from "@/types/database";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export interface InsightOptions {
  org?: Organization | null;
  depenses?: Depense[];
  declarations?: DeclarationTVA[];
}

export type InsightColor = "red" | "orange" | "yellow" | "blue" | "green";

export interface Insight {
  id: string;
  icon: string;
  color: InsightColor;
  priority: number; // 0 = le plus urgent
  title: string;
  detail: string;
  action: string;
  euros: number; // Montant en jeu
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function computeInsights(documents: Document[], clients: Client[], options?: InsightOptions): Insight[] {
  const insights: Insight[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── 1. Factures en retard ────────────────────────────────────────────────────
  const overdue = documents.filter(
    (d) =>
      d.type === "facture" &&
      d.status === "envoye" &&
      d.due_date &&
      new Date(d.due_date) < today
  );
  if (overdue.length > 0) {
    const total = overdue.reduce((s, d) => s + d.total_ttc, 0);
    const oldest = [...overdue].sort(
      (a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    )[0];
    const daysLate = Math.floor(
      (today.getTime() - new Date(oldest.due_date!).getTime()) / 86400000
    );
    insights.push({
      id: `overdue-${overdue.length}-${Math.round(total)}`,
      icon: "🔴",
      color: "red",
      priority: 0,
      title: `${fmt(total)} bloqués — risque de non-recouvrement`,
      detail: `${overdue.length} facture${overdue.length > 1 ? "s" : ""} impayée${overdue.length > 1 ? "s" : ""}. La plus ancienne (${oldest.number}) est en retard de ${daysLate} jour${daysLate > 1 ? "s" : ""}. Chaque semaine supplémentaire réduit statistiquement vos chances de récupérer cet argent de 12%.`,
      action: "Comment récupérer cet argent maintenant ?",
      euros: total,
    });
  }

  // ── 2. Devis qui expirent dans les 7 prochains jours ─────────────────────────
  const expiringDevis = documents.filter((d) => {
    if (d.type !== "devis") return false;
    if (d.status === "paye" || d.status === "annule" || d.status === "refuse") return false;
    if (!d.due_date) return false;
    const dueDate = new Date(d.due_date);
    const daysLeft = (dueDate.getTime() - today.getTime()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 7;
  });
  if (expiringDevis.length > 0) {
    const total = expiringDevis.reduce((s, d) => s + d.total_ttc, 0);
    insights.push({
      id: `expiring-${expiringDevis.length}-${Math.round(total)}`,
      icon: "🟠",
      color: "orange",
      priority: 1,
      title: `${fmt(total)} de devis expirent cette semaine`,
      detail: `${expiringDevis.length} devis sans réponse vont expirer dans moins de 7 jours. Une relance aujourd'hui coûte 2 minutes. Ne pas le faire coûte ${fmt(total)}.`,
      action: "Rédiger une relance percutante",
      euros: total,
    });
  }

  // ── 3. Clients dormants avec historique de CA ─────────────────────────────────
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 86400000);
  const recentClientIds = new Set(
    documents
      .filter((d) => new Date(d.date) >= ninetyDaysAgo)
      .map((d) => d.client_id)
  );
  const dormantClients = clients.filter((c) => !recentClientIds.has(c.id));
  if (dormantClients.length > 0) {
    const dormantSet = new Set(dormantClients.map((c) => c.id));
    const historicCA = documents
      .filter((d) => dormantSet.has(d.client_id) && d.type === "facture" && d.status === "paye")
      .reduce((s, d) => s + d.total_ttc, 0);
    if (historicCA > 500) {
      const estimated = historicCA * 0.25;
      insights.push({
        id: `dormant-${dormantClients.length}-${Math.round(historicCA)}`,
        icon: "🟡",
        color: "yellow",
        priority: 2,
        title: `${dormantClients.length} client${dormantClients.length > 1 ? "s" : ""} silencieux depuis 3 mois`,
        detail: `Ces clients ont généré ${fmt(historicCA)} par le passé. Ils ne sont pas perdus — ils sont en attente d'une raison de revenir. Une relance commerciale ciblée peut réactiver ${fmt(estimated)} de CA dormant.`,
        action: "Stratégie de réactivation clients",
        euros: estimated,
      });
    }
  }

  // ── 4. Tendance CA mois courant vs mois précédent ─────────────────────────────
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const thisMonthCA = documents
    .filter(
      (d) =>
        d.type === "facture" &&
        d.status === "paye" &&
        new Date(d.date) >= thisMonthStart
    )
    .reduce((s, d) => s + d.total_ttc, 0);

  const lastMonthCA = documents
    .filter(
      (d) =>
        d.type === "facture" &&
        d.status === "paye" &&
        new Date(d.date) >= lastMonthStart &&
        new Date(d.date) <= lastMonthEnd
    )
    .reduce((s, d) => s + d.total_ttc, 0);

  if (lastMonthCA > 0) {
    const pct = Math.round(((thisMonthCA - lastMonthCA) / lastMonthCA) * 100);
    if (pct <= -20) {
      const delta = lastMonthCA - thisMonthCA;
      insights.push({
        id: `ca-drop-${pct}-${Math.round(thisMonthCA)}`,
        icon: "🟠",
        color: "orange",
        priority: 2,
        title: `−${Math.abs(pct)}% de CA encaissé vs mois dernier`,
        detail: `Vous avez encaissé ${fmt(thisMonthCA)} ce mois contre ${fmt(lastMonthCA)} le mois dernier. Soit ${fmt(delta)} de manque à gagner. Ce n'est pas une fatalité — identifions les causes ensemble.`,
        action: "Analyser et inverser la tendance",
        euros: delta,
      });
    } else if (pct >= 20) {
      insights.push({
        id: `ca-growth-${pct}-${Math.round(thisMonthCA)}`,
        icon: "🔵",
        color: "blue",
        priority: 3,
        title: `+${pct}% de CA — momentum à exploiter maintenant`,
        detail: `Vous êtes à ${fmt(thisMonthCA)} encaissés ce mois vs ${fmt(lastMonthCA)} le mois dernier. Ce momentum ne dure pas indéfiniment — c'est le moment d'envoyer des devis et de solliciter vos meilleurs clients.`,
        action: "Comment capitaliser sur ce momentum ?",
        euros: thisMonthCA - lastMonthCA,
      });
    }
  }

  // ── 5. Taux de conversion devis → facture faible ──────────────────────────────
  const allDevis = documents.filter((d) => d.type === "devis");
  const convertedDevis = documents.filter(
    (d) => d.type === "devis" && d.status === "paye"
  );
  if (allDevis.length >= 5) {
    const rate = convertedDevis.length / allDevis.length;
    if (rate < 0.4) {
      const lostTotal = allDevis
        .filter((d) => d.status === "annule" || d.status === "refuse")
        .reduce((s, d) => s + d.total_ttc, 0);
      insights.push({
        id: `conversion-${Math.round(rate * 100)}-${Math.round(lostTotal)}`,
        icon: "🟡",
        color: "yellow",
        priority: 3,
        title: `Taux de conversion devis trop bas : ${Math.round(rate * 100)}%`,
        detail: `Seulement ${convertedDevis.length} devis sur ${allDevis.length} sont convertis en ventes. ${fmt(lostTotal)} de devis refusés ou annulés. La moyenne du secteur est autour de 55%. Il y a un levier à actionner ici.`,
        action: "Comment améliorer mon taux de conversion ?",
        euros: lostTotal * 0.15,
      });
    }
  }

  // ── 6. 🟢 Clients fidèles à upseller ─────────────────────────────────────────
  // Client avec 3+ factures payées = relation établie → proposer contrat annuel / retainer
  const clientInvoiceCounts = new Map<string, { count: number; total: number; name: string }>();
  documents
    .filter((d) => d.type === "facture" && d.status === "paye")
    .forEach((d) => {
      const existing = clientInvoiceCounts.get(d.client_id);
      const client = clients.find((c) => c.id === d.client_id);
      const name = client?.company_name || `${client?.first_name || ""} ${client?.last_name || ""}`.trim() || "Client";
      if (existing) {
        existing.count += 1;
        existing.total += d.total_ttc;
      } else {
        clientInvoiceCounts.set(d.client_id, { count: 1, total: d.total_ttc, name });
      }
    });
  const loyalClients = [...clientInvoiceCounts.entries()]
    .filter(([, v]) => v.count >= 3)
    .sort(([, a], [, b]) => b.total - a.total);
  if (loyalClients.length > 0) {
    const [, top] = loyalClients[0];
    const avgBasket = top.total / top.count;
    const annualEstimate = avgBasket * 12;
    insights.push({
      id: `upsell-loyal-${loyalClients.length}-${Math.round(top.total)}`,
      icon: "🟢",
      color: "green",
      priority: 4,
      title: `${top.name} : opportunité contrat annuel — ${fmt(annualEstimate)}/an`,
      detail: `${top.name} a commandé ${top.count} fois pour un total de ${fmt(top.total)}. Un client qui rachète 3 fois est prêt à s'engager sur la durée. Un contrat annuel ou un abonnement mensuel te sécurise ${fmt(annualEstimate)} de CA récurrent — sans prospecter.`,
      action: "Comment proposer un contrat annuel à ce client ?",
      euros: annualEstimate,
    });
  }

  // ── 7. 🟢 Aucun devis ce mois → pipeline vide ─────────────────────────────────
  const devisThisMonth = documents.filter(
    (d) => d.type === "devis" && new Date(d.date) >= thisMonthStart
  );
  if (devisThisMonth.length === 0 && clients.length > 0) {
    const avgDevisValue =
      allDevis.length > 0
        ? allDevis.reduce((s, d) => s + d.total_ttc, 0) / allDevis.length
        : 0;
    const potential = avgDevisValue * 3;
    insights.push({
      id: `no-devis-${today.getFullYear()}-${today.getMonth()}`,
      icon: "🟢",
      color: "green",
      priority: 4,
      title: `0 devis envoyé ce mois — pipeline commercial vide`,
      detail: `Tu n'as envoyé aucun devis depuis le 1er du mois. Sans devis, pas de CA futur. Avec ton panier moyen de ${fmt(avgDevisValue)}, 3 devis envoyés maintenant représentent un potentiel de ${fmt(potential)} — même à 50% de conversion.`,
      action: "Quels clients devrais-je relancer commercialement ?",
      euros: potential,
    });
  }

  // ── 8. 🟢 Concentration CA : top 3 clients > 60% ─────────────────────────────
  const caByClient = new Map<string, number>();
  documents
    .filter((d) => d.type === "facture" && d.status === "paye")
    .forEach((d) => {
      caByClient.set(d.client_id, (caByClient.get(d.client_id) || 0) + d.total_ttc);
    });
  if (caByClient.size >= 4) {
    const totalCA = [...caByClient.values()].reduce((s, v) => s + v, 0);
    const top3CA = [...caByClient.values()]
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((s, v) => s + v, 0);
    const top3Pct = Math.round((top3CA / totalCA) * 100);
    if (top3Pct >= 60 && totalCA > 1000) {
      insights.push({
        id: `concentration-${top3Pct}-${Math.round(totalCA)}`,
        icon: "🟢",
        color: "blue",
        priority: 3,
        title: `Tes 3 meilleurs clients = ${top3Pct}% de ton CA`,
        detail: `Opportunité : ces clients VIP représentent ${fmt(top3CA)} sur ${fmt(totalCA)} de CA total. Ce sont tes meilleurs ambassadeurs potentiels. Un geste commercial (remise fidélité, appel de suivi, offre exclusive) peut augmenter leur panier de 20% — soit +${fmt(top3CA * 0.2)}.`,
        action: "Comment maximiser la valeur de mes meilleurs clients ?",
        euros: top3CA * 0.2,
      });
    }
  }

  // ── 9. 🟢 Panier moyen en progression ─────────────────────────────────────────
  const last3MonthsStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const prev3MonthsStart = new Date(today.getFullYear(), today.getMonth() - 6, 1);

  const recent3MonthsInvoices = documents.filter(
    (d) => d.type === "facture" && d.status === "paye" && new Date(d.date) >= last3MonthsStart
  );
  const prev3MonthsInvoices = documents.filter(
    (d) =>
      d.type === "facture" &&
      d.status === "paye" &&
      new Date(d.date) >= prev3MonthsStart &&
      new Date(d.date) < last3MonthsStart
  );

  if (recent3MonthsInvoices.length >= 3 && prev3MonthsInvoices.length >= 3) {
    const recentAvg =
      recent3MonthsInvoices.reduce((s, d) => s + d.total_ttc, 0) / recent3MonthsInvoices.length;
    const prevAvg =
      prev3MonthsInvoices.reduce((s, d) => s + d.total_ttc, 0) / prev3MonthsInvoices.length;
    const pctIncrease = Math.round(((recentAvg - prevAvg) / prevAvg) * 100);
    if (pctIncrease >= 15) {
      insights.push({
        id: `basket-growth-${pctIncrease}-${Math.round(recentAvg)}`,
        icon: "🟢",
        color: "green",
        priority: 4,
        title: `Panier moyen en hausse de +${pctIncrease}% — signal fort`,
        detail: `Ton panier moyen est passé de ${fmt(prevAvg)} à ${fmt(recentAvg)} sur les 3 derniers mois. Tes clients achètent plus. C'est le moment d'aller chercher de nouveaux clients avec la même proposition de valeur — tu sais que ça fonctionne.`,
        action: "Comment capitaliser sur cette hausse du panier moyen ?",
        euros: (recentAvg - prevAvg) * recent3MonthsInvoices.length,
      });
    }
  }

  // ── Insights comptables (TVA / franchise) ─────────────────────────────────
  const regime = options?.org?.regime_tva ?? null;
  const declarations = options?.declarations ?? [];
  const depenses = options?.depenses ?? [];
  const now = new Date();

  if (regime === "reel_mensuel") {
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const deadline = new Date(now.getFullYear(), now.getMonth(), 20);
    const daysLeft = Math.round((deadline.getTime() - now.getTime()) / 86400000);
    const alreadyDone = declarations.some((d) => d.annee === prevYear && d.mois === prevMonth + 1);

    if (!alreadyDone) {
      const periodPaid = documents.filter((d) => {
        if (d.type !== "facture" || d.status !== "paye") return false;
        const dt = d.paid_at ? new Date(d.paid_at) : new Date(d.date);
        return dt.getFullYear() === prevYear && dt.getMonth() === prevMonth;
      });
      const periodAvoir = documents.filter((d) => {
        if (d.type !== "avoir" || d.status !== "paye") return false;
        const dt = d.paid_at ? new Date(d.paid_at) : new Date(d.date);
        return dt.getFullYear() === prevYear && dt.getMonth() === prevMonth;
      });
      const tvaCollectee =
        periodPaid.reduce((s, d) => s + d.total_tva, 0) -
        periodAvoir.reduce((s, d) => s + d.total_tva, 0);
      const periodDep = depenses.filter((d) => {
        const dt = new Date(d.date);
        return dt.getFullYear() === prevYear && dt.getMonth() === prevMonth;
      });
      const tvaDeductible = periodDep.reduce((s, d) => s + d.montant_tva, 0);
      const solde = tvaCollectee - tvaDeductible;
      const moisLabel = `${MOIS_FR[prevMonth]} ${prevYear}`;

      if (daysLeft < 0) {
        insights.push({
          id: `ca3-late-${prevYear}-${prevMonth + 1}`,
          icon: "🔴",
          color: "red",
          priority: 0,
          title: `Déclaration TVA de ${moisLabel} — tu es en retard`,
          detail: `La date limite du 20 est passée sans que la déclaration soit déposée. Ce n'est pas catastrophique si tu agis maintenant — une pénalité de 5% s'applique, mais elle ne grossit pas à l'infini.\n\n• Ce que tes clients t'ont versé en TVA : ${fmt(tvaCollectee)}\n• Ce que tu peux déduire sur tes achats : ${fmt(tvaDeductible)}\n• ${solde > 0 ? `Ce que tu dois reverser à l'État : ${fmt(solde)}` : `Crédit de TVA — l'État te doit : ${fmt(Math.abs(solde))}`}\n\nVa sur impots.gouv.fr → espace professionnel → Déclarer → TVA. Tu n'as qu'à recopier ces chiffres.\n\nRéférences sur le formulaire : case L.14 = ${fmt(tvaCollectee)} · case L.21 = ${fmt(tvaDeductible)} · case ${solde >= 0 ? "L.29" : "L.28"} = ${fmt(Math.abs(solde))}`,
          action: "Qu'est-ce que je risque et comment régulariser ?",
          euros: Math.abs(solde),
        });
      } else if (daysLeft <= 10) {
        insights.push({
          id: `ca3-deadline-${prevYear}-${prevMonth + 1}`,
          icon: daysLeft <= 3 ? "🔴" : "🟠",
          color: daysLeft <= 3 ? "red" : "orange",
          priority: 0,
          title: `Déclaration TVA de ${moisLabel} — ${daysLeft === 0 ? "c'est aujourd'hui" : `il reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}`,
          detail: `Chaque mois tu collectes de la TVA pour le compte de l'État — il faut la lui reverser avant le 20. J'ai calculé tout ça pour toi :\n\n• Ce que tes clients t'ont versé en TVA : ${fmt(tvaCollectee)}\n• Ce que tu peux déduire sur tes propres achats : ${fmt(tvaDeductible)}\n• Ce que tu dois reverser à l'État : ${fmt(Math.abs(solde))}${solde < 0 ? " (crédit — l'État te doit de l'argent)" : ""}\n\nPour déposer : impots.gouv.fr → ton espace professionnel → Déclarer → TVA. Tu n'as qu'à recopier ces chiffres.\n\nRéférences sur le formulaire : case L.14 (TVA collectée) = ${fmt(tvaCollectee)} · case L.21 (total déductions) = ${fmt(tvaDeductible)} · case ${solde >= 0 ? "L.29 (TVA à payer)" : "L.28 (crédit de TVA)"} = ${fmt(Math.abs(solde))}`,
          action: "Explique-moi comment remplir la déclaration pas à pas",
          euros: Math.abs(solde),
        });
      }
    }
  }

  if (regime === "reel_trimestriel") {
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    const prevQ = currentQ === 1 ? 4 : currentQ - 1;
    const prevYear = currentQ === 1 ? now.getFullYear() - 1 : now.getFullYear();
    const qEndMonth = prevQ * 3;
    const deadline = new Date(
      qEndMonth === 12 ? now.getFullYear() : prevYear,
      qEndMonth === 12 ? 0 : qEndMonth,
      24,
    );
    const daysLeft = Math.round((deadline.getTime() - now.getTime()) / 86400000);
    const alreadyDone = declarations.some((d) => d.annee === prevYear && d.trimestre === prevQ);

    if (!alreadyDone && daysLeft >= 0 && daysLeft <= 14) {
      const periodPaid = documents.filter((d) => {
        if (d.type !== "facture" || d.status !== "paye") return false;
        const dt = d.paid_at ? new Date(d.paid_at) : new Date(d.date);
        return dt.getFullYear() === prevYear && Math.floor(dt.getMonth() / 3) + 1 === prevQ;
      });
      const tvaCollectee = periodPaid.reduce((s, d) => s + d.total_tva, 0);
      const periodDep = depenses.filter((d) => {
        const dt = new Date(d.date);
        return dt.getFullYear() === prevYear && Math.floor(dt.getMonth() / 3) + 1 === prevQ;
      });
      const tvaDeductible = periodDep.reduce((s, d) => s + d.montant_tva, 0);
      const solde = tvaCollectee - tvaDeductible;

      insights.push({
        id: `ca3-q-deadline-${prevYear}-${prevQ}`,
        icon: daysLeft <= 5 ? "🔴" : "🟠",
        color: daysLeft <= 5 ? "red" : "orange",
        priority: 0,
        title: `Déclaration TVA du trimestre ${prevQ} — ${daysLeft <= 5 ? `urgent, ${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : `${daysLeft} jours restants`}`,
        detail: `Tu déclares ta TVA chaque trimestre — la deadline pour ce trimestre est le ${deadline.toLocaleDateString("fr-FR")}. J'ai calculé tout ça pour toi :\n\n• TVA encaissée auprès de tes clients ce trimestre : ${fmt(tvaCollectee)}\n• TVA que tu peux récupérer sur tes achats : ${fmt(tvaDeductible)}\n• Ce que tu dois reverser à l'État : ${fmt(Math.abs(solde))}${solde < 0 ? " (crédit — l'État te doit de l'argent)" : ""}\n\nPour déposer : impots.gouv.fr → ton espace professionnel → Déclarer → TVA. Tu n'as qu'à recopier ces chiffres.\n\nRéférences sur le formulaire : case L.14 = ${fmt(tvaCollectee)} · case L.21 = ${fmt(tvaDeductible)} · case ${solde >= 0 ? "L.29 (TVA à payer)" : "L.28 (crédit de TVA)"} = ${fmt(Math.abs(solde))}`,
        action: "Explique-moi comment remplir la déclaration pas à pas",
        euros: Math.abs(solde),
      });
    }
  }

  if (regime === "franchise_base") {
    const thisYear = now.getFullYear();
    const caHT =
      documents
        .filter((d) => {
          if (d.type !== "facture" || d.status !== "paye") return false;
          const yr = d.paid_at ? new Date(d.paid_at).getFullYear() : new Date(d.date).getFullYear();
          return yr === thisYear;
        })
        .reduce((s, d) => s + d.total_ht, 0) -
      documents
        .filter((d) => {
          if (d.type !== "avoir" || d.status !== "paye") return false;
          const yr = d.paid_at ? new Date(d.paid_at).getFullYear() : new Date(d.date).getFullYear();
          return yr === thisYear;
        })
        .reduce((s, d) => s + d.total_ht, 0);

    const seuilServices = 77700;
    const pct = caHT > 0 ? (caHT / seuilServices) * 100 : 0;
    const restant = Math.max(seuilServices - caHT, 0);

    if (pct >= 70) {
      insights.push({
        id: `franchise-seuil-${thisYear}-${Math.round(pct)}`,
        icon: pct >= 90 ? "🔴" : "🟠",
        color: pct >= 90 ? "red" : "orange",
        priority: pct >= 90 ? 0 : 1,
        title: `Tu approches la limite au-delà de laquelle tu devras facturer la TVA`,
        detail: `Tu es en franchise de TVA — un avantage qui te permet de ne pas facturer la TVA à tes clients. Mais ce statut a une limite annuelle : ${fmt(seuilServices)} de chiffre d'affaires.\n\nAujourd'hui tu en es à ${fmt(caHT)}, soit ${pct.toFixed(0)}% de cette limite. Il te reste ${fmt(restant)} avant de la dépasser.\n\n${pct >= 90 ? "C'est très peu. Attention : si tu dépasses, tu devras facturer la TVA rétroactivement à partir de la facture qui a fait déborder — pas depuis janvier. Parle-en à un expert-comptable maintenant." : "Ça veut dire que si tes prochaines factures dépassent ce montant, ton statut change automatiquement. Anticipe si tu as des devis importants en cours."}`,
        action: pct >= 90 ? "Que se passe-t-il concrètement si je dépasse ?" : "Comment me préparer si j'approche du seuil ?",
        euros: caHT,
      });
    }
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

// Filtre les insights déjà vus (stockés en localStorage)
export function filterUnseen(insights: Insight[]): Insight[] {
  try {
    const seen: string[] = JSON.parse(localStorage.getItem("assistant_seen_insights") || "[]");
    return insights.filter((i) => !seen.includes(i.id));
  } catch {
    return insights;
  }
}

export function markAsSeen(insightId: string): void {
  try {
    const seen: string[] = JSON.parse(localStorage.getItem("assistant_seen_insights") || "[]");
    if (!seen.includes(insightId)) {
      seen.push(insightId);
      localStorage.setItem("assistant_seen_insights", JSON.stringify(seen));
    }
  } catch {}
}
