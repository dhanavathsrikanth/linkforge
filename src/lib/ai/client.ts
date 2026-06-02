/**
 * Cloudflare Workers AI client for LinkForge.
 *
 * Uses the REST API at https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/{model}
 * Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast (70B params, edge-deployed)
 *
 * Replaces OpenRouter (deepseek/deepseek-v4-flash:free) which was rate-limited
 * and unreliable. Workers AI has no rate limits, sub-10ms cold start, and runs
 * at the edge.
 */

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

function getConfig() {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const token =
    process.env.CLOUDFLARE_URL_SCANNER_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN for Workers AI"
    );
  }
  return { accountId, token };
}

async function runModel(messages: Message[]): Promise<string> {
  const { accountId, token } = getConfig();
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        max_tokens: 2048,
        temperature: 0.2,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`Workers AI error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const result = json.result;

  if (!result) {
    throw new Error("Workers AI returned no result");
  }

  // Workers AI returns { result: { response: "..." } } for non-streaming
  if (typeof result.response === "string") {
    return result.response;
  }

  throw new Error("Unexpected Workers AI response format");
}

/**
 * Complete a chat completion request.
 * Drop-in replacement for the old OpenRouter aiComplete.
 */
export async function aiComplete(
  messages: Message[],
  _opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  return runModel(messages);
}

/**
 * Generate structured JSON from a system + user prompt.
 *
 * Workers AI doesn't have native JSON mode, so we append an instruction
 * to the user message and extract JSON from the response (handles markdown
 * code fences if the model wraps output).
 */
export async function aiJson<T>(
  system: string,
  user: string
): Promise<T> {
  const augmentedUser = `${user}\n\nReturn ONLY valid JSON — no markdown, no explanation, just the JSON object.`;
  const result = await runModel([
    { role: "system", content: system },
    { role: "user", content: augmentedUser },
  ]);
  return JSON.parse(extractJson(result)) as T;
}

/**
 * Strip markdown code fences from LLM output if present.
 */
function extractJson(raw: string): string {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return raw.trim();
}
