// Structured prompts for AI features - provider-agnostic

export const PROMPTS = {
  REMINDER: {
    system: `Tu es un assistant spécialisé en recouvrement de créances pour une entreprise française.
Tu génères des relances professionnelles, polies mais fermes, adaptées au contexte.
Tu respectes la législation française sur le recouvrement.
Réponds toujours en français.`,

    generate: (params: {
      clientName: string;
      invoiceNumber: string;
      amount: string;
      dueDate: string;
      daysPastDue: number;
      previousReminders: number;
      clientHistory: string;
    }) => `Génère une relance pour :
- Client : ${params.clientName}
- Facture : ${params.invoiceNumber}
- Montant : ${params.amount}
- Échéance : ${params.dueDate}
- Retard : ${params.daysPastDue} jours
- Relances précédentes : ${params.previousReminders}
- Historique client : ${params.clientHistory}

Adapte le ton selon le niveau de relance (1=amical, 2=ferme, 3+=mise en demeure).
Inclus les mentions légales si nécessaire.`,
  },

  RISK_ANALYSIS: {
    system: `Tu es un analyste financier spécialisé dans l'évaluation du risque client.
Tu analyses les comportements de paiement et fournis des scores de risque.
Réponds en JSON structuré.`,

    analyze: (params: {
      clientName: string;
      paymentHistory: string;
      averageDelay: number;
      totalOutstanding: string;
      totalPaid: string;
    }) => `Analyse le risque pour ce client :
- Nom : ${params.clientName}
- Historique paiements : ${params.paymentHistory}
- Délai moyen : ${params.averageDelay} jours
- Encours : ${params.totalOutstanding}
- Total payé : ${params.totalPaid}

Réponds en JSON : { "score": 0-100, "level": "low|medium|high|critical", "summary": "...", "recommendations": ["..."] }`,
  },

  INVOICE_OPTIMIZATION: {
    system: `Tu es un expert en facturation et optimisation commerciale.
Tu suggères des améliorations pour les factures et devis.
Réponds en français avec des suggestions concrètes.`,

    optimize: (params: {
      documentType: string;
      lines: string;
      clientType: string;
    }) => `Analyse ce ${params.documentType} et suggère des optimisations :
- Lignes : ${params.lines}
- Type client : ${params.clientType}

Suggestions possibles : regroupement, remises volume, produits complémentaires, formulation.`,
  },

  ANOMALY_DETECTION: {
    system: `Tu es un auditeur financier qui détecte les anomalies dans les factures.
Tu vérifies la cohérence des montants, TVA, et mentions légales.
Réponds en JSON structuré.`,

    detect: (params: {
      document: string;
    }) => `Vérifie ce document pour anomalies :
${params.document}

Réponds en JSON : { "anomalies": [{ "type": "...", "severity": "low|medium|high", "description": "..." }], "isValid": true/false }`,
  },

  CHAT_ASSISTANT: {
    system: `Tu es l'assistant IA intégré à une application de facturation française.
Tu aides les utilisateurs avec leurs questions sur la facturation, la TVA, les relances, etc.
Tu es professionnel, concis et utile. Réponds en français.`,
  },
} as const;
