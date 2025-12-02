/**
 * Shared Configuration Loader for Custom Tools
 *
 * Loads credentials from .claude/tools/config/credentials.json with environment variable resolution
 * Shared across all custom tool wrappers (Linear, Currents, etc.)
 *
 * SECURITY: Each tool only receives its own credentials via getToolConfig()
 * Other services' credentials are never exposed to the calling tool.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { resolveProjectPath } from '../../lib/find-project-root.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Schema for a single service's credentials
 * Each service has string key-value pairs (credential names to values/env var refs)
 */
const ServiceCredentialsSchema = z.record(z.string(), z.string());

/**
 * Schema for the entire credentials.json file
 * Maps service names to their credential objects
 */
const CredentialsFileSchema = z.record(z.string(), ServiceCredentialsSchema);

/**
 * TypeScript type for credentials file structure
 */
export type CredentialsFile = z.infer<typeof CredentialsFileSchema>;

/**
 * TypeScript type for a single service's credentials
 */
export type ServiceCredentials = z.infer<typeof ServiceCredentialsSchema>;

/**
 * Resolve environment variables in config values
 * Supports ${ENV_VAR} syntax
 */
function resolveEnvVars(value: any): any {
  if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    const envVar = value.slice(2, -1);
    const resolved = process.env[envVar];

    if (!resolved) {
      throw new Error(
        `Environment variable ${envVar} not set.\n` +
        `Set it in your shell profile or .env file:\n` +
        `  export ${envVar}="your-value-here"`
      );
    }

    return resolved;
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).reduce((acc, [k, v]) => {
      acc[k] = resolveEnvVars(v);
      return acc;
    }, {} as any);
  }

  return value;
}

/**
 * Error thrown when credentials.json structure is invalid
 */
export class CredentialsValidationError extends Error {
  constructor(
    public issues: z.ZodIssue[],
    public configPath: string
  ) {
    const issueMessages = issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    super(
      `Invalid credentials.json structure:\n${issueMessages}\n` +
      `File: ${configPath}\n` +
      `Expected format: { "serviceName": { "credentialKey": "value" } }`
    );
    this.name = 'CredentialsValidationError';
  }
}

/**
 * Get configuration for a specific tool
 *
 * SECURITY: This function returns ONLY the requested tool's credentials.
 * Other services' credentials in credentials.json are never returned.
 *
 * @param toolName - Name of the tool (e.g., 'linear', 'currents', 'github')
 * @returns Tool configuration with resolved environment variables
 * @throws CredentialsValidationError if credentials.json structure is invalid
 * @throws Error if tool not found or config file missing
 *
 * @example
 * ```typescript
 * const config = getToolConfig('currents');
 * console.log(config.apiKey); // Resolved from ${CURRENTS_API_KEY}
 * ```
 */
export function getToolConfig<T = any>(toolName: string): T {
  const configPath = resolveProjectPath('.claude', 'tools', 'config', 'credentials.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
      `Create .claude/tools/config/credentials.json with your tool credentials.\n` +
      `Example:\n` +
      `{\n` +
      `  "${toolName}": {\n` +
      `    "apiKey": "\${${toolName.toUpperCase()}_API_KEY}"\n` +
      `  }\n` +
      `}`
    );
  }

  const rawConfig = fs.readFileSync(configPath, 'utf-8');
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawConfig);
  } catch (e) {
    throw new Error(
      `Failed to parse credentials.json: ${e instanceof Error ? e.message : String(e)}\n` +
      `File: ${configPath}`
    );
  }

  // Validate structure with Zod
  const validationResult = CredentialsFileSchema.safeParse(parsedJson);

  if (!validationResult.success) {
    throw new CredentialsValidationError(validationResult.error.issues, configPath);
  }

  const config = validationResult.data;

  if (!config[toolName]) {
    throw new Error(
      `Tool '${toolName}' not found in credentials.json.\n` +
      `Available tools: ${Object.keys(config).join(', ')}\n` +
      `Add configuration for ${toolName} to credentials.json`
    );
  }

  // SECURITY: Return ONLY the requested tool's credentials
  // This ensures service A cannot access service B's credentials
  return resolveEnvVars(config[toolName]);
}

/**
 * Check if tool configuration exists
 */
export function hasToolConfig(toolName: string): boolean {
  try {
    getToolConfig(toolName);
    return true;
  } catch {
    return false;
  }
}
