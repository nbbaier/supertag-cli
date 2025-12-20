/**
 * Stdin Parser
 * Reads input from stdin for Unix-style piping
 */

/**
 * Read all input from stdin
 * @returns Promise that resolves with stdin content
 */
export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    process.stdin.on('data', (chunk) => {
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    process.stdin.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if stdin has data available
 * @returns true if stdin is not a TTY (has piped input)
 */
export function hasStdinData(): boolean {
  return !process.stdin.isTTY;
}

/**
 * Read from stdin with timeout
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise that resolves with stdin content or rejects on timeout
 */
export async function readStdinWithTimeout(timeoutMs: number): Promise<string> {
  return Promise.race([
    readStdin(),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Stdin read timeout')), timeoutMs)
    ),
  ]);
}
