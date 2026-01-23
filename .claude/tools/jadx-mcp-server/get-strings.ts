/**
 * JADX MCP Wrapper: get-strings
 *
 * Pattern: simple_fetch with XML parsing and secret detection
 * Purpose: Retrieves and parses strings.xml resources with security analysis
 * Security: MEDIUM (may contain API keys, tokens, credentials)
 *
 * Token optimization: 80% reduction via structured extraction + entry limiting
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { truncateWithIndicator } from '../config/lib/response-utils.js';

// ============================================================================
// Constants
// ============================================================================

const MAX_ENTRIES = 50;
const MAX_VALUE_LENGTH = 100;
const RAW_XML_PREVIEW_LENGTH = 500;

// Secret detection patterns
const SECRET_PATTERNS = {
  AWS_KEY: /AKIA[0-9A-Z]{16}/,
  OPENAI_KEY: /sk-proj-[A-Za-z0-9]{32,}/,
  GITHUB_PAT: /gh[ps]_[A-Za-z0-9_]{30,}/,
  API_KEY: /api[_-]?key[_-]?[a-f0-9]{32,}/i,
  BEARER: /Bearer\s+[A-Za-z0-9\-._~+/]+/,
  BASE64: /[A-Za-z0-9+/]{40,}={0,2}/,
};

const SENSITIVE_NAME_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /bearer/i,
  /auth/i,
  /credential/i,
];

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({}).strict();

export type GetStringsInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interfaces
// ============================================================================

export interface StringEntry {
  name: string;
  value: string;
  valueTruncated: boolean;
  secret: boolean;
  secretType?: string;
}

export interface GetStringsOutput {
  entries: StringEntry[];
  totalEntries: number;
  entriesTooMany: boolean;
  secretsFound: number;
  rawXmlPreview: string;
  rawXmlTruncated: boolean;
  estimatedTokens: number;
}

// ============================================================================
// Secret Detection
// ============================================================================

function detectSecret(name: string, value: string): { isSecret: boolean; type?: string } {
  // Check name patterns
  const sensitiveNameFound = SENSITIVE_NAME_PATTERNS.some(p => p.test(name));

  // Check value patterns (order matters - check specific patterns before generic)
  if (SECRET_PATTERNS.OPENAI_KEY.test(value)) return { isSecret: true, type: 'OPENAI_KEY' };
  if (SECRET_PATTERNS.AWS_KEY.test(value)) return { isSecret: true, type: 'AWS_KEY' };
  if (SECRET_PATTERNS.GITHUB_PAT.test(value)) return { isSecret: true, type: 'GITHUB_PAT' };
  if (SECRET_PATTERNS.API_KEY.test(value)) return { isSecret: true, type: 'API_KEY' };
  if (SECRET_PATTERNS.BEARER.test(value)) return { isSecret: true, type: 'BEARER' };
  if (SECRET_PATTERNS.BASE64.test(value) && value.length > 60) return { isSecret: true, type: 'BASE64' };

  // Sensitive name with suspicious value (long strings)
  if (sensitiveNameFound && value.length > 20) {
    return { isSecret: true, type: 'SENSITIVE_NAME' };
  }

  return { isSecret: false };
}

// ============================================================================
// XML Parsing
// ============================================================================

function parseStringsXML(xmlContent: string): StringEntry[] {
  const stringPattern = /<string\s+name="([^"]+)"(?:\s*\/>|>([^<]*)<\/string>)/g;
  const entries: StringEntry[] = [];

  let match;
  while ((match = stringPattern.exec(xmlContent)) !== null) {
    const [, name, rawValue = ''] = match;

    // Decode XML entities
    const value = rawValue
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    // Detect secrets
    const { isSecret, type: secretType } = detectSecret(name, value);

    // Truncate long values
    const valueTruncated = value.length > MAX_VALUE_LENGTH;
    const truncatedValue = valueTruncated
      ? value.slice(0, MAX_VALUE_LENGTH) + '...'
      : value;

    entries.push({
      name,
      value: truncatedValue,
      valueTruncated,
      secret: isSecret,
      ...(secretType && { secretType }),
    });

    // Limit to MAX_ENTRIES
    if (entries.length >= MAX_ENTRIES) break;
  }

  return entries;
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(rawData: unknown): GetStringsOutput {
  const raw = validateObjectResponse(rawData, 'get-strings');

  const xmlContent = raw.content ?? '';

  // Parse XML - note: parseStringsXML already limits to MAX_ENTRIES
  const entries = parseStringsXML(xmlContent);

  // Count total entries in XML before limiting
  const totalMatches = (xmlContent.match(/<string\s+name="/g) || []).length;
  const totalEntries = totalMatches;
  const entriesTooMany = totalEntries > MAX_ENTRIES;

  // Count secrets
  const secretsFound = entries.filter(e => e.secret).length;

  // Truncate raw XML
  const rawXmlPreview = truncateWithIndicator(xmlContent, RAW_XML_PREVIEW_LENGTH) ?? '';
  const rawXmlTruncated = xmlContent.length > RAW_XML_PREVIEW_LENGTH;

  return addTokenEstimation({
    entries,
    totalEntries,
    entriesTooMany,
    secretsFound,
    rawXmlPreview,
    rawXmlTruncated,
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

export const getStrings = {
  name: 'jadx.get-strings',
  description: 'Retrieves and parses strings.xml resources with secret detection. Extracts up to 50 entries.',
  inputSchema: InputSchema,

  async execute(input: GetStringsInput): Promise<GetStringsOutput> {
    InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_strings', {});
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-strings');
    }
  },
};

export default getStrings;
