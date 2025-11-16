/**
 * MCP Client for OWASP Nest API
 * 
 * This client communicates with the MCP server using the standard
 * MCP SSE (Server-Sent Events) transport protocol.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPCallResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

class MCPClient {
  private baseUrl: string;
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private connected: boolean = false;

  constructor(baseUrl: string = "http://localhost:3001") {
    this.baseUrl = baseUrl;
  }

  /**
   * Connect to the MCP SSE server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      console.log('[MCP Client] Connecting to SSE server...');
      
      this.client = new Client(
        {
          name: "nest-ai-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      this.transport = new SSEClientTransport(
        new URL(`${this.baseUrl}/sse`)
      );

      await this.client.connect(this.transport);
      this.connected = true;
      
      console.log('[MCP Client] ✅ Connected to MCP SSE server');
    } catch (error) {
      console.error('[MCP Client] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
      this.connected = false;
      console.log('[MCP Client] Disconnected');
    }
  }

  /**
   * Ensure connection before operations
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * List available MCP tools
   */
  async listTools(): Promise<MCPTool[]> {
    try {
      // In production, this would communicate with the MCP server
      // For now, return the known tools
      return [
        {
          name: "nest_get_projects",
          description: "Fetch OWASP projects from Nest API",
          inputSchema: {
            type: "object",
            properties: {
              level: {
                type: "string",
                enum: ["flagship", "lab", "incubator"],
              },
              type: {
                type: "string",
                enum: ["tool", "documentation", "code"],
              },
            },
          },
        },
        {
          name: "nest_get_events",
          description: "Fetch upcoming OWASP events",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", default: 10 },
            },
          },
        },
        {
          name: "nest_get_issues",
          description: "Fetch open issues from OWASP projects",
          inputSchema: {
            type: "object",
            properties: {
              priority: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
              project: { type: "string" },
            },
          },
        },
        {
          name: "nest_get_contributors",
          description: "Fetch top contributors to OWASP projects",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", default: 10 },
            },
          },
        },
        {
          name: "nest_get_chapters",
          description: "Fetch OWASP chapters",
          inputSchema: {
            type: "object",
            properties: {
              location: { type: "string" },
            },
          },
        },
      ];
    } catch (error) {
      console.error("Error listing MCP tools:", error);
      return [];
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: any = {}): Promise<any> {
    try {
      // In production, this would send a request to the MCP server
      // For now, return mock data based on the tool name
      
      switch (name) {
        case "nest_get_projects":
          return {
            projects: [
              {
                id: "zap",
                name: "OWASP ZAP",
                description: "The world's most widely used web app scanner",
                url: "https://owasp.org/www-project-zap/",
                level: "flagship",
              },
              {
                id: "top10",
                name: "OWASP Top 10",
                description: "Standard awareness document",
                url: "https://owasp.org/www-project-top-ten/",
                level: "flagship",
              },
            ],
          };

        case "nest_get_events":
          return {
            events: [
              {
                name: "OWASP Global AppSec 2025",
                date: "2025-12-15",
                location: "San Francisco, CA",
                url: "https://owasp.org/events",
              },
            ],
          };

        case "nest_get_issues":
          return {
            issues: [
              {
                title: "Add OAuth 2.0 support",
                project: "OWASP ZAP",
                priority: "high",
                url: "https://github.com/zaproxy/zaproxy/issues",
              },
            ],
          };

        case "nest_get_contributors":
          return {
            contributors: [
              {
                name: "John Doe",
                contributions: 523,
                projects: ["ZAP", "Top 10"],
                url: "https://github.com",
              },
            ],
          };

        case "nest_get_chapters":
          return {
            chapters: [
              {
                name: "OWASP San Francisco",
                location: "San Francisco, CA",
                url: "https://owasp.org/www-chapter-san-francisco/",
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error calling MCP tool ${name}:`, error);
      throw error;
    }
  }

  /**
   * Detect intent from user message and call appropriate tool
   */
  async handleIntent(message: string): Promise<any> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("event")) {
      return this.callTool("nest_get_events");
    } else if (lowerMessage.includes("project")) {
      return this.callTool("nest_get_projects");
    } else if (lowerMessage.includes("issue") || lowerMessage.includes("contribute")) {
      return this.callTool("nest_get_issues");
    } else if (lowerMessage.includes("contributor")) {
      return this.callTool("nest_get_contributors");
    } else if (lowerMessage.includes("chapter")) {
      return this.callTool("nest_get_chapters");
    }

    return null;
  }
}

// Export singleton instance
export const mcpClient = new MCPClient();

// Export class for testing
export default MCPClient;
