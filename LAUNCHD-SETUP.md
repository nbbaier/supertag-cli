# launchd Setup for Tana Webhook Server

Auto-start configuration for macOS to run the Tana webhook server on boot.

## Quick Setup

```bash
# Install service (runs on port 3100)
./install-launchd.sh

# Check status
./src/cli/tana-webhook.ts status

# Test endpoint
curl http://localhost:3100/health
```

## What Gets Installed

### Service Configuration

**File**: `~/Library/LaunchAgents/com.pai.tana-webhook.plist`

**Configuration:**
- **Port**: 3100 (not 3000, to avoid conflicts)
- **Host**: localhost (security by default)
- **Database**: `./test-production.db` (change in plist if needed)
- **Auto-Start**: Starts on boot
- **Auto-Restart**: Restarts on crash
- **Throttle**: 60 seconds between restart attempts

### Log Files

**Location**: `./logs/`

- `tana-webhook.log` - Standard output (server startup, requests)
- `tana-webhook.error.log` - Error output (crashes, exceptions)

### Environment

- **PATH**: Includes bun binary location (`~/.bun/bin`)
- **HOME**: User home directory
- **Working Directory**: Skill directory

## Installation Steps

### 1. Validate Prerequisites

```bash
# Ensure database exists
./src/cli/tana-sync.ts index

# Test server manually first
./src/cli/tana-webhook.ts start --port 3100
# (Press Ctrl+C to stop after testing)
```

### 2. Install Service

```bash
./install-launchd.sh
```

**What happens:**
1. Copies plist to `~/Library/LaunchAgents/`
2. Loads service with `launchctl load`
3. Verifies service is running
4. Displays management commands

### 3. Verify Installation

```bash
# Check service status
launchctl list | grep tana-webhook

# Test HTTP endpoint
curl http://localhost:3100/health

# View logs
tail -f logs/tana-webhook.log
```

## Management Commands

### Check Status

```bash
# Via CLI tool
./src/cli/tana-webhook.ts status

# Via launchctl
launchctl list | grep tana-webhook

# Sample output:
# 12345  0  com.pai.tana-webhook
# (PID)  (exit code)  (label)
```

### View Logs

```bash
# Output log (server activity)
tail -f logs/tana-webhook.log

# Error log (only errors/crashes)
tail -f logs/tana-webhook.error.log

# Last 50 lines
tail -50 logs/tana-webhook.log
```

### Restart Service

```bash
# Graceful restart
launchctl kickstart -k gui/$(id -u)/com.pai.tana-webhook

# Or stop and start
launchctl unload ~/Library/LaunchAgents/com.pai.tana-webhook.plist
launchctl load ~/Library/LaunchAgents/com.pai.tana-webhook.plist
```

### Stop Service

```bash
# Temporarily stop (until reboot)
launchctl unload ~/Library/LaunchAgents/com.pai.tana-webhook.plist

# Via CLI tool (if daemon mode PID file exists)
./src/cli/tana-webhook.ts stop
```

### Uninstall Service

```bash
# Complete removal
./uninstall-launchd.sh

# Manual removal
launchctl unload ~/Library/LaunchAgents/com.pai.tana-webhook.plist
rm ~/Library/LaunchAgents/com.pai.tana-webhook.plist
```

## Customization

### Change Port

Edit `com.pai.tana-webhook.plist`:

```xml
<string>--port</string>
<string>3200</string>  <!-- Change from 3100 -->
```

Then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.pai.tana-webhook.plist
cp com.pai.tana-webhook.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.pai.tana-webhook.plist
```

### Change Database Path

Edit `com.pai.tana-webhook.plist`:

```xml
<string>--db-path</string>
<string>/Users/fischer/path/to/database.db</string>  <!-- Change path -->
```

### Enable Network Access

**Current**: Bound to `localhost` only (secure)

To allow network access:

1. Edit plist, change host to `0.0.0.0`:
   ```xml
   <string>--host</string>
   <string>0.0.0.0</string>
   ```

2. Configure firewall to allow port 3100

3. **⚠️ Security Warning**: Add authentication before network exposure

## Troubleshooting

### Service Won't Start

**Check logs**:
```bash
tail -50 logs/tana-webhook.error.log
```

**Common causes**:
- Database file not found (run `./src/cli/tana-sync.ts index` first)
- Port 3100 already in use (check with `lsof -i :3100`)
- Bun not found in PATH (check `/Users/fischer/.bun/bin/bun` exists)

**Verify plist syntax**:
```bash
plutil -lint ~/Library/LaunchAgents/com.pai.tana-webhook.plist
```

### Service Keeps Crashing

**Check crash reports**:
```bash
tail -100 logs/tana-webhook.error.log
```

**Common causes**:
- Database corrupted (re-index with `tana-sync`)
- Insufficient memory (check with `top` or Activity Monitor)
- Permission issues (check file ownership)

**Throttle behavior**: Service restarts up to once per 60 seconds. After multiple crashes, launchd may stop trying.

### Port Already in Use

**Find what's using port 3100**:
```bash
lsof -i :3100
```

**Change port** (see Customization section above)

### Logs Not Appearing

**Check log directory exists**:
```bash
ls -la logs/
```

**Create if missing**:
```bash
mkdir -p logs
```

**Check permissions**:
```bash
chmod 755 logs/
```

### Service Not Auto-Starting on Boot

**Verify plist location**:
```bash
ls -la ~/Library/LaunchAgents/com.pai.tana-webhook.plist
```

**Check RunAtLoad setting**:
```bash
defaults read ~/Library/LaunchAgents/com.pai.tana-webhook.plist RunAtLoad
# Should output: 1
```

**Test boot behavior**:
```bash
# Logout and login again (or reboot)
# Then check:
launchctl list | grep tana-webhook
```

## Security Considerations

### Current Security

- ✅ **Localhost Only**: Bound to 127.0.0.1 (not accessible from network)
- ✅ **No Authentication**: Safe because localhost only
- ✅ **Read-Only Database**: Webhook server only queries, doesn't write
- ✅ **Standard User**: Runs as your user, not root

### If Enabling Network Access

**⚠️ IMPORTANT**: If you change host to `0.0.0.0` or network interface:

1. **Add Authentication**: Implement API key or token-based auth
2. **Use Firewall**: Restrict access to specific IPs
3. **Use HTTPS**: Add TLS/SSL for encryption
4. **Rate Limiting**: Implement rate limiting (not currently included)
5. **Monitor Access**: Log all requests for security auditing

## Performance

**Resource Usage** (with 1.2M node database):
- **Memory**: ~200MB RSS
- **CPU**: < 2% at idle, 5-10% during queries
- **Disk I/O**: Minimal (SQLite caching)
- **Network**: < 1KB per request (Tana Paste responses)

**Request Latency**:
- Health check: < 5ms
- Search: 35-50ms
- Stats: 15-20ms

**Startup Time**: < 2 seconds

## Backup and Restore

### Backup Configuration

```bash
# Backup plist
cp ~/Library/LaunchAgents/com.pai.tana-webhook.plist ~/backups/

# Backup logs
cp -r logs/ ~/backups/tana-webhook-logs-$(date +%Y-%m-%d)/
```

### Restore Configuration

```bash
# Restore plist
cp ~/backups/com.pai.tana-webhook.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.pai.tana-webhook.plist
```

## Monitoring

### Health Check Script

Create `check-webhook-health.sh`:

```bash
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/health)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Webhook server healthy"
    exit 0
else
    echo "❌ Webhook server unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

Run periodically with cron:

```bash
# Add to crontab (check every 5 minutes)
*/5 * * * * /path/to/check-webhook-health.sh
```

### Log Rotation

Logs can grow over time. Rotate them periodically:

```bash
# Create log rotation script
cat > rotate-logs.sh <<'EOF'
#!/bin/bash
cd /Users/fischer/work/supertag-cli
mv logs/tana-webhook.log logs/tana-webhook.log.$(date +%Y%m%d)
mv logs/tana-webhook.error.log logs/tana-webhook.error.log.$(date +%Y%m%d)
launchctl kickstart -k gui/$(id -u)/com.pai.tana-webhook
find logs/ -name "*.log.*" -mtime +30 -delete
EOF

chmod +x rotate-logs.sh

# Add to weekly cron
0 0 * * 0 /Users/fischer/work/supertag-cli/rotate-logs.sh
```

## Related Documentation

- **[README.md](./README.md)** - Complete skill overview
- **[WEBHOOK-SERVER.md](./WEBHOOK-SERVER.md)** - API reference
- **[TEST-RESULTS.md](./TEST-RESULTS.md)** - Test report
- **[SKILL.md](./SKILL.md)** - Full documentation

## Support

If you encounter issues:

1. Check logs: `tail -100 logs/tana-webhook.error.log`
2. Verify service status: `launchctl list | grep tana-webhook`
3. Test manually: `./src/cli/tana-webhook.ts start --port 3100`
4. Check database: `./src/cli/tana-query.ts stats`

---

**Setup Date**: November 30, 2025
**Port**: 3100 (localhost only)
**Auto-Start**: Enabled
**Auto-Restart**: Enabled (60s throttle)
