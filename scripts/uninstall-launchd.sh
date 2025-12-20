#!/bin/bash

##
# Uninstall Tana Webhook Server launchd service
##

set -e

PLIST_NAME="com.pai.tana-webhook.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🛑 Uninstalling Tana Webhook Server launchd service"
echo ""

if [ ! -f "$PLIST_PATH" ]; then
    echo "❌ Service not installed (plist not found)"
    exit 1
fi

# Stop service
if launchctl list | grep -q "com.pai.tana-webhook"; then
    echo "⏹️  Stopping service..."
    launchctl unload "$PLIST_PATH"
    echo "✅ Service stopped"
else
    echo "⚠️  Service was not running"
fi

# Remove plist
echo "🗑️  Removing plist..."
rm "$PLIST_PATH"

echo ""
echo "✅ Service uninstalled successfully"
echo ""
echo "💡 Note: Log files are preserved in $(pwd)/logs/"
echo "   To remove logs: rm -rf $(pwd)/logs/"
