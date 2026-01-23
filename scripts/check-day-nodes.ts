#!/usr/bin/env bun
/**
 * Check Day Nodes in Tana Export
 *
 * Standalone script - no dependencies required except Bun runtime.
 * Parses a Tana JSON export file and finds the most recent #Day nodes.
 *
 * Usage:
 *   bun check-day-nodes.ts <export-file.json>
 *
 * Example:
 *   bun check-day-nodes.ts ~/Documents/Tana-Export/main/M9rkJkwuED@2026-01-12.json
 *
 * What this diagnoses:
 *   Tana generates workspace snapshots periodically, NOT on-demand.
 *   When you export, you get the most recent snapshot which may be stale.
 *   If recent Day nodes are missing, the snapshot hasn't been updated yet.
 *
 * Installation:
 *   1. Install Bun: curl -fsSL https://bun.sh/install | bash
 *   2. Save this script as check-day-nodes.ts
 *   3. Run: bun check-day-nodes.ts <your-export-file.json>
 */

import { readFileSync, statSync } from "fs";
import { basename } from "path";

interface TanaNode {
  id: string;
  props: {
    name?: string;
    docType?: string;
    _ownerId?: string;
    created?: number;
    edited?: number;
  };
}

interface TanaExport {
  storeData?: {
    docs: TanaNode[];
    metadata?: {
      lastUpdated?: string;
    };
  };
  docs?: TanaNode[];
}

function parseExport(filePath: string): { nodes: TanaNode[]; lastUpdated?: string } {
  const content = readFileSync(filePath, "utf-8");
  const data: TanaExport = JSON.parse(content);

  // Handle both wrapped (storeData.docs) and unwrapped (docs) formats
  const nodes = data.storeData?.docs || data.docs || [];
  const lastUpdated = data.storeData?.metadata?.lastUpdated;

  return { nodes, lastUpdated };
}

function findDayNodes(nodes: TanaNode[]): TanaNode[] {
  // Day nodes use various formats depending on Tana locale settings

  const dayPatterns = [
    // "January 12, 2026" format (US)
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/i,
    // "2026-01-12" format (ISO, exact)
    /^\d{4}-\d{2}-\d{2}$/,
    // "2026-01-12 - Monday" format (ISO with day name)
    /^\d{4}-\d{2}-\d{2}\s+-\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i,
    // "2026-01-12 - Montag" format (ISO with German day name)
    /^\d{4}-\d{2}-\d{2}\s+-\s+(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)$/i,
    // "12 January 2026" format (UK/EU)
    /^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i,
    // "12. Januar 2026" format (German)
    /^\d{1,2}\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4}$/i,
  ];

  return nodes.filter(node => {
    const name = node.props.name;
    if (!name) return false;
    return dayPatterns.some(pattern => pattern.test(name));
  });
}

function parseDateFromName(name: string): Date | null {
  // Try "January 12, 2026" format
  const monthDayYear = name.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/i);
  if (monthDayYear) {
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    return new Date(parseInt(monthDayYear[3]), months[monthDayYear[1].toLowerCase()], parseInt(monthDayYear[2]));
  }

  // Try "2026-01-12" or "2026-01-12 - Monday" format (extract just the date part)
  const isoDate = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return new Date(parseInt(isoDate[1]), parseInt(isoDate[2]) - 1, parseInt(isoDate[3]));
  }

  return null;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun scripts/check-day-nodes.ts <export-file.json>");
    console.error("\nExample:");
    console.error("  bun scripts/check-day-nodes.ts ~/Documents/Tana-Export/main/M9rkJkwuED@2026-01-12.json");
    console.error("\nThis script checks if your Tana export contains recent Day nodes.");
    console.error("If recent days are missing, your Tana snapshot may be stale.");
    process.exit(1);
  }

  const filePath = args[0];
  console.log(`\n=== Tana Export Day Node Analysis ===\n`);
  console.log(`File: ${basename(filePath)}`);

  try {
    // Show file modification time
    const stat = statSync(filePath);
    console.log(`File modified: ${stat.mtime.toISOString().replace("T", " ").slice(0, 19)}`);

    const { nodes, lastUpdated } = parseExport(filePath);
    console.log(`Total nodes: ${nodes.length.toLocaleString()}`);

    // Show snapshot timestamp if available
    if (lastUpdated) {
      const snapshotDate = new Date(lastUpdated);
      const now = new Date();
      const ageHours = Math.round((now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60));
      const ageDisplay = ageHours < 24 ? `${ageHours}h ago` : `${Math.round(ageHours / 24)}d ago`;
      console.log(`Snapshot timestamp: ${snapshotDate.toISOString().replace("T", " ").slice(0, 19)} (${ageDisplay})`);
      if (ageHours > 24) {
        console.log(`\n⚠️  WARNING: Snapshot is ${ageDisplay} old - may be missing recent changes!`);
      }
    }

    const dayNodes = findDayNodes(nodes);
    console.log(`Day nodes found: ${dayNodes.length}`);
    console.log("");

    if (dayNodes.length === 0) {
      console.log("\nNo day nodes found in export.");
      console.log("This could indicate the export is missing day nodes or uses a different naming format.");
      process.exit(0);
    }

    // Sort by parsed date (most recent first)
    const sortedDays = dayNodes
      .map(node => ({
        node,
        date: parseDateFromName(node.props.name!),
        name: node.props.name!,
      }))
      .filter(d => d.date !== null)
      .sort((a, b) => b.date!.getTime() - a.date!.getTime());

    console.log("\n--- Most Recent 10 Day Nodes ---\n");

    const recent = sortedDays.slice(0, 10);
    for (const day of recent) {
      const created = day.node.props.created
        ? new Date(day.node.props.created).toISOString().slice(0, 10)
        : "unknown";
      console.log(`  ${day.name.padEnd(20)} (id: ${day.node.id}, created: ${created})`);
    }

    // Check for gaps in recent days
    console.log("\n--- Gap Analysis (last 14 days) ---\n");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingDates = new Set(
      sortedDays
        .filter(d => d.date)
        .map(d => d.date!.toISOString().slice(0, 10))
    );

    const missingDays: string[] = [];
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().slice(0, 10);

      if (!existingDates.has(dateStr)) {
        missingDays.push(dateStr);
      }
    }

    if (missingDays.length === 0) {
      console.log("  All days present for the last 14 days.");
    } else {
      console.log(`  Missing days (${missingDays.length}):`);
      for (const day of missingDays) {
        console.log(`    - ${day}`);
      }
    }

    // Show oldest and newest
    if (sortedDays.length > 0) {
      console.log("\n--- Date Range ---\n");
      const oldest = sortedDays[sortedDays.length - 1];
      const newest = sortedDays[0];
      console.log(`  Oldest day: ${oldest.name}`);
      console.log(`  Newest day: ${newest.name}`);
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
