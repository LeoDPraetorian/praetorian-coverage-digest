/**
 * Knowledge Loader - YAML Persistence for Knowledge Layers
 *
 * Provides secure file I/O for the 3-layer knowledge system:
 * - Layer 1: Schema (schema.yaml)
 * - Layer 2: Glossary (glossary.yaml)
 * - Layer 3: Patterns (patterns.yaml)
 *
 * Security Requirements (from security-lead-review.md):
 * - YD-01 to YD-05: YAML deserialization protections
 * - Inheritance depth limiting (max 3 levels)
 * - SQL injection pattern validation
 * - Salesforce ID sanitization
 *
 * @see Architecture: /.claude/.output/mcp-wrappers/2026-01-16-165022-salesforce-knowledge-layer/tool-lead-architecture.md
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'yaml';
import {
  SchemaKnowledgeSchema,
  GlossaryKnowledgeSchema,
  PatternKnowledgeSchema,
  type SchemaKnowledge,
  type GlossaryKnowledge,
  type PatternKnowledge,
  type QueryPattern,
  type KnowledgeContext,
  type Result,
  type SavePatternInput,
} from './types.js';
import { tokenize, normalizeQuery } from './pattern-matcher.js';

// ============================================
// Constants
// ============================================

/** Maximum YAML file size (1MB) */
const MAX_YAML_SIZE = 1024 * 1024;

/** Maximum inheritance depth for glossary terms */
const MAX_INHERITANCE_DEPTH = 3;

/** Dangerous YAML tags that could enable code execution */
const DANGEROUS_YAML_TAGS = [
  '!!python',
  '!!js',
  '!!ruby',
  '!!perl',
  '!!php',
  '!!java',
  '!!exec',
  '!<tag:yaml.org,2002:python',
  '!<tag:yaml.org,2002:js',
];

/** SQL injection patterns to block in glossary conditions */
const SQL_INJECTION_PATTERNS = [
  /--/, // SQL comment
  /;/, // Statement terminator
  /\/\*/, // Block comment start
  /\*\//, // Block comment end
  /\bOR\s+1\s*=\s*1\b/i, // OR 1=1 tautology
  /\bAND\s+1\s*=\s*1\b/i, // AND 1=1 tautology
  /\bUNION\b/i, // UNION injection
  /\bDROP\b/i, // DROP statement
  /\bDELETE\b/i, // DELETE statement
  /\bINSERT\b/i, // INSERT statement
  /\bUPDATE\b/i, // UPDATE statement
  /\bEXEC\b/i, // EXEC statement
  /\bEXECUTE\b/i, // EXECUTE statement
  /\bTRUNCATE\b/i, // TRUNCATE statement
  /\bALTER\b/i, // ALTER statement
  /\bCREATE\b/i, // CREATE statement
  /\bGRANT\b/i, // GRANT permissions
  /\bREVOKE\b/i, // REVOKE permissions
];

/** Salesforce ID pattern (15 or 18 characters) */
const SALESFORCE_ID_PATTERN = /'[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?'/g;

/** Fields that indicate user-specific data */
const USER_SPECIFIC_FIELDS = [
  /\bOwnerId\b/i,
  /\bCreatedById\b/i,
  /\bModifiedById\b/i,
  /\bLastModifiedById\b/i,
  /\bEmail\s*=/i,
];

// ============================================
// Directory Management
// ============================================

/**
 * Get the path to the knowledge directory
 */
export function getKnowledgeDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return __dirname;
}

// ============================================
// YAML Security Functions
// ============================================

/**
 * Safely parse YAML with security protections
 *
 * @param content - YAML string to parse
 * @param maxSize - Maximum allowed size (default: 1MB)
 * @returns Parsed data or error
 */
export function safeParseYAML<T>(
  content: string,
  maxSize: number = MAX_YAML_SIZE
): Result<T, Error> {
  // YD-04: Check file size
  if (content.length > maxSize) {
    return {
      success: false,
      error: new Error(`SECURITY: YAML content exceeds max size (${maxSize} bytes)`),
    };
  }

  // YD-03: Check for dangerous tags
  for (const tag of DANGEROUS_YAML_TAGS) {
    if (content.includes(tag)) {
      return {
        success: false,
        error: new Error(`SECURITY: YAML contains dangerous tag: ${tag}`),
      };
    }
  }

  try {
    const parsed = yaml.parse(content) as T;
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: new Error(`YAML parse error: ${error instanceof Error ? error.message : 'invalid YAML'}`),
    };
  }
}

/**
 * Validate a glossary condition for SQL injection patterns
 *
 * @param condition - SOQL condition string to validate
 * @returns True if safe, false if injection detected
 */
export function validateGlossaryCondition(condition: string): boolean {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(condition)) {
      return false;
    }
  }
  return true;
}

/**
 * Sanitize SOQL by removing Salesforce IDs
 *
 * @param soql - SOQL query to sanitize
 * @returns Sanitized SOQL with IDs replaced
 */
export function sanitizeSOQLForCache(soql: string): string {
  return soql.replace(SALESFORCE_ID_PATTERN, "'<ID_REMOVED>'");
}

/**
 * Check if a SOQL pattern contains user-specific data
 *
 * User-specific patterns include:
 * - Record IDs (can be sanitized, but indicate user-specific context)
 * - User-specific fields (OwnerId, CreatedById, Email)
 *
 * @param soql - SOQL query to check
 * @returns True if user-specific patterns detected
 */
export function isUserSpecificPattern(soql: string): boolean {
  // Check for user-specific fields
  for (const pattern of USER_SPECIFIC_FIELDS) {
    if (pattern.test(soql)) {
      return true;
    }
  }

  // Check for record IDs (these indicate user-specific context)
  // Reset lastIndex before testing
  const idPattern = new RegExp(SALESFORCE_ID_PATTERN.source, 'g');
  if (idPattern.test(soql)) {
    return true;
  }

  return false;
}

/**
 * Check if a SOQL pattern contains non-sanitizable user-specific data
 *
 * These are patterns that cannot be made generic by sanitization:
 * - OwnerId, CreatedById, ModifiedById filters
 * - Email filters
 *
 * @param soql - SOQL query to check (after ID sanitization)
 * @returns True if non-sanitizable user-specific patterns detected
 */
function hasNonSanitizableUserData(soql: string): boolean {
  for (const pattern of USER_SPECIFIC_FIELDS) {
    if (pattern.test(soql)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate glossary inheritance depth (on raw data)
 *
 * @param terms - Raw terms object
 * @returns Error if depth exceeded, undefined if valid
 */
function validateInheritanceDepthRaw(terms: Record<string, { inherits?: string[] }>): Error | undefined {
  const visited = new Set<string>();

  function checkDepth(termName: string, depth: number): Error | undefined {
    if (depth > MAX_INHERITANCE_DEPTH) {
      return new Error(`SECURITY: Glossary inheritance depth exceeds maximum (${MAX_INHERITANCE_DEPTH})`);
    }

    if (visited.has(termName)) {
      return new Error(`SECURITY: Circular inheritance detected in term: ${termName}`);
    }

    const term = terms[termName];
    if (!term || !term.inherits) {
      return undefined;
    }

    visited.add(termName);
    for (const parentName of term.inherits) {
      const error = checkDepth(parentName, depth + 1);
      if (error) return error;
    }
    visited.delete(termName);

    return undefined;
  }

  for (const termName of Object.keys(terms)) {
    const error = checkDepth(termName, 0);
    if (error) return error;
  }

  return undefined;
}

/**
 * Validate glossary inheritance depth
 *
 * @param glossary - Glossary to validate
 * @returns Error if depth exceeded, undefined if valid
 */
function validateInheritanceDepth(glossary: GlossaryKnowledge): Error | undefined {
  return validateInheritanceDepthRaw(glossary.terms as Record<string, { inherits?: string[] }>);
}

// ============================================
// File Loading Functions
// ============================================

/**
 * Load schema knowledge from schema.yaml
 *
 * @param dir - Directory containing the file
 * @returns Schema knowledge or default empty structure
 */
export async function loadSchemaKnowledge(dir: string = getKnowledgeDir()): Promise<Result<SchemaKnowledge, Error>> {
  const filePath = join(dir, 'schema.yaml');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parseResult = safeParseYAML<SchemaKnowledge>(content);

    if (!parseResult.success) {
      return parseResult;
    }

    // Validate against Zod schema
    const validation = SchemaKnowledgeSchema.safeParse(parseResult.data);
    if (!validation.success) {
      return {
        success: false,
        error: new Error(`Schema validation failed: ${validation.error.message}`),
      };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    // File not found - return default empty structure
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const defaultSchema: SchemaKnowledge = {
        version: '1.0.0',
        syncedAt: new Date().toISOString(),
        orgId: '',
        objects: {},
        fieldIndex: {},
      };
      return { success: true, data: defaultSchema };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Load glossary knowledge from glossary.yaml
 *
 * @param dir - Directory containing the file
 * @returns Glossary knowledge or default empty structure
 */
export async function loadGlossaryKnowledge(dir: string = getKnowledgeDir()): Promise<Result<GlossaryKnowledge, Error>> {
  const filePath = join(dir, 'glossary.yaml');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parseResult = safeParseYAML<Record<string, unknown>>(content);

    if (!parseResult.success) {
      return parseResult;
    }

    const rawData = parseResult.data;

    // Security validation FIRST - check SQL injection in conditions before Zod validation
    if (rawData.terms && typeof rawData.terms === 'object') {
      for (const [termName, term] of Object.entries(rawData.terms as Record<string, { condition?: string }>)) {
        if (term && term.condition && !validateGlossaryCondition(term.condition)) {
          return {
            success: false,
            error: new Error(`SECURITY: Dangerous SQL injection pattern in term '${termName}'`),
          };
        }
      }
    }

    // Check inheritance depth on raw data
    if (rawData.terms && typeof rawData.terms === 'object') {
      const terms = rawData.terms as Record<string, { inherits?: string[] }>;
      const depthError = validateInheritanceDepthRaw(terms);
      if (depthError) {
        return { success: false, error: depthError };
      }
    }

    // Validate against Zod schema
    const validation = GlossaryKnowledgeSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: new Error(`Glossary validation failed: ${validation.error.message}`),
      };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    // File not found - return default empty structure
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const defaultGlossary: GlossaryKnowledge = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        terms: {},
        aliases: {},
      };
      return { success: true, data: defaultGlossary };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Load pattern cache from patterns.yaml
 *
 * @param dir - Directory containing the file
 * @returns Pattern knowledge or default empty structure
 */
export async function loadPatternCache(dir: string = getKnowledgeDir()): Promise<Result<PatternKnowledge, Error>> {
  const filePath = join(dir, 'patterns.yaml');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parseResult = safeParseYAML<PatternKnowledge>(content);

    if (!parseResult.success) {
      return parseResult;
    }

    // Validate against Zod schema
    const validation = PatternKnowledgeSchema.safeParse(parseResult.data);
    if (!validation.success) {
      return {
        success: false,
        error: new Error(`Pattern cache validation failed: ${validation.error.message}`),
      };
    }

    // Validate SOQL in patterns for injection
    for (const pattern of validation.data.patterns) {
      if (!validateGlossaryCondition(pattern.soql)) {
        return {
          success: false,
          error: new Error(`SECURITY: Dangerous SQL injection pattern in cached pattern '${pattern.id}'`),
        };
      }
    }

    return { success: true, data: validation.data };
  } catch (error) {
    // File not found - return default empty structure
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const defaultPatterns: PatternKnowledge = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        patterns: [],
        queryIndex: {},
      };
      return { success: true, data: defaultPatterns };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Load complete knowledge context (all 3 layers)
 *
 * @param dir - Directory containing the files
 * @returns Complete knowledge context
 */
export async function loadKnowledgeContext(dir: string = getKnowledgeDir()): Promise<Result<KnowledgeContext, Error>> {
  const [schemaResult, glossaryResult, patternsResult] = await Promise.all([
    loadSchemaKnowledge(dir),
    loadGlossaryKnowledge(dir),
    loadPatternCache(dir),
  ]);

  if (!schemaResult.success) {
    return { success: false, error: schemaResult.error };
  }
  if (!glossaryResult.success) {
    return { success: false, error: glossaryResult.error };
  }
  if (!patternsResult.success) {
    return { success: false, error: patternsResult.error };
  }

  return {
    success: true,
    data: {
      schema: schemaResult.data,
      glossary: glossaryResult.data,
      patterns: patternsResult.data,
    },
  };
}

// ============================================
// File Saving Functions
// ============================================

/**
 * Save schema knowledge to schema.yaml
 *
 * @param dir - Directory to save to
 * @param schema - Schema knowledge to save
 * @returns Success or error
 */
export async function saveSchemaCache(
  dir: string,
  schema: SchemaKnowledge
): Promise<Result<void, Error>> {
  const filePath = join(dir, 'schema.yaml');

  try {
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write YAML
    const content = yaml.stringify(schema);
    await fs.writeFile(filePath, content, 'utf-8');

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Save glossary knowledge to glossary.yaml
 *
 * @param dir - Directory to save to
 * @param glossary - Glossary knowledge to save
 * @returns Success or error
 */
export async function saveGlossaryCache(
  dir: string,
  glossary: GlossaryKnowledge
): Promise<Result<void, Error>> {
  // Validate conditions for SQL injection
  for (const [termName, term] of Object.entries(glossary.terms)) {
    if (term.condition && !validateGlossaryCondition(term.condition)) {
      return {
        success: false,
        error: new Error(`SECURITY: Dangerous SQL injection pattern in term '${termName}'`),
      };
    }
  }

  // Validate inheritance depth
  const depthError = validateInheritanceDepth(glossary);
  if (depthError) {
    return { success: false, error: depthError };
  }

  const filePath = join(dir, 'glossary.yaml');

  try {
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write YAML
    const content = yaml.stringify(glossary);
    await fs.writeFile(filePath, content, 'utf-8');

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Save pattern cache to patterns.yaml
 *
 * Flow:
 * 1. Sanitize IDs in SOQL (replace with <ID_REMOVED>)
 * 2. Check if sanitized SOQL has non-sanitizable user data (OwnerId, Email, etc.)
 * 3. Reject if non-sanitizable user data found
 * 4. Save sanitized patterns
 *
 * @param dir - Directory to save to
 * @param patterns - Pattern knowledge to save
 * @returns Success or error
 */
export async function savePatternCache(
  dir: string,
  patterns: PatternKnowledge
): Promise<Result<void, Error>> {
  // Sanitize IDs first, then validate
  const sanitizedPatterns: PatternKnowledge = {
    ...patterns,
    patterns: patterns.patterns.map((p) => ({
      ...p,
      soql: sanitizeSOQLForCache(p.soql),
    })),
  };

  // Check for non-sanitizable user-specific data in the SANITIZED patterns
  for (const pattern of sanitizedPatterns.patterns) {
    if (hasNonSanitizableUserData(pattern.soql)) {
      return {
        success: false,
        error: new Error('SECURITY: Cannot save pattern with user-specific data'),
      };
    }
  }

  const filePath = join(dir, 'patterns.yaml');

  try {
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write YAML
    const content = yaml.stringify(sanitizedPatterns);
    await fs.writeFile(filePath, content, 'utf-8');

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Save a new pattern to the pattern cache
 *
 * @param input - Pattern input data
 * @param dir - Directory containing patterns.yaml
 * @returns Created pattern or error
 */
export async function savePattern(
  input: SavePatternInput,
  dir: string = getKnowledgeDir()
): Promise<Result<QueryPattern, Error>> {
  // Load current patterns
  const loadResult = await loadPatternCache(dir);
  if (!loadResult.success) {
    return loadResult;
  }

  const patterns = loadResult.data;

  // Generate unique ID
  const maxId = patterns.patterns.reduce((max, p) => {
    const num = parseInt(p.id.replace('pat_', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  const newId = `pat_${String(maxId + 1).padStart(3, '0')}`;

  // Create new pattern
  const now = new Date().toISOString();
  const newPattern: QueryPattern = {
    id: newId,
    naturalLanguage: input.naturalLanguage,
    normalizedQuery: input.normalizedQuery,
    soql: input.soql,
    glossaryTermsUsed: input.glossaryTermsUsed,
    schemaFieldsUsed: input.schemaFieldsUsed,
    createdAt: now,
    lastUsed: now,
    useCount: 1,
    confidence: input.confidence,
  };

  // Add to patterns array
  patterns.patterns.push(newPattern);

  // Update query index
  const tokens = tokenize(normalizeQuery(input.naturalLanguage));
  for (const token of tokens) {
    if (!patterns.queryIndex[token]) {
      patterns.queryIndex[token] = [];
    }
    if (!patterns.queryIndex[token].includes(newId)) {
      patterns.queryIndex[token].push(newId);
    }
  }

  // Update timestamp
  patterns.lastUpdated = now;

  // Save back
  const saveResult = await savePatternCache(dir, patterns);
  if (!saveResult.success) {
    return saveResult;
  }

  return { success: true, data: newPattern };
}
