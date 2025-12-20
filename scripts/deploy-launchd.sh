#!/bin/bash
# Deploy and reload LaunchAgent after code changes
#
# Usage: ./scripts/deploy-launchd.sh

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

# TOOL_NAME: The display name of your tool (used in status messages)
TOOL_NAME="tana-daily"

# PLIST_NAME: The LaunchAgent identifier (must match your .plist file)
PLIST_NAME="com.kai.tana-daily"

# PROJECT_DIR: Auto-detected from script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# PLIST_PATH: Location of your LaunchAgent plist file
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

# TEST_COMMAND: Command to test your tool (commented out as it triggers actual export)
# Uncomment if you have a safe test command
# TEST_COMMAND="./tana-daily --help"
TEST_COMMAND=""

# ============================================================================
# DEPLOYMENT LOGIC - NO CHANGES NEEDED BELOW THIS LINE
# ============================================================================

echo "🔄 Deploying ${TOOL_NAME} LaunchAgent..."
echo ""

# Check if plist exists
if [ ! -f "$PLIST_PATH" ]; then
    echo "❌ LaunchAgent plist not found at: $PLIST_PATH"
    echo "   Expected location: ~/Library/LaunchAgents/${PLIST_NAME}.plist"
    echo ""
    echo "   To install:"
    echo "   1. Create your .plist file in launchd/ directory"
    echo "   2. Run: cp launchd/${PLIST_NAME}.plist ~/Library/LaunchAgents/"
    exit 1
fi

# Unload existing agent (ignore errors if not loaded)
echo "⏹️  Unloading existing agent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Load agent
echo "▶️  Loading agent..."
launchctl load "$PLIST_PATH"

# Verify it's loaded
echo ""
echo "✅ Verifying LaunchAgent status..."

if launchctl list | grep -q "$PLIST_NAME"; then
    echo "   ✅ LaunchAgent loaded successfully"

    # Show status
    echo ""
    echo "📊 Agent Status:"
    launchctl list | grep "tana-daily"
else
    echo "   ❌ LaunchAgent failed to load"
    echo ""
    echo "   Troubleshooting:"
    echo "   - Check plist syntax: plutil -lint $PLIST_PATH"
    echo "   - View system logs: log show --predicate 'subsystem == \"com.apple.launchd\"' --last 5m"
    exit 1
fi

# Optional: Run test execution
if [ -n "$TEST_COMMAND" ]; then
    echo ""
    read -p "🧪 Run test execution? [Y/n] " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo ""
        echo "🧪 Running test: $TEST_COMMAND"
        cd "$PROJECT_DIR" && eval "$TEST_COMMAND"

        echo ""
        echo "✅ Test completed successfully!"
    else
        echo "⏭️  Skipped test execution"
    fi
fi

echo ""
echo "✨ Deployment complete!"
echo ""
echo "📝 Next scheduled run: Daily at 6:00 AM"
echo "📋 View logs:"
echo "    tail -f ~/.pai/logs/tana-daily.log"
echo ""
