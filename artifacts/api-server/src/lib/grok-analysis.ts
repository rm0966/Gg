import { ReplitConnectors } from "@replit/connectors-sdk";

export class GrokAnalysisError extends Error {
  constructor(message = "Grok could not complete the analysis") {
    super(message);
    this.name = "GrokAnalysisError";
  }
}

let connectors: ReplitConnectors | undefined;

function getConnectors(): ReplitConnectors {
  connectors ??= new ReplitConnectors();
  return connectors;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new GrokAnalysisError("Grok returned an unreadable report");
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  } catch {
    throw new GrokAnalysisError("Grok returned an unreadable report");
  }
}

export async function analyzeWithGrok(input: {
  language: "ar" | "en";
  assessmentTitle: string;
  assessmentGroup: "self" | "future" | "abilities";
  questionsAndAnswers: Array<{
    question: string;
    answer: string;
    value: string;
  }>;
}): Promise<unknown> {
  const languageInstruction =
    input.language === "ar"
      ? "Write every report field in clear, natural Arabic."
      : "Write every report field in clear, natural English.";
  const system = [
    "You are a careful self-discovery and career exploration guide.",
    languageInstruction,
    "Interpret only the supplied questions and answers. Do not diagnose, label the user, or claim scientific certainty.",
    "Do not create numerical personality scores, promise career success, or invent salaries, licensing rules, or labor-market facts.",
    "Clearly frame findings as possible interpretations, not facts about the person.",
    "Use possibleTensions only for meaningful differences between answers; return an empty array when none stand out.",
    "Recommendations must include at least four varied, realistic options. For career and practical skills, include relevant hands-on trades, crafts, technical work, services, or self-employment when the answers support them; do not limit suggestions to office jobs.",
    "Give a concise reason tied to the supplied answers and actionable, low-barrier next steps for each recommendation.",
    "Mention limits and uncertainty, especially that one short self-report is not enough to determine a person's future.",
    "Return only a valid JSON object with these exact keys and value types: summary (string), observedPatterns (string array), strengths (string array), motivations (string array), values (string array), possibleTensions (string array), recommendations (array of objects with title, whyItMayFit, practicalNextSteps string array), nextSteps (string array), uncertaintyNote (string).",
  ].join(" ");
  const user = JSON.stringify({
    assessment: input.assessmentTitle,
    assessmentGroup: input.assessmentGroup,
    answers: input.questionsAndAnswers,
  });

  let response: Response;
  try {
    response = await getConnectors().proxy("xai", "/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4.5",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_completion_tokens: 2600,
      }),
    });
  } catch {
    throw new GrokAnalysisError();
  }

  if (!response.ok) {
    throw new GrokAnalysisError();
  }

  let payload: {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new GrokAnalysisError("Grok returned an invalid response");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new GrokAnalysisError("Grok returned an empty report");
  }

  return extractJsonObject(content);
}
