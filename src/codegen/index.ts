/**
 * T-2.3: Codegen Orchestrator
 *
 * Main entry point for code generation. Coordinates reading from database,
 * transforming supertags, and generating output files.
 */

import { Database } from "bun:sqlite";
import { UnifiedSchemaService } from "../services/unified-schema-service";
import type { UnifiedSupertag } from "../services/unified-schema-service";
import type {
  CodegenOptions,
  CodegenSupertag,
  CodegenField,
  GenerationResult,
  GeneratedFile,
} from "./types";
import { toClassName, toPropertyName } from "./naming";
import { mapDataTypeToEffect } from "./type-mapper";
import { generateEffectFile, type GenerateFileOptions } from "./effect-generator";
import type { DataType } from "../utils/infer-data-type";

/**
 * Transform a UnifiedSupertag to CodegenSupertag.
 *
 * @param supertag - Supertag from UnifiedSchemaService
 * @param options - Generation options
 * @param idToClassName - Map from tag ID to class name (for resolving parent references)
 * @returns Transformed supertag ready for code generation
 */
export function transformSupertag(
  supertag: UnifiedSupertag,
  options: CodegenOptions,
  idToClassName?: Map<string, string>
): CodegenSupertag {
  const fields: CodegenField[] = supertag.fields.map((field) => {
    // All Tana fields are optional by nature
    const effectSchema = mapDataTypeToEffect(field.dataType as DataType | null, {
      isOptional: true,
      optionalStrategy: options.optionalStrategy,
    });

    return {
      originalName: field.name,
      propertyName: toPropertyName(field.name),
      effectSchema,
      comment: field.description || undefined,
      isOptional: true,
    };
  });

  // Resolve parent class name if this supertag extends another
  let parentClassName: string | undefined;
  if (supertag.extends && supertag.extends.length > 0 && idToClassName) {
    // Use first parent (Tana supports multiple inheritance but we only use first)
    const parentId = supertag.extends[0];
    parentClassName = idToClassName.get(parentId);
  }

  return {
    id: supertag.id,
    name: supertag.name,
    className: toClassName(supertag.name),
    parentClassName,
    fields,
    metadata: {
      syncedAt: new Date().toISOString(),
      tagId: supertag.id,
    },
  };
}

/**
 * Topologically sort supertags so parents come before children.
 *
 * @param supertags - Supertags to sort
 * @returns Sorted array with parents before children
 */
function topologicalSort(supertags: UnifiedSupertag[]): UnifiedSupertag[] {
  const idToTag = new Map<string, UnifiedSupertag>();
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  // Build graph
  for (const tag of supertags) {
    idToTag.set(tag.id, tag);
    inDegree.set(tag.id, 0);
    children.set(tag.id, []);
  }

  // Calculate in-degrees (number of parents)
  for (const tag of supertags) {
    if (tag.extends) {
      for (const parentId of tag.extends) {
        if (idToTag.has(parentId)) {
          inDegree.set(tag.id, (inDegree.get(tag.id) || 0) + 1);
          children.get(parentId)?.push(tag.id);
        }
      }
    }
  }

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  const result: UnifiedSupertag[] = [];

  // Start with tags that have no parents
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const tag = idToTag.get(id)!;
    result.push(tag);

    for (const childId of children.get(id) || []) {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    }
  }

  // If some tags weren't added (cycle), add them at the end
  for (const tag of supertags) {
    if (!result.includes(tag)) {
      result.push(tag);
    }
  }

  return result;
}

/**
 * Generate Effect Schema files from database.
 *
 * @param db - SQLite database with supertag metadata
 * @param options - Generation options
 * @returns Generation result with files and stats
 */
export async function generateSchemas(
  db: Database,
  options: CodegenOptions
): Promise<GenerationResult> {
  const service = new UnifiedSchemaService(db);

  // Get all supertags
  let supertags = service.listSupertags();

  // Filter by tags if specified
  if (options.tags && options.tags.length > 0) {
    const tagSet = new Set(options.tags.map((t) => t.toLowerCase()));
    supertags = supertags.filter((s) =>
      tagSet.has(s.name.toLowerCase()) || tagSet.has(s.normalizedName)
    );
  }

  // Topologically sort supertags so parents come before children
  supertags = topologicalSort(supertags);

  // Build ID to class name map for resolving parent references
  const idToClassName = new Map<string, string>();
  for (const tag of supertags) {
    idToClassName.set(tag.id, toClassName(tag.name));
  }

  // Transform supertags
  const codegenTags = supertags.map((s) => transformSupertag(s, options, idToClassName));

  // Count total fields
  const totalFields = codegenTags.reduce(
    (sum, tag) => sum + tag.fields.length,
    0
  );

  // Generate output
  const files: GeneratedFile[] = [];

  if (options.split) {
    // Multi-file mode: one file per supertag
    for (const tag of codegenTags) {
      // If this tag has a parent, we need to import it
      const fileOptions = tag.parentClassName
        ? { parentImports: [{ className: tag.parentClassName, from: `./${tag.parentClassName}` }] }
        : undefined;
      const content = generateEffectFile([tag], options, fileOptions);
      const fileName = `${tag.className}.ts`;
      files.push({
        path: options.outputPath.replace(/\.ts$/, `/${fileName}`),
        content,
      });
    }

    // Generate index file
    const indexContent = codegenTags
      .map((t) => `export * from "./${t.className}";`)
      .join("\n");
    files.push({
      path: options.outputPath.replace(/\.ts$/, "/index.ts"),
      content: indexContent,
    });
  } else {
    // Single file mode
    const content = generateEffectFile(codegenTags, options);
    files.push({
      path: options.outputPath,
      content,
    });
  }

  return {
    files,
    stats: {
      supertagsProcessed: codegenTags.length,
      fieldsProcessed: totalFields,
      filesGenerated: files.length,
    },
  };
}
