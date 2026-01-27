/**
 * Query Resolver - 3-Layer Resolution Logic
 *
 * Resolves natural language queries to SOQL using:
 * - Layer 3: Pattern cache (exact + fuzzy matching)
 * - Layer 2: Glossary term expansion
 * - Layer 1: Schema field lookup
 * - Fallback: Tooling API suggestion
 *
 * Security Requirements (QR-01 to QR-06):
 * - Max 500 characters input
 * - Control character stripping
 * - Rate limiting (10/minute per session)
 * - Input hash logging (not raw input)
 * - Generic error messages
 *
 * @see Architecture: /.claude/.output/mcp-wrappers/2026-01-16-165022-salesforce-knowledge-layer/tool-lead-architecture.md
 */

import {
  type KnowledgeContext,
  type ResolutionResult,
  type QueryPattern,
  type Result,
} from './types.js';
import {
  normalizeQuery,
  tokenize,
  fuzzyMatch,
  scoreSimilarity,
  findBestMatches,
} from './pattern-matcher.js';
import { savePatternCache, getKnowledgeDir } from './knowledge-loader.js';

// ============================================
// Constants
// ============================================

/** Maximum allowed input length (QR-01) */
const MAX_INPUT_LENGTH = 500;

/** Control characters pattern */
const CONTROL_CHARS_PATTERN = /[\x00-\x1f\x7f]/;

/** Rate limit: requests per minute */
const RATE_LIMIT_PER_MINUTE = 10;

/** Confidence thresholds */
const CONFIDENCE = {
  PATTERN_EXACT: 0.98,
  PATTERN_FUZZY_HIGH: 0.85,
  PATTERN_FUZZY_LOW: 0.70,
  GLOSSARY: 0.85,
  SCHEMA: 0.50,
  TOOLING_API: 0.0,
} as const;

/** Minimum score threshold for pattern matching - must be high to avoid false positives */
const PATTERN_SCORE_THRESHOLD = 0.85;

// ============================================
// Rate Limiter Class (Instance-based)
// ============================================

class RateLimiter {
  private timestamps: number[] = [];

  /**
   * Check if rate limit is exceeded
   */
  isLimited(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.timestamps = this.timestamps.filter((ts) => ts > oneMinuteAgo);

    // Check limit
    if (this.timestamps.length >= RATE_LIMIT_PER_MINUTE) {
      return true;
    }

    // Record this request
    this.timestamps.push(now);
    return false;
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.timestamps = [];
  }
}

// ============================================
// Query Resolver Class
// ============================================

export class QueryResolver {
  private context: KnowledgeContext;
  private rateLimiter: RateLimiter;

  constructor(context: KnowledgeContext) {
    this.context = context;
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Resolve a natural language query to SOQL
   *
   * Resolution order:
   * 1. Pattern cache (exact + fuzzy)
   * 2. Glossary term expansion
   * 3. Schema field lookup
   * 4. Tooling API fallback
   *
   * @param query - Natural language query
   * @returns Resolution result or error
   */
  async resolve(query: string): Promise<Result<ResolutionResult, Error>> {
    // QR-01: Validate input length
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: new Error('Query is required and cannot be empty'),
      };
    }

    if (query.length > MAX_INPUT_LENGTH) {
      return {
        success: false,
        error: new Error(`Query too long (max ${MAX_INPUT_LENGTH} characters)`),
      };
    }

    // QR-02: Check for control characters
    if (CONTROL_CHARS_PATTERN.test(query)) {
      return {
        success: false,
        error: new Error('Query contains invalid characters'),
      };
    }

    // QR-04: Rate limiting
    if (this.rateLimiter.isLimited()) {
      return {
        success: false,
        error: new Error('Rate limit exceeded. Please wait before trying again.'),
      };
    }

    // QR-03: Normalize input
    const normalized = normalizeQuery(query);

    if (normalized.length === 0) {
      return {
        success: false,
        error: new Error('Query is empty after normalization'),
      };
    }

    // Try resolution in order
    const patternResult = await this.resolveFromPatternCache(normalized);
    if (patternResult) {
      return { success: true, data: patternResult };
    }

    const glossaryResult = this.resolveFromGlossary(normalized);
    if (glossaryResult) {
      return { success: true, data: glossaryResult };
    }

    const schemaResult = this.resolveFromSchema(normalized);
    if (schemaResult) {
      return { success: true, data: schemaResult };
    }

    // Fallback to Tooling API suggestion
    return {
      success: true,
      data: this.createToolingApiFallback(normalized),
    };
  }

  /**
   * Reset the rate limiter (for testing)
   */
  resetRateLimiter(): void {
    this.rateLimiter.reset();
  }

  /**
   * Layer 3: Pattern Cache Resolution
   */
  private async resolveFromPatternCache(normalizedQuery: string): Promise<ResolutionResult | null> {
    const { patterns } = this.context.patterns;

    if (patterns.length === 0) {
      return null;
    }

    // Find best matches using fuzzy matching
    const matches = findBestMatches(normalizedQuery, patterns, PATTERN_SCORE_THRESHOLD);

    if (matches.length === 0) {
      return null;
    }

    const bestMatch = matches[0];
    const pattern = bestMatch.pattern;

    // Calculate confidence based on match quality
    const similarity = scoreSimilarity(normalizedQuery, pattern.normalizedQuery);
    let confidence: number;

    // Check if this is an exact match (same normalized query) or fuzzy match
    const isExactMatch = normalizedQuery === pattern.normalizedQuery;

    if (isExactMatch && similarity >= 0.95) {
      confidence = CONFIDENCE.PATTERN_EXACT;
    } else if (similarity >= 0.80) {
      confidence = CONFIDENCE.PATTERN_FUZZY_HIGH;
    } else {
      confidence = CONFIDENCE.PATTERN_FUZZY_LOW;
    }

    // Auto-learning: Update pattern statistics
    pattern.useCount++;
    pattern.lastUsed = new Date().toISOString();

    // Persist changes to file (await to ensure save completes, but ignore errors)
    await this.persistPatternUpdates().catch(() => {
      // Silently ignore save errors - resolution still succeeds
    });

    return {
      success: true,
      soql: pattern.soql,
      source: 'pattern_cache',
      confidence,
      normalizedQuery,
      matchedTerms: pattern.glossaryTermsUsed,
      fieldsUsed: pattern.schemaFieldsUsed,
    };
  }

  /**
   * Persist pattern cache updates to YAML file
   */
  private async persistPatternUpdates(): Promise<void> {
    await savePatternCache(getKnowledgeDir(), this.context.patterns);
  }

  /**
   * Layer 2: Glossary Term Expansion
   */
  private resolveFromGlossary(normalizedQuery: string): ResolutionResult | null {
    const { glossary } = this.context;
    const tokens = tokenize(normalizedQuery);

    if (tokens.length === 0) {
      return null;
    }

    // Find matching terms
    const matchedTerms: string[] = [];
    const conditions: string[] = [];
    const fieldsUsed: string[] = [];
    const objects = new Set<string>();

    for (const token of tokens) {
      // Check direct term match
      let termName = token;
      let term = glossary.terms[termName];

      // Check aliases
      if (!term && glossary.aliases[token]) {
        termName = glossary.aliases[token];
        term = glossary.terms[termName];
      }

      // If no direct match, try fuzzy matching against term names
      if (!term) {
        for (const [name, t] of Object.entries(glossary.terms)) {
          if (fuzzyMatch(token, name)) {
            termName = name;
            term = t;
            break;
          }
        }
      }

      // Check if term exists
      if (term && !matchedTerms.includes(termName)) {
        matchedTerms.push(termName);

        // Collect all conditions (including inherited)
        const allConditions = this.collectTermConditions(termName, new Set());
        conditions.push(...allConditions.conditions);
        fieldsUsed.push(...allConditions.fields);
        allConditions.objects.forEach((obj) => objects.add(obj));
      }
    }

    if (matchedTerms.length === 0) {
      return null;
    }

    // Build SOQL
    const objectName = objects.size > 0 ? Array.from(objects)[0] : 'Opportunity';
    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const soql = `SELECT Id, Name, Amount FROM ${objectName}${whereClause}`;

    return {
      success: true,
      soql,
      source: 'glossary',
      confidence: CONFIDENCE.GLOSSARY,
      normalizedQuery,
      matchedTerms,
      fieldsUsed,
    };
  }

  /**
   * Collect conditions from a term and its inherited terms
   */
  private collectTermConditions(
    termName: string,
    visited: Set<string>
  ): { conditions: string[]; fields: string[]; objects: string[] } {
    if (visited.has(termName)) {
      return { conditions: [], fields: [], objects: [] };
    }
    visited.add(termName);

    const term = this.context.glossary.terms[termName];
    if (!term) {
      return { conditions: [], fields: [], objects: [] };
    }

    const result = {
      conditions: [] as string[],
      fields: [] as string[],
      objects: term.objects || [],
    };

    // Add own condition
    if (term.condition) {
      result.conditions.push(term.condition);
    }

    // Add fields
    for (const field of term.fields) {
      if (field.range) {
        result.conditions.push(`${field.field} >= '${field.range.start}'`);
        result.conditions.push(`${field.field} <= '${field.range.end}'`);
        result.fields.push(field.field);
      }
    }

    // Collect inherited conditions
    if (term.inherits) {
      for (const parentName of term.inherits) {
        const parentResult = this.collectTermConditions(parentName, visited);
        result.conditions.push(...parentResult.conditions);
        result.fields.push(...parentResult.fields);
        result.objects.push(...parentResult.objects);
      }
    }

    return result;
  }

  /**
   * Layer 1: Schema Field Lookup
   */
  private resolveFromSchema(normalizedQuery: string): ResolutionResult | null {
    const { schema } = this.context;
    const tokens = tokenize(normalizedQuery);

    if (tokens.length === 0) {
      return null;
    }

    const matchedFields: string[] = [];
    const suggestions: string[] = [];

    for (const token of tokens) {
      // Check field index
      const indexedFields = schema.fieldIndex[token];
      if (indexedFields && indexedFields.length > 0) {
        matchedFields.push(...indexedFields);
        continue;
      }

      // Fuzzy match against field labels
      for (const [objectName, objectDef] of Object.entries(schema.objects)) {
        for (const [fieldName, fieldDef] of Object.entries(objectDef.fields)) {
          const fieldPath = `${objectName}.${fieldName}`;

          if (
            fuzzyMatch(token, fieldName) ||
            fuzzyMatch(token, fieldDef.label) ||
            fuzzyMatch(token, fieldDef.apiName)
          ) {
            if (!matchedFields.includes(fieldPath)) {
              matchedFields.push(fieldPath);
            }
          }
        }
      }
    }

    if (matchedFields.length === 0) {
      return null;
    }

    // Build suggestions
    for (const fieldPath of matchedFields) {
      suggestions.push(`Use ${fieldPath} in your SOQL query`);
    }

    // Schema resolution cannot auto-generate SOQL - only provides suggestions
    return {
      success: true,
      source: 'schema',
      confidence: CONFIDENCE.SCHEMA,
      normalizedQuery,
      fieldsUsed: matchedFields,
      suggestions,
    };
  }

  /**
   * Create Tooling API fallback result
   */
  private createToolingApiFallback(normalizedQuery: string): ResolutionResult {
    return {
      success: true,
      source: 'tooling_api',
      confidence: CONFIDENCE.TOOLING_API,
      normalizedQuery,
      suggestions: [
        'Could not resolve query from knowledge layer.',
        'Use Tooling API to discover available fields and objects.',
        'Try using more specific business terms.',
      ],
    };
  }
}

/**
 * Reset rate limiter state (for testing)
 */
export function resetRateLimiter(): void {
  rateLimiterState.timestamps = [];
}
