/**
 * Test Utilities
 *
 * Shared helper functions for tests
 */

import { unlinkSync, existsSync } from "fs";

/**
 * Clean up SQLite database and its companion files (WAL, SHM)
 *
 * SQLite in WAL mode creates additional files:
 * - .db-wal (Write-Ahead Log)
 * - .db-shm (Shared Memory)
 *
 * These must be cleaned up along with the main .db file to avoid
 * littering the test directory.
 *
 * @param dbPath - Path to the SQLite database file
 */
export function cleanupSqliteDatabase(dbPath: string): void {
  const filesToDelete = [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`,
  ];

  for (const file of filesToDelete) {
    try {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    } catch {
      // Ignore errors - file may not exist or be locked
    }
  }
}

/**
 * Generate a unique database path for tests to avoid conflicts
 * when tests run in parallel or random order.
 *
 * @param testName - Name to include in the path for debugging
 * @returns Unique database path
 */
export function getUniqueTestDbPath(testName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `/tmp/supertag-test-${testName}-${timestamp}-${random}.db`;
}

/**
 * Get a unique port for test servers to avoid port conflicts.
 *
 * @returns Random port in range 10000-20000
 */
export function getUniqueTestPort(): number {
  return 10000 + Math.floor(Math.random() * 10000);
}
