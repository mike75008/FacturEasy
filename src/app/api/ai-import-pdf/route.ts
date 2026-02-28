import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: "Texte PDF trop court ou illisible" }, { status: 400 });
    }

    // Limiter le texte pour ne pas dépasser les tokens (max ~6000 chars)
    const truncatedText = text.slice(0, 6000);

    const messages = [
      {
        role: "system" as const,
        content:
          "Tu es un expert en extraction de données pour des logiciels de gestion français. " +
          "Tu lis du texte extrait de PDFs (factures, catalogues, carnets d'adresses) et tu en extrais des données structurées. " +
          "Tu réponds UNIQUEMENT en JSON valide, sans markdown ni explication.",
      },
      {
        role: "user" as const,
        content:
          `Analyse ce texte extrait d'un PDF et extrais toutes les données structurées :\n\n` +
          `---\n${truncatedText}\n---\n\n` +
          `Détermine si ce document contient des données de type :\n` +
          `- "clients" : contacts, sociétés, carnets d'adresses, clients\n` +
          `- "products" : produits, services, catalogue, tarifs, articles\n\n` +
          `Champs clients : company_name, first_name, last_name, email, phone, address, city, postal_code, country, siret, tva_number, sector, notes\n` +
          `Champs produits : name, description, unit_price, unit, tva_rate, category\n\n` +
          `Réponds UNIQUEMENT avec ce JSON :\n` +
          `{\n` +
          `  "entityType": "clients" ou "products",\n` +
          `  "confidence": nombre entre 0 et 1,\n` +
          `  "records": [\n` +
          `    { "champ1": "valeur1", "champ2": "valeur2", ... },\n` +
          `    ...\n` +
          `  ]\n` +
          `}`,
      },
    ];

    const response = await generateAIResponse(messages, {
      model: "gpt-4o",
      maxTokens: 2000,
      temperature: 0.1,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse IA invalide");

    const result = JSON.parse(jsonMatch[0]);
    if (!result.entityType || !Array.isArray(result.records)) throw new Error("Structure IA invalide");

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Import PDF]", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse du PDF" }, { status: 500 });
  }
}
