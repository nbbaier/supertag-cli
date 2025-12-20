#!/bin/bash
set -e

EXPORT_DIR=~/Documents/Tana-Export
DB_PATH=./tana-index.db

echo "================================"
echo "Testing Differential Sync"
echo "================================"

# Test 1: Sequential imports (Dec 1 -> Dec 2 -> Dec 3)
echo ""
echo "TEST 1: Sequential Imports"
echo "================================"

rm -f $DB_PATH
echo "✓ Database cleared"

echo ""
echo "Importing Dec 1..."
bun src/cli/tana-sync.ts index --export-dir $EXPORT_DIR --db-path $DB_PATH 2>&1 | grep -E "(Indexed|Changes|Total Nodes|Duration)"

# Rename export to force specific file
mv $EXPORT_DIR/M9rkJkwuED@2025-12-02.json $EXPORT_DIR/M9rkJkwuED@2025-12-02.json.tmp
mv $EXPORT_DIR/M9rkJkwuED@2025-12-03.json $EXPORT_DIR/M9rkJkwuED@2025-12-03.json.tmp

echo ""
echo "Importing Dec 2..."
mv $EXPORT_DIR/M9rkJkwuED@2025-12-02.json.tmp $EXPORT_DIR/M9rkJkwuED@2025-12-02.json
bun src/cli/tana-sync.ts index --export-dir $EXPORT_DIR --db-path $DB_PATH 2>&1 | grep -E "(Indexed|Changes|Total Nodes|Duration)"

echo ""
echo "Importing Dec 3..."
mv $EXPORT_DIR/M9rkJkwuED@2025-12-03.json.tmp $EXPORT_DIR/M9rkJkwuED@2025-12-03.json
bun src/cli/tana-sync.ts index --export-dir $EXPORT_DIR --db-path $DB_PATH 2>&1 | grep -E "(Indexed|Changes|Total Nodes|Duration)"

# Capture final stats from sequential import
echo ""
echo "Final stats from sequential import:"
sqlite3 $DB_PATH "SELECT COUNT(*) as total_nodes FROM nodes"
sqlite3 $DB_PATH "SELECT COUNT(*) as total_supertags FROM supertags"
sqlite3 $DB_PATH "SELECT COUNT(*) as total_fields FROM fields"
sqlite3 $DB_PATH 'SELECT COUNT(*) as total_refs FROM "references"'
sqlite3 $DB_PATH "SELECT COUNT(*) as total_tag_apps FROM tag_applications"

# Calculate checksum of all node IDs (sorted)
echo ""
echo "Node ID checksum (sequential):"
NODE_CHECKSUM_SEQ=$(sqlite3 $DB_PATH "SELECT id FROM nodes ORDER BY id" | md5)
echo $NODE_CHECKSUM_SEQ

# Save database
mv $DB_PATH ${DB_PATH}.sequential

echo ""
echo "================================"
echo "TEST 2: Single Import (Dec 3 only)"
echo "================================"

rm -f $DB_PATH
echo "✓ Database cleared"

echo ""
echo "Importing Dec 3 only..."
bun src/cli/tana-sync.ts index --export-dir $EXPORT_DIR --db-path $DB_PATH 2>&1 | grep -E "(Indexed|Changes|Total Nodes|Duration)"

# Capture final stats from single import
echo ""
echo "Final stats from single import:"
sqlite3 $DB_PATH "SELECT COUNT(*) as total_nodes FROM nodes"
sqlite3 $DB_PATH "SELECT COUNT(*) as total_supertags FROM supertags"
sqlite3 $DB_PATH "SELECT COUNT(*) as total_fields FROM fields"
sqlite3 $DB_PATH 'SELECT COUNT(*) as total_refs FROM "references"'
sqlite3 $DB_PATH "SELECT COUNT(*) as total_tag_apps FROM tag_applications"

# Calculate checksum of all node IDs (sorted)
echo ""
echo "Node ID checksum (single):"
NODE_CHECKSUM_SINGLE=$(sqlite3 $DB_PATH "SELECT id FROM nodes ORDER BY id" | md5)
echo $NODE_CHECKSUM_SINGLE

echo ""
echo "================================"
echo "COMPARISON"
echo "================================"

if [ "$NODE_CHECKSUM_SEQ" = "$NODE_CHECKSUM_SINGLE" ]; then
  echo "✅ SUCCESS: Sequential and single import produce identical results!"
else
  echo "❌ FAILURE: Results differ!"
fi

echo ""
echo "Databases saved as:"
echo "  - tana-index.db (single import)"
echo "  - tana-index.db.sequential (sequential imports)"
