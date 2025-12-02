/**
 * Configuration loader for custom tools
 *
 * Loads credentials from .claude/config/credentials.json with environment variable resolution
 */

import * as fs from 'fs';
import * as path from 'path';

interface ToolConfig {
  [key: string]: string | number | boolean;
}

interface CredentialsConfig {
  [toolName: string]: ToolConfig;
}

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
        `Environment variable ${envVar} not set. ` +
        `Set it in your shell profile or .env file.`
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
 * Get configuration for a specific tool
 *
 * @param toolName - Name of the tool (e.g., 'linear', 'github')
 * @returns Tool configuration with resolved environment variables
 *
 * @example
 * ```typescript
 * const config = getToolConfig('linear');
 * console.log(config.apiKey); // Resolved from ${LINEAR_API_KEY}
 * console.log(config.endpoint); // https://api.linear.app/graphql
 * ```
 */
export function getToolConfig(toolName: string): ToolConfig {
  const configPath = path.join(
    process.cwd(),
    '.claude',
    'config',
    'credentials.json'
  );

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
      `Copy .claude/config/credentials.json.example to .claude/config/credentials.json`
    );
  }

  const rawConfig = fs.readFileSync(configPath, 'utf-8');
  const config: CredentialsConfig = JSON.parse(rawConfig);

  if (!config[toolName]) {
    throw new Error(
      `Tool '${toolName}' not found in credentials.json. ` +
      `Available tools: ${Object.keys(config).join(', ')}`
    );
  }

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
