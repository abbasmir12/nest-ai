#!/usr/bin/env node
/**
 * OWASP Nest MCP Server - Proper MCP Implementation
 * 
 * This MCP server provides tools to interact with the OWASP Nest API.
 * It exposes functions to fetch projects, events, issues, contributors, and chapters.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  McpError,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const NEST_API_BASE = "https://nest.owasp.org/api/v1";

/**
 * OWASP Nest MCP Server Class
 */
class OwaspNestMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "owasp-nest-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[OWASP Nest MCP Server] Error:", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler("tools/list", async () => {
      return {
        tools: [
          {
            name: "nest_get_projects",
            description: `Fetch OWASP projects from Nest API with optional filters.
            
RETURNS JSON STRUCTURE:
{
  "projects": [
    {
      "name": "OWASP ZAP",
      "description": "The world's most widely used web app scanner",
      "url": "https://owasp.org/www-project-zap/",
      "level": "flagship",
      "type": "tool",
      "leaders": ["Simon Bennetts"]
    }
  ]
}

Use this for discovering OWASP projects and their details.`,
            inputSchema: {
              type: "object",
              properties: {
                level: {
                  type: "string",
                  enum: ["flagship", "lab", "incubator"],
                  description: "Filter by project level",
                },
                type: {
                  type: "string",
                  enum: ["tool", "documentation", "code"],
                  description: "Filter by project type",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of projects to return",
                  default: 10,
                },
              },
            },
          },
          {
            name: "nest_get_events",
            description: `Fetch upcoming OWASP events and conferences.
            
RETURNS JSON STRUCTURE:
{
  "events": [
    {
      "name": "OWASP Global AppSec",
      "description": "Annual global conference",
      "date": "2025-09-15",
      "location": "San Francisco, CA",
      "url": "https://owasp.org/events"
    }
  ]
}

Use this for finding OWASP events, conferences, and meetups.`,
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of events to return",
                  default: 10,
                },
                upcoming: {
                  type: "boolean",
                  description: "Only show upcoming events",
                  default: true,
                },
              },
            },
          },
          {
            name: "nest_get_issues",
            description: `Fetch open issues from OWASP projects on GitHub.
            
RETURNS JSON STRUCTURE:
{
  "issues": [
    {
      "title": "Add new authentication feature",
      "project": "OWASP ZAP",
      "priority": "high",
      "labels": ["enhancement", "security"],
      "url": "https://github.com/zaproxy/zaproxy/issues/123",
      "created": "2025-01-15T10:30:00Z"
    }
  ]
}

Use this for finding contribution opportunities in OWASP projects.`,
            inputSchema: {
              type: "object",
              properties: {
                priority: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Filter by priority",
                },
                project: {
                  type: "string",
                  description: "Filter by project name",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of issues to return",
                  default: 10,
                },
              },
            },
          },
          {
            name: "nest_get_contributors",
            description: `Fetch top contributors to OWASP projects.
            
RETURNS JSON STRUCTURE:
{
  "contributors": [
    {
      "name": "John Doe",
      "contributions": 150,
      "projects": ["OWASP ZAP", "OWASP Juice Shop"],
      "url": "https://github.com/johndoe"
    }
  ]
}

Use this for finding active OWASP contributors and their work.`,
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of contributors to return",
                  default: 10,
                },
                project: {
                  type: "string",
                  description: "Filter by specific project",
                },
              },
            },
          },
          {
            name: "nest_get_chapters",
            description: `Fetch OWASP chapters worldwide.
            
RETURNS JSON STRUCTURE:
{
  "chapters": [
    {
      "name": "OWASP London",
      "location": "London, UK",
      "meetingFrequency": "Monthly",
      "url": "https://owasp.org/www-chapter-london/"
    }
  ]
}

Use this for finding local OWASP chapters and community groups.`,
            inputSchema: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "Filter by location/region",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of chapters to return",
                  default: 10,
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "nest_get_projects":
            return await this.handleGetProjects(args);
          case "nest_get_events":
            return await this.handleGetEvents(args);
          case "nest_get_issues":
            return await this.handleGetIssues(args);
          case "nest_get_contributors":
            return await this.handleGetContributors(args);
          case "nest_get_chapters":
            return await this.handleGetChapters(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`[OWASP Nest MCP Server] Error in ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  /**
   * Helper function to fetch from OWASP Nest API
   */
  async fetchNestAPI(endpoint, params) {
    try {
      const response = await axios.get(`${NEST_API_BASE}${endpoint}`, {
        params,
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error(`[OWASP Nest MCP] Error fetching ${endpoint}:`, error.message);
      throw new Error(`Failed to fetch data from OWASP Nest API: ${endpoint}`);
    }
  }

  /**
   * Handle nest_get_projects tool call
   */
  async handleGetProjects(args) {
    const { level, type, limit = 10 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching projects (level: ${level || 'all'}, type: ${type || 'all'}, limit: ${limit})`);

    try {
      const data = await this.fetchNestAPI('/projects', { level, type, limit });
      
      const projects = (data.projects || data || []).slice(0, limit).map((p) => ({
        name: p.name || p.title || 'Unknown Project',
        description: p.description || p.summary || 'No description available',
        url: p.url || p.website || `https://owasp.org/www-project-${(p.name || '').toLowerCase().replace(/\s+/g, '-')}/`,
        level: p.level || p.type || 'unknown',
        type: p.projectType || type || 'general',
        leaders: p.leaders || []
      }));

      const result = { projects };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${projects.length} projects`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[OWASP Nest MCP] ❌ Error fetching projects:`, error);
      throw error;
    }
  }

  /**
   * Handle nest_get_events tool call
   */
  async handleGetEvents(args) {
    const { limit = 10, upcoming = true } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching events (limit: ${limit}, upcoming: ${upcoming})`);

    try {
      const data = await this.fetchNestAPI('/events', { limit, upcoming });
      
      const events = (data.events || data || []).slice(0, limit).map((e) => ({
        name: e.name || e.title || 'OWASP Event',
        description: e.description || e.summary || 'No description available',
        date: e.date || e.startDate || e.start_date || 'TBD',
        location: e.location || e.venue || 'Virtual',
        url: e.url || e.website || 'https://owasp.org/events'
      }));

      const result = { events };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${events.length} events`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[OWASP Nest MCP] ❌ Error fetching events:`, error);
      throw error;
    }
  }

  /**
   * Handle nest_get_issues tool call
   */
  async handleGetIssues(args) {
    const { priority, project, limit = 10 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching issues (priority: ${priority || 'all'}, project: ${project || 'all'}, limit: ${limit})`);

    try {
      const data = await this.fetchNestAPI('/issues', { priority, project, limit });
      
      const issues = (data.issues || data || []).slice(0, limit).map((i) => ({
        title: i.title || 'Untitled Issue',
        project: i.project || i.repository || project || 'OWASP Project',
        priority: i.priority || priority || 'medium',
        labels: i.labels || i.tags || [],
        url: i.url || i.html_url || 'https://github.com/OWASP',
        created: i.created_at || i.createdAt || undefined
      }));

      const result = { issues };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${issues.length} issues`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[OWASP Nest MCP] ❌ Error fetching issues:`, error);
      throw error;
    }
  }

  /**
   * Handle nest_get_contributors tool call
   */
  async handleGetContributors(args) {
    const { limit = 10, project } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching contributors (project: ${project || 'all'}, limit: ${limit})`);

    try {
      const data = await this.fetchNestAPI('/contributors', { limit, project });
      
      const contributors = (data.contributors || data || []).slice(0, limit).map((c) => ({
        name: c.name || c.login || c.username || 'Anonymous',
        contributions: c.contributions || c.commits || 0,
        projects: c.projects || c.repositories || [],
        url: c.url || c.html_url || c.profile_url || 'https://github.com'
      }));

      const result = { contributors };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${contributors.length} contributors`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[OWASP Nest MCP] ❌ Error fetching contributors:`, error);
      throw error;
    }
  }

  /**
   * Handle nest_get_chapters tool call
   */
  async handleGetChapters(args) {
    const { location, limit = 10 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching chapters (location: ${location || 'all'}, limit: ${limit})`);

    try {
      const data = await this.fetchNestAPI('/chapters', { location, limit });
      
      const chapters = (data.chapters || data || []).slice(0, limit).map((ch) => ({
        name: ch.name || ch.title || 'OWASP Chapter',
        location: ch.location || ch.city || ch.region || 'Unknown',
        meetingFrequency: ch.meetingFrequency || ch.frequency || undefined,
        url: ch.url || ch.website || `https://owasp.org/www-chapter-${(ch.name || '').toLowerCase().replace(/\s+/g, '-')}/`
      }));

      const result = { chapters };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${chapters.length} chapters`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[OWASP Nest MCP] ❌ Error fetching chapters:`, error);
      throw error;
    }
  }

  /**
   * Start the MCP server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("[OWASP Nest MCP Server] 🚀 OWASP Nest MCP Server started successfully");
  }
}

// Start the server
const server = new OwaspNestMCPServer();
server.start().catch((error) => {
  console.error("[OWASP Nest MCP Server] Failed to start server:", error);
  process.exit(1);
});
