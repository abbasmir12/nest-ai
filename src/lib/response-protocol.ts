/**
 * Structured Response Protocol for Nest AI
 * 
 * This protocol defines how the AI should structure its responses
 * so that we can parse them and create display cards automatically.
 */

export interface StructuredResponse {
  summary: string;
  intent: 'projects' | 'events' | 'issues' | 'contributors' | 'chapters' | 'general';
  cards?: CardData[];
}

export interface CardData {
  title: string;
  description: string;
  date?: string;
  link: string;
  type: 'project' | 'event' | 'issue' | 'contributor' | 'chapter';
}

export const RESPONSE_PROTOCOL = `
# Structured Response Protocol

When responding to user queries about OWASP Nest, you MUST structure your response in the following JSON format:

{
  "summary": "A natural language summary of the results",
  "intent": "projects|events|issues|contributors|chapters|general",
  "cards": [
    {
      "title": "Card Title",
      "description": "Brief description (max 100 chars)",
      "date": "Optional date string",
      "link": "Full URL to the resource",
      "type": "project|event|issue|contributor|chapter"
    }
  ]
}

## Rules:

1. ALWAYS return valid JSON wrapped in \`\`\`json code blocks
2. The "summary" should be a friendly, conversational response
3. The "intent" must match the user's query type
4. Each card must have: title, description, link, and type
5. Keep descriptions under 100 characters
6. Use full URLs for links (https://...)
7. For dates, use human-readable format (e.g., "Dec 15, 2025")

## Examples:

### Example 1: Projects Query
User: "Show me OWASP security projects"

Response:
\`\`\`json
{
  "summary": "Here are some popular OWASP security projects that you might find useful:",
  "intent": "projects",
  "cards": [
    {
      "title": "OWASP ZAP",
      "description": "World's most widely used web app scanner",
      "link": "https://owasp.org/www-project-zap/",
      "type": "project"
    },
    {
      "title": "OWASP Top 10",
      "description": "Standard awareness document for web security",
      "link": "https://owasp.org/www-project-top-ten/",
      "type": "project"
    }
  ]
}
\`\`\`

### Example 2: Events Query
User: "What are the upcoming OWASP events?"

Response:
\`\`\`json
{
  "summary": "Here are the upcoming OWASP events you can attend:",
  "intent": "events",
  "cards": [
    {
      "title": "OWASP Global AppSec 2025",
      "description": "Annual global application security conference",
      "date": "Dec 15, 2025",
      "link": "https://owasp.org/events/appsec-global-2025",
      "type": "event"
    }
  ]
}
\`\`\`

### Example 3: Issues Query
User: "Show me issues I can contribute to"

Response:
\`\`\`json
{
  "summary": "Here are some high-priority issues where you can make an impact:",
  "intent": "issues",
  "cards": [
    {
      "title": "Add OAuth 2.0 support",
      "description": "High priority - OWASP ZAP",
      "link": "https://github.com/zaproxy/zaproxy/issues/123",
      "type": "issue"
    }
  ]
}
\`\`\`

IMPORTANT: You must ALWAYS use the MCP tools to fetch real data before responding. Never make up data.
`;

/**
 * Parse AI response and extract structured data
 */
export function parseStructuredResponse(aiResponse: string): StructuredResponse | null {
  try {
    // Extract JSON from code blocks
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // Try to find JSON without code blocks
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = aiResponse.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonStr);
      }
      return null;
    }

    const jsonStr = jsonMatch[1];
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed.summary || !parsed.intent) {
      return null;
    }

    return parsed as StructuredResponse;
  } catch (error) {
    console.error('Failed to parse structured response:', error);
    return null;
  }
}

/**
 * Convert MCP tool response to cards
 */
export function convertMCPDataToCards(data: any, type: CardData['type']): CardData[] {
  const cards: CardData[] = [];

  if (type === 'project' && data.projects) {
    cards.push(...data.projects.map((p: any) => ({
      title: p.name,
      description: p.description.substring(0, 100),
      link: p.url,
      type: 'project' as const
    })));
  }

  if (type === 'event' && data.events) {
    cards.push(...data.events.map((e: any) => ({
      title: e.name,
      description: e.description.substring(0, 100),
      date: e.date,
      link: e.url,
      type: 'event' as const
    })));
  }

  if (type === 'issue' && data.issues) {
    cards.push(...data.issues.map((i: any) => ({
      title: i.title,
      description: `${i.priority} priority - ${i.project}`.substring(0, 100),
      link: i.url,
      type: 'issue' as const
    })));
  }

  if (type === 'contributor' && data.contributors) {
    cards.push(...data.contributors.map((c: any) => ({
      title: c.name,
      description: `${c.contributions}+ contributions`,
      link: c.url,
      type: 'contributor' as const
    })));
  }

  if (type === 'chapter' && data.chapters) {
    cards.push(...data.chapters.map((ch: any) => ({
      title: ch.name,
      description: ch.location,
      link: ch.url,
      type: 'chapter' as const
    })));
  }

  return cards;
}
