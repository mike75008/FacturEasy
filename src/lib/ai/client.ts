import OpenAI from "openai";

// AI provider abstraction - easy switch from OpenAI to Claude later
const provider = process.env.AI_PROVIDER || "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function generateAIResponse(
  messages: AIMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<AIResponse> {
  const { model, maxTokens = 1024, temperature = 0.7 } = options;

  if (provider === "openai") {
    const response = await openai.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: maxTokens,
      temperature,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      usage: response.usage
        ? {
            input_tokens: response.usage.prompt_tokens,
            output_tokens: response.usage.completion_tokens || 0,
          }
        : undefined,
    };
  }

  // Future: Claude provider
  // if (provider === "claude") {
  //   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  //   const systemMsg = messages.find(m => m.role === "system")?.content || "";
  //   const userMessages = messages.filter(m => m.role !== "system");
  //   const response = await anthropic.messages.create({
  //     model: model || "claude-haiku-4-5-20251001",
  //     max_tokens: maxTokens,
  //     system: systemMsg,
  //     messages: userMessages,
  //   });
  //   return { content: response.content[0].text, usage: response.usage };
  // }

  throw new Error(`Unknown AI provider: ${provider}`);
}

export async function generateAIStream(
  messages: AIMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
) {
  const { model, maxTokens = 1024, temperature = 0.7 } = options;

  if (provider === "openai") {
    return openai.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: maxTokens,
      temperature,
      stream: true,
    });
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}
