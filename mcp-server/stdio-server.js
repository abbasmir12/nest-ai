#!/usr/bin/env node
/**
 * OWASP Nest MCP Server - Official SDK Implementation
 * 
 * This MCP server provides tools to interact with the OWASP Nest API
 * using the official OWASP Nest TypeScript SDK.
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
import { Nest } from "owasp-nest";
import axios from "axios";
import * as cheerio from "cheerio";

const NEST_API_KEY = process.env.NEST_API_KEY || "";

// Initialize OWASP Nest SDK client
const nestClient = new Nest({
  apiKey: NEST_API_KEY,
});

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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "nest_get_projects",
            description: `Fetch OWASP projects from Nest API with powerful filtering options.

## PURPOSE
Discover OWASP projects including security tools, documentation, and code libraries. Perfect for finding projects to use, contribute to, or learn from.

## PARAMETERS

### level (optional)
Filter by project maturity and community support:
- "flagship" - Most mature, widely adopted projects (e.g., OWASP ZAP, Top 10, ASVS)
- "lab" - Experimental projects with active development
- "incubator" - New projects in early stages

### type (optional)
Filter by project category:
- "tool" - Security tools and scanners (e.g., ZAP, Dependency-Check)
- "documentation" - Standards, guides, cheat sheets (e.g., Top 10, ASVS)
- "code" - Libraries and frameworks (e.g., ESAPI, Security Shepherd)

### limit (optional)
Number of results to return (default: 10, max: 50)

## USAGE EXAMPLES

### Example 1: Find flagship security tools
Query: "Show me the most popular OWASP security tools"
Parameters: { level: "flagship", type: "tool", limit: 5 }
Use case: User wants battle-tested, production-ready security tools

### Example 2: Find beginner-friendly projects
Query: "What OWASP projects are good for beginners?"
Parameters: { level: "incubator", limit: 10 }
Use case: New contributors looking for projects to join

### Example 3: Find security documentation
Query: "Show me OWASP security standards and guides"
Parameters: { type: "documentation", level: "flagship", limit: 5 }
Use case: Developer needs security best practices

### Example 4: Browse all projects
Query: "List OWASP projects"
Parameters: { limit: 20 }
Use case: General exploration of OWASP ecosystem

### Example 5: Find experimental tools
Query: "What new security tools is OWASP working on?"
Parameters: { level: "lab", type: "tool", limit: 10 }
Use case: Early adopters looking for cutting-edge tools

## FILTERING STRATEGY

**For production use:** level: "flagship"
**For contribution:** level: "incubator" or "lab"
**For security tools:** type: "tool"
**For learning:** type: "documentation"
**For code examples:** type: "code"

## RESPONSE STRUCTURE
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

## TIPS
- Combine level + type for precise results (e.g., flagship tools)
- Use higher limits (20-30) for browsing, lower (3-5) for specific needs
- Flagship projects are best for production use
- Lab/incubator projects are great for contributing
- Check project leaders to find active maintainers`,
            inputSchema: {
              type: "object",
              properties: {
                level: {
                  type: "string",
                  enum: ["flagship", "lab", "incubator"],
                  description: "Filter by project maturity: flagship (mature), lab (experimental), incubator (new)",
                },
                type: {
                  type: "string",
                  enum: ["tool", "documentation", "code"],
                  description: "Filter by category: tool (scanners/utilities), documentation (guides/standards), code (libraries)",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of projects to return (default: 10, recommended: 5-20)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "nest_get_events",
            description: `Fetch OWASP events, conferences, and community meetups worldwide.

## PURPOSE
Discover OWASP events to attend, speak at, or organize. Includes global conferences, regional AppSec events, chapter meetings, and training sessions.

## PARAMETERS

### limit (optional)
Number of events to return (default: 10, recommended: 5-15)
- Use 3-5 for quick overview
- Use 10-15 for comprehensive list
- Use 20+ for full calendar view

### upcoming (optional)
Filter by event timing (default: true)
- true: Only future events (recommended for most queries)
- false: Include past events (useful for historical data)

## USAGE EXAMPLES

### Example 1: Find upcoming conferences
Query: "What OWASP conferences are coming up?"
Parameters: { upcoming: true, limit: 5 }
Use case: User wants to attend major OWASP events

### Example 2: Find local meetups
Query: "Are there any OWASP events near me?"
Parameters: { upcoming: true, limit: 10 }
Use case: User looking for local networking opportunities
Note: Combine with nest_get_chapters for location-specific results

### Example 3: Plan conference attendance
Query: "Show me all OWASP events this year"
Parameters: { upcoming: true, limit: 20 }
Use case: Planning annual conference schedule

### Example 4: Find training opportunities
Query: "Where can I get OWASP security training?"
Parameters: { upcoming: true, limit: 10 }
Use case: Looking for hands-on workshops and training

### Example 5: Research past events
Query: "What OWASP events happened recently?"
Parameters: { upcoming: false, limit: 10 }
Use case: Finding recordings or materials from past events

## EVENT TYPES YOU'LL FIND

**Global AppSec Conferences**
- Large international conferences (500+ attendees)
- Multiple tracks, workshops, training
- Held in different regions (US, EU, APAC)

**Regional Events**
- Regional AppSec conferences
- Local security summits
- Country-specific gatherings

**Chapter Meetings**
- Monthly local meetups
- Free and open to all
- Great for networking

**Training Sessions**
- Hands-on workshops
- Certification courses
- Tool-specific training

## RESPONSE STRUCTURE
{
  "events": [
    {
      "name": "OWASP Global AppSec San Francisco 2025",
      "description": "Annual global conference with 50+ talks, workshops, and training",
      "date": "2025-09-15",
      "location": "San Francisco, CA, USA",
      "url": "https://owasp.org/events/2025-global-appsec-sf"
    }
  ]
}

## FILTERING STRATEGY

**For conference planning:** upcoming: true, limit: 10-15
**For immediate events:** upcoming: true, limit: 3-5
**For research:** upcoming: false, limit: 10-20
**For comprehensive view:** limit: 20-30

## TIPS
- Check event dates early - popular conferences sell out
- Global AppSec events are the largest (plan 3-6 months ahead)
- Chapter meetings are free and great for beginners
- Many events offer virtual attendance options
- CFP (Call for Papers) usually opens 4-6 months before event
- Combine with nest_get_chapters to find local events
- Event URLs often have registration and agenda details`,
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of events to return (default: 10, use 5 for quick view, 20 for full calendar)",
                  default: 10,
                },
                upcoming: {
                  type: "boolean",
                  description: "Filter by timing: true (future events only), false (include past events)",
                  default: true,
                },
              },
            },
          },
          {
            name: "nest_get_issues",
            description: `Fetch open issues from OWASP projects on GitHub - perfect for finding contribution opportunities.

## PURPOSE
Discover open issues across OWASP projects to contribute code, documentation, or expertise. Great for developers wanting to give back to the security community.

## PARAMETERS

### priority (optional)
Filter by issue urgency and impact:
- "high" - Critical bugs, security vulnerabilities, urgent features
- "medium" - Important improvements, moderate bugs
- "low" - Nice-to-have features, minor bugs, good first issues

### project (optional)
Filter by specific OWASP project name:
- "OWASP ZAP" - Web application scanner
- "OWASP Juice Shop" - Vulnerable web app for training
- "OWASP Top 10" - Security awareness document
- "OWASP Dependency-Check" - Dependency vulnerability scanner
- Or any other OWASP project name

### limit (optional)
Number of issues to return (default: 10, recommended: 5-20)

## USAGE EXAMPLES

### Example 1: Find beginner-friendly issues
Query: "I'm new to OWASP, what can I contribute to?"
Parameters: { priority: "low", limit: 10 }
Use case: First-time contributors looking for "good first issue" tasks
Why: Low priority often includes documentation, simple bugs, easy wins

### Example 2: Find urgent security issues
Query: "What critical security issues need attention?"
Parameters: { priority: "high", limit: 5 }
Use case: Experienced developers wanting high-impact contributions
Why: High priority issues are often security-critical

### Example 3: Contribute to specific project
Query: "What issues does OWASP ZAP need help with?"
Parameters: { project: "OWASP ZAP", limit: 15 }
Use case: Developer familiar with ZAP wants to contribute
Why: Project-specific filtering shows relevant issues

### Example 4: Find documentation tasks
Query: "I want to help with OWASP documentation"
Parameters: { priority: "low", limit: 20 }
Use case: Technical writers or non-coders wanting to contribute
Why: Documentation issues are often lower priority but high value

### Example 5: Browse all contribution opportunities
Query: "Show me ways to contribute to OWASP"
Parameters: { limit: 20 }
Use case: General exploration of contribution opportunities
Why: No filters shows diverse range of issues

### Example 6: Find medium-complexity tasks
Query: "Show me moderate difficulty OWASP issues"
Parameters: { priority: "medium", limit: 10 }
Use case: Developers with some experience, not beginners
Why: Medium priority balances challenge and accessibility

## ISSUE TYPES YOU'LL FIND

**Bug Fixes**
- Security vulnerabilities
- Functional bugs
- Performance issues

**Feature Requests**
- New capabilities
- Enhancements
- Integrations

**Documentation**
- README improvements
- API documentation
- User guides
- Code comments

**Testing**
- Unit tests
- Integration tests
- Test coverage

**Refactoring**
- Code cleanup
- Architecture improvements
- Dependency updates

## RESPONSE STRUCTURE
{
  "issues": [
    {
      "title": "Add OAuth 2.0 authentication support",
      "project": "OWASP ZAP",
      "priority": "high",
      "labels": ["enhancement", "security", "authentication"],
      "url": "https://github.com/zaproxy/zaproxy/issues/7234",
      "created": "2025-01-15T10:30:00Z"
    }
  ]
}

## FILTERING STRATEGY

**For beginners:** priority: "low", limit: 10-15
**For experienced devs:** priority: "high", limit: 5-10
**For specific expertise:** project: "ProjectName", limit: 10-20
**For quick wins:** priority: "low", limit: 5
**For high impact:** priority: "high", limit: 5-10
**For exploration:** No filters, limit: 20-30

## CONTRIBUTION WORKFLOW

1. **Find issues** using this tool
2. **Check labels** for "good first issue", "help wanted", "beginner-friendly"
3. **Read issue description** on GitHub
4. **Comment** on issue to claim it
5. **Fork repository** and create branch
6. **Submit pull request** with fix
7. **Engage with maintainers** during review

## TIPS
- Low priority ≠ low value (often includes great starter tasks)
- Check issue labels for "good first issue" or "help wanted"
- Comment on issue before starting work to avoid duplicates
- High priority issues may require more expertise
- Documentation issues are great for non-coders
- Look for issues with recent activity (active maintainers)
- Project-specific filtering helps focus your expertise
- Many issues include mentorship from maintainers
- Contributing to issues builds your security portfolio`,
            inputSchema: {
              type: "object",
              properties: {
                priority: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Filter by urgency: high (critical/urgent), medium (important), low (nice-to-have, good for beginners)",
                },
                project: {
                  type: "string",
                  description: "Filter by project name (e.g., 'OWASP ZAP', 'OWASP Juice Shop')",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of issues to return (default: 10, use 5 for focused, 20 for browsing)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "nest_get_contributors",
            description: `Fetch top contributors to OWASP projects - discover active community members and their expertise.

## PURPOSE
Find active OWASP contributors to learn from, collaborate with, or recognize their work. Great for networking, mentorship, and understanding project leadership.

## PARAMETERS

### limit (optional)
Number of contributors to return (default: 10, recommended: 5-20)
- Use 5-10 for top contributors
- Use 15-20 for broader community view
- Use 30+ for comprehensive contributor list

### project (optional)
Filter by specific OWASP project name:
- "OWASP ZAP" - See ZAP core team and contributors
- "OWASP Juice Shop" - Find Juice Shop maintainers
- "OWASP Top 10" - See documentation contributors
- Or any other OWASP project name

## USAGE EXAMPLES

### Example 1: Find project maintainers
Query: "Who maintains OWASP ZAP?"
Parameters: { project: "OWASP ZAP", limit: 5 }
Use case: Want to know who leads a specific project
Why: Top contributors are usually maintainers/leaders

### Example 2: Find mentors
Query: "Who are the most active OWASP contributors I can learn from?"
Parameters: { limit: 10 }
Use case: New contributor seeking mentorship
Why: Active contributors often mentor newcomers

### Example 3: Research expertise
Query: "Who contributes to multiple OWASP projects?"
Parameters: { limit: 20 }
Use case: Finding cross-project experts
Why: Multi-project contributors have broad expertise

### Example 4: Find collaboration opportunities
Query: "Who should I collaborate with on OWASP Juice Shop?"
Parameters: { project: "OWASP Juice Shop", limit: 10 }
Use case: Want to work with active project members
Why: Active contributors are responsive and engaged

### Example 5: Recognize community leaders
Query: "Who are the top OWASP contributors?"
Parameters: { limit: 15 }
Use case: Highlighting community achievements
Why: Recognition motivates continued contribution

### Example 6: Find project-specific experts
Query: "Who knows the most about OWASP Dependency-Check?"
Parameters: { project: "OWASP Dependency-Check", limit: 5 }
Use case: Need expert help with specific tool
Why: Top contributors have deep project knowledge

## CONTRIBUTOR TYPES YOU'LL FIND

**Project Leaders**
- Founded or lead major projects
- High contribution counts (100+)
- Active across multiple projects

**Core Maintainers**
- Regular code contributors
- Review pull requests
- Moderate contributions (50-100)

**Active Contributors**
- Frequent commits
- Bug fixes and features
- Growing contribution count (10-50)

**Documentation Contributors**
- Write guides and docs
- Improve README files
- May have lower commit counts but high impact

**Community Organizers**
- Chapter leaders
- Event organizers
- May contribute non-code work

## RESPONSE STRUCTURE
{
  "contributors": [
    {
      "name": "Simon Bennetts",
      "contributions": 2847,
      "projects": ["OWASP ZAP", "OWASP Core"],
      "url": "https://github.com/psiinon"
    }
  ]
}

## FILTERING STRATEGY

**For mentorship:** No project filter, limit: 10-15 (find active mentors)
**For project help:** project: "ProjectName", limit: 5-10 (find experts)
**For networking:** No filters, limit: 20-30 (broad community view)
**For collaboration:** project: "ProjectName", limit: 10 (find teammates)
**For recognition:** No filters, limit: 10 (top contributors)

## HOW TO USE THIS DATA

### For Learning
- Follow contributors on GitHub
- Read their code and commits
- Study their contribution patterns
- Learn from their PR reviews

### For Networking
- Reach out on GitHub or Twitter
- Attend events they speak at
- Join projects they maintain
- Engage in discussions they participate in

### For Collaboration
- Comment on their issues/PRs
- Propose collaboration ideas
- Join their project teams
- Co-present at conferences

### For Mentorship
- Ask questions on their projects
- Request code reviews
- Seek guidance on contributions
- Learn their development practices

## CONTRIBUTION METRICS EXPLAINED

**High contributions (100+)**
- Project leaders/founders
- Long-term maintainers
- Deep expertise

**Medium contributions (20-100)**
- Active regular contributors
- Growing expertise
- Good collaboration partners

**Lower contributions (5-20)**
- Newer contributors
- Specialized expertise
- May focus on specific areas

**Note:** Contribution count isn't everything - quality matters too!

## TIPS
- High contribution count = deep project knowledge
- Multi-project contributors have broad security expertise
- Project-specific filtering finds the right experts
- Check their GitHub profiles for contact info
- Many contributors are open to mentoring
- Contribution count includes commits, PRs, reviews
- Some contributors focus on quality over quantity
- Documentation contributors may have lower counts but high impact
- Chapter leaders may contribute non-code work
- Follow contributors to learn from their work
- Engage respectfully - they're volunteers!`,
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of contributors to return (default: 10, use 5 for top contributors, 20 for broader view)",
                  default: 10,
                },
                project: {
                  type: "string",
                  description: "Filter by project name (e.g., 'OWASP ZAP') to find project-specific contributors",
                },
              },
            },
          },
          {
            name: "nest_get_chapters",
            description: `Fetch OWASP chapters worldwide - find local security communities near you.

## PURPOSE
Discover local OWASP chapters for networking, learning, and community engagement. Chapters host free meetups, workshops, and events in cities worldwide.

## PARAMETERS

### location (optional)
Filter by geographic location:
- **Country names:** "United States", "India", "United Kingdom", "Germany", "Brazil"
- **Regions:** "Europe", "Asia", "North America", "South America"
- **Cities:** "London", "New York", "San Francisco", "Tokyo", "Mumbai"
- **States/Provinces:** "California", "Texas", "Ontario"

### limit (optional)
Number of chapters to return (default: 10, recommended: 5-20)
- Use 5-10 for specific location
- Use 15-20 for regional view
- Use 30+ for global overview

## USAGE EXAMPLES

### Example 1: Find local chapter
Query: "Is there an OWASP chapter in London?"
Parameters: { location: "London", limit: 5 }
Use case: User wants to join local security community
Why: City-specific search finds nearby chapters

### Example 2: Find chapters in your country
Query: "What OWASP chapters are in India?"
Parameters: { location: "India", limit: 15 }
Use case: Exploring national OWASP presence
Why: Country filter shows all chapters in that nation

### Example 3: Find chapters in your state
Query: "Are there OWASP chapters in California?"
Parameters: { location: "California", limit: 10 }
Use case: Finding chapters in your state/province
Why: State filter shows regional options

### Example 4: Explore regional chapters
Query: "What OWASP chapters are in Europe?"
Parameters: { location: "Europe", limit: 20 }
Use case: Planning European conference tour
Why: Regional view shows multiple countries

### Example 5: Browse all chapters
Query: "Show me OWASP chapters worldwide"
Parameters: { limit: 30 }
Use case: Global overview of OWASP presence
Why: No location filter shows worldwide chapters

### Example 6: Find chapters for relocation
Query: "I'm moving to New York, are there OWASP chapters there?"
Parameters: { location: "New York", limit: 5 }
Use case: Finding community before relocating
Why: City search helps plan community engagement

### Example 7: Find chapters for business travel
Query: "What OWASP chapters are in San Francisco?"
Parameters: { location: "San Francisco", limit: 5 }
Use case: Attending meetups during business trip
Why: City-specific search for travel planning

## CHAPTER TYPES YOU'LL FIND

**City Chapters**
- Most common type
- Monthly meetups
- 20-100 attendees
- Free and open to all

**University Chapters**
- Student-focused
- Campus-based
- Great for students and faculty

**Regional Chapters**
- Cover multiple cities
- Larger geographic area
- Less frequent meetings

**Virtual Chapters**
- Online-only
- Global participation
- Timezone-friendly options

## WHAT CHAPTERS OFFER

**Monthly Meetups**
- Technical talks
- Tool demonstrations
- Networking
- Free pizza/refreshments

**Workshops**
- Hands-on training
- Tool tutorials
- Capture the Flag (CTF)
- Security challenges

**Study Groups**
- Certification prep
- Book clubs
- Code reviews
- Peer learning

**Community**
- Local networking
- Job opportunities
- Mentorship
- Collaboration

## RESPONSE STRUCTURE
{
  "chapters": [
    {
      "name": "OWASP London",
      "location": "London, United Kingdom",
      "meetingFrequency": "Monthly",
      "url": "https://owasp.org/www-chapter-london/"
    }
  ]
}

## FILTERING STRATEGY

**For local networking:** location: "YourCity", limit: 5
**For regional view:** location: "YourCountry", limit: 15
**For travel planning:** location: "DestinationCity", limit: 5
**For global overview:** No location, limit: 30
**For relocation research:** location: "NewCity", limit: 10

## LOCATION SEARCH TIPS

### Be Specific
- ✅ "London" - finds London chapter
- ✅ "United Kingdom" - finds all UK chapters
- ❌ "UK" - may not match (use full name)

### Try Multiple Searches
- Search by city first
- Then try country if no results
- Then try region for broader view

### Common Location Formats
- Cities: "San Francisco", "Mumbai", "Tokyo"
- Countries: "United States", "India", "Germany"
- Regions: "Europe", "Asia", "North America"
- States: "California", "Texas", "New York"

## HOW TO ENGAGE WITH CHAPTERS

### Attend Meetings
1. Visit chapter URL
2. Check meeting schedule
3. RSVP (usually via Meetup.com)
4. Show up and network!

### Get Involved
- Volunteer to speak
- Help organize events
- Contribute to chapter projects
- Mentor new members

### Start a Chapter
- No chapter in your city?
- OWASP supports new chapters
- Visit owasp.org/chapters for info
- Build your local security community!

## MEETING FREQUENCY GUIDE

**Monthly** - Most active, regular meetings
**Quarterly** - Less frequent, often larger events
**Bi-monthly** - Every 2 months
**Ad-hoc** - Irregular schedule, check website

## TIPS
- Most chapters meet monthly (check meetingFrequency)
- Meetings are FREE and open to everyone
- No membership required to attend
- Great for job networking
- Many chapters have Slack/Discord channels
- Virtual attendance often available
- Chapters welcome speakers (great for your portfolio)
- Students especially welcome
- Bring business cards for networking
- Many meetings include free food/drinks
- Check chapter URL for upcoming events
- Follow chapters on social media
- Some chapters offer study groups for certifications
- Great way to find local security jobs
- Perfect for building your professional network`,
            inputSchema: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "Filter by location: city ('London'), country ('United States'), region ('Europe'), or state ('California')",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of chapters to return (default: 10, use 5 for local, 20 for regional, 30 for global)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "nest_get_committees",
            description: `Fetch OWASP committees and working groups.

## PURPOSE
Discover OWASP committees and working groups that drive the organization's initiatives.

## PARAMETERS

### limit (optional)
Number of committees to return (default: 10, recommended: 5-20)

## USAGE EXAMPLES

### Example 1: List all committees
Query: "What committees does OWASP have?"
Parameters: { limit: 10 }

### Example 2: Get comprehensive list
Query: "Show me all OWASP committees"
Parameters: { limit: 50 }`,
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of committees to return (default: 10)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "nest_get_milestones",
            description: `Fetch GitHub milestones for OWASP repositories.

## PURPOSE
Discover project milestones and roadmap items for OWASP repositories.

## PARAMETERS

### organization (optional)
GitHub organization name (default: "OWASP")

### repository (required)
Repository name (e.g., "zaproxy", "Nest")

### limit (optional)
Number of milestones to return (default: 10)

## USAGE EXAMPLES

### Example 1: ZAP milestones
Query: "What are the upcoming milestones for OWASP ZAP?"
Parameters: { repository: "zaproxy", limit: 10 }

### Example 2: Nest milestones
Query: "Show me Nest API milestones"
Parameters: { repository: "Nest", limit: 5 }`,
            inputSchema: {
              type: "object",
              properties: {
                organization: {
                  type: "string",
                  description: "GitHub organization (default: OWASP)",
                  default: "OWASP",
                },
                repository: {
                  type: "string",
                  description: "Repository name (required)",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of milestones to return (default: 10)",
                  default: 10,
                },
              },
              required: ["repository"],
            },
          },
          {
            name: "nest_get_releases",
            description: `Fetch GitHub releases for OWASP projects.

## PURPOSE
Discover latest releases and versions for OWASP projects.

## PARAMETERS

### organization (optional)
GitHub organization name (default: "OWASP")

### repository (required)
Repository name (e.g., "zaproxy", "Nest")

### limit (optional)
Number of releases to return (default: 10)

## USAGE EXAMPLES

### Example 1: Latest ZAP releases
Query: "What are the latest OWASP ZAP releases?"
Parameters: { repository: "zaproxy", limit: 5 }

### Example 2: All releases
Query: "Show me all Nest API releases"
Parameters: { repository: "Nest", limit: 20 }`,
            inputSchema: {
              type: "object",
              properties: {
                organization: {
                  type: "string",
                  description: "GitHub organization (default: OWASP)",
                  default: "OWASP",
                },
                repository: {
                  type: "string",
                  description: "Repository name (required)",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of releases to return (default: 10)",
                  default: 10,
                },
              },
              required: ["repository"],
            },
          },
          {
            name: "nest_get_repositories",
            description: `Fetch OWASP GitHub repositories.

## PURPOSE
Discover OWASP repositories on GitHub with stats and information.

## PARAMETERS

### organization (optional)
GitHub organization name (default: "OWASP")

### limit (optional)
Number of repositories to return (default: 10)

## USAGE EXAMPLES

### Example 1: Top OWASP repos
Query: "What are the most popular OWASP repositories?"
Parameters: { limit: 10 }

### Example 2: Browse all repos
Query: "Show me OWASP repositories"
Parameters: { limit: 20 }`,
            inputSchema: {
              type: "object",
              properties: {
                organization: {
                  type: "string",
                  description: "GitHub organization (default: OWASP)",
                  default: "OWASP",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of repositories to return (default: 10)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "nest_get_sponsors",
            description: `Fetch OWASP sponsors and supporters.

## PURPOSE
Discover organizations and individuals sponsoring OWASP.

## PARAMETERS

### limit (optional)
Number of sponsors to return (default: 10)

## USAGE EXAMPLES

### Example 1: List sponsors
Query: "Who sponsors OWASP?"
Parameters: { limit: 10 }

### Example 2: All sponsors
Query: "Show me all OWASP sponsors"
Parameters: { limit: 50 }`,
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of sponsors to return (default: 10)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "search_internet",
            description: `Fetch and extract content from any web page - perfect for enriching project data.

## PURPOSE
Scrape web pages to extract detailed information that's not available in the API. Use this to get:
- Project descriptions and overviews
- GitHub repository links
- Programming languages used
- Documentation links
- Installation instructions
- Key features and capabilities

## PARAMETERS

### url (required)
The full URL of the web page to fetch
- OWASP project pages: https://owasp.org/www-project-{project-key}/
- GitHub repositories: https://github.com/{org}/{repo}
- Documentation sites: Any public URL

## USAGE EXAMPLES

### Example 1: Enrich project data
Query: "Get details about OWASP ZAP"
Workflow:
1. Call nest_get_projects to get project key
2. Call search_internet with https://owasp.org/www-project-zap/
3. Extract description, GitHub link, features

### Example 2: Get GitHub info
Query: "What languages does OWASP ZAP use?"
Workflow:
1. Call search_internet with https://github.com/zaproxy/zaproxy
2. Extract language badges and tech stack

### Example 3: Get documentation
Query: "How do I install OWASP Dependency-Check?"
Workflow:
1. Call search_internet with project URL
2. Extract installation instructions

## RESPONSE STRUCTURE
{
  "url": "https://owasp.org/www-project-zap/",
  "title": "OWASP ZAP",
  "content": "Full text content of the page...",
  "links": ["https://github.com/zaproxy/zaproxy", ...],
  "success": true
}

## TIPS
- Always use full URLs (include https://)
- OWASP project URLs follow pattern: https://owasp.org/www-project-{key}/
- Extract key from project data (lowercase, hyphenated)
- Use this tool AFTER getting basic project data from nest_get_projects
- Parse the content to extract specific information
- Look for GitHub links, language badges, feature lists
- Respect rate limits - don't spam requests`,
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "Full URL of the web page to fetch (must include https://)",
                },
              },
              required: ["url"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
          case "nest_get_committees":
            return await this.handleGetCommittees(args);
          case "nest_get_milestones":
            return await this.handleGetMilestones(args);
          case "nest_get_releases":
            return await this.handleGetReleases(args);
          case "nest_get_repositories":
            return await this.handleGetRepositories(args);
          case "nest_get_sponsors":
            return await this.handleGetSponsors(args);
          case "search_internet":
            return await this.handleSearchInternet(args);
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
   * Helper function to handle SDK errors
   */
  handleSDKError(error, operation) {
    console.error(`[OWASP Nest MCP] Error in ${operation}:`, error.message);
    if (error.statusCode) {
      console.error(`[OWASP Nest MCP] Status: ${error.statusCode}`);
    }
    throw new Error(`Failed to fetch data from OWASP Nest API: ${operation}`);
  }

  /**
   * Handle nest_get_projects tool call
   */
  async handleGetProjects(args) {
    const { level, type, limit = 10, page = 1 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching projects (level: ${level || 'all'}, type: ${type || 'all'}, limit: ${limit}, page: ${page})`);

    try {
      // Use official SDK with pagination
      const response = await nestClient.projects.listProjects({
        level: level,
        type: type,
        pageSize: limit,
        page: page,
      });

      // SDK returns items array in the response
      const projectsData = response.items || response.data || [];
      const projects = projectsData.slice(0, limit).map((p) => ({
        name: p.name || 'Unknown Project',
        key: p.key || (p.name || '').toLowerCase().replace(/\s+/g, '-'),
        description: p.description || p.summary || 'No description available',
        url: p.url || `https://owasp.org/www-project-${(p.key || p.name || '').toLowerCase().replace(/\s+/g, '-')}/`,
        level: p.level || 'unknown',
        type: p.type || type || 'general',
        leaders: p.leaders || []
      }));

      const result = { 
        projects,
        pagination: {
          page: page,
          limit: limit,
          total: response.total || projects.length,
          hasMore: response.hasMore || (response.next ? true : false)
        }
      };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${projects.length} projects (page ${page})`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_projects');
    }
  }

  /**
   * Handle nest_get_events tool call
   */
  async handleGetEvents(args) {
    const { limit = 10, upcoming = true, page = 1 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching events (limit: ${limit}, upcoming: ${upcoming}, page: ${page})`);

    try {
      // Use official SDK with pagination
      const response = await nestClient.events.listEvents({
        pageSize: limit,
        page: page,
      });

      const eventsData = response.items || response.data || [];
      const events = eventsData.slice(0, limit).map((e) => ({
        name: e.name || e.title || 'OWASP Event',
        description: e.description || e.summary || 'No description available',
        date: e.startDate || e.date || 'TBD',
        location: e.location || 'Virtual',
        url: e.url || 'https://owasp.org/events'
      }));

      const result = { 
        events,
        pagination: {
          page: page,
          limit: limit,
          total: response.total || events.length,
          hasMore: response.hasMore || (response.next ? true : false)
        }
      };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${events.length} events (page ${page})`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_events');
    }
  }

  /**
   * Handle nest_get_issues tool call
   */
  async handleGetIssues(args) {
    const { priority, project, limit = 10, page = 1 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching issues (priority: ${priority || 'all'}, project: ${project || 'all'}, limit: ${limit}, page: ${page})`);

    try {
      // Use official SDK with pagination
      const response = await nestClient.issues.listIssues({
        pageSize: limit,
        page: page,
      });

      const issuesData = response.items || response.data || [];
      const issues = issuesData.slice(0, limit).map((i) => ({
        title: i.title || 'Untitled Issue',
        project: i.project || project || 'OWASP Project',
        priority: i.priority || priority || 'medium',
        labels: i.labels || [],
        url: i.url || i.htmlUrl || 'https://github.com/OWASP',
        created: i.createdAt || undefined
      }));

      const result = { 
        issues,
        pagination: {
          page: page,
          limit: limit,
          total: response.total || issues.length,
          hasMore: response.hasMore || (response.next ? true : false)
        }
      };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${issues.length} issues (page ${page})`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_issues');
    }
  }

  /**
   * Handle nest_get_contributors tool call
   */
  async handleGetContributors(args) {
    const { limit = 10, project, page = 1 } = args;
    const MAX_PER_REQUEST = 50; // API limitation
    
    console.log(`[OWASP Nest MCP] 🔌 Fetching contributors (project: ${project || 'all'}, limit: ${limit}, page: ${page})`);

    try {
      // If limit <= 50, single request
      if (limit <= MAX_PER_REQUEST) {
        const response = await nestClient.community.listMembers({
          pageSize: limit,
          page: page,
        });

        const membersData = response.items || response.data || [];
        const contributors = membersData.slice(0, limit).map((c) => ({
          name: c.name || c.login || 'Anonymous',
          contributions: c.contributions || 0,
          projects: c.projects || [],
          url: c.url || c.githubUrl || 'https://github.com'
        }));

        const result = { 
          contributors,
          pagination: {
            page: page,
            limit: limit,
            total: response.total || contributors.length,
            hasMore: response.hasMore || (response.next ? true : false),
            requestsMade: 1
          }
        };
        console.log(`[OWASP Nest MCP] ✅ Fetched ${contributors.length} contributors (page ${page})`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // If limit > 50, make multiple requests and aggregate
      console.log(`[OWASP Nest MCP] 📊 Limit ${limit} exceeds max per request (${MAX_PER_REQUEST}), making multiple calls...`);
      
      const numRequests = Math.ceil(limit / MAX_PER_REQUEST);
      const uniqueContributors = new Map(); // Use Map to deduplicate by URL
      let requestsMade = 0;
      
      for (let i = 0; i < numRequests; i++) {
        const currentPage = page + i;
        const currentLimit = Math.min(MAX_PER_REQUEST, limit - (i * MAX_PER_REQUEST));
        
        console.log(`[OWASP Nest MCP] 📄 Request ${i + 1}/${numRequests}: page=${currentPage}, limit=${currentLimit}`);
        
        try {
          const response = await nestClient.community.listMembers({
            pageSize: currentLimit,
            page: currentPage,
          });

          requestsMade++;
          const membersData = response.items || response.data || [];
          
          if (membersData.length === 0) {
            console.log(`[OWASP Nest MCP] ⚠️  No data returned, stopping pagination`);
            break;
          }
          
          const contributors = membersData.map((c) => ({
            name: c.name || c.login || 'Anonymous',
            contributions: c.contributions || 0,
            projects: c.projects || [],
            url: c.url || c.githubUrl || 'https://github.com'
          }));

          // Deduplicate by URL
          contributors.forEach(c => {
            if (!uniqueContributors.has(c.url)) {
              uniqueContributors.set(c.url, c);
            }
          });

          console.log(`[OWASP Nest MCP] ✅ Request ${i + 1} complete: ${contributors.length} contributors (${uniqueContributors.size} unique total)`);
          
          // Stop if we have enough unique contributors
          if (uniqueContributors.size >= limit) {
            console.log(`[OWASP Nest MCP] 🎯 Reached target of ${limit} unique contributors`);
            break;
          }
          
          // Stop if we got less than requested (no more data)
          if (contributors.length < currentLimit) {
            console.log(`[OWASP Nest MCP] ⚠️  Received less than requested, stopping pagination`);
            break;
          }
        } catch (error) {
          console.error(`[OWASP Nest MCP] ❌ Error on request ${i + 1}:`, error.message);
          // Don't throw, just stop and return what we have
          break;
        }
      }

      const finalContributors = Array.from(uniqueContributors.values()).slice(0, limit);
      
      const result = { 
        contributors: finalContributors,
        pagination: {
          page: page,
          limit: limit,
          total: finalContributors.length,
          hasMore: uniqueContributors.size > limit,
          requestsMade: requestsMade,
          deduplicatedFrom: uniqueContributors.size
        }
      };
      
      console.log(`[OWASP Nest MCP] 🎉 Aggregation complete: ${finalContributors.length} unique contributors from ${requestsMade} requests`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[OWASP Nest MCP] ❌ Fatal error:`, error.message);
      // Return empty result instead of throwing
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              contributors: [],
              pagination: {
                page: page,
                limit: limit,
                total: 0,
                hasMore: false,
                requestsMade: 0,
                error: error.message
              }
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Handle nest_get_chapters tool call
   */
  async handleGetChapters(args) {
    const { location, limit = 10, page = 1 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching chapters (location: ${location || 'all'}, limit: ${limit}, page: ${page})`);

    try {
      // Use official SDK with pagination
      const response = await nestClient.chapters.listChapters({
        country: location,
        pageSize: limit,
        page: page,
      });

      const chaptersData = response.items || response.data || [];
      const chapters = chaptersData.slice(0, limit).map((ch) => ({
        name: ch.name || 'OWASP Chapter',
        location: ch.location || ch.country || ch.region || 'Unknown',
        meetingFrequency: ch.meetingFrequency || undefined,
        url: ch.url || `https://owasp.org/www-chapter-${(ch.key || ch.name || '').toLowerCase().replace(/\s+/g, '-')}/`
      }));

      const result = { 
        chapters,
        pagination: {
          page: page,
          limit: limit,
          total: response.total || chapters.length,
          hasMore: response.hasMore || (response.next ? true : false)
        }
      };
      console.log(`[OWASP Nest MCP] ✅ Fetched ${chapters.length} chapters (page ${page})`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_chapters');
    }
  }

  /**
   * Handle nest_get_committees tool call
   */
  async handleGetCommittees(args) {
    const { limit = 10 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching ${limit} committees`);

    try {
      const response = await nestClient.committees.listCommittees({
        pageSize: limit,
        page: 1,
      });

      const items = response.items || [];
      const committees = items.slice(0, limit).map((c) => ({
        name: c.name || 'OWASP Committee',
        description: c.description || 'No description available',
        url: c.url || 'https://owasp.org',
        key: c.key || (c.name || '').toLowerCase().replace(/\s+/g, '-'),
        leaders: c.leaders || []
      }));

      const result = { 
        committees,
        metadata: {
          requested: limit,
          returned: committees.length,
          totalAvailable: response.totalCount || committees.length,
          hasMore: response.hasNext || false
        }
      };

      console.log(`[OWASP Nest MCP] ✅ Fetched ${committees.length} committees`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_committees');
    }
  }

  /**
   * Handle nest_get_milestones tool call
   */
  async handleGetMilestones(args) {
    const { organization = 'OWASP', repository, limit = 10 } = args;
    
    if (!repository) {
      throw new McpError(ErrorCode.InvalidParams, 'repository parameter is required');
    }

    console.log(`[OWASP Nest MCP] 🔌 Fetching ${limit} milestones for ${organization}/${repository}`);

    try {
      const response = await nestClient.milestones.listMilestones({
        organization: organization,
        repository: repository,
        pageSize: limit,
        page: 1,
      });

      const items = response.items || [];
      const milestones = items.slice(0, limit).map((m) => ({
        title: m.title || 'Milestone',
        description: m.description || '',
        state: m.state || 'open',
        number: m.number || 0,
        openIssues: m.openIssues || 0,
        closedIssues: m.closedIssues || 0,
        dueDate: m.dueOn || '',
        url: m.htmlUrl || m.url || `https://github.com/${organization}/${repository}/milestones`
      }));

      const result = { 
        milestones,
        metadata: {
          requested: limit,
          returned: milestones.length,
          totalAvailable: response.totalCount || milestones.length,
          hasMore: response.hasNext || false,
          repository: `${organization}/${repository}`
        }
      };

      console.log(`[OWASP Nest MCP] ✅ Fetched ${milestones.length} milestones`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_milestones');
    }
  }

  /**
   * Handle nest_get_releases tool call
   */
  async handleGetReleases(args) {
    const { organization = 'OWASP', repository, limit = 10 } = args;
    
    if (!repository) {
      throw new McpError(ErrorCode.InvalidParams, 'repository parameter is required');
    }

    console.log(`[OWASP Nest MCP] 🔌 Fetching ${limit} releases for ${organization}/${repository}`);

    try {
      const response = await nestClient.releases.listReleases({
        organization: organization,
        repository: repository,
        pageSize: limit,
        page: 1,
      });

      const items = response.items || [];
      const releases = items.slice(0, limit).map((r) => ({
        name: r.name || r.tagName || 'Release',
        tagName: r.tagName || '',
        description: r.body || '',
        publishedAt: r.publishedAt || '',
        author: r.author?.login || 'Unknown',
        url: r.htmlUrl || r.url || `https://github.com/${organization}/${repository}/releases`,
        isPrerelease: r.prerelease || false,
        isDraft: r.draft || false
      }));

      const result = { 
        releases,
        metadata: {
          requested: limit,
          returned: releases.length,
          totalAvailable: response.totalCount || releases.length,
          hasMore: response.hasNext || false,
          repository: `${organization}/${repository}`
        }
      };

      console.log(`[OWASP Nest MCP] ✅ Fetched ${releases.length} releases`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_releases');
    }
  }

  /**
   * Handle nest_get_repositories tool call
   */
  async handleGetRepositories(args) {
    const { organization = 'OWASP', limit = 10 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching ${limit} repositories for ${organization}`);

    try {
      const response = await nestClient.repositories.listRepositories({
        organization: organization,
        pageSize: limit,
        page: 1,
      });

      const items = response.items || [];
      const repositories = items.slice(0, limit).map((r) => ({
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

      const result = { 
        repositories,
        metadata: {
          requested: limit,
          returned: repositories.length,
          totalAvailable: response.totalCount || repositories.length,
          hasMore: response.hasNext || false,
          organization: organization
        }
      };

      console.log(`[OWASP Nest MCP] ✅ Fetched ${repositories.length} repositories`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_repositories');
    }
  }

  /**
   * Handle nest_get_sponsors tool call
   */
  async handleGetSponsors(args) {
    const { limit = 10 } = args;
    console.log(`[OWASP Nest MCP] 🔌 Fetching ${limit} sponsors`);

    try {
      const response = await nestClient.sponsors.listSponsors({
        pageSize: limit,
        page: 1,
      });

      const items = response.items || [];
      const sponsors = items.slice(0, limit).map((s) => ({
        name: s.name || 'Sponsor',
        description: s.description || '',
        url: s.url || 'https://owasp.org',
        logo: s.logo || s.logoUrl || '',
        tier: s.tier || s.level || 'supporter',
        joinedDate: s.joinedDate || s.createdAt || ''
      }));

      const result = { 
        sponsors,
        metadata: {
          requested: limit,
          returned: sponsors.length,
          totalAvailable: response.totalCount || sponsors.length,
          hasMore: response.hasNext || false
        }
      };

      console.log(`[OWASP Nest MCP] ✅ Fetched ${sponsors.length} sponsors`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleSDKError(error, 'nest_get_sponsors');
    }
  }

  /**
   * Handle search_internet tool call
   */
  async handleSearchInternet(args) {
    const { url } = args;
    console.log(`[OWASP Nest MCP] 🌐 Fetching web page: ${url}`);

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

      console.log(`[OWASP Nest MCP] ✅ Fetched page: ${title} (${content.length} chars, ${links.length} links)`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[OWASP Nest MCP] ❌ Error fetching ${url}:`, error.message);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              url: url,
              success: false,
              error: error.message,
              title: '',
              content: '',
              links: []
            }, null, 2),
          },
        ],
      };
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
