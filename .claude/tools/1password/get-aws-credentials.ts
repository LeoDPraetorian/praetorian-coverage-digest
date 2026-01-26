import { z } from 'zod';
import { execOp, execOpRaw, OpClientError } from './lib/op-client.js';
import { getVaultName } from './lib/config.js';
import { buildSecretReference } from './lib/config.js';
import { exec } from 'child_process';

/**
 * Characters that could enable shell injection.
 * Note: Spaces are intentionally ALLOWED because 1Password item names
 * commonly contain spaces (e.g., "AWS Production Credentials").
 */
const UNSAFE_CHARS = /[;&|`$()]/;

export const getAwsCredentialsInput = z.object({
  item: z.string()
    .default('AWS Credentials')
    .refine(val => !UNSAFE_CHARS.test(val), 'Item name contains unsafe characters'),
  sessionDuration: z.number()
    .min(900, 'Session duration must be at least 900 seconds (15 minutes)')
    .max(129600, 'Session duration must be at most 129600 seconds (36 hours)')
    .default(3600)
});

export const getAwsCredentialsOutput = z.object({
  Version: z.literal(1),
  AccessKeyId: z.string(),
  SecretAccessKey: z.string(),
  SessionToken: z.string().optional(),
  Expiration: z.string().optional()
});

export type GetAwsCredentialsInput = z.infer<typeof getAwsCredentialsInput>;
export type GetAwsCredentialsOutput = z.infer<typeof getAwsCredentialsOutput>;

/**
 * Retrieve AWS credentials from 1Password.
 * Detects MFA requirement and automatically gets session token if needed.
 * Returns credentials in AWS credential_process JSON format.
 *
 * @example
 * ```typescript
 * // Static credentials (no MFA)
 * const creds = await getAwsCredentials.execute({});
 * // { Version: 1, AccessKeyId: 'AKIA...', SecretAccessKey: '...' }
 *
 * // With MFA (automatic session token)
 * const creds = await getAwsCredentials.execute({ item: 'AWS Production' });
 * // { Version: 1, AccessKeyId: 'ASIA...', SecretAccessKey: '...', SessionToken: '...', Expiration: '...' }
 * ```
 */
export const getAwsCredentials = {
  name: '1password.get-aws-credentials',
  description: 'Retrieve AWS credentials from 1Password (supports MFA)',
  parameters: getAwsCredentialsInput,

  async execute(input: GetAwsCredentialsInput): Promise<GetAwsCredentialsOutput> {
    const validated = getAwsCredentialsInput.parse(input);
    const vault = getVaultName();

    // Step 1: Get item details from 1Password
    const output = await execOp([
      'item', 'get', `"${validated.item}"`,
      '--vault', `"${vault}"`,
      '--reveal'
    ]);

    const item = JSON.parse(output);

    // Step 2: Parse fields into a map with normalized keys
    const fieldsMap: Record<string, string> = {};
    (item.fields || []).forEach((field: any) => {
      if (field.label && field.value !== undefined) {
        fieldsMap[field.label] = field.value;
      }
    });

    // Helper: Normalize field label for comparison (lowercase, replace underscores/spaces with nothing)
    const normalizeLabel = (label: string) => label.toLowerCase().replace(/[_\s]/g, '');

    // Helper: Find field by normalized label
    const findField = (patterns: string[]): { key: string; value: string } | undefined => {
      for (const key of Object.keys(fieldsMap)) {
        const normalized = normalizeLabel(key);
        if (patterns.some(pattern => normalized === normalizeLabel(pattern))) {
          return { key, value: fieldsMap[key] };
        }
      }
      return undefined;
    };

    // Step 3: Check for required fields with flexible matching
    const accessKeyIdField = findField(['AccessKeyId', 'Access Key ID', 'aws_access_key_id']);
    if (!accessKeyIdField) {
      throw new OpClientError('AccessKeyId field is required in 1Password item', 'ITEM_NOT_FOUND');
    }

    const secretAccessKeyField = findField(['SecretAccessKey', 'Secret Access Key', 'aws_secret_access_key']);
    if (!secretAccessKeyField) {
      throw new OpClientError('SecretAccessKey field is required in 1Password item', 'ITEM_NOT_FOUND');
    }

    // Step 4: Detect MFA requirement (check for mfa serial or mfa device fields)
    const mfaSerialField = findField(['mfa serial', 'mfa_serial', 'MFA Serial', 'mfa device', 'mfa_device', 'MFA Device']);

    // Step 5: If no MFA, return static credentials
    if (!mfaSerialField) {
      return getAwsCredentialsOutput.parse({
        Version: 1,
        AccessKeyId: accessKeyIdField.value,
        SecretAccessKey: secretAccessKeyField.value
      });
    }

    // Step 6: MFA detected - get TOTP code
    const reference = buildSecretReference(validated.item, mfaSerialField.key);
    const totpCode = await execOpRaw(['read', reference]);

    // Step 7: Call AWS STS to get session token
    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        exec(
          `aws sts get-session-token --serial-number "${mfaSerialField.value}" --token-code ${totpCode} --duration-seconds ${validated.sessionDuration}`,
          {
            env: {
              ...process.env,
              AWS_ACCESS_KEY_ID: accessKeyIdField.value,
              AWS_SECRET_ACCESS_KEY: secretAccessKeyField.value
            }
          },
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve(stdout);
            }
          }
        );
      });

      const stsResponse = JSON.parse(stdout);

      return getAwsCredentialsOutput.parse({
        Version: 1,
        AccessKeyId: stsResponse.Credentials.AccessKeyId,
        SecretAccessKey: stsResponse.Credentials.SecretAccessKey,
        SessionToken: stsResponse.Credentials.SessionToken,
        Expiration: stsResponse.Credentials.Expiration
      });
    } catch (error: any) {
      throw new OpClientError(
        `AWS STS error: ${error.message}`,
        'UNKNOWN',
        error
      );
    }
  }
};
