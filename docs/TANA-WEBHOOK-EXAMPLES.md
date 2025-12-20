# Using Tana Webhook Server from Tana

**Query your Tana workspace from within Tana using HTTP requests**

The webhook server returns Tana Paste format, so responses are automatically parsed and inserted as nodes.

---

## Prerequisites

1. **Webhook server running**:
   ```bash
   ./install-launchd.sh  # Auto-start on boot
   # OR
   ./src/cli/tana-webhook.ts start --port 3100  # Manual start
   ```

2. **Verify server is up**:
   ```bash
   curl http://localhost:3100/health
   # Should return: {"status":"ok","timestamp":...}
   ```

3. **CORS Support**: The server includes CORS headers to allow browser-based requests from Tana. No additional configuration needed.

---

## Method 1: Tana Commands (Recommended)

Create reusable Tana commands that query the webhook server.

### Example 1: Search Command

**Create a Tana Command Node:**

```
- Search Tana #command
  - Name:: /search-tana
  - Run webhook:: GET http://localhost:3100/search?query=${query}&limit=5
```

**Usage in Tana:**

1. Type `/search-tana`
2. When prompted, enter search term (e.g., "meeting")
3. Results automatically insert as nodes:

```
- Search Results: meeting
  - Team Meeting #meeting
    - Node ID:: CLYvmr6p3S
    - Rank:: -7.61
  - Weekly Standup #meeting
    - Node ID:: def456
    - Rank:: -7.83
```

### Example 2: Stats Command

**Create a Tana Command Node:**

```
- Workspace Stats #command
  - Name:: /stats
  - Run webhook:: GET http://localhost:3100/stats
```

**Usage in Tana:**

1. Type `/stats`
2. Statistics automatically insert:

```
- Database Statistics
  - Total Nodes:: 1,220,449
  - Total Supertags:: 568
  - Total Fields:: 1,502
  - Total References:: 21,943
```

### Example 3: Top Tags Command

**Create a Tana Command Node:**

```
- Top Tags #command
  - Name:: /top-tags
  - Run webhook:: POST http://localhost:3100/tags
  - Body:: {"limit": 10}
```

**Usage in Tana:**

1. Type `/top-tags`
2. Top 10 most-used tags automatically insert:

```
- Top Supertags
  - #project (2,431 nodes)
  - #meeting (1,856 nodes)
  - #person (1,203 nodes)
  - #task (987 nodes)
  ...
```

### Example 4: Find Projects Command

**Create a Tana Command Node:**

```
- Find Projects #command
  - Name:: /find-projects
  - Run webhook:: POST http://localhost:3100/nodes
  - Body:: {"pattern": "Project%", "limit": 10}
```

**Usage in Tana:**

1. Type `/find-projects`
2. Matching nodes automatically insert

---

## Method 2: Direct URL in Browser

For quick testing or one-off queries.

### Search Query

Open in browser:
```
http://localhost:3100/search?query=meeting&limit=5
```

Copy the Tana Paste response and paste into Tana (Cmd+V).

### Stats Query

Open in browser:
```
http://localhost:3100/stats
```

Copy response and paste into Tana.

---

## Method 3: cURL + Clipboard (macOS)

For power users who want to query from terminal and paste into Tana.

### Search

```bash
curl -X POST http://localhost:3100/search \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting", "limit": 5}' | pbcopy
```

Then paste (Cmd+V) into Tana.

### Find Nodes by Pattern

```bash
curl -X POST http://localhost:3100/nodes \
  -H "Content-Type: application/json" \
  -d '{"pattern": "Q4%", "limit": 10}' | pbcopy
```

Then paste into Tana.

### Reference Graph

```bash
curl -X POST http://localhost:3100/refs \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "AInt1f2QagVo"}' | pbcopy
```

Then paste into Tana.

---

## Method 4: Tana Input API Integration (Advanced)

Combine webhook queries with Tana Input API to post results to specific locations.

### Example: Daily Summary Automation

```bash
#!/bin/bash
# Get today's stats and post to Daily Notes

STATS=$(curl -s http://localhost:3100/stats)
SEARCH=$(curl -s -X POST http://localhost:3100/search \
  -H "Content-Type: application/json" \
  -d '{"query": "today", "limit": 5}')

# Format as JSON and post to Tana
echo "{
  \"name\": \"Daily Summary $(date +%Y-%m-%d)\",
  \"tag\": \"daily-note\",
  \"children\": [
    {\"name\": \"$STATS\"},
    {\"name\": \"$SEARCH\"}
  ]
}" | ./tana post
```

---

## Real-World Workflows

### Workflow 1: Meeting Prep

**Goal**: Find all notes related to upcoming meeting topic

1. Create command: `/prep [topic]`
2. Webhook: `POST /search` with query="${topic}"
3. Tana inserts relevant nodes
4. Review context before meeting

### Workflow 2: Project Dashboard

**Goal**: Generate project dashboard with stats and recent activity

1. Create command: `/project-dashboard`
2. Multiple webhooks:
   - `POST /nodes` with pattern="Project%"
   - `POST /tags` to see most-used tags
   - `POST /stats` for overall metrics
3. Tana creates structured dashboard

### Workflow 3: Reference Explorer

**Goal**: Explore connections from a specific node

1. Find node ID in Tana (hover over node, copy ID)
2. Create command: `/explore [nodeId]`
3. Webhook: `POST /refs` with nodeId="${nodeId}"
4. Tana shows inbound/outbound references
5. Navigate reference graph

### Workflow 4: Weekly Review

**Goal**: Get top tags and search for weekly patterns

1. Create command: `/weekly-review`
2. Multiple webhooks:
   - `POST /tags` with limit=20
   - `POST /search` with query="week"
   - `GET /stats`
3. Tana creates structured review node
4. Analyze patterns and trends

---

## Available Endpoints Reference

| Endpoint | Method | Parameters | Use Case |
|----------|--------|------------|----------|
| `/health` | GET | none | Check server status |
| `/search` | POST | `query`, `limit` | Full-text search |
| `/stats` | GET | none | Workspace statistics |
| `/tags` | POST | `limit` | Most-used supertags |
| `/nodes` | POST | `pattern`, `tag`, `limit` | Find nodes by pattern |
| `/refs` | POST | `nodeId` | Reference graph |

---

## Troubleshooting

### Server Not Responding

```bash
# Check if server is running
./src/cli/tana-webhook.ts status

# Check logs
tail -20 logs/tana-webhook.log

# Restart if needed
launchctl kickstart -k gui/$(id -u)/com.pai.tana-webhook
```

### Command Not Working in Tana

1. Verify URL is correct: `http://localhost:3100`
2. Test URL in browser first
3. Check that server is bound to localhost (not 0.0.0.0)
4. Ensure port 3100 is not blocked by firewall

### Empty Results

```bash
# Check database exists and has data
./src/cli/tana-query.ts stats

# Re-index if needed
./src/cli/tana-sync.ts index
```

---

## Performance Notes

- **Health check**: < 5ms
- **Search queries**: 35-50ms
- **Stats queries**: 15-20ms
- **Pattern matching**: 30-40ms
- **Reference queries**: 40-50ms

All fast enough for interactive use within Tana.

---

## Security Notes

**Current Configuration (Secure)**:
- Server bound to `localhost` only (127.0.0.1)
- Not accessible from network
- No authentication needed (localhost is trusted)

**If You Enable Network Access**:
⚠️ Add authentication (API key, token)
⚠️ Use HTTPS/TLS
⚠️ Implement rate limiting
⚠️ Configure firewall rules

See [LAUNCHD-SETUP.md](./LAUNCHD-SETUP.md) for security details.

---

## Next Steps

1. **Create your first command**: Start with `/stats` (simplest)
2. **Test in Tana**: Verify response is inserted correctly
3. **Create search command**: Add `/search-tana [query]`
4. **Build workflows**: Combine commands for specific use cases
5. **Automate**: Use cron + Tana Input API for scheduled updates

---

**Related Documentation:**
- [WEBHOOK-SERVER.md](./WEBHOOK-SERVER.md) - Complete API reference
- [LAUNCHD-SETUP.md](./LAUNCHD-SETUP.md) - Service management
- [SKILL.md](./SKILL.md) - Full skill documentation
- [README.md](./README.md) - Quick start guide
