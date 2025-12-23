# launchd Setup for Supertag

Auto-start configuration for macOS to run Supertag services on boot.

## Quick Setup

```bash
# Install webhook server (auto-starts, restarts on crash)
./scripts/install-launchd.sh server

# Install sync scheduler (runs every 6 hours)
./scripts/install-launchd.sh daily

# Check status
supertag server status

# Test endpoint
curl http://localhost:3100/health
```

---

## Path Configuration

**IMPORTANT:** The install script automatically configures paths based on where you run it from.

### How Paths Are Configured

The plist template files contain placeholders that get replaced during installation:

| Placeholder | Replaced With |
|-------------|---------------|
| `/Users/YOUR_USERNAME` | Your `$HOME` directory |
| `/usr/local/bin/supertag` | Path to supertag binary in your installation |

### Installation from Different Locations

**From extracted release zip:**
```bash
cd ~/Downloads/supertag-cli-macos-arm64
./scripts/install-launchd.sh server
# Uses: ~/Downloads/supertag-cli-macos-arm64/supertag
```

**From cloned repository:**
```bash
cd ~/Projects/supertag-cli
./scripts/install-launchd.sh server
# Uses: ~/Projects/supertag-cli/supertag
```

**After moving to permanent location (recommended):**
```bash
# Move to permanent location first
mv ~/Downloads/supertag-cli-macos-arm64 /usr/local/supertag-cli
cd /usr/local/supertag-cli
./scripts/install-launchd.sh server
# Uses: /usr/local/supertag-cli/supertag
```

### If You Move the Installation

If you move the supertag-cli directory after installing launchd services, you must reinstall:

```bash
# After moving to new location
cd /new/path/to/supertag-cli
./scripts/deploy-launchd.sh server
./scripts/deploy-launchd.sh daily
```

### Verifying Path Configuration

Check the installed plist to verify paths are correct:

```bash
# View installed server plist
cat ~/Library/LaunchAgents/ch.invisible.supertag-server.plist | grep -A1 ProgramArguments

# Should show your actual path, e.g.:
# <string>/usr/local/supertag-cli/supertag</string>
```

---

## Available Services

### Webhook Server (`supertag-server`)

- **Purpose**: HTTP API for searching and querying Tana data
- **Behavior**: Starts on boot, restarts on crash
- **Port**: 3100 (localhost only)
- **Plist**: `ch.invisible.supertag-server.plist`

### Sync Scheduler (`supertag-daily`)

- **Purpose**: Automated database sync from Tana exports
- **Schedule**: Every 6 hours (midnight, 6 AM, noon, 6 PM)
- **Command**: `supertag sync index`
- **Plist**: `ch.invisible.supertag-daily.plist`

---

## Installation

### Install Server (Auto-Start)

```bash
./scripts/install-launchd.sh server
```

### Install Sync Scheduler

```bash
./scripts/install-launchd.sh daily
```

The install script:
1. Copies plist to `~/Library/LaunchAgents/`
2. Replaces path placeholders with your actual paths
3. Loads the service
4. Verifies it's running

---

## Management Commands

### Check Status

```bash
# All supertag services
launchctl list | grep supertag

# Server specifically
supertag server status
```

### View Logs

```bash
# Server logs
tail -f ~/.local/state/supertag/logs/supertag-server.log

# Sync logs
tail -f ~/.local/state/supertag/logs/supertag-daily.log

# Error logs
tail -f ~/.local/state/supertag/logs/supertag-server.error.log
```

### Restart Service

```bash
# Reload after changes
./scripts/deploy-launchd.sh server
./scripts/deploy-launchd.sh daily

# Or manually
launchctl kickstart -k gui/$(id -u)/ch.invisible.supertag-server
```

### Stop Service

```bash
# Temporarily (until reboot)
launchctl unload ~/Library/LaunchAgents/ch.invisible.supertag-server.plist
```

### Uninstall

```bash
# Uninstall server
./scripts/uninstall-launchd.sh server

# Uninstall sync scheduler
./scripts/uninstall-launchd.sh daily

# Uninstall both
./scripts/uninstall-launchd.sh all
```

---

## Customization

### Change Server Port

Edit `launchd/ch.invisible.supertag-server.plist`:

```xml
<string>--port</string>
<string>3200</string>  <!-- Change from 3100 -->
```

Then deploy:

```bash
./scripts/deploy-launchd.sh server
```

### Change Sync Schedule

Edit `launchd/ch.invisible.supertag-daily.plist`.

**Current schedule (every 6 hours):**
```xml
<key>StartCalendarInterval</key>
<array>
    <dict>
        <key>Hour</key><integer>0</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <dict>
        <key>Hour</key><integer>6</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <dict>
        <key>Hour</key><integer>12</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <dict>
        <key>Hour</key><integer>18</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
</array>
```

**Once daily at 7:30 AM:**
```xml
<key>StartCalendarInterval</key>
<dict>
    <key>Hour</key>
    <integer>7</integer>
    <key>Minute</key>
    <integer>30</integer>
</dict>
```

Then deploy:
```bash
./scripts/deploy-launchd.sh daily
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
tail -50 ~/.local/state/supertag/logs/supertag-server.error.log

# Validate plist syntax
plutil -lint ~/Library/LaunchAgents/ch.invisible.supertag-server.plist
```

**Common causes:**
- Database not found: Run `supertag sync index` first
- Port in use: Check with `lsof -i :3100`
- Binary not found: Verify path in plist matches actual location

### Wrong Path in Plist

If paths are incorrect after moving the installation:

```bash
# Re-run install from new location
cd /new/path/to/supertag-cli
./scripts/deploy-launchd.sh server
```

### Port Already in Use

```bash
# Find what's using port 3100
lsof -i :3100

# Use different port
# Edit plist and deploy, or start manually:
supertag server start --port 3200
```

### Service Keeps Crashing

The server is throttled to restart at most once per 60 seconds. Check error logs:

```bash
tail -100 ~/.local/state/supertag/logs/supertag-server.error.log
```

---

## Security

### Current Configuration

- **Localhost only**: Bound to 127.0.0.1 (not accessible from network)
- **No authentication**: Safe because localhost only
- **Read-only queries**: Server doesn't modify data
- **Standard user**: Runs as your user, not root

### Enabling Network Access

If you need network access (not recommended):

1. Edit plist to bind to `0.0.0.0`
2. Configure firewall
3. Add authentication (not included)
4. Use HTTPS

---

## File Locations

| File | Path |
|------|------|
| Server plist (template) | `launchd/ch.invisible.supertag-server.plist` |
| Daily plist (template) | `launchd/ch.invisible.supertag-daily.plist` |
| Installed plists | `~/Library/LaunchAgents/ch.invisible.supertag-*.plist` |
| Logs | `~/.local/state/supertag/logs/` |

---

## Related Documentation

- [Webhook Server API](./WEBHOOK-SERVER.md)
- [Export Automation](./export.md)
