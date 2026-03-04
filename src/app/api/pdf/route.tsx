// API Route PDF — aucune dépendance browser
// React-PDF reste côté navigateur, ce fichier fait uniquement l'embedding Factur-X
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, AFRelationship } from "pdf-lib";
import { generateFacturXML } from "@/lib/facturx";
import type { Document as Doc, DocumentLine, Organization, Client } from "@/types/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const dataStr = formData.get("data") as string | null;

    if (!pdfFile || !dataStr) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const { doc, lines, organization, client } = JSON.parse(dataStr) as {
      doc: Doc;
      lines: DocumentLine[];
      organization: Organization;
      client: Client | null;
    };

    // 1. Récupérer les bytes du PDF généré par React-PDF côté navigateur
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // 2. Générer le XML Factur-X (fonction pure, aucune dépendance browser)
    const xmlString = generateFacturXML({ doc, lines, organization, client });
    const xmlBytes = new TextEncoder().encode(xmlString);

    // 3. Charger le PDF et embarquer le XML avec pdf-lib (Node.js natif)
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    await pdfDoc.attach(xmlBytes, "factur-x.xml", {
      mimeType: "text/xml",
      description: "Factur-X XML (EN 16931)",
      creationDate: new Date(),
      modificationDate: new Date(),
      afRelationship: AFRelationship.Alternative,
    });

    const finalBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(finalBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[PDF API]", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}
