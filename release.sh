#!/bin/bash
#
# Supertag CLI Release Script
# ===========================
#
# This script automates the release process for Supertag CLI.
# Run from the tana skill directory: ./release.sh
#
# Prerequisites:
# - Bun installed
# - Access to ~/kDrive/tana-cli/
# - Access to ~/work/web/invisible-store/
#
# What this script does:
# 1. Updates version in package.json (if provided)
# 2. Builds binaries for all 4 platforms
# 3. Creates distribution zip files
# 4. Copies to kDrive for distribution
# 5. Updates website guide
# 6. Provides git commands for manual review
#
# Usage:
#   ./release.sh                    # Build with current version
#   ./release.sh 0.9.0              # Build with new version
#   ./release.sh --guide-only       # Only rebuild the website guide
#   ./release.sh --push             # Build and push both repos
#   ./release.sh 0.9.0 --push       # Build with new version and push
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBSITE_DIR="$HOME/work/web/invisible-store"
KDRIVE_DIR="$HOME/kDrive/tana-cli"

# Parse arguments
DO_PUSH=false
VERSION_ARG=""
for arg in "$@"; do
    case $arg in
        --push)
            DO_PUSH=true
            ;;
        --guide-only)
            # Handled separately below
            ;;
        *)
            VERSION_ARG="$arg"
            ;;
    esac
done

# Functions
log_step() {
    echo -e "\n${BLUE}==>${NC} ${1}"
}

log_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} ${1}"
}

log_error() {
    echo -e "${RED}✗${NC} ${1}"
}

# Check if guide-only mode
if [ "$1" = "--guide-only" ]; then
    log_step "Rebuilding website guide only..."
    cd "$WEBSITE_DIR/tana"
    bun run build-guide.ts
    log_success "Guide rebuilt: $WEBSITE_DIR/tana/guide.html"
    exit 0
fi

# Get version
if [ -n "$VERSION_ARG" ]; then
    VERSION="$VERSION_ARG"
    log_step "Setting version to $VERSION..."
    # Update package.json version
    cd "$SCRIPT_DIR"
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" export/package.json
    log_success "Updated package.json to version $VERSION"
else
    VERSION=$(grep '"version"' "$SCRIPT_DIR/package.json" | sed 's/.*"version": "\([^"]*\)".*/\1/')
    log_step "Using current version: $VERSION"
fi

# Verify directories exist
log_step "Verifying directories..."
[ -d "$WEBSITE_DIR" ] || { log_error "Website directory not found: $WEBSITE_DIR"; exit 1; }
[ -d "$KDRIVE_DIR" ] || { log_error "kDrive directory not found: $KDRIVE_DIR"; exit 1; }
log_success "All directories found"

# Build binaries
log_step "Building binaries for all platforms..."
cd "$SCRIPT_DIR"

echo "  Building supertag (macOS ARM64)..."
bun build src/index.ts --compile --outfile supertag

echo "  Building supertag-darwin-x64..."
bun build src/index.ts --compile --target=bun-darwin-x64 --outfile supertag-darwin-x64

echo "  Building supertag-linux-x64..."
bun build src/index.ts --compile --target=bun-linux-x64 --outfile supertag-linux-x64

echo "  Building supertag-windows-x64..."
bun build src/index.ts --compile --target=bun-windows-x64 --outfile supertag-windows-x64.exe

# Note: Export tool uses Playwright which requires external bundling
# The --external flags prevent bundling modules that need runtime installation
EXTERNAL_FLAGS="--external playwright --external playwright-core --external electron --external chromium-bidi"

echo "  Building supertag-export (macOS ARM64)..."
bun build export/index.ts --compile $EXTERNAL_FLAGS --outfile export/supertag-export

echo "  Building supertag-export-darwin-x64..."
bun build export/index.ts --compile --target=bun-darwin-x64 $EXTERNAL_FLAGS --outfile export/supertag-export-darwin-x64

echo "  Building supertag-export-linux-x64..."
bun build export/index.ts --compile --target=bun-linux-x64 $EXTERNAL_FLAGS --outfile export/supertag-export-linux-x64

echo "  Building supertag-export-windows-x64..."
bun build export/index.ts --compile --target=bun-windows-x64 $EXTERNAL_FLAGS --outfile export/supertag-export-windows-x64.exe

# MCP Server builds
echo "  Building supertag-mcp (macOS ARM64)..."
bun build src/mcp/index.ts --compile --outfile supertag-mcp

echo "  Building supertag-mcp-darwin-x64..."
bun build src/mcp/index.ts --compile --target=bun-darwin-x64 --outfile supertag-mcp-darwin-x64

echo "  Building supertag-mcp-linux-x64..."
bun build src/mcp/index.ts --compile --target=bun-linux-x64 --outfile supertag-mcp-linux-x64

echo "  Building supertag-mcp-windows-x64..."
bun build src/mcp/index.ts --compile --target=bun-windows-x64 --outfile supertag-mcp-windows-x64.exe

log_success "All binaries built"

# Create distribution directories and zip files
log_step "Creating distribution packages..."

# Create temp directory for packaging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# macOS ARM64
DIST_NAME="supertag-cli-macos-arm64"
mkdir -p "$TEMP_DIR/$DIST_NAME/export"
mkdir -p "$TEMP_DIR/$DIST_NAME/mcp"
cp supertag "$TEMP_DIR/$DIST_NAME/"
cp export/supertag-export "$TEMP_DIR/$DIST_NAME/export/"
cp export/package.json "$TEMP_DIR/$DIST_NAME/export/"
cp supertag-mcp "$TEMP_DIR/$DIST_NAME/mcp/"
cp README.md "$TEMP_DIR/$DIST_NAME/"
cd "$TEMP_DIR"
zip -r "supertag-cli-v${VERSION}-macos-arm64.zip" "$DIST_NAME"
log_success "Created supertag-cli-v${VERSION}-macos-arm64.zip"

# macOS x64
DIST_NAME="supertag-cli-macos-x64"
mkdir -p "$TEMP_DIR/$DIST_NAME/export"
mkdir -p "$TEMP_DIR/$DIST_NAME/mcp"
cp "$SCRIPT_DIR/supertag-darwin-x64" "$TEMP_DIR/$DIST_NAME/supertag"
cp "$SCRIPT_DIR/export/supertag-export-darwin-x64" "$TEMP_DIR/$DIST_NAME/export/supertag-export"
cp "$SCRIPT_DIR/export/package.json" "$TEMP_DIR/$DIST_NAME/export/"
cp "$SCRIPT_DIR/supertag-mcp-darwin-x64" "$TEMP_DIR/$DIST_NAME/mcp/supertag-mcp"
cp "$SCRIPT_DIR/README.md" "$TEMP_DIR/$DIST_NAME/"
zip -r "supertag-cli-v${VERSION}-macos-x64.zip" "$DIST_NAME"
log_success "Created supertag-cli-v${VERSION}-macos-x64.zip"

# Linux x64
DIST_NAME="supertag-cli-linux-x64"
mkdir -p "$TEMP_DIR/$DIST_NAME/export"
mkdir -p "$TEMP_DIR/$DIST_NAME/mcp"
cp "$SCRIPT_DIR/supertag-linux-x64" "$TEMP_DIR/$DIST_NAME/supertag"
cp "$SCRIPT_DIR/export/supertag-export-linux-x64" "$TEMP_DIR/$DIST_NAME/export/supertag-export"
cp "$SCRIPT_DIR/export/package.json" "$TEMP_DIR/$DIST_NAME/export/"
cp "$SCRIPT_DIR/supertag-mcp-linux-x64" "$TEMP_DIR/$DIST_NAME/mcp/supertag-mcp"
cp "$SCRIPT_DIR/README.md" "$TEMP_DIR/$DIST_NAME/"
zip -r "supertag-cli-v${VERSION}-linux-x64.zip" "$DIST_NAME"
log_success "Created supertag-cli-v${VERSION}-linux-x64.zip"

# Windows x64
DIST_NAME="supertag-cli-windows-x64"
mkdir -p "$TEMP_DIR/$DIST_NAME/export"
mkdir -p "$TEMP_DIR/$DIST_NAME/mcp"
cp "$SCRIPT_DIR/supertag-windows-x64.exe" "$TEMP_DIR/$DIST_NAME/supertag.exe"
cp "$SCRIPT_DIR/export/supertag-export-windows-x64.exe" "$TEMP_DIR/$DIST_NAME/export/supertag-export.exe"
cp "$SCRIPT_DIR/export/package.json" "$TEMP_DIR/$DIST_NAME/export/"
cp "$SCRIPT_DIR/supertag-mcp-windows-x64.exe" "$TEMP_DIR/$DIST_NAME/mcp/supertag-mcp.exe"
cp "$SCRIPT_DIR/README.md" "$TEMP_DIR/$DIST_NAME/"
zip -r "supertag-cli-v${VERSION}-windows-x64.zip" "$DIST_NAME"
log_success "Created supertag-cli-v${VERSION}-windows-x64.zip"

# Copy to kDrive
log_step "Copying to kDrive..."
cp "$TEMP_DIR/supertag-cli-v${VERSION}-macos-arm64.zip" "$KDRIVE_DIR/"
cp "$TEMP_DIR/supertag-cli-v${VERSION}-macos-x64.zip" "$KDRIVE_DIR/"
cp "$TEMP_DIR/supertag-cli-v${VERSION}-linux-x64.zip" "$KDRIVE_DIR/"
cp "$TEMP_DIR/supertag-cli-v${VERSION}-windows-x64.zip" "$KDRIVE_DIR/"
log_success "Distribution files copied to $KDRIVE_DIR"

# Update website guide
log_step "Updating website guide..."
cd "$WEBSITE_DIR/tana"
bun run build-guide.ts
log_success "Guide rebuilt: $WEBSITE_DIR/tana/guide.html"

# Build the website (Vite)
log_step "Building website with Vite..."
cd "$WEBSITE_DIR"
npm run build
log_success "Website built to dist/"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release v${VERSION} prepared successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Distribution files in kDrive:"
ls -lh "$KDRIVE_DIR"/supertag-cli-v${VERSION}*.zip
echo ""

# Handle git operations
if [ "$DO_PUSH" = true ]; then
    log_step "Committing and pushing changes..."

    # Commit tana skill changes (only release.sh if modified)
    cd "$SCRIPT_DIR"
    if [ -n "$(git status --porcelain release.sh package.json export/package.json 2>/dev/null)" ]; then
        git add release.sh package.json export/package.json
        git commit -m "release: v${VERSION}" || true
    fi
    git push
    log_success "Pushed tana skill repo"

    # Commit and push website changes
    cd "$WEBSITE_DIR"
    if [ -n "$(git status --porcelain tana/ 2>/dev/null)" ]; then
        git add tana/
        git commit -m "docs: update Supertag CLI guide for v${VERSION}"
    fi
    git push
    log_success "Pushed website repo"

    echo ""
    echo -e "${GREEN}All changes committed and pushed!${NC}"
    echo ""
    echo "Remaining manual steps:"
    echo "  - Tag release on GitHub: git tag v\${VERSION} && git push --tags"
else
    # Git commands for manual execution
    echo -e "${YELLOW}Manual steps remaining:${NC}"
    echo ""
    echo "1. Review and commit tana skill changes:"
    echo "   cd $SCRIPT_DIR"
    echo "   git add -A"
    echo "   git status"
    echo "   git commit -m \"release: v${VERSION}\""
    echo ""
    echo "2. Review and commit website changes:"
    echo "   cd $WEBSITE_DIR"
    echo "   git add -A"
    echo "   git status"
    echo "   git commit -m \"docs: update Supertag CLI guide for v${VERSION}\""
    echo ""
    echo "3. Push both repositories:"
    echo "   cd $SCRIPT_DIR && git push"
    echo "   cd $WEBSITE_DIR && git push"
    echo ""
    echo "4. Tag release on GitHub:"
    echo "   git tag v${VERSION} && git push --tags"
    echo ""
    echo "Or re-run with --push to do this automatically:"
    echo "   ./release.sh --push"
fi
echo ""
