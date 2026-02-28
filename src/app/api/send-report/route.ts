import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { pdfBase64, clientEmail, clientName, reportTitle, companyName, resendKey } =
      await request.json();

    if (!clientEmail) {
      return NextResponse.json({ error: "Email client manquant" }, { status: 400 });
    }
    if (!pdfBase64) {
      return NextResponse.json({ error: "PDF manquant" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY || resendKey;
    if (!apiKey) {
      return NextResponse.json({ error: "CLE_RESEND_MANQUANTE" }, { status: 400 });
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: clientEmail,
      subject: reportTitle,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6f9;padding:24px;">
          <div style="background:#081525;padding:32px 28px;border-radius:12px;margin-bottom:20px;">
            <h1 style="color:#d4af37;margin:0 0 4px 0;font-size:26px;letter-spacing:1px;">FacturEasy</h1>
            <p style="color:#9fb9d8;margin:0;font-size:13px;">Rapport financier confidentiel</p>
          </div>
          <div style="background:#ffffff;padding:28px;border-radius:12px;border-top:4px solid #d4af37;">
            <h2 style="color:#081525;margin:0 0 16px 0;font-size:18px;">${reportTitle}</h2>
            <p style="color:#444;line-height:1.7;margin:0 0 12px 0;">Bonjour <strong>${clientName}</strong>,</p>
            <p style="color:#444;line-height:1.7;margin:0 0 12px 0;">
              Veuillez trouver ci-joint votre rapport financier établi par <strong>${companyName}</strong>.
            </p>
            <p style="color:#444;line-height:1.7;margin:0 0 20px 0;">
              Ce rapport inclut une analyse complète de votre relation commerciale,
              vos indicateurs financiers clés et des recommandations personnalisées générées par notre IA.
            </p>
            <div style="background:#f8f4e8;border-left:4px solid #d4af37;padding:12px 16px;border-radius:4px;margin-bottom:20px;">
              <p style="color:#7a6520;margin:0;font-size:13px;">
                📎 Le rapport PDF est joint à cet email.
              </p>
            </div>
            <p style="color:#888;font-size:12px;line-height:1.6;margin:0;">
              Ce rapport est confidentiel et généré automatiquement par FacturEasy.
            </p>
          </div>
          <p style="color:#aaa;font-size:11px;text-align:center;margin-top:20px;">
            Généré par FacturEasy — Logiciel de facturation intelligent
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${reportTitle.replace(/[^a-z0-9àâäéèêëîïôöùûü -]/gi, "").trim()}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
        },
      ],
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Send Report]", error);
    return NextResponse.json(
      { error: (error as Error).message || "Erreur envoi email" },
      { status: 500 }
    );
  }
}
