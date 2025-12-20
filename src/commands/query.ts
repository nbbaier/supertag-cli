/**
 * Query Command Group - Query indexed Tana data
 *
 * Consolidates all tana-query functionality into main tana CLI
 * Supports multi-workspace configuration via -w/--workspace option
 */

import { Command } from "commander";
import { TanaQueryEngine } from "../query/tana-query-engine";
import { TanaIndexer } from "../db/indexer";
import { findMeaningfulAncestor } from "../embeddings/ancestor-resolution";
import { existsSync } from "fs";
import { getDatabasePath, resolveWorkspace } from "../config/paths";
import { getConfig } from "../config/manager";

// Default database path - uses XDG with legacy fallback
const DEFAULT_DB_PATH = getDatabasePath();

/**
 * Parse a date string into UNIX timestamp (milliseconds)
 * Supports: YYYY-MM-DD, YYYY-MM-DD HH:MM, ISO 8601
 */
function parseDate(dateStr: string): number {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD or ISO 8601`);
  }
  return date.getTime();
}

/**
 * Parse date range options from CLI into timestamps
 */
function parseDateRangeOptions(options: {
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}): {
  createdAfter?: number;
  createdBefore?: number;
  updatedAfter?: number;
  updatedBefore?: number;
} {
  const result: {
    createdAfter?: number;
    createdBefore?: number;
    updatedAfter?: number;
    updatedBefore?: number;
  } = {};

  if (options.createdAfter) {
    result.createdAfter = parseDate(options.createdAfter);
  }
  if (options.createdBefore) {
    result.createdBefore = parseDate(options.createdBefore);
  }
  if (options.updatedAfter) {
    result.updatedAfter = parseDate(options.updatedAfter);
  }
  if (options.updatedBefore) {
    result.updatedBefore = parseDate(options.updatedBefore);
  }

  return result;
}

/**
 * Resolve the database path from options
 * Priority: --db-path > --workspace > default workspace > legacy
 */
function resolveDbPath(options: { dbPath?: string; workspace?: string }): string {
  // Explicit db-path takes precedence
  if (options.dbPath && options.dbPath !== DEFAULT_DB_PATH) {
    return options.dbPath;
  }

  // Resolve workspace
  const config = getConfig().getConfig();
  const ctx = resolveWorkspace(options.workspace, config);
  return ctx.dbPath;
}

function checkDb(dbPath: string, workspaceAlias?: string): boolean {
  if (!existsSync(dbPath)) {
    console.error(`❌ Database not found: ${dbPath}`);
    if (workspaceAlias) {
      console.error(`   Run 'supertag sync index --workspace ${workspaceAlias}' first`);
    } else {
      console.error(`   Run 'supertag sync index' first`);
    }
    return false;
  }
  return true;
}

export function registerQueryCommands(program: Command): void {
  const query = program
    .command("query")
    .description("Query indexed Tana data (search, tags, stats, etc.)");

  query
    .command("search <query>")
    .description("Full-text search on node names (shows ancestor context by default)")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--limit <n>", "Limit results", "20")
    .option("--json", "Output as JSON", false)
    .option("--raw", "Return raw search results without ancestor resolution", false)
    .option("-a, --ancestor", "Show nearest ancestor with supertag (enabled by default)")
    .option("--no-ancestor", "Disable ancestor resolution")
    .option("--created-after <date>", "Filter nodes created after date (YYYY-MM-DD)")
    .option("--created-before <date>", "Filter nodes created before date (YYYY-MM-DD)")
    .option("--updated-after <date>", "Filter nodes updated after date (YYYY-MM-DD)")
    .option("--updated-before <date>", "Filter nodes updated before date (YYYY-MM-DD)")
    .action(async (queryStr, options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);

      // Ensure FTS index exists
      const hasFTS = await engine.hasFTSIndex();
      if (!hasFTS) {
        console.log("🔄 Creating FTS index...");
        await engine.initializeFTS();
      }

      const dateRange = parseDateRangeOptions(options);
      const results = await engine.searchNodes(queryStr, {
        limit: parseInt(options.limit),
        ...dateRange,
      });

      // ancestor is true by default (--no-ancestor or --raw disables it)
      const includeAncestor = options.ancestor !== false && !options.raw;

      if (options.json) {
        // JSON output with optional ancestor info
        const enriched = results.map((result) => {
          const item: Record<string, unknown> = {
            id: result.id,
            name: result.name,
            rank: result.rank,
          };

          // Add tags
          if (!options.raw) {
            item.tags = engine.getNodeTags(result.id);
          }

          // Add ancestor info if enabled
          if (includeAncestor) {
            const ancestorResult = findMeaningfulAncestor(engine.rawDb, result.id);
            if (ancestorResult && ancestorResult.depth > 0) {
              item.ancestor = ancestorResult.ancestor;
              item.pathFromAncestor = ancestorResult.path;
              item.depthFromAncestor = ancestorResult.depth;
            }
          }

          return item;
        });
        console.log(JSON.stringify(enriched, null, 2));
      } else {
        // Human-readable output
        console.log(`\n🔍 Search results for "${queryStr}" (${results.length}):\n`);
        results.forEach((result, i) => {
          const tags = options.raw ? [] : engine.getNodeTags(result.id);
          const tagStr = tags.length > 0 ? ` #${tags.join(" #")}` : "";

          console.log(`${i + 1}. ${result.name || "(unnamed)"}${tagStr}`);
          console.log(`   ID: ${result.id}`);
          console.log(`   Rank: ${result.rank.toFixed(2)}`);

          // Show ancestor context if available
          if (includeAncestor) {
            const ancestorResult = findMeaningfulAncestor(engine.rawDb, result.id);
            if (ancestorResult && ancestorResult.depth > 0) {
              const ancestorTags = ancestorResult.ancestor.tags.map(t => `#${t}`).join(" ");
              console.log(`   📂 ${ancestorResult.ancestor.name} ${ancestorTags}`);
            }
          }
          console.log();
        });
      }

      engine.close();
    });

  query
    .command("nodes")
    .description("Find nodes by criteria")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--name <name>", "Exact name match")
    .option("--pattern <pattern>", "Name pattern (SQL LIKE)")
    .option("--tag <tag>", "Filter by supertag")
    .option("--limit <n>", "Limit results", "20")
    .option("--json", "Output as JSON", false)
    .option("--created-after <date>", "Filter nodes created after date (YYYY-MM-DD)")
    .option("--created-before <date>", "Filter nodes created before date (YYYY-MM-DD)")
    .option("--updated-after <date>", "Filter nodes updated after date (YYYY-MM-DD)")
    .option("--updated-before <date>", "Filter nodes updated before date (YYYY-MM-DD)")
    .action(async (options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);
      const dateRange = parseDateRangeOptions(options);

      const results = await engine.findNodes({
        name: options.name,
        namePattern: options.pattern,
        supertag: options.tag,
        limit: parseInt(options.limit),
        ...dateRange,
      });

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(`\n📄 Found ${results.length} nodes:\n`);
        results.forEach((node, i) => {
          console.log(`${i + 1}. ${node.name || "(unnamed)"}`);
          console.log(`   ID: ${node.id}`);
          if (node.created) {
            console.log(`   Created: ${new Date(node.created).toLocaleDateString()}`);
          }
          console.log();
        });
      }

      engine.close();
    });

  query
    .command("tags")
    .description("List all supertags with counts")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--top <n>", "Show only top N tags", "20")
    .option("--json", "Output as JSON", false)
    .action(async (options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);
      const tags = await engine.getTopSupertags(parseInt(options.top));

      if (options.json) {
        console.log(JSON.stringify(tags, null, 2));
      } else {
        console.log(`\n🏷️  Top ${tags.length} supertags:\n`);
        tags.forEach((tag, i) => {
          console.log(`${i + 1}. ${tag.tagName} (${tag.count} nodes)`);
          console.log(`   ID: ${tag.tagId}`);
          console.log();
        });
      }

      engine.close();
    });

  query
    .command("refs <node-id>")
    .description("Show references for a node")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--json", "Output as JSON", false)
    .action(async (nodeId, options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);

      try {
        const graph = await engine.getReferenceGraph(nodeId, 1);

        if (options.json) {
          console.log(JSON.stringify(graph, null, 2));
        } else {
          console.log(`\n🔗 References for: ${graph.node.name || nodeId}\n`);

          console.log(`📤 Outbound references (${graph.outbound.length}):`);
          graph.outbound.forEach((ref) => {
            console.log(`  → ${ref.node?.name || ref.reference.toNode}`);
            console.log(`     Type: ${ref.reference.referenceType}`);
          });

          console.log(`\n📥 Inbound references (${graph.inbound.length}):`);
          graph.inbound.forEach((ref) => {
            console.log(`  ← ${ref.node?.name || ref.reference.fromNode}`);
            console.log(`     Type: ${ref.reference.referenceType}`);
          });
        }
      } catch (error) {
        console.error(`❌ Error: ${(error as Error).message}`);
        process.exit(1);
      }

      engine.close();
    });

  query
    .command("stats")
    .description("Show database statistics")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--json", "Output as JSON", false)
    .action(async (options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);
      const stats = await engine.getStatistics();

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(`\n📊 Database Statistics:\n`);
        console.log(`   Total Nodes: ${stats.totalNodes.toLocaleString()}`);
        console.log(`   Total Supertags: ${stats.totalSupertags.toLocaleString()}`);
        console.log(`   Total Fields: ${stats.totalFields.toLocaleString()}`);
        console.log(`   Total References: ${stats.totalReferences.toLocaleString()}`);
        console.log();
      }

      engine.close();
    });

  query
    .command("tagged <tagname>")
    .description("Find nodes with a specific supertag applied")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--limit <n>", "Limit results", "10")
    .option("--order-by <field>", "Order by field (created or updated)", "created")
    .option("--json", "Output as JSON", false)
    .option("-i, --case-insensitive", "Case-insensitive tag matching", false)
    .option("--created-after <date>", "Filter nodes created after date (YYYY-MM-DD)")
    .option("--created-before <date>", "Filter nodes created before date (YYYY-MM-DD)")
    .option("--updated-after <date>", "Filter nodes updated after date (YYYY-MM-DD)")
    .option("--updated-before <date>", "Filter nodes updated before date (YYYY-MM-DD)")
    .action(async (tagname, options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);
      const dateRange = parseDateRangeOptions(options);

      let results = await engine.findNodesByTag(tagname, {
        limit: parseInt(options.limit),
        orderBy: options.orderBy as "created" | "updated",
        ...dateRange,
      });

      if (results.length === 0 && options.caseInsensitive) {
        const alternates = [
          tagname.toLowerCase(),
          tagname.charAt(0).toUpperCase() + tagname.slice(1).toLowerCase(),
          tagname.toUpperCase(),
        ];
        for (const alt of alternates) {
          if (alt === tagname) continue;
          results = await engine.findNodesByTag(alt, {
            limit: parseInt(options.limit),
            orderBy: options.orderBy as "created" | "updated",
            ...dateRange,
          });
          if (results.length > 0) {
            tagname = alt;
            break;
          }
        }
      }

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(`\n🏷️  Nodes tagged with #${tagname} (${results.length}):\n`);
        results.forEach((node, i) => {
          console.log(`${i + 1}. ${node.name || "(unnamed)"}`);
          console.log(`   ID: ${node.id}`);
          if (node.created) {
            console.log(`   Created: ${new Date(node.created).toLocaleDateString()}`);
          }
          console.log();
        });

        if (results.length === 0) {
          console.log(`   No nodes found with tag "#${tagname}"`);
          console.log(`   Try --case-insensitive or check available tags with: supertag query top-tags`);
        }
      }

      engine.close();
    });

  query
    .command("top-tags")
    .description("Show most used supertags by application count")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--limit <n>", "Number of tags to show", "20")
    .option("--json", "Output as JSON", false)
    .action(async (options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);
      const tags = await engine.getTopTagsByUsage(parseInt(options.limit));

      if (options.json) {
        console.log(JSON.stringify(tags, null, 2));
      } else {
        console.log(`\n🏷️  Top ${tags.length} supertags by usage:\n`);
        tags.forEach((tag, i) => {
          console.log(`${i + 1}. #${tag.tagName} (${tag.count} nodes)`);
        });
        console.log();
      }

      engine.close();
    });

  query
    .command("recent")
    .description("Show recently updated nodes")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("--db-path <path>", "Database path (overrides workspace)")
    .option("--limit <n>", "Number of nodes", "10")
    .option("--json", "Output as JSON", false)
    .option("--created-after <date>", "Filter nodes created after date (YYYY-MM-DD)")
    .option("--created-before <date>", "Filter nodes created before date (YYYY-MM-DD)")
    .option("--updated-after <date>", "Filter nodes updated after date (YYYY-MM-DD)")
    .option("--updated-before <date>", "Filter nodes updated before date (YYYY-MM-DD)")
    .action(async (options) => {
      const dbPath = resolveDbPath(options);
      if (!checkDb(dbPath, options.workspace)) process.exit(1);

      const engine = new TanaQueryEngine(dbPath);
      const dateRange = parseDateRangeOptions(options);
      const results = await engine.findRecentlyUpdated(parseInt(options.limit), dateRange);

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(`\n⏱️  Recently updated (${results.length}):\n`);
        results.forEach((node, i) => {
          console.log(`${i + 1}. ${node.name || "(unnamed)"}`);
          console.log(`   ID: ${node.id}`);
          if (node.updated) {
            console.log(`   Updated: ${new Date(node.updated).toLocaleString()}`);
          }
          console.log();
        });
      }

      engine.close();
    });
}
