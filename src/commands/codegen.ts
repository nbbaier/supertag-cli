/**
 * T-3.1: Codegen CLI Command
 *
 * Generate Effect Schema classes from supertag definitions.
 */

import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { getDatabasePath, createSimpleLogger } from "../config/paths";
import { resolveWorkspaceContext } from "../config/workspace-resolver";
import { withDatabase } from "../db/with-database";
import { generateSchemas } from "../codegen/index";
import { UnifiedSchemaService } from "../services/unified-schema-service";
import type { CodegenOptions, GenerationResult } from "../codegen/types";

const logger = createSimpleLogger("codegen");

/**
 * Options passed to codegenCommand
 */
export interface CodegenCommandOptions {
  output: string;
  format: "effect";
  workspace?: string;
  tags?: string[];
  optional: "option" | "undefined" | "nullable";
  naming: "camelCase" | "PascalCase" | "snake_case";
  split: boolean;
  dryRun: boolean;
  noMetadata: boolean;
}

/**
 * Execute codegen command.
 *
 * @param options - Command options
 * @param dbPathOverride - Optional database path override (for testing)
 * @returns Generation result
 */
export async function codegenCommand(
  options: CodegenCommandOptions,
  dbPathOverride?: string
): Promise<GenerationResult> {
  // Resolve database path
  let dbPath: string;
  if (dbPathOverride) {
    dbPath = dbPathOverride;
  } else {
    const ws = resolveWorkspaceContext({
      workspace: options.workspace,
      requireDatabase: false,
    });
    dbPath = ws.dbPath;
  }

  if (!existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}\nRun 'supertag sync index' first`);
  }

  // Build codegen options
  const codegenOptions: CodegenOptions = {
    outputPath: resolve(options.output),
    format: options.format,
    tags: options.tags,
    optionalStrategy: options.optional,
    naming: options.naming,
    includeMetadata: !options.noMetadata,
    split: options.split,
    includeInherited: true,
  };

  // Generate schemas within database context
  const result = await withDatabase({ dbPath, readonly: true }, async (ctx) => {
    return generateSchemas(ctx.db, codegenOptions);
  });

  // Write files outside database context (doesn't need db)
  if (!options.dryRun) {
    for (const file of result.files) {
      const dir = dirname(file.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(file.path, file.content);
      logger.info(`Generated: ${file.path}`);
    }

    logger.info("");
    logger.info(`✅ Generated ${result.stats.filesGenerated} file(s)`);
    logger.info(`   ${result.stats.supertagsProcessed} supertags`);
    logger.info(`   ${result.stats.fieldsProcessed} fields`);
  } else {
    logger.info("Dry-run mode - no files written");
    logger.info("");
    logger.info(`Would generate ${result.stats.filesGenerated} file(s):`);
    for (const file of result.files) {
      logger.info(`  - ${file.path}`);
    }
    logger.info(`   ${result.stats.supertagsProcessed} supertags`);
    logger.info(`   ${result.stats.fieldsProcessed} fields`);
  }

  return result;
}

/**
 * Create the codegen CLI command
 */
export function createCodegenCommand(): Command {
  const codegen = new Command("codegen")
    .description("Generate Effect Schema classes from supertags");

  codegen
    .command("generate")
    .description("Generate Effect Schema classes from supertag definitions")
    .requiredOption("-o, --output <path>", "Output file path (e.g., ./generated/schemas.ts)")
    .option("-w, --workspace <alias>", "Workspace alias or nodeid")
    .option("-t, --tags <tags...>", "Filter to specific supertags")
    .option("-f, --format <format>", "Output format (effect)", "effect")
    .option("--optional <strategy>", "Optional field strategy: option, undefined, nullable", "option")
    .option("--naming <convention>", "Naming convention: camelCase, PascalCase, snake_case", "camelCase")
    .option("--split", "Generate separate file per supertag", false)
    .option("--no-metadata", "Exclude metadata comments")
    .option("-d, --dry-run", "Preview without writing files", false)
    .action(async (options) => {
      try {
        await codegenCommand({
          output: options.output,
          format: options.format as "effect",
          workspace: options.workspace,
          tags: options.tags,
          optional: options.optional as "option" | "undefined" | "nullable",
          naming: options.naming as "camelCase" | "PascalCase" | "snake_case",
          split: options.split,
          dryRun: options.dryRun,
          noMetadata: !options.metadata, // Commander converts --no-metadata to metadata=false
        });
      } catch (error) {
        logger.error((error as Error).message);
        process.exit(1);
      }
    });

  return codegen;
}
