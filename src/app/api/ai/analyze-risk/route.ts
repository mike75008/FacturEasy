import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";
import { PROMPTS } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const params = await request.json();

    const messages = [
      { role: "system" as const, content: PROMPTS.RISK_ANALYSIS.system },
      { role: "user" as const, content: PROMPTS.RISK_ANALYSIS.analyze(params) },
    ];

    const response = await generateAIResponse(messages, {
      temperature: 0.3,
      maxTokens: 512,
    });

    // Parse JSON from AI response
    let analysis;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.content };
    } catch {
      analysis = { raw: response.content };
    }

    return NextResponse.json({
      analysis,
      usage: response.usage,
    });
  } catch (error) {
    console.error("Risk analysis error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse de risque" },
      { status: 500 }
    );
  }
}
