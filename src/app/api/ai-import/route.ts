import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";

export const runtime = "nodejs";

const CLIENT_FIELDS = [
  "company_name", "first_name", "last_name", "email", "phone",
  "address", "city", "postal_code", "country", "siret", "tva_number", "notes",
];

const PRODUCT_FIELDS = [
  "name", "description", "unit_price", "unit", "tva_rate", "category",
];

export async function POST(request: NextRequest) {
  try {
    const { headers, sampleRows } = await request.json();

    const sampleText = sampleRows
      .slice(0, 3)
      .map((row: string[], i: number) => `Ligne ${i + 1}: ${headers.map((h: string, j: number) => `${h}="${row[j] ?? ""}"`).join(", ")}`)
      .join("\n");

    const messages = [
      {
        role: "system" as const,
        content:
          "Tu es un expert en migration de données pour des logiciels de facturation français. " +
          "Tu analyses des colonnes de fichiers (Excel, CSV) et tu les associes aux champs d'une application de facturation. " +
          "Tu réponds UNIQUEMENT en JSON valide, sans markdown ni explication.",
      },
      {
        role: "user" as const,
        content:
          `Analyse ces colonnes et données d'exemple :\n\n` +
          `Colonnes : ${headers.join(", ")}\n\n` +
          `${sampleText}\n\n` +
          `Détermine :\n` +
          `1. Le type d'entité : "clients" (carnets d'adresses, contacts, sociétés) ou "products" (catalogue, articles, services, tarifs)\n` +
          `2. La correspondance de chaque colonne source vers un champ FacturEasy (ou null si non pertinent)\n\n` +
          `Champs disponibles pour clients : ${CLIENT_FIELDS.join(", ")}\n` +
          `Champs disponibles pour products : ${PRODUCT_FIELDS.join(", ")}\n\n` +
          `Réponds UNIQUEMENT avec ce JSON :\n` +
          `{\n` +
          `  "entityType": "clients" ou "products",\n` +
          `  "confidence": nombre entre 0 et 1,\n` +
          `  "mapping": { "NomColonneSource": "champCible ou null", ... }\n` +
          `}`,
      },
    ];

    const response = await generateAIResponse(messages, { maxTokens: 600, temperature: 0.1 });

    // Extraire le JSON de la réponse (parfois l'IA ajoute du texte autour)
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse IA invalide");

    const result = JSON.parse(jsonMatch[0]);

    // Validation basique
    if (!result.entityType || !result.mapping) throw new Error("Structure IA invalide");

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Import]", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse IA" }, { status: 500 });
  }
}
