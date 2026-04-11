import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ResolutionResult = {
  outcome:    "YES" | "NO" | "INVALID";
  confidence: number;     // 0-1
  reasoning:  string;
  sources:    string[];
};

/// Resolve a market question using AI + web search for current data
export async function resolveMarket(
  question: string,
  resolvesAt: string
): Promise<ResolutionResult> {
  const prompt = `You are a trusted prediction market resolver. 
Your job is to determine the outcome of the following market question.

Market Question: "${question}"
Resolution Date: ${resolvesAt}

Instructions:
1. Search for current, factual information about this event
2. Determine if the outcome is YES, NO, or INVALID (if the question is ambiguous or unresolvable)
3. Be strictly factual — no speculation
4. Cite your sources

Respond ONLY with valid JSON in this exact format:
{
  "outcome": "YES" | "NO" | "INVALID",
  "confidence": 0.0-1.0,
  "reasoning": "brief factual explanation",
  "sources": ["source url or description 1", "source 2"]
}`;

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content from response
  const textBlock = response.content.find((b: any) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI resolver");
  }

  try {
    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean) as ResolutionResult;
    return result;
  } catch {
    throw new Error(`Failed to parse AI resolution: ${textBlock.text}`);
  }
}

/// Generate AI-suggested prediction markets based on trending topics
export async function suggestMarkets(count = 5): Promise<any[]> {
  const today = new Date().toISOString().slice(0, 10);

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Today is ${today}. Generate ${count} compelling, high-quality binary prediction market questions about REAL-WORLD events occurring in May, June, or July 2026.
      
      CRITICAL INSTRUCTIONS:
      - ONLY use real, confirmed events (e.g. UEFA Champions League, NBA Playoffs, Major Tech Launches, Crypto milestones).
      - ABSOLUTELY NO test, dummy, or fictional markets.
      - Ensure the resolution criteria are specific and objectively verifiable.
      - Category mix: crypto, sports, politics, tech, entertainment.
      
      Respond ONLY with a JSON array:
      [
        {
          "question": "Will [Confirmed Actor/Team/Person] [Action/Result] by [Specific Date]?",
          "description": "Context about the real-world event and how to verify resolution via official sources.",
          "category": "crypto|sports|politics|tech|entertainment|other",
          "suggestedResolvesAt": "2026-MM-DDTHH:mm:ssZ",
          "rationale": "High-interest factual event for traders."
        }
      ]`
    }],
  });

  const textBlock = response.content.find((b: any) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  try {
    const text = (textBlock as any).text as string;
    const clean = text.replace(/```json|```/g, "").trim();
    // Extract JSON array if surrounded by extra text
    const match = clean.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : JSON.parse(clean);
  } catch (e: any) {
    console.error("[AI] suggestMarkets parse error:", e.message);
    return [];
  }
}

/// Validate if a user-submitted market question is suitable
export async function validateMarketQuestion(question: string): Promise<{
  valid: boolean;
  reason: string;
  improvedQuestion?: string;
}> {
  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Validate this prediction market question: "${question}"

A valid question must:
- Be binary (yes/no answerable)
- Have a clear, objective resolution criterion
- Be about a verifiable real-world event
- Not involve death, harm, or illegal activity
- Be resolvable within 90 days

Respond ONLY with JSON:
{
  "valid": true|false,
  "reason": "explanation",
  "improvedQuestion": "better version if needed, or null"
}`
    }],
  });

  const textBlock = response.content.find((b: any) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return { valid: false, reason: "AI error" };

  try {
    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { valid: false, reason: "Parse error" };
  }
}
