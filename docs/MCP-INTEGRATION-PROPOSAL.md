# MCP Integration Proposal for Supertag CLI

**Research Date:** December 10, 2025
**Author:** PAI Research System
**Status:** Proposal for Implementation
**Version:** 2.0 (Revised for Cross-Platform Focus)

---

## Executive Summary

This document proposes adding an MCP (Model Context Protocol) server to the Supertag CLI bundle, enabling users to connect their Tana knowledge graph to **any MCP-compatible AI tool** - not just Claude.

### The Key Insight

MCP has become the **universal standard** for AI-tool integration. By shipping an MCP server alongside the existing CLI, Supertag CLI customers gain access to their Tana data from:

| AI Tool | Company | MCP Support |
|---------|---------|-------------|
| Claude Desktop | Anthropic | Nov 2024 |
| Claude Code | Anthropic | Nov 2024 |
| ChatGPT Desktop | OpenAI | Mar 2025 |
| OpenAI Agents SDK | OpenAI | Mar 2025 |
| Cursor IDE | Anysphere | 2024 |
| Windsurf | Codeium | 2025 |
| VS Code Copilot | Microsoft | 2025 |
| Cody | Sourcegraph | 2025 |
| Continue.dev | Open Source | 2024 |
| Gemini (upcoming) | Google | Apr 2025 |

### Critical Point: 100% Local, No Server Required

**The MCP server runs entirely on the user's local machine.** Users do NOT need:
- An internet server
- Cloud hosting
- Any network exposure
- Additional subscriptions

The MCP server is just another binary in the distribution (like `supertag-export`), launched as a local subprocess by the AI tool.

### Value Proposition

| Audience | Current Value | With MCP Server |
|----------|---------------|-----------------|
| Claude Code users | CLI works well | Marginal improvement |
| ChatGPT users | No access to Tana | **Full Tana integration** |
| Cursor/IDE users | No access to Tana | **Full Tana integration** |
| Multi-tool users | CLI only | **Universal AI access** |

**Recommendation:** Ship `supertag-mcp` as a third binary in the distribution bundle, expanding market reach to all MCP-compatible AI tools.

---

## Part 1: What is MCP?

### 1.1 The Universal AI Integration Standard

The **Model Context Protocol (MCP)** is an open-source standard that lets AI applications connect to external tools and data sources. Think of it as **"USB-C for AI"** - one standard connector that works everywhere.

**Industry Backing:**
- Created by Anthropic (November 2024)
- Adopted by OpenAI (March 2025)
- Adopted by Google DeepMind (April 2025)
- Donated to Linux Foundation's Agentic AI Foundation
- 97M+ monthly SDK downloads

### 1.2 How It Works (Local Architecture)

```
┌─────────────────────────────────────────┐
│     AI Application (User's Machine)      │
│  (ChatGPT Desktop, Cursor, Claude, etc.) │
└──────────────────┬──────────────────────┘
                   │
                   │ Spawns local subprocess
                   │ (like running any CLI tool)
                   │
┌──────────────────▼──────────────────────┐
│         supertag-mcp binary              │
│      (runs on user's machine)            │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │  Reads local SQLite database    │    │
│  │  Calls Tana Input API           │    │
│  │  No network server needed       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Key Points:**
- MCP server = local binary, same as CLI
- AI tool spawns it as subprocess
- Communication via stdin/stdout (no network)
- All data stays on user's machine
- Same cross-platform support (macOS, Linux, Windows)

### 1.3 MCP vs CLI: What's the Difference?

| Aspect | CLI (supertag) | MCP Server (supertag-mcp) |
|--------|----------------|---------------------------|
| **Works with** | Claude Code only | All MCP-compatible AI tools |
| **Invocation** | Process spawn per command | Persistent connection |
| **Discovery** | User reads docs | AI discovers tools automatically |
| **Output** | Text (needs parsing) | Structured JSON |
| **User experience** | "Run supertag search X" | "Search my Tana for X" |

**The CLI is not going away.** The MCP server is an additional interface that expands compatibility.

---

## Part 2: Market Opportunity

### 2.1 Expanding Beyond Claude

Currently, Supertag CLI users can only access their Tana data through Claude Code (which handles CLI tools well). With an MCP server, the same users can use:

**ChatGPT Desktop (OpenAI)**
- Millions of ChatGPT Plus subscribers
- Native MCP support since March 2025
- Users can ask: "What meetings do I have about project X?"

**Cursor IDE**
- Popular AI-powered code editor
- Strong MCP integration
- Developers can reference Tana notes while coding

**VS Code with Copilot**
- Microsoft's IDE with GitHub Copilot
- MCP support in 2025
- Enterprise market access

**Windsurf, Cody, Continue.dev**
- Growing AI coding assistant market
- All support MCP
- Each represents new potential users

### 2.2 Competitive Differentiation

**Current landscape:** No other Tana tool offers MCP integration.

By shipping an MCP server, Supertag CLI becomes:
- The **only** way to use Tana with ChatGPT
- The **only** way to use Tana with Cursor
- The **universal** Tana-to-AI bridge

### 2.3 User Scenarios

**Scenario 1: ChatGPT User**
> "I use ChatGPT Desktop for most of my AI work, but I keep all my notes in Tana. With supertag-mcp, I can finally ask ChatGPT about my projects, meetings, and ideas stored in Tana."

**Scenario 2: Cursor Developer**
> "When coding, I often need to reference my technical notes in Tana. With the MCP server, Cursor can search my Tana workspace and pull relevant context into my coding session."

**Scenario 3: Multi-Tool User**
> "I switch between Claude and ChatGPT depending on the task. The MCP server means my Tana knowledge graph is available in both, with the same interface."

---

## Part 3: Technical Design

### 3.1 Distribution Model

**Current Bundle:**
```
supertag-cli-v0.8.0-{platform}.zip
├── supertag              # Main CLI (query, create, config)
├── supertag-export       # Export tool (Playwright)
└── README.md
```

**Proposed Bundle:**
```
supertag-cli-v0.9.0-{platform}.zip
├── supertag              # Main CLI (unchanged)
├── supertag-export       # Export tool (unchanged)
├── supertag-mcp          # NEW: MCP server
└── README.md
```

**Binary Size Estimate:**
- Current supertag: ~57 MB
- supertag-mcp: ~60 MB (includes MCP SDK)
- Total bundle increase: ~60 MB per platform

### 3.2 Implementation Approach: CLI Wrapper

Rather than duplicating logic, the MCP server will **wrap the existing CLI**:

```typescript
// MCP tool calls the CLI internally
async function tana_search(query: string, limit: number) {
  const result = await exec(`supertag query search "${query}" --limit ${limit} --json`);
  return JSON.parse(result.stdout);
}
```

**Benefits:**
- Minimal new code
- CLI remains source of truth
- Bug fixes apply to both interfaces
- Lower maintenance burden

### 3.3 Proposed Tools

**Phase 1: Core (Read-Only)**

| Tool | CLI Equivalent | Description |
|------|----------------|-------------|
| `tana_search` | `supertag query search` | Full-text search |
| `tana_tagged` | `supertag query tagged` | Find by supertag |
| `tana_stats` | `supertag query stats` | Database statistics |
| `tana_supertags` | `supertag schema list` | List all supertags |
| `tana_node` | `supertag show node` | Get node details |

**Phase 2: Write Operations**

| Tool | CLI Equivalent | Description |
|------|----------------|-------------|
| `tana_create` | `supertag create` | Create new node |
| `tana_sync` | `supertag sync index` | Trigger reindex |

### 3.4 User Configuration

Users configure MCP servers in their AI tool's settings. Example for ChatGPT Desktop:

**macOS/Linux:**
```json
{
  "mcpServers": {
    "tana": {
      "command": "/path/to/supertag-mcp",
      "args": [],
      "env": {
        "TANA_WORKSPACE": "personal"
      }
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "tana": {
      "command": "C:\\path\\to\\supertag-mcp.exe",
      "args": [],
      "env": {
        "TANA_WORKSPACE": "personal"
      }
    }
  }
}
```

Each AI tool has its own config location:
- Claude Desktop: `~/.claude/claude_desktop_config.json`
- Cursor: Settings → MCP Servers
- ChatGPT Desktop: Settings → Integrations → MCP
- VS Code: `.vscode/mcp.json` or user settings

---

## Part 4: Implementation Plan

### 4.1 Phase 1: MVP (1-2 weeks)

**Goal:** Ship working MCP server with read-only tools

**Tasks:**
1. Add MCP SDK dependency
2. Create thin wrapper calling CLI commands
3. Implement 5 read-only tools
4. Compile for all 4 platforms
5. Update release script
6. Test with Claude Desktop and Cursor

**Deliverable:** `supertag-mcp` binary in distribution

### 4.2 Phase 2: Write Operations (1 week)

**Goal:** Enable node creation via MCP

**Tasks:**
1. Add `tana_create` tool
2. Add `tana_sync` tool
3. Implement dry-run mode
4. Test end-to-end with ChatGPT

### 4.3 Phase 3: Documentation (1 week)

**Goal:** Users can self-serve setup

**Tasks:**
1. Setup guide for each major AI tool
2. Troubleshooting documentation
3. Update website with MCP feature
4. Video walkthrough (optional)

### 4.4 Release Strategy

**Option A: Included in bundle (Recommended)**
- Ship supertag-mcp in standard distribution
- All existing customers get MCP for free
- Simpler distribution

**Option B: Separate add-on**
- MCP server as premium add-on
- Additional revenue stream
- More complex licensing

---

## Part 5: FAQ

### Q: Do users need to run a server?

**No.** The MCP "server" is a misleading name. It's just a binary that runs locally when the AI tool needs it. No internet server, no cloud hosting, no always-on process.

### Q: Does this require internet access?

**Only for Tana API operations** (creating nodes). Reading/searching the local database works completely offline.

### Q: Which AI tools does this work with?

Any tool supporting the MCP standard:
- Claude Desktop/Code (Anthropic)
- ChatGPT Desktop (OpenAI)
- Cursor, Windsurf, VS Code
- Continue.dev, Cody
- Any future MCP-compatible tool

### Q: Why not just use the CLI?

The CLI only works with Claude Code (which can run shell commands). Other AI tools like ChatGPT Desktop cannot run arbitrary CLI commands - they need MCP.

### Q: Does this replace the CLI?

**No.** The CLI remains for:
- Direct terminal usage
- Scripting and automation
- Claude Code users (who prefer CLI)
- Export and sync operations

The MCP server is an additional interface.

### Q: How much development effort?

Estimated 3-4 weeks for full implementation:
- Week 1-2: Core MCP server with read tools
- Week 3: Write operations
- Week 4: Documentation and testing

### Q: What about security?

- All operations run locally
- No network exposure
- Same security model as CLI
- API tokens stored in existing config

---

## Part 6: Recommendation

### Decision Matrix

| Factor | Weight | CLI Only | CLI + MCP |
|--------|--------|----------|-----------|
| Claude Code users | 30% | Excellent | Excellent |
| ChatGPT users | 25% | None | **Full access** |
| Other AI tools | 20% | None | **Full access** |
| Development effort | 15% | Zero | 3-4 weeks |
| Maintenance burden | 10% | Low | Low (CLI wrapper) |

### Recommendation

**Implement the MCP server** for these reasons:

1. **Market Expansion:** Access to ChatGPT, Cursor, and other AI tool users
2. **Competitive Moat:** First/only Tana tool with universal AI integration
3. **Low Risk:** CLI wrapper approach minimizes new code
4. **Future-Proof:** MCP is the emerging industry standard

### Suggested Pricing

If MCP is included in the standard bundle:
- Increased value proposition justifies current pricing
- Marketing angle: "Works with any AI assistant"

If MCP is a separate add-on:
- $29-49 one-time for MCP server
- Appeals to multi-tool users

### Next Steps

1. **Decide:** Include in bundle or separate add-on?
2. **Prioritize:** Which AI tools to test first?
3. **Implement:** Start with Phase 1 MVP
4. **Document:** Setup guides for top 3 AI tools
5. **Launch:** Announce MCP support

---

## Appendix A: Technical Specifications

### A.1 MCP Tool Definitions

```typescript
// tana_search
{
  name: "tana_search",
  description: "Search Tana workspace using full-text search",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      limit: { type: "number", description: "Max results (default 20)" },
      workspace: { type: "string", description: "Workspace alias (optional)" }
    },
    required: ["query"]
  }
}

// tana_tagged
{
  name: "tana_tagged",
  description: "Find Tana nodes with a specific supertag",
  inputSchema: {
    type: "object",
    properties: {
      supertag: { type: "string", description: "Supertag name" },
      limit: { type: "number", description: "Max results (default 20)" },
      status: { type: "string", enum: ["all", "done", "not_done"] }
    },
    required: ["supertag"]
  }
}

// tana_create
{
  name: "tana_create",
  description: "Create a new node in Tana",
  inputSchema: {
    type: "object",
    properties: {
      supertag: { type: "string", description: "Supertag to apply" },
      name: { type: "string", description: "Node title" },
      fields: { type: "object", description: "Field values" },
      target: { type: "string", description: "Target: INBOX or node ID" }
    },
    required: ["supertag", "name"]
  }
}
```

### A.2 CLI Wrapper Implementation

```typescript
import { spawn } from 'child_process';

async function runCLI(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('supertag', args, {
      env: { ...process.env, SUPERTAG_OUTPUT: 'json' }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);

    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `Exit code ${code}`));
    });
  });
}

// Tool implementations
async function tana_search(query: string, limit = 20) {
  const output = await runCLI(['query', 'search', query, '--limit', String(limit), '--json']);
  return JSON.parse(output);
}

async function tana_tagged(supertag: string, limit = 20) {
  const output = await runCLI(['query', 'tagged', supertag, '--limit', String(limit), '--json']);
  return JSON.parse(output);
}

async function tana_create(supertag: string, name: string, fields?: Record<string, string>) {
  const args = ['create', supertag, name];
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      args.push(`--${key}`, value);
    }
  }
  const output = await runCLI(args);
  return JSON.parse(output);
}
```

### A.3 Release Script Update

```bash
# Add to release.sh after existing binary builds

echo "Building MCP server binaries..."

# macOS ARM64 (Apple Silicon)
bun build src/mcp/index.ts --compile --target=bun-darwin-arm64 --outfile=supertag-mcp

# macOS x64 (Intel)
bun build src/mcp/index.ts --compile --target=bun-darwin-x64 --outfile=supertag-mcp-darwin-x64

# Linux x64
bun build src/mcp/index.ts --compile --target=bun-linux-x64 --outfile=supertag-mcp-linux-x64

# Windows x64
bun build src/mcp/index.ts --compile --target=bun-windows-x64 --outfile=supertag-mcp-windows-x64.exe

# Update zip creation to include MCP binary
```

---

**Document Status:** Revised proposal focusing on cross-platform AI tool market.

---

*Generated by PAI Research System - December 10, 2025*
