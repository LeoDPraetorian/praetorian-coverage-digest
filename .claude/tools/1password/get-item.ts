import { z } from 'zod';
import { execOp, OpClientError } from './lib/op-client.js';
import { getVaultName } from './lib/config.js';

/**
 * Characters that could enable shell injection.
 * Note: Spaces are intentionally ALLOWED because 1Password item names
 * commonly contain spaces (e.g., "Context7 API Key"). The quoting in
 * CLI args handles spaces safely.
 */
const UNSAFE_CHARS = /[;&|`$()]/;

export const getItemInput = z.object({
  item: z.string()
    .min(1, 'Item name is required')
    .refine(val => !UNSAFE_CHARS.test(val), 'Item name contains unsafe characters')
});

export const getItemOutput = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  fields: z.record(z.string())
});

export type GetItemInput = z.infer<typeof getItemInput>;
export type GetItemOutput = z.infer<typeof getItemOutput>;

/**
 * Get full details of a 1Password item including all fields and values.
 * Requires biometric authentication (Touch ID/YubiKey) for each session.
 * Uses --reveal flag to expose concealed fields.
 *
 * @example
 * ```typescript
 * const item = await getItem.execute({ item: 'GitHub Token' });
 * // { id: '...', name: 'GitHub Token', category: 'LOGIN', fields: { username: 'user', password: 'ghp_xxx' } }
 * ```
 */
export const getItem = {
  name: '1password.get-item',
  description: 'Get full details of a 1Password item',
  parameters: getItemInput,

  async execute(input: GetItemInput): Promise<GetItemOutput> {
    const validated = getItemInput.parse(input);
    const vault = getVaultName();

    const output = await execOp([
      'item', 'get', `"${validated.item}"`,
      '--vault', `"${vault}"`,
      '--reveal'
    ]);

    const item = JSON.parse(output);

    const fieldsMap: Record<string, string> = {};
    (item.fields || []).forEach((field: any) => {
      if (field.label && field.value !== undefined) {
        fieldsMap[field.label] = field.value;
      }
    });

    return getItemOutput.parse({
      id: item.id,
      name: item.title,
      category: item.category,
      fields: fieldsMap
    });
  }
};
