/**
 * T-1.1: Codegen Types
 *
 * Type definitions for the Effect Schema code generator.
 */

/**
 * Options for code generation.
 */
export interface CodegenOptions {
  /** Output file or directory path */
  outputPath: string;

  /** Optional filter to specific supertag names */
  tags?: string[];

  /** Output format (currently only 'effect' supported) */
  format: "effect";

  /** How to represent optional fields */
  optionalStrategy: "option" | "undefined" | "nullable";

  /** Naming convention for generated identifiers */
  naming: "camelCase" | "PascalCase" | "snake_case";

  /** Include metadata comments (tag ID, sync timestamp) */
  includeMetadata: boolean;

  /** Split output into one file per supertag */
  split: boolean;

  /** Include inherited fields from parent supertags */
  includeInherited: boolean;
}

/**
 * Represents a field in a generated schema class.
 */
export interface CodegenField {
  /** Original field name from Tana */
  originalName: string;

  /** Generated property name (valid TypeScript identifier) */
  propertyName: string;

  /** Effect Schema type expression (e.g., "Schema.String") */
  effectSchema: string;

  /** Optional JSDoc comment */
  comment?: string;

  /** Whether this field is optional */
  isOptional: boolean;
}

/**
 * Represents a supertag prepared for code generation.
 */
export interface CodegenSupertag {
  /** Tana node ID */
  id: string;

  /** Original supertag name from Tana */
  name: string;

  /** Generated class name (valid TypeScript identifier) */
  className: string;

  /** Fields to include in the generated class */
  fields: CodegenField[];

  /** Parent class name if using inheritance (via .extend()) */
  parentClassName?: string;

  /** Metadata for comments */
  metadata: {
    /** ISO timestamp of when schema was synced */
    syncedAt: string;

    /** Tana supertag node ID */
    tagId: string;
  };
}

/**
 * Represents a generated file.
 */
export interface GeneratedFile {
  /** Path where the file should be written */
  path: string;

  /** Generated TypeScript content */
  content: string;
}

/**
 * Result of a code generation run.
 */
export interface GenerationResult {
  /** Generated files */
  files: GeneratedFile[];

  /** Statistics about the generation */
  stats: {
    /** Number of supertags processed */
    supertagsProcessed: number;

    /** Total number of fields processed */
    fieldsProcessed: number;

    /** Number of files generated */
    filesGenerated: number;
  };
}
