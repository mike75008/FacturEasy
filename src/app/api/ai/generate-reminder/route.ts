import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";
import { PROMPTS } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const params = await request.json();

    const messages = [
      { role: "system" as const, content: PROMPTS.REMINDER.system },
      { role: "user" as const, content: PROMPTS.REMINDER.generate(params) },
    ];

    const response = await generateAIResponse(messages, {
      temperature: 0.8,
      maxTokens: 1024,
    });

    return NextResponse.json({
      content: response.content,
      usage: response.usage,
    });
  } catch (error) {
    console.error("Generate reminder error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de la relance" },
      { status: 500 }
    );
  }
}
