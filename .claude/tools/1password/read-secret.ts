import { z } from 'zod';
import { execOpRaw, OpClientError } from './lib/op-client.js';
import { buildSecretReference } from './lib/config.js';

/**
 * Characters that could enable shell injection.
 * Note: Spaces are intentionally ALLOWED because 1Password item names
 * commonly contain spaces (e.g., "Context7 API Key"). The quoting in
 * buildSecretReference() handles spaces safely.
 */
const UNSAFE_CHARS = /[;&|`$()]/;

export const readSecretInput = z.object({
  item: z.string()
    .min(1, 'Item name is required')
    .refine(val => !UNSAFE_CHARS.test(val), 'Item name contains unsafe characters'),
  field: z.string()
    .default('password')
    .refine(val => !UNSAFE_CHARS.test(val), 'Field name contains unsafe characters')
});

export const readSecretOutput = z.object({
  value: z.string(),
  item: z.string(),
  field: z.string()
});

export type ReadSecretInput = z.infer<typeof readSecretInput>;
export type ReadSecretOutput = z.infer<typeof readSecretOutput>;

/**
 * Retrieve a single secret value from 1Password.
 * Requires biometric authentication (Touch ID/YubiKey) for each session.
 *
 * @example
 * ```typescript
 * const result = await readSecret.execute({ item: 'GitHub Token' });
 * // { value: 'ghp_xxx', item: 'GitHub Token', field: 'password' }
 * ```
 */
export const readSecret = {
  name: '1password.read-secret',
  description: 'Retrieve a single secret from 1Password',
  parameters: readSecretInput,

  async execute(input: ReadSecretInput): Promise<ReadSecretOutput> {
    const validated = readSecretInput.parse(input);
    const reference = buildSecretReference(validated.item, validated.field);

    // Use execOpRaw because `op read` returns plain text, not JSON
    const value = await execOpRaw(['read', reference]);

    return readSecretOutput.parse({
      value,
      item: validated.item,
      field: validated.field
    });
  }
};
