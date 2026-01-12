/**
 * Supertag CLI - Library Entry Point
 * 
 * This module provides programmatic access to supertag-cli functionality
 * for use as a library in TypeScript applications.
 * 
 * @example
 * ```typescript
 * import { TanaApiClient, withDatabase, getDatabasePath } from 'supertag-cli';
 * 
 * // Use the Tana API
 * const client = new TanaApiClient(token, endpoint);
 * await client.postNodes('INBOX', [{
 *   name: 'New task',
 *   supertags: [{ id: 'todo' }]
 * }]);
 * 
 * // Query the database
 * const dbPath = getDatabasePath();
 * withDatabase(dbPath, (db) => {
 *   const results = db.query('SELECT * FROM nodes LIMIT 10').all();
 *   console.log(results);
 * });
 * ```
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Tana node structures
  TanaNode,
  TanaApiPayload,
  TanaApiNode,
  TanaApiFieldNode,
  TanaApiDateNode,
  TanaApiReferenceNode,
  TanaApiResponse,
} from './types';

// =============================================================================
// API Client
// =============================================================================

export {
  TanaApiClient,
} from './api/client';

export {
  getGlobalRateLimiter,
  type RateLimiter,
} from './api/rateLimit';

// =============================================================================
// Database Access
// =============================================================================

export {
  // Core database functions
  withDatabase,
  withTransaction,
  withQueryEngine,
  // Workspace database functions
  withWorkspaceDatabase,
  withWorkspaceQuery,
  // Types
  type DatabaseContext,
  type QueryContext,
  type DatabaseOptions,
  type WorkspaceDatabaseOptions,
  type WorkspaceDatabaseContext,
  type WorkspaceQueryContext,
  // Error classes
  DatabaseNotFoundError,
} from './db/with-database';

export {
  // Database schema
  createDatabase,
  type TanaIndexDatabase,
} from './db/schema';

export {
  // Query builder utilities
  buildPagination,
  buildWhereClause,
  buildOrderBy,
  buildSelectQuery,
  type PaginationOptions,
  type SortOptions,
  type FilterCondition,
  type BuiltQuery,
} from './db/query-builder';

export {
  // Entity detection
  isEntity,
  isEntityById,
  findNearestEntityAncestor,
} from './db/entity';

export {
  // Database retry utilities
  withDbRetry,
  withDbRetrySync,
  enableWalMode,
  configureDbForConcurrency,
  isDbLockError,
  DB_RETRY_CONFIG,
} from './db/retry';

// =============================================================================
// Configuration
// =============================================================================

export {
  // Config manager
  ConfigManager,
  getConfig,
  DEFAULT_EMBEDDING_CONFIG,
} from './config/manager';

export {
  // Path utilities
  TANA_CONFIG_DIR,
  TANA_DATA_DIR,
  TANA_CACHE_DIR,
  TANA_LOG_DIR,
  WORKSPACES_DIR,
  BROWSER_DATA_DIR,
  DEFAULT_EXPORT_DIR,
  CONFIG_FILE,
  DATABASE_PATH,
  SCHEMA_CACHE_FILE,
  PID_FILE,
  SERVER_CONFIG_FILE,
  ensureDir,
  ensureAllDirs,
  getAllPaths,
  getDatabasePath,
  getWorkspaceDir,
  getWorkspaceDatabasePath,
  getWorkspaceSchemaPath,
  getWorkspaceExportDir,
  ensureWorkspaceDir,
  resolveWorkspace,
  getEnabledWorkspaces,
  needsMigration,
  createSimpleLogger,
  LEGACY_PATHS,
} from './config/paths';

export {
  // Workspace resolver
  resolveWorkspaceContext,
  listAvailableWorkspaces,
  getDefaultWorkspace,
  withWorkspace,
  clearWorkspaceCache,
  type ResolvedWorkspace,
  type ResolveOptions,
  WorkspaceNotFoundError,
  WorkspaceDatabaseMissingError,
} from './config/workspace-resolver';

export {
  // Batch processing
  processWorkspaces,
  resolveWorkspaceList,
  isBatchMode,
  createProgressLogger,
  type BatchOptions,
  type WorkspaceResult,
  type BatchResult,
  type ProgressCallback,
} from './config/batch-processor';

// =============================================================================
// Services
// =============================================================================

export {
  // Batch operations
  batchGetNodes,
  batchCreateNodes,
  BATCH_GET_MAX_NODES,
  BATCH_CREATE_MAX_NODES,
  BATCH_CREATE_CHUNK_SIZE,
  type BatchGetRequest,
  type BatchGetResult,
  type BatchCreateRequest,
  type BatchCreateResult,
  type BatchCreateSummary,
} from './services/batch-operations';

export {
  // Graph traversal service
  GraphTraversalService,
} from './services/graph-traversal';

export {
  // Graph traversal types
  type RelationshipType,
  type Direction,
  type RelatedQuery,
  type RelationshipMetadata,
  type RelatedNode,
  type RelatedResult,
  MAX_DEPTH,
  MAX_LIMIT,
  DEFAULT_DEPTH,
  DEFAULT_LIMIT,
  ALL_RELATIONSHIP_TYPES,
} from './types/graph';

export {
  // Node builder
  buildNodePayload,
  parseChildObject,
} from './services/node-builder';

// =============================================================================
// Utilities
// =============================================================================

export {
  // Error classes
  TanaError,
  ApiError,
  ValidationError,
  ParseError,
  ConfigError,
  RateLimitError,
  formatErrorMessage,
} from './utils/errors';

export {
  // Structured errors (spec 073)
  StructuredError,
  type ErrorCode,
  type ErrorDetails,
  type RecoveryInfo,
} from './utils/structured-errors';

export {
  // Error formatters
  formatErrorForCli,
  formatErrorForMcp,
} from './utils/error-formatter';

export {
  // Debug utilities
  isDebugMode,
  setDebugMode,
  formatDebugError,
} from './utils/debug';

export {
  // Logger
  createLogger,
  configureGlobalLogger,
  getGlobalLogger,
  hasGlobalLogger,
  type Logger,
  type LogLevel,
  type LoggerConfig,
} from './utils/logger';

export {
  // Output formatters
  formatAsTable,
  formatAsJson,
  formatAsCsv,
  formatAsIds,
  formatAsMinimal,
  formatAsJsonl,
  type OutputFormat,
  type FormattableData,
} from './utils/output-formatter';

export {
  // Output options
  resolveOutputOptions,
  resolveOutputMode,
  type OutputOptions,
  type OutputMode,
} from './utils/output-options';

// =============================================================================
// Version
// =============================================================================

export { VERSION } from './version';
