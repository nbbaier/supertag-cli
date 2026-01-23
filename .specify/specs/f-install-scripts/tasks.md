# Implementation Tasks: Install Scripts

## Completed Tasks

### T1: install.sh (macOS/Linux)
- [x] Color/formatting utilities
- [x] Platform detection (darwin-arm64, darwin-x64, linux-x64)
- [x] Bun installation (via bun.sh, not Homebrew)
- [x] Playwright global installation
- [x] Chromium browser installation
- [x] Version resolution (latest or specific)
- [x] Binary download and extraction
- [x] Quarantine removal (macOS)
- [x] Smart PATH configuration:
  - [x] Detect existing ~/bin or ~/.local/bin in PATH
  - [x] Offer choice: /usr/local/bin (sudo) or ~/.local/bin (user)
  - [x] Create symlinks
  - [x] Update shell config if needed
- [x] NODE_PATH configuration for Playwright
- [x] MCP auto-configuration (Claude Desktop, Cursor, Claude Code)
- [x] Installation verification
- [x] Idempotency (safe to run multiple times)
- [x] --version, --no-mcp, --help flags

### T2: uninstall.sh (macOS/Linux)
- [x] Remove symlinks from all possible locations
- [x] Remove installation directory
- [x] Clean shell config (remove installer-added lines)
- [x] Optional MCP config removal
- [x] --purge flag for config/data removal
- [x] Confirmation prompts
- [x] Does NOT remove Bun/Playwright

### T3: install.ps1 (Windows)
- [x] Platform detection (windows-x64, windows-arm64)
- [x] Bun installation (via bun.sh/install.ps1)
- [x] Playwright global installation
- [x] Chromium browser installation
- [x] Version resolution
- [x] Binary download and extraction
- [x] PATH configuration (User environment variable)
- [x] NODE_PATH configuration
- [x] MCP auto-configuration (Claude Desktop, Cursor, Claude Code)
- [x] Installation verification
- [x] -Version, -NoMcp, -Help parameters

### T4: uninstall.ps1 (Windows)
- [x] Remove from PATH
- [x] Remove installation directory
- [x] Clean NODE_PATH
- [x] Optional MCP config removal
- [x] -Purge flag for config/data removal
- [x] Confirmation prompts
- [x] Does NOT remove Bun/Playwright

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| install.sh | `/install.sh` | macOS/Linux installer |
| uninstall.sh | `/uninstall.sh` | macOS/Linux uninstaller |
| install.ps1 | `/install.ps1` | Windows installer |
| uninstall.ps1 | `/uninstall.ps1` | Windows uninstaller |

## Testing Status

### Manual Testing Required

| Platform | Fresh | Partial | Update | No sudo |
|----------|-------|---------|--------|---------|
| macOS ARM64 | [ ] | [ ] | [ ] | [ ] |
| macOS x64 | [ ] | [ ] | [ ] | [ ] |
| Linux x64 | [ ] | [ ] | [ ] | [ ] |
| Windows 10 | [ ] | [ ] | [ ] | N/A |
| Windows 11 | [ ] | [ ] | [ ] | N/A |

## Next Steps

1. Test install.sh on macOS ARM64 (primary development platform)
2. Update course materials to reference install scripts
3. Update README.md quick start section
4. Add to GitHub releases workflow

---

*Tasks created: 2026-01-11*
*Implementation completed: 2026-01-11*
