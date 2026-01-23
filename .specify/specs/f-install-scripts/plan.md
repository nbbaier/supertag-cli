# Implementation Plan: Install Scripts

## Overview

Implement standalone install/uninstall scripts for supertag-cli that handle all dependencies and MCP configuration.

## Architecture

```
scripts/
├── install.sh          # macOS/Linux installer
├── install.ps1         # Windows installer
├── uninstall.sh        # macOS/Linux uninstaller
├── uninstall.ps1       # Windows uninstaller
└── lib/
    └── common.sh       # Shared functions (colors, logging)
```

Scripts will be hosted at repo root and accessible via:
```bash
curl -fsSL https://raw.githubusercontent.com/jcfischer/supertag-cli/main/install.sh | bash
```

## Implementation Approach

### install.sh Structure

```bash
#!/bin/bash
set -euo pipefail

# ============================================
# Configuration
# ============================================
VERSION="${1:-latest}"          # From --version flag or default
INSTALL_DIR="${SUPERTAG_INSTALL_DIR:-$HOME/Tools/supertag-cli}"
SKIP_MCP="${SKIP_MCP:-false}"   # From --no-mcp flag

# ============================================
# Utility Functions
# ============================================
# - Colors (detect terminal support)
# - Logging (info, success, error, warn)
# - Download with retry
# - JSON manipulation (for MCP config)

# ============================================
# Detection Functions
# ============================================
# - detect_platform() → darwin-arm64, darwin-x64, linux-x64
# - detect_shell() → zsh, bash, fish
# - is_bun_installed()
# - is_playwright_installed()
# - is_chromium_installed()
# - get_installed_version()
# - detect_mcp_clients() → array of found clients

# ============================================
# Installation Functions
# ============================================
# - install_bun()
# - install_playwright()
# - install_chromium()
# - download_supertag()
# - configure_path()
# - configure_mcp()

# ============================================
# Main
# ============================================
main() {
    parse_args "$@"
    print_banner

    step "1/6" "Installing Bun"
    install_bun

    step "2/6" "Installing Playwright"
    install_playwright

    step "3/6" "Installing Chromium"
    install_chromium

    step "4/6" "Downloading supertag-cli"
    download_supertag

    step "5/6" "Configuring PATH"
    configure_path

    if [[ "$SKIP_MCP" != "true" ]]; then
        step "6/6" "Configuring MCP"
        configure_mcp
    fi

    verify_installation
    print_success
}
```

### Key Implementation Details

#### 1. Bun Installation (No Homebrew)

```bash
install_bun() {
    if command -v bun &>/dev/null; then
        local version=$(bun --version)
        success "Bun v$version already installed (skipping)"
        return 0
    fi

    info "Downloading Bun installer..."
    curl -fsSL https://bun.sh/install | bash

    # Source the new PATH
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    success "Bun $(bun --version) installed"
}
```

#### 2. Platform Detection

```bash
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    case "$os" in
        darwin)
            case "$arch" in
                arm64) echo "macos-arm64" ;;
                x86_64) echo "macos-x64" ;;
                *) error "Unsupported architecture: $arch" ;;
            esac
            ;;
        linux)
            case "$arch" in
                x86_64) echo "linux-x64" ;;
                *) error "Unsupported architecture: $arch" ;;
            esac
            ;;
        *) error "Unsupported OS: $os" ;;
    esac
}
```

#### 3. Version Resolution

```bash
resolve_version() {
    local requested="$1"

    if [[ "$requested" == "latest" ]]; then
        # Fetch latest release tag from GitHub API
        curl -fsSL https://api.github.com/repos/jcfischer/supertag-cli/releases/latest \
            | grep '"tag_name"' \
            | sed -E 's/.*"v?([^"]+)".*/\1/'
    else
        echo "$requested"
    fi
}
```

#### 4. MCP Auto-Configuration

```bash
configure_mcp() {
    local mcp_path="$INSTALL_DIR/supertag-mcp"
    local configured=()

    # Claude Desktop
    local claude_config="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    if [[ -f "$claude_config" ]] || [[ -d "$(dirname "$claude_config")" ]]; then
        if configure_mcp_client "$claude_config" "$mcp_path"; then
            configured+=("Claude Desktop")
        fi
    fi

    # Cursor
    local cursor_config="$HOME/Library/Application Support/Cursor/User/globalStorage/cursor-mcp/config.json"
    if [[ -f "$cursor_config" ]] || [[ -d "$(dirname "$cursor_config")" ]]; then
        if configure_mcp_client "$cursor_config" "$mcp_path"; then
            configured+=("Cursor")
        fi
    fi

    # Claude Code
    local claude_code_config="$HOME/.claude.json"
    if [[ -f "$claude_code_config" ]]; then
        if configure_mcp_client "$claude_code_config" "$mcp_path"; then
            configured+=("Claude Code")
        fi
    fi

    if [[ ${#configured[@]} -eq 0 ]]; then
        warn "No MCP clients found. You can configure manually later."
    else
        success "MCP configured for: ${configured[*]}"
    fi
}

configure_mcp_client() {
    local config_file="$1"
    local mcp_path="$2"

    # Create backup
    if [[ -f "$config_file" ]]; then
        cp "$config_file" "${config_file}.backup"
    fi

    # Create or update config using jq-like manipulation
    # (We'll use a simple approach without jq dependency)
    ...
}
```

#### 5. JSON Manipulation Without jq

Since we can't rely on `jq` being installed, we'll use a simple approach:

```bash
# For creating new config
create_mcp_config() {
    local mcp_path="$1"
    cat <<EOF
{
  "mcpServers": {
    "supertag": {
      "command": "$mcp_path"
    }
  }
}
EOF
}

# For updating existing config, we'll use Python (usually available) or awk
update_mcp_config() {
    local config_file="$1"
    local mcp_path="$2"

    # Try Python first (most reliable)
    if command -v python3 &>/dev/null; then
        python3 - "$config_file" "$mcp_path" <<'PYTHON'
import json, sys
config_file, mcp_path = sys.argv[1], sys.argv[2]
try:
    with open(config_file) as f:
        config = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    config = {}

if "mcpServers" not in config:
    config["mcpServers"] = {}

if "supertag" not in config["mcpServers"]:
    config["mcpServers"]["supertag"] = {"command": mcp_path}
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    print("added")
else:
    print("exists")
PYTHON
    else
        # Fallback: simple text manipulation
        ...
    fi
}
```

#### 6. Smart PATH Configuration

```bash
configure_path() {
    local bin_dir=""
    local needs_shell_config=false

    # Step 1: Check if user already has a local bin in PATH
    local existing_local_bin=""
    for dir in "$HOME/bin" "$HOME/.local/bin"; do
        if [[ ":$PATH:" == *":$dir:"* ]]; then
            existing_local_bin="$dir"
            break
        fi
    done

    if [[ -n "$existing_local_bin" ]]; then
        # User has local bin in PATH already
        info "Found $existing_local_bin in your PATH"
        if confirm "Install symlinks there?"; then
            bin_dir="$existing_local_bin"
        fi
    fi

    # Step 2: If no local bin found or user declined, offer choice
    if [[ -z "$bin_dir" ]]; then
        echo ""
        echo "Where should I install the commands?"
        echo ""
        echo "  1) /usr/local/bin (requires sudo, no shell config changes)"
        echo "  2) ~/.local/bin (no sudo, adds to shell config)"
        echo ""
        read -p "Choice [1]: " choice
        choice="${choice:-1}"

        case "$choice" in
            1)
                bin_dir="/usr/local/bin"
                needs_shell_config=false
                ;;
            2)
                bin_dir="$HOME/.local/bin"
                needs_shell_config=true
                mkdir -p "$bin_dir"
                ;;
            *)
                error "Invalid choice"
                ;;
        esac
    fi

    # Step 3: Create symlinks
    info "Creating symlinks in $bin_dir"

    if [[ "$bin_dir" == "/usr/local/bin" ]]; then
        sudo ln -sf "$INSTALL_DIR/supertag" "$bin_dir/supertag"
        sudo ln -sf "$INSTALL_DIR/supertag-export" "$bin_dir/supertag-export"
        sudo ln -sf "$INSTALL_DIR/supertag-mcp" "$bin_dir/supertag-mcp"
    else
        ln -sf "$INSTALL_DIR/supertag" "$bin_dir/supertag"
        ln -sf "$INSTALL_DIR/supertag-export" "$bin_dir/supertag-export"
        ln -sf "$INSTALL_DIR/supertag-mcp" "$bin_dir/supertag-mcp"
    fi

    # Step 4: Update shell config if needed
    if [[ "$needs_shell_config" == true ]]; then
        configure_shell_path "$bin_dir"
    fi

    success "Symlinks created in $bin_dir"
}

configure_shell_path() {
    local bin_dir="$1"
    local shell_config=""
    local path_line="export PATH=\"\$PATH:$bin_dir\""

    # Detect shell config file
    case "$SHELL" in
        */zsh)  shell_config="$HOME/.zshrc" ;;
        */bash)
            if [[ -f "$HOME/.bash_profile" ]]; then
                shell_config="$HOME/.bash_profile"
            else
                shell_config="$HOME/.bashrc"
            fi
            ;;
        */fish) shell_config="$HOME/.config/fish/config.fish"
                path_line="set -gx PATH \$PATH $bin_dir"
                ;;
        *)
            warn "Unknown shell: $SHELL"
            warn "Add this to your shell config manually:"
            echo "  $path_line"
            return
            ;;
    esac

    # Check if already configured
    if grep -q "$bin_dir" "$shell_config" 2>/dev/null; then
        info "PATH already configured in $shell_config"
        return
    fi

    # Add to shell config
    echo "" >> "$shell_config"
    echo "# Added by supertag-cli installer" >> "$shell_config"
    echo "$path_line" >> "$shell_config"

    success "Added $bin_dir to PATH in $shell_config"
    warn "Run 'source $shell_config' or open a new terminal"
}
```

### install.ps1 Structure

```powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Version = "latest",
    [switch]$NoMcp,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$InstallDir = "$env:USERPROFILE\Tools\supertag-cli"

function Main {
    if ($Help) { Show-Help; return }

    Write-Banner

    Write-Step "1/6" "Installing Bun"
    Install-Bun

    Write-Step "2/6" "Installing Playwright"
    Install-Playwright

    Write-Step "3/6" "Installing Chromium"
    Install-Chromium

    Write-Step "4/6" "Downloading supertag-cli"
    Download-Supertag

    Write-Step "5/6" "Configuring PATH"
    Configure-Path

    if (-not $NoMcp) {
        Write-Step "6/6" "Configuring MCP"
        Configure-Mcp
    }

    Test-Installation
    Write-Success
}
```

### Uninstall Scripts

```bash
# uninstall.sh
main() {
    print_banner "Uninstalling supertag-cli"

    # Remove symlinks
    sudo rm -f /usr/local/bin/supertag
    sudo rm -f /usr/local/bin/supertag-export
    sudo rm -f /usr/local/bin/supertag-mcp

    # Remove installation directory
    rm -rf "$INSTALL_DIR"

    # Remove MCP configs (ask first)
    if confirm "Remove MCP configurations?"; then
        remove_mcp_configs
    fi

    # Note: Don't remove Bun/Playwright (user may need them)

    success "supertag-cli uninstalled"
    warn "Bun and Playwright were not removed (may be used by other tools)"
}
```

## File Structure After Implementation

```
supertag-cli/
├── install.sh              # Main macOS/Linux installer
├── install.ps1             # Main Windows installer
├── uninstall.sh            # macOS/Linux uninstaller
├── uninstall.ps1           # Windows uninstaller
├── scripts/
│   └── install-lib.sh      # Shared functions (optional)
└── docs/
    ├── INSTALL-MACOS.md    # Updated to reference install.sh
    ├── INSTALL-WINDOWS.md  # Updated to reference install.ps1
    └── INSTALL-LINUX.md    # Updated to reference install.sh
```

## Testing Strategy

### Manual Testing Matrix

| Platform | Fresh | Partial | Update | No sudo |
|----------|-------|---------|--------|---------|
| macOS ARM64 | [ ] | [ ] | [ ] | [ ] |
| macOS x64 | [ ] | [ ] | [ ] | [ ] |
| Linux x64 | [ ] | [ ] | [ ] | [ ] |
| Windows 10 | [ ] | [ ] | [ ] | N/A |
| Windows 11 | [ ] | [ ] | [ ] | N/A |

### Test Scenarios

1. **Fresh install**: No Bun, no supertag-cli
2. **Partial install**: Bun exists, no Playwright
3. **Update**: Old version installed, run again
4. **No sudo**: Verify fallback to user directories
5. **MCP detection**: With/without Claude Desktop, Cursor

## Rollout Plan

1. Create scripts in feature branch
2. Test on all platforms
3. Update documentation to reference scripts
4. Add to GitHub releases as downloadable assets
5. Update README quick start section

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bun installer changes | Pin to known-working install URL, monitor |
| GitHub API rate limits | Cache version info, provide fallback |
| MCP config format changes | Version check, graceful degradation |
| User PATH already broken | Detect and warn, don't make worse |

---

*Plan created: 2026-01-11*
