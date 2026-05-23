import OpenAI from "openai";

const MODEL = "deepseek/deepseek-v4-flash:free";

function createClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) client = createClient();
  return client!;
}

export async function aiComplete(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts?: { maxTokens?: number; temperature?: number }
) {
  const c = getClient();
  if (!c) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  const res = await c.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: opts?.maxTokens ?? 1024,
    temperature: opts?.temperature ?? 0.3,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function aiJson<T>(
  system: string,
  user: string
): Promise<T> {
  const c = getClient();
  if (!c) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  const res = await c.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 2048,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}
