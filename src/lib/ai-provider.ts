import { AIConfig } from "@/types";

const SYSTEM_PROMPT = `You are Nest AI, an intelligent assistant for the OWASP Nest API ecosystem.

Your role is to help users discover and interact with OWASP projects, events, issues, contributors, and chapters.

When users ask questions, you should:
1. Understand their intent (e.g., finding events, projects, contributors, issues, chapters)
2. Use the available MCP tools to fetch real-time data from OWASP Nest API
3. Provide concise, helpful summaries
4. Return structured data that will be displayed as interactive cards

Available MCP Tools:
- nest_get_projects: Fetch OWASP projects
- nest_get_events: Fetch upcoming OWASP events
- nest_get_issues: Fetch open issues to contribute to
- nest_get_contributors: Fetch top contributors
- nest_get_chapters: Fetch OWASP chapters

When responding:
- Be concise and friendly
- Focus on actionable information
- Highlight key details (dates, priorities, locations)
- Encourage community participation

Example queries you should handle:
- "What are the upcoming OWASP events?"
- "Show me top contributors"
- "List high-priority issues I can contribute to"
- "Find OWASP projects related to web security"
- "Show me OWASP chapters near me"

Always structure your response to include both a natural language summary and structured data for display cards.`;

export async function queryAI(
  message: string,
  config: AIConfig,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: message },
  ];

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export function parseAIResponse(aiResponse: string): {
  summary: string;
  intent: string;
} {
  // Simple intent detection
  const lowerResponse = aiResponse.toLowerCase();
  
  let intent = "general";
  if (lowerResponse.includes("event")) intent = "events";
  else if (lowerResponse.includes("project")) intent = "projects";
  else if (lowerResponse.includes("issue") || lowerResponse.includes("contribute")) intent = "issues";
  else if (lowerResponse.includes("contributor")) intent = "contributors";
  else if (lowerResponse.includes("chapter")) intent = "chapters";

  return {
    summary: aiResponse,
    intent,
  };
}
