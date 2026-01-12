// .claude/tools/config/lib/preference-manager.ts
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Testability: Allow override via env var for CI/testing
function getPreferencesDir(): string {
  return process.env.CLAUDE_PREFERENCES_DIR
    ?? path.join(os.homedir(), '.claude-preferences');
}

// Result type for explicit error handling (not null ambiguity)
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type LoadError =
  | { code: 'NOT_FOUND' }
  | { code: 'CORRUPTED'; message: string }
  | { code: 'PERMISSION_DENIED'; message: string }
  | { code: 'SCHEMA_INVALID'; message: string };

export class PreferenceManager {
  private preferencesPath: string;

  constructor(service: string) {
    this.preferencesPath = path.join(getPreferencesDir(), `${service}.json`);
  }

  /**
   * Loads and validates preferences from disk using the provided Zod schema.
   *
   * @param schema - Zod schema for validation and type inference
   * @returns Result containing validated preferences or LoadError
   * @throws Never throws - all errors are returned as Result.error with explicit error codes
   *
   * @example
   * ```typescript
   * const manager = new PreferenceManager('linear');
   * const schema = z.object({ teamId: z.string(), apiKey: z.string() });
   *
   * const result = await manager.load(schema);
   * if (result.ok) {
   *   console.log('Team ID:', result.value.teamId);
   * } else {
   *   switch (result.error.code) {
   *     case 'NOT_FOUND':
   *       console.log('No preferences found');
   *       break;
   *     case 'CORRUPTED':
   *       console.error('Malformed JSON:', result.error.message);
   *       break;
   *     case 'SCHEMA_INVALID':
   *       console.error('Schema validation failed:', result.error.message);
   *       break;
   *     case 'PERMISSION_DENIED':
   *       console.error('Permission denied:', result.error.message);
   *       break;
   *   }
   * }
   * ```
   */
  async load<T extends z.ZodType<any, any, any>>(
    schema: T
  ): Promise<Result<z.infer<T>, LoadError>> {
    try {
      const content = await fs.readFile(this.preferencesPath, 'utf-8');
      const parsed = JSON.parse(content);
      const validated = schema.parse(parsed);
      return { ok: true, value: validated };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if ('code' in error && error.code === 'ENOENT') {
          return { ok: false, error: { code: 'NOT_FOUND' } };
        }
        if ('code' in error && error.code === 'EACCES') {
          return { ok: false, error: { code: 'PERMISSION_DENIED', message: error.message } };
        }
        if (error instanceof SyntaxError) {
          return { ok: false, error: { code: 'CORRUPTED', message: error.message } };
        }
        if (error instanceof z.ZodError) {
          return { ok: false, error: { code: 'SCHEMA_INVALID', message: error.message } };
        }
      }
      return { ok: false, error: { code: 'CORRUPTED', message: String(error) } };
    }
  }

  /**
   * Atomically saves validated preferences to disk with secure file permissions.
   *
   * Uses atomic write pattern (write to temp file, then rename) to prevent
   * partial writes and race conditions. Creates preferences directory if it
   * doesn't exist with 0o700 permissions. File is written with 0o600 permissions
   * (owner read/write only).
   *
   * @param data - Preferences data to save
   * @param schema - Zod schema for validation before saving
   * @returns Result indicating success or error
   * @throws Never throws - all errors are returned as Result.error
   *
   * @example
   * ```typescript
   * const manager = new PreferenceManager('linear');
   * const schema = z.object({ teamId: z.string(), apiKey: z.string() });
   * const data = { teamId: 'team-123', apiKey: 'secret-key' };
   *
   * const result = await manager.save(data, schema);
   * if (result.ok) {
   *   console.log('Preferences saved successfully');
   * } else {
   *   console.error('Failed to save:', result.error.message);
   * }
   * ```
   */
  async save<T extends z.ZodType<any, any, any>>(
    data: z.infer<T>,
    schema: T
  ): Promise<Result<void, Error>> {
    try {
      schema.parse(data);
      await fs.mkdir(getPreferencesDir(), { recursive: true, mode: 0o700 });
      const tempPath = `${this.preferencesPath}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), { mode: 0o600 });
      await fs.rename(tempPath, this.preferencesPath);
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  /**
   * Deletes the preferences file from disk.
   *
   * Returns true if file was deleted, false if file didn't exist.
   * This is NOT an error case - deleting a non-existent file is considered
   * a successful no-op.
   *
   * @returns Result containing boolean (true if deleted, false if didn't exist) or Error
   * @throws Never throws - all errors are returned as Result.error
   *
   * @example
   * ```typescript
   * const manager = new PreferenceManager('linear');
   *
   * const result = await manager.delete();
   * if (result.ok) {
   *   if (result.value) {
   *     console.log('Preferences file deleted');
   *   } else {
   *     console.log('Preferences file did not exist');
   *   }
   * } else {
   *   console.error('Failed to delete:', result.error.message);
   * }
   * ```
   */
  async delete(): Promise<Result<boolean, Error>> {
    try {
      await fs.unlink(this.preferencesPath);
      return { ok: true, value: true };
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return { ok: true, value: false };
      }
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
