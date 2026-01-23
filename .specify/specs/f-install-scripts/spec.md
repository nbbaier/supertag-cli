# Feature: Standalone Install Scripts

## Overview

Standalone shell scripts that install all dependencies required to run supertag-cli, including the export functionality. These scripts run BEFORE supertag-cli is available and handle system-level dependencies.

## Problem Statement

Current installation requires users to:
1. Manually install Bun
2. Manually install Playwright globally
3. Manually configure NODE_PATH
4. Manually install Chromium browser
5. Manually download and extract supertag-cli binaries

This is error-prone for non-technical users and creates friction in onboarding.

## Solution

Four standalone scripts:
- `install.sh` - macOS and Linux installer
- `install.ps1` - Windows PowerShell installer
- `uninstall.sh` - macOS and Linux uninstaller
- `uninstall.ps1` - Windows PowerShell uninstaller

**Flags:**
- `--version X.Y.Z` - Install specific version (default: latest)
- `--no-mcp` - Skip MCP auto-configuration
- `--help` - Show usage

## Requirements

### Functional Requirements

#### FR1: Dependency Installation
- [ ] Install Bun runtime (without requiring Homebrew on macOS)
- [ ] Install Playwright package globally via Bun
- [ ] Install Chromium browser via Playwright
- [ ] Configure NODE_PATH environment variable

#### FR2: supertag-cli Installation
- [ ] Detect platform (macOS ARM64, macOS x64, Linux x64, Windows x64)
- [ ] Download correct binary from GitHub releases
- [ ] Extract to appropriate location
- [ ] Add to PATH (symlinks on Unix, PATH modification on Windows)
- [ ] Remove quarantine attribute on macOS

#### FR3: Verification
- [ ] Verify each step succeeded before proceeding
- [ ] Run `supertag --version` to confirm installation
- [ ] Run `supertag-export --help` to confirm export tool works
- [ ] Provide clear success/failure message

#### FR4: Idempotency
- [ ] Safe to run multiple times
- [ ] Skip already-installed components
- [ ] Don't duplicate PATH entries or shell config lines

#### FR5: MCP Auto-Configuration
- [ ] Detect Claude Desktop installation (check config file location)
- [ ] Detect Cursor installation (check config file location)
- [ ] Detect Claude Code installation (check ~/.claude.json or ~/.claude/)
- [ ] If detected, offer to add supertag-mcp server configuration
- [ ] Backup existing config before modifying
- [ ] Don't duplicate if already configured

#### FR6: Update Handling
- [ ] Detect existing supertag-cli installation
- [ ] Compare installed version with target version
- [ ] If older, offer to update (or auto-update)
- [ ] Preserve user configuration during update

### Non-Functional Requirements

#### NFR1: No External Dependencies (macOS/Linux)
- Must work with only `curl`, `unzip`, and standard Unix tools
- Must NOT require Homebrew
- Must NOT require Node.js/npm

#### NFR2: User Experience
- Clear progress messages at each step
- Colored output where supported
- Estimated time for long operations
- Summary at end showing what was installed

#### NFR3: Error Handling
- Each step should have clear error messages
- Suggest fixes for common failures
- Exit gracefully on unrecoverable errors
- Don't leave system in broken state

## Failure Modes & Mitigations

### FM1: Network Failures
| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Can't reach bun.sh | curl exit code | Retry once, then suggest checking network |
| Can't reach GitHub | curl exit code | Retry once, provide manual download URL |
| Partial download | File size check | Delete partial, retry |

### FM2: Permission Failures
| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Can't write to /usr/local/bin | mkdir/ln failure | Fall back to ~/bin or ~/.local/bin |
| Can't modify shell config | Write failure | Print manual instructions |
| sudo not available | Command not found | Use user-local installation |

### FM3: Platform Detection Failures
| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Unknown architecture | uname output | Fail with clear error, list supported platforms |
| Rosetta (x64 on ARM) | Check both uname -m and sysctl | Warn user, suggest native version |

### FM4: Dependency Conflicts
| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Old Bun version | Version check | Offer to update or skip |
| Playwright already installed | Package check | Skip, report existing version |
| PATH already configured | grep shell config | Skip, don't duplicate |

### FM5: Disk Space
| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Not enough space | df check before large downloads | Fail early with space requirement |

### FM6: Shell Configuration
| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Unknown shell | $SHELL check | Support zsh, bash, fish; warn for others |
| Shell config doesn't exist | File check | Create if missing, or skip with instructions |

### FM7: MCP Configuration
| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Config file is invalid JSON | JSON parse error | Backup original, warn user, skip MCP config |
| No write permission | Write failure | Print manual instructions |
| Config format changed | Missing expected keys | Warn user, skip MCP config |
| Multiple AI tools found | Multiple configs exist | Ask user which to configure, or configure all |

## User Flows

### Happy Path (macOS)
```
$ curl -fsSL https://raw.githubusercontent.com/jcfischer/supertag-cli/main/install.sh | bash

Installing supertag-cli...

[1/6] Installing Bun...
      ✓ Bun v1.x.x installed

[2/6] Installing Playwright...
      ✓ Playwright installed globally

[3/6] Installing Chromium browser...
      ✓ Chromium installed (this took ~30 seconds)

[4/6] Downloading supertag-cli v0.16.0 for macOS ARM64...
      ✓ Downloaded and extracted to ~/Tools/supertag-cli

[5/6] Configuring PATH...
      ✓ Added to /usr/local/bin
      ✓ NODE_PATH configured in ~/.zshrc

[6/6] Configuring MCP servers...
      ✓ Found Claude Desktop
      ✓ Added supertag-mcp to Claude Desktop config
      ✓ Found Cursor
      ✓ Added supertag-mcp to Cursor config

Installation complete!

  supertag --version    → v0.16.0
  supertag-export       → Ready
  MCP configured for    → Claude Desktop, Cursor

Next steps:
  1. Open a new terminal (or run: source ~/.zshrc)
  2. Run: supertag-export login
  3. Run: supertag-export discover
  4. Restart Claude Desktop or Cursor to use MCP

Documentation: https://github.com/jcfischer/supertag-cli
```

### Already Installed
```
$ ./install.sh

Installing supertag-cli...

[1/5] Installing Bun...
      ✓ Bun v1.x.x already installed (skipping)

[2/5] Installing Playwright...
      ✓ Playwright already installed (skipping)

[3/5] Installing Chromium browser...
      ✓ Chromium already installed (skipping)

[4/5] Downloading supertag-cli...
      ✓ supertag-cli v0.16.0 already installed (skipping)

[5/5] Configuring PATH...
      ✓ Already configured (skipping)

Everything is already installed!

  supertag --version → v0.16.0
```

### Error Case: No Network
```
$ ./install.sh

Installing supertag-cli...

[1/5] Installing Bun...
      ✗ Failed to download Bun installer

      Could not connect to bun.sh
      Please check your internet connection and try again.

      Manual install: https://bun.sh/docs/installation
```

## Technical Design

### install.sh Structure
```bash
#!/bin/bash
set -e

# Colors (if terminal supports)
# Platform detection
# Utility functions (download, verify, etc.)

main() {
    detect_platform
    install_bun
    install_playwright
    install_chromium
    download_supertag
    configure_path
    verify_installation
    print_success
}

# Each function handles its own idempotency and error reporting
```

### install.ps1 Structure
```powershell
#Requires -Version 5.1

# Platform detection (x64 only for now)
# Utility functions

function Main {
    Install-Bun
    Install-Playwright
    Install-Chromium
    Download-Supertag
    Configure-Path
    Verify-Installation
    Show-Success
}
```

## Installation Locations

### macOS/Linux
| Component | Location |
|-----------|----------|
| Bun | `~/.bun/` |
| Playwright (global) | `~/.bun/install/global/node_modules/` |
| Chromium | `~/Library/Caches/ms-playwright/` (Mac) or `~/.cache/ms-playwright/` (Linux) |
| supertag-cli | `~/Tools/supertag-cli/` |
| Symlinks | `/usr/local/bin/` or `~/.local/bin/` |

### Windows
| Component | Location |
|-----------|----------|
| Bun | `%USERPROFILE%\.bun\` |
| Playwright | `%USERPROFILE%\.bun\install\global\node_modules\` |
| Chromium | `%LOCALAPPDATA%\ms-playwright\` |
| supertag-cli | `%USERPROFILE%\Tools\supertag-cli\` |

## Environment Variables

### Required
| Variable | Purpose | Set By Script |
|----------|---------|---------------|
| NODE_PATH | Playwright lookup | Yes (shell config) |
| PATH | Binary access | Yes (shell config) |

### Optional
| Variable | Purpose | Default |
|----------|---------|---------|
| SUPERTAG_INSTALL_DIR | Override install location | ~/Tools/supertag-cli |

## Testing Checklist

### Platforms to Test
- [ ] macOS ARM64 (M1/M2/M3/M4)
- [ ] macOS x64 (Intel)
- [ ] Linux x64 (Ubuntu/Debian)
- [ ] Windows 10 x64
- [ ] Windows 11 x64

### Scenarios to Test
- [ ] Fresh install (nothing pre-installed)
- [ ] Partial install (some components present)
- [ ] Full reinstall (everything present)
- [ ] Update (old version → new version)
- [ ] No sudo access
- [ ] Non-standard shell (fish, etc.)
- [ ] Slow network (timeouts)
- [ ] Interrupted install (Ctrl+C)

## MCP Configuration Locations

### macOS
| Tool | Config Location |
|------|-----------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `~/Library/Application Support/Cursor/User/globalStorage/cursor-mcp/config.json` |
| Claude Code | `~/.claude.json` or `~/.claude/settings.json` |

### Windows
| Tool | Config Location |
|------|-----------------|
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `%APPDATA%\Cursor\User\globalStorage\cursor-mcp\config.json` |
| Claude Code | `%USERPROFILE%\.claude.json` |

### Linux
| Tool | Config Location |
|------|-----------------|
| Claude Code | `~/.claude.json` or `~/.claude/settings.json` |

### MCP Config Format
```json
{
  "mcpServers": {
    "supertag": {
      "command": "/path/to/supertag-mcp"
    }
  }
}
```

## Decisions (Resolved)

1. **Version pinning**: Default to latest, allow `--version X.Y.Z` flag ✓

2. **Uninstall**: Yes, provide `uninstall.sh` and `uninstall.ps1` ✓

3. **Update**: Yes, running install again updates existing installation ✓

4. **MCP auto-config**: Yes, detect and configure Claude Desktop, Cursor, Claude Code ✓

---

*Spec created: 2026-01-11*
*Updated: 2026-01-11 - Added MCP auto-config, uninstall scripts, resolved open questions*
