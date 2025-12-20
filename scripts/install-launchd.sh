#!/bin/bash

##
# Install Tana Webhook Server as macOS launchd service
#
# This script installs the webhook server to start automatically on boot
# and restart on crashes.
##

set -e

PLIST_NAME="com.pai.tana-webhook.plist"
PLIST_SOURCE="$(pwd)/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🚀 Installing Tana Webhook Server as launchd service"
echo ""

# Check if plist file exists
if [ ! -f "$PLIST_SOURCE" ]; then
    echo "❌ Error: $PLIST_NAME not found in current directory"
    exit 1
fi

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$HOME/Library/LaunchAgents"

# Stop service if already running
if launchctl list | grep -q "com.pai.tana-webhook"; then
    echo "⏹️  Stopping existing service..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Copy plist file
echo "📋 Installing plist to ~/Library/LaunchAgents/"
cp "$PLIST_SOURCE" "$PLIST_DEST"

# Load the service
echo "▶️  Loading service..."
launchctl load "$PLIST_DEST"

# Wait a moment for service to start
sleep 2

# Check if service is running
if launchctl list | grep -q "com.pai.tana-webhook"; then
    echo ""
    echo "✅ Service installed and running!"
    echo ""
    echo "📊 Service Status:"
    launchctl list | grep "com.pai.tana-webhook" || echo "   Not found in list"
    echo ""
    echo "🔗 Server Address: http://localhost:3100"
    echo ""
    echo "📝 Logs:"
    echo "   Output: $(pwd)/logs/tana-webhook.log"
    echo "   Errors: $(pwd)/logs/tana-webhook.error.log"
    echo ""
    echo "🛠️  Management Commands:"
    echo "   Check status:  launchctl list | grep tana-webhook"
    echo "   View logs:     tail -f $(pwd)/logs/tana-webhook.log"
    echo "   Restart:       launchctl kickstart -k gui/$(id -u)/com.pai.tana-webhook"
    echo "   Stop:          launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
    echo "   Uninstall:     ./uninstall-launchd.sh"
    echo ""
    echo "🧪 Test the server:"
    echo "   curl http://localhost:3100/health"
else
    echo ""
    echo "⚠️  Service installed but not running. Check logs:"
    echo "   tail $(pwd)/logs/tana-webhook.error.log"
    exit 1
fi
