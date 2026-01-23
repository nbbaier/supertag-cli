#!/bin/bash
# =============================================================================
# supertag-cli Uninstaller
#
# Removes supertag-cli and optionally cleans up MCP configurations.
# Does NOT remove Bun or Playwright (may be used by other tools).
#
# Usage:
#   ./uninstall.sh
#   ./uninstall.sh --purge    # Also remove config and data
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

INSTALL_DIR="${SUPERTAG_INSTALL_DIR:-$HOME/Tools/supertag-cli}"

# =============================================================================
# Colors & Formatting
# =============================================================================

if [[ -t 1 ]] && [[ "${TERM:-}" != "dumb" ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    BOLD=''
    NC=''
fi

# =============================================================================
# Utility Functions
# =============================================================================

info() {
    echo -e "  ${BLUE}→${NC} $1"
}

success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "  ${RED}✗${NC} $1" >&2
}

confirm() {
    local prompt="$1"
    local default="${2:-n}"
    local yn

    if [[ "$default" == "y" ]]; then
        read -p "  $prompt [Y/n]: " yn
        yn="${yn:-y}"
    else
        read -p "  $prompt [y/N]: " yn
        yn="${yn:-n}"
    fi

    [[ "$yn" =~ ^[Yy] ]]
}

# =============================================================================
# Uninstall Functions
# =============================================================================

remove_symlinks() {
    local removed=()

    # Check common symlink locations
    for bin_dir in "/usr/local/bin" "$HOME/.local/bin" "$HOME/bin"; do
        for cmd in supertag supertag-export supertag-mcp; do
            local link="$bin_dir/$cmd"
            if [[ -L "$link" ]]; then
                local target
                target=$(readlink "$link" 2>/dev/null || echo "")
                if [[ "$target" == *"supertag"* ]]; then
                    if [[ "$bin_dir" == "/usr/local/bin" ]]; then
                        sudo rm -f "$link" 2>/dev/null && removed+=("$link")
                    else
                        rm -f "$link" 2>/dev/null && removed+=("$link")
                    fi
                fi
            fi
        done
    done

    if [[ ${#removed[@]} -gt 0 ]]; then
        success "Removed symlinks: ${removed[*]}"
    else
        info "No symlinks found"
    fi
}

remove_install_dir() {
    if [[ -d "$INSTALL_DIR" ]]; then
        rm -rf "$INSTALL_DIR"
        success "Removed $INSTALL_DIR"
    else
        info "Installation directory not found"
    fi
}

remove_mcp_configs() {
    local removed=()

    # Claude Desktop (macOS)
    if [[ "$(uname -s)" == "Darwin" ]]; then
        local claude_config="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
        if remove_mcp_from_config "$claude_config"; then
            removed+=("Claude Desktop")
        fi

        # Cursor (macOS)
        local cursor_config="$HOME/Library/Application Support/Cursor/User/globalStorage/cursor-mcp/config.json"
        if remove_mcp_from_config "$cursor_config"; then
            removed+=("Cursor")
        fi
    fi

    # Claude Code
    local claude_code_config="$HOME/.claude.json"
    if remove_mcp_from_config "$claude_code_config"; then
        removed+=("Claude Code")
    fi

    if [[ ${#removed[@]} -gt 0 ]]; then
        success "Removed MCP config from: ${removed[*]}"
    fi
}

remove_mcp_from_config() {
    local config_file="$1"

    if [[ ! -f "$config_file" ]]; then
        return 1
    fi

    if command -v python3 &>/dev/null; then
        local result
        result=$(python3 - "$config_file" <<'PYTHON'
import json
import sys
import os

config_file = sys.argv[1]

try:
    with open(config_file) as f:
        config = json.load(f)
except (json.JSONDecodeError, IOError, FileNotFoundError):
    print("skip")
    sys.exit(0)

if "mcpServers" in config and "supertag" in config["mcpServers"]:
    del config["mcpServers"]["supertag"]

    # Remove mcpServers if empty
    if not config["mcpServers"]:
        del config["mcpServers"]

    # Remove file if empty
    if not config or config == {}:
        os.remove(config_file)
        print("deleted")
    else:
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        print("removed")
else:
    print("skip")
PYTHON
        )

        case "$result" in
            removed|deleted) return 0 ;;
            *) return 1 ;;
        esac
    else
        warn "python3 not found - cannot safely modify config"
        return 1
    fi
}

remove_config_and_data() {
    local config_dir="$HOME/.config/supertag"
    local data_dir

    case "$(uname -s)" in
        Darwin) data_dir="$HOME/Library/Application Support/supertag" ;;
        *) data_dir="$HOME/.local/share/supertag" ;;
    esac

    if [[ -d "$config_dir" ]]; then
        rm -rf "$config_dir"
        success "Removed config: $config_dir"
    fi

    if [[ -d "$data_dir" ]]; then
        rm -rf "$data_dir"
        success "Removed data: $data_dir"
    fi
}

clean_shell_config() {
    local shell_name
    shell_name=$(basename "${SHELL:-/bin/bash}")

    local shell_config=""
    case "$shell_name" in
        zsh) shell_config="$HOME/.zshrc" ;;
        bash)
            if [[ -f "$HOME/.bash_profile" ]]; then
                shell_config="$HOME/.bash_profile"
            else
                shell_config="$HOME/.bashrc"
            fi
            ;;
        fish) shell_config="$HOME/.config/fish/config.fish" ;;
        *) return ;;
    esac

    if [[ ! -f "$shell_config" ]]; then
        return
    fi

    # Check if there are supertag-related lines
    if grep -q "supertag-cli installer" "$shell_config" 2>/dev/null; then
        # Create backup
        cp "$shell_config" "${shell_config}.backup.$(date +%Y%m%d%H%M%S)"

        # Remove supertag-related lines
        if command -v python3 &>/dev/null; then
            python3 - "$shell_config" <<'PYTHON'
import sys
import re

config_file = sys.argv[1]

with open(config_file, 'r') as f:
    lines = f.readlines()

# Remove lines related to supertag-cli installer
new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if "supertag-cli installer" in line:
        skip_next = True
        # Also remove preceding empty line if exists
        if new_lines and new_lines[-1].strip() == '':
            new_lines.pop()
        continue
    if skip_next:
        skip_next = False
        continue
    new_lines.append(line)

with open(config_file, 'w') as f:
    f.writelines(new_lines)
PYTHON
            success "Cleaned shell config: $shell_config"
        else
            warn "python3 not found - shell config may have leftover lines"
        fi
    fi
}

# =============================================================================
# Main
# =============================================================================

print_banner() {
    echo ""
    echo -e "${BOLD}Uninstalling supertag-cli${NC}"
    echo ""
}

print_help() {
    echo "supertag-cli uninstaller"
    echo ""
    echo "Usage: uninstall.sh [options]"
    echo ""
    echo "Options:"
    echo "  --purge   Also remove config files and data"
    echo "  --help    Show this help message"
    echo ""
}

main() {
    local purge=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --purge) purge=true; shift ;;
            --help|-h) print_help; exit 0 ;;
            *) shift ;;
        esac
    done

    print_banner

    # Check if installed
    if [[ ! -d "$INSTALL_DIR" ]] && ! command -v supertag &>/dev/null; then
        info "supertag-cli doesn't appear to be installed"
        exit 0
    fi

    echo "This will remove:"
    echo "  - supertag-cli binaries from $INSTALL_DIR"
    echo "  - Symlinks in PATH"
    if [[ "$purge" == true ]]; then
        echo "  - Configuration and data files"
    fi
    echo ""

    if ! confirm "Continue?"; then
        echo "Cancelled."
        exit 0
    fi

    echo ""

    remove_symlinks
    remove_install_dir
    clean_shell_config

    if confirm "Remove MCP configurations?"; then
        remove_mcp_configs
    fi

    if [[ "$purge" == true ]]; then
        remove_config_and_data
    fi

    echo ""
    echo -e "${GREEN}${BOLD}supertag-cli uninstalled${NC}"
    echo ""
    warn "Bun and Playwright were NOT removed (may be used by other tools)"
    echo ""
}

main "$@"
