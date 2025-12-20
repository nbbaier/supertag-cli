#!/usr/bin/env bash
#
# Build script for supertag CLI
# Compiles TypeScript to standalone binary
#
# Usage:
#   ./scripts/build.sh           # Build if source changed
#   ./scripts/build.sh --force   # Force rebuild
#   ./scripts/build.sh --check   # Check if rebuild needed (exit 1 if yes)
#
# NOTE: Run this after implementing changes to ensure binary is up to date

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BINARY="$PROJECT_DIR/supertag"
SRC_DIR="$PROJECT_DIR/src"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[build]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[build]${NC} $1"
}

log_error() {
    echo -e "${RED}[build]${NC} $1"
}

# Check if binary needs rebuilding
needs_rebuild() {
    # If binary doesn't exist, rebuild
    if [[ ! -f "$BINARY" ]]; then
        return 0
    fi

    # Check if any source file is newer than binary
    local newer_files
    newer_files=$(find "$SRC_DIR" -name "*.ts" -newer "$BINARY" 2>/dev/null | head -1)

    if [[ -n "$newer_files" ]]; then
        return 0
    fi

    # Check if package.json is newer
    if [[ "$PROJECT_DIR/package.json" -nt "$BINARY" ]]; then
        return 0
    fi

    return 1
}

# Build the binary
do_build() {
    log_info "Building supertag binary..."
    cd "$PROJECT_DIR"

    # Run tests first (skip slow tests for faster builds)
    log_info "Running tests..."
    if ! bun test ./tests/*.test.ts ./src/**/*.test.ts --timeout 120000 2>&1; then
        log_error "Tests failed! Aborting build."
        exit 1
    fi

    # Build main CLI
    log_info "Compiling supertag..."
    bun build src/index.ts --compile --outfile=supertag

    log_info "Build complete: $BINARY"
    ls -lh "$BINARY" | awk '{print "  Size: " $5 "  Modified: " $6 " " $7 " " $8}'
}

# Main
main() {
    local force=false
    local check_only=false

    for arg in "$@"; do
        case $arg in
            --force|-f)
                force=true
                ;;
            --check|-c)
                check_only=true
                ;;
            --help|-h)
                echo "Usage: $0 [--force] [--check]"
                echo "  --force, -f   Force rebuild even if binary is up to date"
                echo "  --check, -c   Check if rebuild needed (exit 1 if yes)"
                exit 0
                ;;
        esac
    done

    if $check_only; then
        if needs_rebuild; then
            log_warn "Rebuild needed"
            exit 1
        else
            log_info "Binary is up to date"
            exit 0
        fi
    fi

    if $force; then
        log_info "Force rebuild requested"
        do_build
    elif needs_rebuild; then
        log_warn "Source files changed, rebuilding..."
        do_build
    else
        log_info "Binary is up to date, skipping build"
    fi
}

main "$@"
