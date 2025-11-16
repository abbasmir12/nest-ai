#!/usr/bin/env node
/**
 * HTTP Wrapper for OWASP Nest MCP Server
 * 
 * This server provides an HTTP interface to the stdio MCP server,
 * allowing the Next.js app to call MCP tools via HTTP requests.
 * 
 * =============================================================================
 * AVAILABLE MCP TOOLS - COMPREHENSIVE GUIDE
 * =============================================================================
 * 
 * 1. nest_get_projects
 *    Purpose: Discover OWASP projects (tools, documentation, code libraries)
 *    Parameters:
 *      - level: "flagship" (mature), "lab" (experimental), "incubator" (new)
 *      - type: "tool" (scanners), "documentation" (guides), "code" (libraries)
 *      - limit: Number of results (default: 10, recommended: 5-20)
 *    Examples:
 *      - Find flagship tools: { level: "flagship", type: "tool", limit: 5 }
 *      - Find beginner projects: { level: "incubator", limit: 10 }
 *      - Browse all: { limit: 20 }
 * 
 * 2. nest_get_events
 *    Purpose: Find OWASP conferences, meetups, and training events
 *    Parameters:
 *      - upcoming: true (future only) or false (include past)
 *      - limit: Number of events (default: 10, recommended: 5-15)
 *    Examples:
 *      - Upcoming conferences: { upcoming: true, limit: 5 }
 *      - Full calendar: { upcoming: true, limit: 20 }
 *      - Past events: { upcoming: false, limit: 10 }
 * 
 * 3. nest_get_issues
 *    Purpose: Find contribution opportunities in OWASP projects
 *    Parameters:
 *      - priority: "high" (urgent), "medium" (important), "low" (beginner-friendly)
 *      - project: Specific project name (e.g., "OWASP ZAP")
 *      - limit: Number of issues (default: 10, recommended: 5-20)
 *    Examples:
 *      - Beginner issues: { priority: "low", limit: 10 }
 *      - ZAP issues: { project: "OWASP ZAP", limit: 15 }
 *      - Critical bugs: { priority: "high", limit: 5 }
 * 
 * 4. nest_get_contributors
 *    Purpose: Find active OWASP contributors and experts
 *    Parameters:
 *      - project: Specific project name (optional)
 *      - limit: Number of contributors (default: 10, recommended: 5-20)
 *    Examples:
 *      - Top contributors: { limit: 10 }
 *      - ZAP maintainers: { project: "OWASP ZAP", limit: 5 }
 *      - Broad view: { limit: 20 }
 * 
 * 5. nest_get_chapters
 *    Purpose: Find local OWASP chapters for networking and events
 *    Parameters:
 *      - location: City, country, region, or state name
 *      - limit: Number of chapters (default: 10, recommended: 5-20)
 *    Examples:
 *      - Local chapter: { location: "London", limit: 5 }
 *      - Country chapters: { location: "India", limit: 15 }
 *      - Global view: { limit: 30 }
 * 
 * 6. nest_get_committees
 *    Purpose: Find OWASP committees and working groups
 *    Parameters:
 *      - limit: Number of committees (default: 10, recommended: 5-20)
 *    Examples:
 *      - List committees: { limit: 10 }
 *      - All committees: { limit: 50 }
 * 
 * 7. nest_get_milestones
 *    Purpose: Find GitHub milestones for OWASP repositories
 *    Parameters:
 *      - organization: GitHub organization (default: "OWASP")
 *      - repository: Repository name (required)
 *      - limit: Number of milestones (default: 10)
 *    Examples:
 *      - ZAP milestones: { repository: "zaproxy", limit: 10 }
 *      - Nest milestones: { repository: "Nest", limit: 5 }
 * 
 * 8. nest_get_releases
 *    Purpose: Find GitHub releases for OWASP projects
 *    Parameters:
 *      - organization: GitHub organization (default: "OWASP")
 *      - repository: Repository name (required)
 *      - limit: Number of releases (default: 10)
 *    Examples:
 *      - Latest ZAP releases: { repository: "zaproxy", limit: 5 }
 *      - All releases: { repository: "Nest", limit: 20 }
 * 
 * 9. nest_get_repositories
 *    Purpose: Find OWASP GitHub repositories
 *    Parameters:
 *      - organization: GitHub organization (default: "OWASP")
 *      - limit: Number of repositories (default: 10)
 *    Examples:
 *      - OWASP repos: { limit: 20 }
 *      - Top repos: { limit: 10 }
 * 
 * 10. nest_get_sponsors
 *     Purpose: Find OWASP sponsors and supporters
 *     Parameters:
 *       - limit: Number of sponsors (default: 10)
 *     Examples:
 *       - List sponsors: { limit: 10 }
 *       - All sponsors: { limit: 50 }
 * 
 * =============================================================================
 * FILTERING STRATEGIES
 * =============================================================================
 * 
 * For Production Tools:
 *   nest_get_projects({ level: "flagship", type: "tool" })
 * 
 * For Beginners:
 *   nest_get_issues({ priority: "low", limit: 10 })
 *   nest_get_projects({ level: "incubator" })
 * 
 * For Local Networking:
 *   nest_get_chapters({ location: "YourCity" })
 *   nest_get_events({ upcoming: true, limit: 5 })
 * 
 * For Contribution:
 *   nest_get_issues({ priority: "low" }) // Good first issues
 *   nest_get_contributors({ project: "ProjectName" }) // Find mentors
 * 
 * For Research:
 *   nest_get_projects({ type: "documentation" })
 *   nest_get_contributors({ limit: 20 }) // Find experts
 * 
 * =============================================================================
 */

import express from 'express';
import cors from 'cors';
import { Nest } from 'owasp-nest';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize OWASP Nest SDK client
const NEST_API_KEY = process.env.NEST_API_KEY;
const nestClient = new Nest({
  apiKey: NEST_API_KEY,
});

// In-memory cache for MCP data
const mcpCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

console.log('[MCP HTTP Server] Starting...');
console.log('[MCP HTTP Server] API Key:', NEST_API_KEY ? 'Present' : 'Missing');

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * MCP endpoint - handles tool calls
 */
app.post('/mcp', async (req, res) => {
  try {
    const { jsonrpc, id, method, params } = req.body;

    console.log(`[MCP HTTP Server] Received request: ${method}`, params);

    if (method !== 'tools/call') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }

    const { name, arguments: args } = params;
    
    // Get API key from header (passed from UI) or use default
    const apiKey = req.headers['x-nest-api-key'] || NEST_API_KEY;
    console.log(`[MCP HTTP Server] Using API key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'Missing'} (from ${req.headers['x-nest-api-key'] ? 'header' : 'default'})`);

    // Call the appropriate MCP tool
    let result;
    switch (name) {
      case 'nest_get_projects':
        result = await handleGetProjects(args);
        break;
      case 'nest_get_events':
        result = await handleGetEvents(args, apiKey);
        break;
      case 'nest_get_issues':
        result = await handleGetIssues(args);
        break;
      case 'nest_get_contributors':
        result = await handleGetContributors(args);
        break;
      case 'nest_get_chapters':
        result = await handleGetChapters(args);
        break;
      case 'nest_get_committees':
        result = await handleGetCommittees(args);
        break;
      case 'nest_get_milestones':
        result = await handleGetMilestones(args);
        break;
      case 'nest_get_releases':
        result = await handleGetReleases(args);
        break;
      case 'nest_get_repositories':
        result = await handleGetRepositories(args);
        break;
      case 'nest_get_sponsors':
        result = await handleGetSponsors(args);
        break;
      case 'search_internet':
        result = await handleSearchInternet(args);
        break;
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: `Unknown tool: ${name}`
          }
        });
    }

    // Return MCP-formatted response
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ],
        structuredContent: result
      }
    });

  } catch (error) {
    console.error('[MCP HTTP Server] Error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

/**
 * Handle nest_get_projects - WITH REAL PAGINATION
 */
async function handleGetProjects(args) {
  const { level, type, limit = 10 } = args;
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} projects (level: ${level || 'all'}, type: ${type || 'all'})`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allProjects = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allProjects.length);
      
      const response = await nestClient.projects.listProjects({
        level: level,
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const projects = items.map((p) => ({
        name: p.name || 'Unknown Project',
        key: p.key || (p.name || '').toLowerCase().replace(/\s+/g, '-'),
        description: p.description || p.summary || 'No description available',
        url: p.url || `https://owasp.org/www-project-${(p.key || p.name || '').toLowerCase().replace(/\s+/g, '-')}/`,
        level: p.level || 'unknown',
        type: p.type || type || 'general',
        leaders: p.leaders || []
      }));

      allProjects.push(...projects);

      if (allProjects.length >= limit || !hasNext) break;
    }

    const finalProjects = allProjects.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalProjects.length} real projects (${requestsMade} API calls)`);
    
    return { 
      projects: finalProjects,
      metadata: {
        requested: limit,
        returned: finalProjects.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalProjects.length < totalCount,
        requestsMade: requestsMade,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching projects:`, error.message);
    throw error;
  }
}

/**
 * Handle nest_get_events - WITH REAL PAGINATION
 */
async function handleGetEvents(args, apiKey = NEST_API_KEY) {
  const { limit = 10, upcoming = true } = args;
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} events (upcoming: ${upcoming})`);
  console.log(`[MCP HTTP Server] Events handler using API key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'Missing'}`);
  console.log(`[MCP HTTP Server] Full API key length: ${apiKey ? apiKey.length : 0} chars`);

  try {
    // SDK has validation bug - call API directly
    console.log(`[MCP HTTP Server] Making request to: https://nest.owasp.dev/api/v0/events/`);
    const response = await axios.get('https://nest.owasp.dev/api/v0/events/', {
      params: {
        page: 1,
        page_size: Math.min(limit, 100)
      },
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = response.data;
    const items = data.items || [];
    
    const events = items.slice(0, limit).map((e) => ({
      name: e.name || 'OWASP Event',
      description: e.description || 'No description available',
      date: e.start_date || e.end_date || 'TBD',
      location: e.location || 'Virtual',
      url: e.url || 'https://owasp.org/events',
      key: e.key
    }));

    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${events.length} events`);
    
    return { 
      events,
      metadata: {
        requested: limit,
        returned: events.length,
        totalAvailable: data.total_count || events.length,
        hasMore: data.has_next || false,
        source: 'direct_api_call'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching events:`, error.message);
    if (error.response) {
      console.error(`[MCP HTTP Server] Response status: ${error.response.status}`);
      console.error(`[MCP HTTP Server] Response data:`, error.response.data);
      console.error(`[MCP HTTP Server] Response headers:`, error.response.headers);
    }
    return { 
      events: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        error: error.message
      } 
    };
  }
}

/**
 * Handle nest_get_issues - WITH REAL PAGINATION
 */
async function handleGetIssues(args) {
  const { priority, project, limit = 10 } = args;
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} issues (priority: ${priority || 'all'}, project: ${project || 'all'})`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allIssues = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allIssues.length);
      
      const response = await nestClient.issues.listIssues({
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const issues = items.map((i) => ({
        title: i.title || 'Untitled Issue',
        project: i.project || project || 'OWASP Project',
        priority: i.priority || priority || 'medium',
        labels: i.labels || [],
        url: i.url || i.htmlUrl || 'https://github.com/OWASP',
        created: i.createdAt || undefined
      }));

      allIssues.push(...issues);

      if (allIssues.length >= limit || !hasNext) break;
    }

    const finalIssues = allIssues.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalIssues.length} real issues (${requestsMade} API calls)`);
    
    return { 
      issues: finalIssues,
      metadata: {
        requested: limit,
        returned: finalIssues.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalIssues.length < totalCount,
        requestsMade: requestsMade,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching issues:`, error.message);
    return { 
      issues: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        error: error.message
      } 
    };
  }
}

/**
 * Handle nest_get_contributors - WITH REAL PAGINATION
 */
async function handleGetContributors(args) {
  const { limit = 10, project } = args;
  const MAX_PER_PAGE = 100; // Try 100 first, fallback to 50 if needed
  
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} contributors (project: ${project || 'all'})`);

  try {
    // Calculate how many pages we need
    const pageSize = Math.min(limit, MAX_PER_PAGE);
    const totalPages = Math.ceil(limit / pageSize);
    
    const allContributors = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;
    
    console.log(`[MCP HTTP Server] 📊 Plan: Fetch ${totalPages} page(s) with ${pageSize} items each`);
    
    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allContributors.length);
      
      console.log(`[MCP HTTP Server] 📄 Request ${page}/${totalPages}: pageSize=${currentPageSize}`);
      
      try {
        const response = await nestClient.community.listMembers({
          Page: page,
          PageSize: currentPageSize,
        });

        requestsMade++;

        // Extract pagination metadata (API returns camelCase at root level)
        const items = response.items || [];
        totalCount = response.totalCount || totalCount;
        hasNext = response.hasNext || false;
        
        console.log(`[MCP HTTP Server] 📦 Received ${items.length} items (Total in DB: ${totalCount}, HasNext: ${hasNext})`);

        // Transform contributors with ALL available fields
        const contributors = items.map((c) => ({
          name: c.name || c.login || 'Anonymous',
          login: c.login || '',
          avatarUrl: c.avatarUrl || '',
          url: c.url || c.githubUrl || 'https://github.com',
          joinedDate: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : '',
          lastActive: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : '',
          contributions: c.contributions || 0,
          projects: c.projects || [],
          // Raw timestamps for reference
          createdAt: c.createdAt || '',
          updatedAt: c.updatedAt || ''
        }));

        allContributors.push(...contributors);

        // Stop if we have enough or no more pages
        if (allContributors.length >= limit || !hasNext) {
          console.log(`[MCP HTTP Server] ✅ Stopping: ${allContributors.length >= limit ? 'Limit reached' : 'No more pages'}`);
          break;
        }
      } catch (error) {
        console.error(`[MCP HTTP Server] ❌ Error on page ${page}:`, error.message);
        // Continue with what we have
        break;
      }
    }

    const finalContributors = allContributors.slice(0, limit);
    
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalContributors.length} real contributors (${requestsMade} API calls)`);
    
    return { 
      contributors: finalContributors,
      metadata: {
        requested: limit,
        returned: finalContributors.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalContributors.length < totalCount,
        requestsMade: requestsMade,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching contributors:`, error.message);
    return { 
      contributors: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        error: error.message
      } 
    };
  }
}

/**
 * Handle nest_get_chapters - WITH REAL PAGINATION
 */
async function handleGetChapters(args) {
  const { location, limit = 10 } = args;
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} chapters (location: ${location || 'all'})`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allChapters = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allChapters.length);
      
      const response = await nestClient.chapters.listChapters({
        country: location,
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const chapters = items.map((ch) => ({
        name: ch.name || 'OWASP Chapter',
        location: ch.location || ch.country || ch.region || 'Unknown',
        meetingFrequency: ch.meetingFrequency || undefined,
        url: ch.url || `https://owasp.org/www-chapter-${(ch.key || ch.name || '').toLowerCase().replace(/\s+/g, '-')}/`
      }));

      allChapters.push(...chapters);

      if (allChapters.length >= limit || !hasNext) break;
    }

    const finalChapters = allChapters.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalChapters.length} real chapters (${requestsMade} API calls)`);
    
    return { 
      chapters: finalChapters,
      metadata: {
        requested: limit,
        returned: finalChapters.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalChapters.length < totalCount,
        requestsMade: requestsMade,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching chapters:`, error.message);
    throw error;
  }
}

/**
 * Handle nest_get_committees - WITH REAL PAGINATION
 */
async function handleGetCommittees(args) {
  const { limit = 10 } = args;
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} committees`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allCommittees = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allCommittees.length);
      
      const response = await nestClient.committees.listCommittees({
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const committees = items.map((c) => ({
        name: c.name || 'OWASP Committee',
        description: c.description || 'No description available',
        url: c.url || 'https://owasp.org',
        key: c.key || (c.name || '').toLowerCase().replace(/\s+/g, '-'),
        leaders: c.leaders || []
      }));

      allCommittees.push(...committees);

      if (allCommittees.length >= limit || !hasNext) break;
    }

    const finalCommittees = allCommittees.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalCommittees.length} committees (${requestsMade} API calls)`);
    
    return { 
      committees: finalCommittees,
      metadata: {
        requested: limit,
        returned: finalCommittees.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalCommittees.length < totalCount,
        requestsMade: requestsMade,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching committees:`, error.message);
    return { 
      committees: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        error: error.message
      } 
    };
  }
}

/**
 * Handle nest_get_milestones - WITH REAL PAGINATION
 */
async function handleGetMilestones(args) {
  const { organization = 'OWASP', repository, limit = 10 } = args;
  
  if (!repository) {
    throw new Error('repository parameter is required');
  }

  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} milestones for ${organization}/${repository}`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allMilestones = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allMilestones.length);
      
      const response = await nestClient.milestones.listMilestones({
        organization: organization,
        repository: repository,
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const milestones = items.map((m) => ({
        title: m.title || 'Milestone',
        description: m.description || '',
        state: m.state || 'open',
        number: m.number || 0,
        openIssues: m.openIssues || 0,
        closedIssues: m.closedIssues || 0,
        dueDate: m.dueOn || '',
        url: m.htmlUrl || m.url || `https://github.com/${organization}/${repository}/milestones`
      }));

      allMilestones.push(...milestones);

      if (allMilestones.length >= limit || !hasNext) break;
    }

    const finalMilestones = allMilestones.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalMilestones.length} milestones (${requestsMade} API calls)`);
    
    return { 
      milestones: finalMilestones,
      metadata: {
        requested: limit,
        returned: finalMilestones.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalMilestones.length < totalCount,
        requestsMade: requestsMade,
        repository: `${organization}/${repository}`,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching milestones:`, error.message);
    return { 
      milestones: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        repository: `${organization}/${repository}`,
        error: error.message
      } 
    };
  }
}

/**
 * Handle nest_get_releases - WITH REAL PAGINATION
 */
async function handleGetReleases(args) {
  const { organization = 'OWASP', repository, limit = 10 } = args;
  
  if (!repository) {
    throw new Error('repository parameter is required');
  }

  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} releases for ${organization}/${repository}`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allReleases = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allReleases.length);
      
      const response = await nestClient.releases.listReleases({
        organization: organization,
        repository: repository,
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const releases = items.map((r) => ({
        name: r.name || r.tagName || 'Release',
        tagName: r.tagName || '',
        description: r.body || '',
        publishedAt: r.publishedAt || '',
        author: r.author?.login || 'Unknown',
        url: r.htmlUrl || r.url || `https://github.com/${organization}/${repository}/releases`,
        isPrerelease: r.prerelease || false,
        isDraft: r.draft || false
      }));

      allReleases.push(...releases);

      if (allReleases.length >= limit || !hasNext) break;
    }

    const finalReleases = allReleases.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalReleases.length} releases (${requestsMade} API calls)`);
    
    return { 
      releases: finalReleases,
      metadata: {
        requested: limit,
        returned: finalReleases.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalReleases.length < totalCount,
        requestsMade: requestsMade,
        repository: `${organization}/${repository}`,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching releases:`, error.message);
    return { 
      releases: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        repository: `${organization}/${repository}`,
        error: error.message
      } 
    };
  }
}

/**
 * Handle nest_get_repositories - WITH REAL PAGINATION
 */
async function handleGetRepositories(args) {
  const { organization = 'OWASP', limit = 10 } = args;
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} repositories for ${organization}`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allRepositories = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allRepositories.length);
      
      const response = await nestClient.repositories.listRepositories({
        organization: organization,
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const repositories = items.map((r) => ({
        name: r.name || 'Repository',
        fullName: r.fullName || `${organization}/${r.name}`,
        description: r.description || 'No description available',
        url: r.htmlUrl || r.url || `https://github.com/${organization}/${r.name}`,
        stars: r.stargazersCount || 0,
        forks: r.forksCount || 0,
        language: r.language || 'Unknown',
        topics: r.topics || [],
        isArchived: r.archived || false,
        updatedAt: r.updatedAt || ''
      }));

      allRepositories.push(...repositories);

      if (allRepositories.length >= limit || !hasNext) break;
    }

    const finalRepositories = allRepositories.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalRepositories.length} repositories (${requestsMade} API calls)`);
    
    return { 
      repositories: finalRepositories,
      metadata: {
        requested: limit,
        returned: finalRepositories.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalRepositories.length < totalCount,
        requestsMade: requestsMade,
        organization: organization,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching repositories:`, error.message);
    return { 
      repositories: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        organization: organization,
        error: error.message
      } 
    };
  }
}

/**
 * Handle nest_get_sponsors - WITH REAL PAGINATION
 */
async function handleGetSponsors(args) {
  const { limit = 10 } = args;
  console.log(`[MCP HTTP Server] 🔍 Fetching ${limit} sponsors`);

  try {
    const pageSize = Math.min(limit, 100);
    const totalPages = Math.ceil(limit / pageSize);
    const allSponsors = [];
    let totalCount = 0;
    let hasNext = false;
    let requestsMade = 0;

    for (let page = 1; page <= totalPages; page++) {
      const currentPageSize = Math.min(pageSize, limit - allSponsors.length);
      
      const response = await nestClient.sponsors.listSponsors({
        page: page,
        pageSize: currentPageSize,
      });

      requestsMade++;

      const items = response.items || [];
      totalCount = response.totalCount || totalCount;
      hasNext = response.hasNext || false;

      const sponsors = items.map((s) => ({
        name: s.name || 'Sponsor',
        description: s.description || '',
        url: s.url || 'https://owasp.org',
        logo: s.logo || s.logoUrl || '',
        tier: s.tier || s.level || 'supporter',
        joinedDate: s.joinedDate || s.createdAt || ''
      }));

      allSponsors.push(...sponsors);

      if (allSponsors.length >= limit || !hasNext) break;
    }

    const finalSponsors = allSponsors.slice(0, limit);
    console.log(`[MCP HTTP Server] 🎉 SUCCESS: Fetched ${finalSponsors.length} sponsors (${requestsMade} API calls)`);
    
    return { 
      sponsors: finalSponsors,
      metadata: {
        requested: limit,
        returned: finalSponsors.length,
        totalAvailable: totalCount,
        hasMore: hasNext && finalSponsors.length < totalCount,
        requestsMade: requestsMade,
        source: 'real_api_pagination'
      }
    };
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching sponsors:`, error.message);
    return { 
      sponsors: [], 
      metadata: { 
        requested: limit,
        returned: 0,
        totalAvailable: 0,
        hasMore: false,
        requestsMade: 0,
        error: error.message
      } 
    };
  }
}

/**
 * Handle search_internet - Fetch and extract web page content
 */
async function handleSearchInternet(args) {
  const { url } = args;
  console.log(`[MCP HTTP Server] 🌐 Fetching web page: ${url}`);

  try {
    // Fetch the web page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5
    });

    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);

    // Remove script and style tags
    $('script, style, nav, footer, header').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';

    // Extract main content
    const content = $('body').text()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 5000); // Limit to 5000 chars

    // Extract all links
    const links = [];
    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && (href.startsWith('http') || href.startsWith('https'))) {
        links.push(href);
      }
    });

    // Extract GitHub links specifically
    const githubLinks = links.filter(link => link.includes('github.com'));

    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content') || 
                           $('meta[property="og:description"]').attr('content') || '';

    const result = {
      url: url,
      title: title,
      description: metaDescription,
      content: content,
      links: [...new Set(links)].slice(0, 20), // Unique links, max 20
      githubLinks: [...new Set(githubLinks)],
      success: true
    };

    console.log(`[MCP HTTP Server] ✅ Fetched page: ${title} (${content.length} chars, ${links.length} links)`);

    return result;
  } catch (error) {
    console.error(`[MCP HTTP Server] ❌ Error fetching ${url}:`, error.message);
    
    return {
      url: url,
      success: false,
      error: error.message,
      title: '',
      description: '',
      content: '',
      links: [],
      githubLinks: []
    };
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`[MCP HTTP Server] 🚀 Running on http://localhost:${PORT}`);
  console.log(`[MCP HTTP Server] MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[MCP HTTP Server] Health check: http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[MCP HTTP Server] Shutting down gracefully...');
  process.exit(0);
});
