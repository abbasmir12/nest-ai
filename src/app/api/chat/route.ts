import { NextRequest, NextResponse } from "next/server";
import { ChatRequest, DisplayCardData } from "@/types";
import { RESPONSE_PROTOCOL, parseStructuredResponse, convertMCPDataToCards } from "@/lib/response-protocol";
import axios from "axios";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001/mcp";

const SYSTEM_PROMPT = `You are Nest AI, an intelligent assistant for the OWASP Nest API ecosystem.

Your role is to help users discover and interact with OWASP projects, events, issues, contributors, and chapters.

${RESPONSE_PROTOCOL}

## Available MCP Tools:

You MUST use these tools to fetch real data before responding:

1. **nest_get_projects** - Fetch OWASP projects
   - Parameters: level (flagship/lab/incubator), type (tool/documentation/code), limit
   
2. **nest_get_events** - Fetch upcoming OWASP events
   - Parameters: limit, upcoming (boolean)
   
3. **nest_get_issues** - Fetch open issues to contribute to
   - Parameters: priority (high/medium/low), project, limit
   
4. **nest_get_contributors** - Fetch top contributors
   - Parameters: limit, project
   
5. **nest_get_chapters** - Fetch OWASP chapters
   - Parameters: location, limit

## Workflow:

1. Understand user's intent
2. Call the appropriate MCP tool(s) to fetch real data
3. Format the response using the Structured Response Protocol
4. Return JSON with summary and cards

## Important:
- ALWAYS call MCP tools to get real data
- NEVER make up or fabricate data
- ALWAYS return responses in the structured JSON format
- Keep descriptions concise (under 100 characters)
- Use full URLs for all links`;

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, config } = body;

    if (!config.apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Step 1: Detect intent and call MCP tools
    const mcpData = await callMCPTools(message);

    // Step 2: Call AI with MCP data
    const aiPrompt = `User query: "${message}"

MCP Tool Data:
${JSON.stringify(mcpData, null, 2)}

Using the above real data from OWASP Nest API, create a structured response following the protocol.`;

    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: aiPrompt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("HuggingFace API error:", error);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Step 3: Parse structured response
    const structured = parseStructuredResponse(aiMessage);

    if (structured && structured.cards) {
      return NextResponse.json({
        message: structured.summary,
        cards: structured.cards,
      });
    }

    // Fallback: if AI didn't return structured format, create cards from MCP data
    const fallbackCards = createFallbackCards(mcpData);

    return NextResponse.json({
      message: aiMessage,
      cards: fallbackCards,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Call MCP tools based on user intent
 */
async function callMCPTools(message: string): Promise<any> {
  const lowerMessage = message.toLowerCase();
  const results: any = {};

  try {
    // Detect intent and call appropriate tools
    if (lowerMessage.includes("project")) {
      results.projects = await callMCPTool("nest_get_projects", { limit: 5 });
    }

    if (lowerMessage.includes("event")) {
      results.events = await callMCPTool("nest_get_events", { limit: 5 });
    }

    if (lowerMessage.includes("issue") || lowerMessage.includes("contribute")) {
      results.issues = await callMCPTool("nest_get_issues", { limit: 5 });
    }

    if (lowerMessage.includes("contributor")) {
      results.contributors = await callMCPTool("nest_get_contributors", { limit: 5 });
    }

    if (lowerMessage.includes("chapter")) {
      results.chapters = await callMCPTool("nest_get_chapters", { limit: 5 });
    }

    // If no specific intent, fetch projects as default
    if (Object.keys(results).length === 0) {
      results.projects = await callMCPTool("nest_get_projects", { limit: 5 });
    }

    return results;
  } catch (error) {
    console.error("Error calling MCP tools:", error);
    return {};
  }
}

/**
 * Call a specific MCP tool
 */
async function callMCPTool(toolName: string, args: any): Promise<any> {
  try {
    const response = await axios.post(MCP_SERVER_URL, {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    }, {
      timeout: 10000
    });

    if (response.data.result?.structuredContent) {
      return response.data.result.structuredContent;
    }

    // Parse from text content if structured content not available
    if (response.data.result?.content?.[0]?.text) {
      return JSON.parse(response.data.result.content[0].text);
    }

    return null;
  } catch (error) {
    console.error(`Error calling MCP tool ${toolName}:`, error);
    return null;
  }
}

/**
 * Create fallback cards from MCP data if AI doesn't return structured format
 */
function createFallbackCards(mcpData: any): DisplayCardData[] {
  const cards: DisplayCardData[] = [];

  if (mcpData.projects) {
    cards.push(...convertMCPDataToCards(mcpData.projects, 'project'));
  }

  if (mcpData.events) {
    cards.push(...convertMCPDataToCards(mcpData.events, 'event'));
  }

  if (mcpData.issues) {
    cards.push(...convertMCPDataToCards(mcpData.issues, 'issue'));
  }

  if (mcpData.contributors) {
    cards.push(...convertMCPDataToCards(mcpData.contributors, 'contributor'));
  }

  if (mcpData.chapters) {
    cards.push(...convertMCPDataToCards(mcpData.chapters, 'chapter'));
  }

  return cards.slice(0, 6); // Limit to 6 cards
}
