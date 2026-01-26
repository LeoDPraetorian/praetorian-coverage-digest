import { z } from 'zod';
import { execOp, OpClientError } from './lib/op-client.js';
import { getVaultName } from './lib/config.js';

export const listItemsInput = z.object({});

export const listItemsOutput = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    fields: z.array(z.string()),
  })
);

export type ListItemsOutput = z.infer<typeof listItemsOutput>;

/**
 * List all items in the configured 1Password vault.
 * Requires biometric authentication (Touch ID/YubiKey) for each session.
 *
 * @example
 * ```typescript
 * const items = await listItems.execute({});
 * // [{ id: '...', name: 'GitHub Token', category: 'LOGIN', fields: ['password', 'username'] }]
 * ```
 */
export const listItems = {
  name: '1password.list-items',
  description: 'List all items in the configured vault',
  parameters: listItemsInput,

  async execute(): Promise<ListItemsOutput> {
    const vault = getVaultName();
    const output = await execOp(['item', 'list', '--vault', `"${vault}"`]);

    const items = JSON.parse(output);

    // Transform to include field names
    const enriched = items.map((item: any) => ({
      id: item.id,
      name: item.title,
      category: item.category,
      fields: extractFieldNames(item.fields || []),
    }));

    return listItemsOutput.parse(enriched);
  },
};

function extractFieldNames(fields: any[]): string[] {
  return fields
    .map((f) => f.label || f.id)
    .filter((name): name is string => Boolean(name));
}
