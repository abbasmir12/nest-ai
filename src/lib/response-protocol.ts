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
  icon?: string;
  metadata?: {
    leaders?: string[];
    level?: string;
    github?: string;
    [key: string]: any;
  };
}

export const RESPONSE_PROTOCOL = `
# 🚨 CRITICAL: Structured Response Protocol

## MANDATORY FORMAT - NO EXCEPTIONS!

You MUST return ONLY valid JSON in this EXACT format. NO extra text, NO explanations, NO markdown except the json code block.

### CORRECT Format:
\`\`\`json
{
  "summary": "A natural language summary of the results",
  "intent": "projects|events|issues|contributors|chapters|general",
  "cards": [
    {
      "title": "Card Title",
      "description": "Brief description (max 100 chars)",
      "date": "Optional date string",
      "link": "Full URL to the resource",
      "type": "project|event|issue|contributor|chapter",
      "icon": "Optional avatar/image URL"
    }
  ]
}
\`\`\`

## 🚨 CRITICAL RULES - FOLLOW EXACTLY:

1. **ONLY return the JSON** - NO text before or after the code block
2. **ALWAYS wrap in \`\`\`json code blocks** - This is mandatory
3. **NO explanations** - Don't add "Here's the response:" or "Hope this helps!"
4. **NO extra markdown** - Just the json code block, nothing else
5. **Valid JSON only** - Must parse without errors
6. **All required fields** - summary, intent, and cards array

## ❌ WRONG Examples (DO NOT DO THIS):

### Wrong 1: Extra text before/after
\`\`\`
Here is the response:
\`\`\`json
{ ... }
\`\`\`
Hope this helps!
\`\`\`
❌ NO! Just return the JSON block!

### Wrong 2: No code block
\`\`\`
{ "summary": "...", "intent": "...", "cards": [] }
\`\`\`
❌ NO! Must wrap in \`\`\`json block!

### Wrong 3: Plain text response
\`\`\`
Here are some OWASP projects: ZAP, Juice Shop, etc.
\`\`\`
❌ NO! Must return structured JSON!

## ✅ CORRECT Example:

\`\`\`json
{
  "summary": "Here are some popular OWASP security projects:",
  "intent": "projects",
  "cards": [
    {
      "title": "OWASP ZAP",
      "description": "World's most widely used web app scanner",
      "link": "https://owasp.org/www-project-zap/",
      "type": "project"
    }
  ]
}
\`\`\`

## Field Requirements:

- **summary**: Friendly, conversational text (1-2 sentences)
- **intent**: Must be one of: projects, events, issues, contributors, chapters, general
- **cards**: Array of card objects (can be empty [])
- **title**: Card title (required)
- **description**: Brief description, max 100 chars (required)
- **link**: Full URL starting with https:// (required)
- **type**: Must match intent (required)
- **icon**: Avatar/image URL (optional, use for contributors)
- **date**: Human-readable date (optional, use for events)
- **metadata**: Object with additional data (optional)
  - **leaders**: Array of leader names for projects
  - **level**: Project level (flagship, lab, incubator)
  - **github**: GitHub URL

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
      "link": "https://github.com/zaproxy/zaproxy",
      "type": "project",
      "metadata": {
        "leaders": ["Simon Bennetts"],
        "level": "flagship",
        "github": "https://github.com/zaproxy/zaproxy"
      }
    },
    {
      "title": "OWASP Top 10",
      "description": "Standard awareness document for web security",
      "link": "https://owasp.org/www-project-top-ten/",
      "type": "project",
      "metadata": {
        "leaders": ["Andrew van der Stock"],
        "level": "flagship"
      }
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

### Example 4: Contributors Query
User: "Show me OWASP contributors"

Response:
\`\`\`json
{
  "summary": "Here are the newest OWASP community members:",
  "intent": "contributors",
  "cards": [
    {
      "title": "Abbas Mir (@abbasmir12)",
      "description": "Joined Aug 16, 2025 • Last active Nov 6, 2025",
      "icon": "https://avatars.githubusercontent.com/u/226835672?v=4",
      "link": "https://github.com/abbasmir12",
      "type": "contributor"
    }
  ]
}
\`\`\`

IMPORTANT: You must ALWAYS use the MCP tools to fetch real data before responding. Never make up data.
`;

/**
 * Parse AI response and extract structured data
 * Handles multiple formats:
 * 1. ```json { ... } ```
 * 2. ``` { ... } ```
 * 3. { ... } (plain JSON)
 * 4. Text before/after JSON
 */
export function parseStructuredResponse(aiResponse: string): StructuredResponse | null {
  try {
    let jsonStr = '';

    // Method 1: Try to extract from ```json code blocks
    const jsonCodeBlock = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonCodeBlock) {
      jsonStr = jsonCodeBlock[1].trim();
    } 
    // Method 2: Try to extract from ``` code blocks (without json keyword)
    else {
      const codeBlock = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlock) {
        jsonStr = codeBlock[1].trim();
      }
    }

    // Method 3: If no code blocks, find JSON by braces
    if (!jsonStr) {
      // Find the first { and last } to extract JSON
      const firstBrace = aiResponse.indexOf('{');
      const lastBrace = aiResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
      } else {
        console.error('No JSON found in response');
        return null;
      }
    }

    // Clean up any remaining markdown or extra characters
    jsonStr = jsonStr
      .replace(/^```json\s*/g, '')  // Remove ```json prefix
      .replace(/^```\s*/g, '')       // Remove ``` prefix
      .replace(/\s*```$/g, '')       // Remove ``` suffix
      .trim();

    // Parse the JSON
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed.summary || !parsed.intent) {
      console.error('Invalid structure: missing summary or intent');
      return null;
    }

    return parsed as StructuredResponse;
  } catch (error) {
    console.error('Failed to parse structured response:', error);
    console.error('Response was:', aiResponse.substring(0, 500)); // Log first 500 chars for debugging
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
      type: 'project' as const,
      metadata: {
        leaders: p.leaders || [],
        level: p.level,
        github: p.githubLink
      }
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
