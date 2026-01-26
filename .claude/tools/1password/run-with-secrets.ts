import { z } from 'zod';
import { exec } from 'child_process';
import { OpClientError } from './lib/op-client.js';

const DEFAULT_ENV_FILE = '.claude/tools/1password/secrets.env';

/**
 * Characters that could enable shell injection.
 * Note: Spaces are intentionally ALLOWED because commands and arguments
 * commonly contain spaces. The quoting in CLI args handles spaces safely.
 */
const UNSAFE_CHARS = /[;&|`$()]/;

export const runWithSecretsInput = z.object({
  command: z.string()
    .min(1, 'Command is required')
    .refine(val => !UNSAFE_CHARS.test(val), 'Command contains unsafe characters'),
  args: z.array(z.string().refine(val => !UNSAFE_CHARS.test(val), 'Argument contains unsafe characters')).default([]),
  envFile: z.string().default(DEFAULT_ENV_FILE)
});

export const runWithSecretsOutput = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number()
});

export type RunWithSecretsInput = z.infer<typeof runWithSecretsInput>;
export type RunWithSecretsOutput = z.infer<typeof runWithSecretsOutput>;

/**
 * Run a command with 1Password secrets injected as environment variables.
 * Requires biometric authentication (Touch ID/YubiKey) for each session.
 * Uses `op run` to load secrets from an env file template.
 *
 * @example
 * ```typescript
 * const result = await runWithSecrets.execute({
 *   command: 'node',
 *   args: ['scripts/deploy.js'],
 *   envFile: '.claude/tools/1password/secrets.env'
 * });
 * // { stdout: '...', stderr: '', exitCode: 0 }
 * ```
 */
export const runWithSecrets = {
  name: '1password.run-with-secrets',
  description: 'Run command with secrets injected from env file',
  parameters: runWithSecretsInput,

  async execute(input: RunWithSecretsInput): Promise<RunWithSecretsOutput> {
    const validated = runWithSecretsInput.parse(input);

    const cmdArgs = [validated.command, ...validated.args].join(' ');
    const fullCommand = `op run --env-file="${validated.envFile}" -- ${cmdArgs}`;

    return new Promise((resolve, reject) => {
      exec(fullCommand, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          // Check for biometric/auth errors
          const errorStderr = (error as any).stderr || stderr || '';
          if (errorStderr.includes('biometric') || errorStderr.includes('authentication')) {
            reject(new OpClientError(
              'Biometric authentication required. Please approve in 1Password.',
              'AUTH_REQUIRED'
            ));
            return;
          }

          // Return command output even on failure
          resolve(runWithSecretsOutput.parse({
            stdout: (error as any).stdout || stdout || '',
            stderr: (error as any).stderr || stderr || error.message,
            exitCode: (error as any).code || 1
          }));
        } else {
          resolve(runWithSecretsOutput.parse({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0
          }));
        }
      });
    });
  }
};
