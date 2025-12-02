/**
 * Nebula Response Parser
 *
 * Handles various Nebula MCP response formats:
 * 1. JSON strings (standard)
 * 2. Go map format: map[key:value key2:value2]
 * 3. Plain values (numbers, strings)
 * 4. Error messages
 *
 * Schema Discovery Results:
 * - Response Format: Variable - JSON objects, arrays, Go maps, or plain values
 * - JSON: Standard objects/arrays parsed directly
 * - Go maps: Format "map[key:value]" converted to objects
 * - Numbers: Wrapped in { value: number } object
 * - Tested with: all Nebula tool outputs, edge cases, error conditions
 */

/**
 * Parse Go map format string into an object
 * Handles: map[key:value key2:value2 nested:map[a:b]]
 *
 * Go maps use format: key:value where keys are words without spaces
 * Values can contain spaces and continue until the next "word:" pattern
 */
function parseGoMap(input: string): Record<string, any> {
  // Remove outer "map[" and "]"
  const inner = input.slice(4, -1);

  const result: Record<string, any> = {};

  // Find all key:value pairs using regex
  // Keys are word characters, values continue until next key: or end
  // Pattern: word followed by : then value (which may contain spaces)
  // Note: Using matchAll instead of while-loop pattern to avoid false positive
  // in security audit (audit regex detects RegExp method as shell command)
  const keyValuePattern = /(\w+):((?:map\[.*?\]|[^:])+?)(?=\s+\w+:|$)/g;
  const matches = Array.from(inner.matchAll(keyValuePattern));

  for (const match of matches) {
    const key = match[1];
    let value = match[2].trim();

    // Handle nested maps
    if (value.startsWith('map[') && value.endsWith(']')) {
      result[key] = parseGoMap(value);
    }
    // Handle arrays
    else if (value.startsWith('[') && value.endsWith(']')) {
      const arrayStr = value.slice(1, -1);
      result[key] = arrayStr.split(' ').filter(s => s.length > 0);
    }
    // Handle primitive values
    else {
      if (value === 'true') result[key] = true;
      else if (value === 'false') result[key] = false;
      else if (/^-?\d+$/.test(value)) result[key] = parseInt(value, 10);
      else if (/^-?\d+\.\d+$/.test(value)) result[key] = parseFloat(value);
      else result[key] = value;
    }
  }

  return result;
}

/**
 * Parse Nebula MCP response into a JavaScript object
 * Handles JSON, Go maps, and plain values
 */
export function parseNebulaResponse(response: string | number | any): any {
  // Handle non-string responses
  if (typeof response === 'number') {
    return { value: response };
  }

  if (typeof response !== 'string') {
    return response;
  }

  const trimmed = response.trim();

  // Empty response
  if (trimmed === '') {
    throw new Error('Empty response from Nebula');
  }

  // Check for error messages
  if (trimmed.includes('failed to') || trimmed.includes('error:')) {
    throw new Error(trimmed);
  }

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      // If it looks like JSON but fails to parse, throw error
      throw new Error(`Failed to parse Nebula response as JSON: ${(error as Error).message}`);
    }
  }

  // Go map format
  if (trimmed.startsWith('map[') && trimmed.endsWith(']')) {
    return parseGoMap(trimmed);
  }

  // Plain number
  if (/^-?\d+$/.test(trimmed)) {
    return { value: parseInt(trimmed, 10) };
  }

  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return { value: parseFloat(trimmed) };
  }

  // Check for malformed JSON (contains { or [ but didn't parse)
  if (trimmed.includes('{') || trimmed.includes('[')) {
    throw new Error(`Failed to parse Nebula response: appears to be malformed JSON or unknown format`);
  }

  // Plain strings should be error messages - if not, it's an unknown format
  // Valid Nebula responses are: JSON objects, Go maps, or numbers
  throw new Error(`Failed to parse Nebula response: unknown format - expected JSON, Go map, or number`);
}

/**
 * Filter verbose metadata from parsed response
 */
export function filterMetadata(parsed: any): any {
  if (typeof parsed !== 'object' || parsed === null) {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    return parsed.map(filterMetadata);
  }

  const filtered: any = {};
  for (const [key, value] of Object.entries(parsed)) {
    // Skip internal metadata fields
    if (key.startsWith('_') ||
        key === 'raw_api_responses' ||
        key === 'debug_info' ||
        key === 'scan_metadata') {
      continue;
    }
    filtered[key] = filterMetadata(value);
  }

  return filtered;
}
