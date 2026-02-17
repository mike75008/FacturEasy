import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai/client";
import { PROMPTS } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Le message est requis" },
        { status: 400 }
      );
    }

    const messages = [
      { role: "system" as const, content: PROMPTS.CHAT_ASSISTANT.system },
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await generateAIResponse(messages);

    return NextResponse.json({
      content: response.content,
      usage: response.usage,
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de la réponse" },
      { status: 500 }
    );
  }
}
