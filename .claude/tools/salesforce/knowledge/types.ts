/**
 * Salesforce Knowledge Layer Types
 *
 * Zod schemas for the 3-layer knowledge system:
 * - Layer 1: Schema (auto-introspected from Salesforce org)
 * - Layer 2: Glossary (human-curated business terms)
 * - Layer 3: Patterns (auto-learned query cache)
 *
 * @see Architecture: /.claude/.output/mcp-wrappers/2026-01-16-165022-salesforce-knowledge-layer/tool-lead-architecture.md
 */

import { z } from 'zod';

// ============================================
// Layer 1: Schema Knowledge Schemas
// ============================================

/**
 * Picklist value definition
 */
export const PicklistValueSchema = z.object({
  value: z.string(),
  label: z.string(),
  default: z.boolean().default(false),
});

export type PicklistValue = z.infer<typeof PicklistValueSchema>;

/**
 * Salesforce field types
 */
export const FieldTypeEnum = z.enum([
  'String',
  'Text',
  'TextArea',
  'LongTextArea',
  'RichTextArea',
  'Currency',
  'Date',
  'DateTime',
  'Checkbox',
  'Number',
  'Percent',
  'Phone',
  'Email',
  'URL',
  'Picklist',
  'MultiSelectPicklist',
  'Lookup',
  'MasterDetail',
  'Formula',
  'AutoNumber',
  'Id',
  'Reference',
]);

/**
 * Field definition for a Salesforce object field
 */
export const FieldDefinitionSchema = z.object({
  type: FieldTypeEnum,
  label: z.string(),
  apiName: z.string(),
  required: z.boolean().default(false),
  picklistValues: z.array(PicklistValueSchema).optional(),
  referenceTo: z.string().optional(),
  formula: z.string().optional(),
  length: z.number().optional(),
  precision: z.number().optional(),
  scale: z.number().optional(),
  isFilterable: z.boolean().optional(),
  isAccessible: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

/**
 * Object definition for a Salesforce object
 */
export const ObjectDefinitionSchema = z.object({
  label: z.string(),
  apiName: z.string(),
  fields: z.record(z.string(), FieldDefinitionSchema),
  keyPrefix: z.string().optional(),
  isQueryable: z.boolean().optional(),
  isCreateable: z.boolean().optional(),
  isUpdateable: z.boolean().optional(),
  isDeletable: z.boolean().optional(),
});

export type ObjectDefinition = z.infer<typeof ObjectDefinitionSchema>;

/**
 * Layer 1: Schema Knowledge - auto-introspected Salesforce metadata
 */
export const SchemaKnowledgeSchema = z.object({
  version: z.string(),
  syncedAt: z.string().datetime(),
  orgId: z.string(),
  objects: z.record(z.string(), ObjectDefinitionSchema),
  fieldIndex: z.record(z.string(), z.array(z.string())), // keyword → field paths (e.g., "amount" → ["Opportunity.Amount"])
});

export type SchemaKnowledge = z.infer<typeof SchemaKnowledgeSchema>;

// ============================================
// Layer 2: Glossary Knowledge Schemas
// ============================================

/**
 * Operators for SOQL conditions
 */
export const OperatorEnum = z.enum(['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN', 'NOT IN']);

/**
 * Field condition in a glossary term
 */
export const FieldConditionSchema = z.object({
  field: z.string(),
  value: z.string().optional(),
  operator: OperatorEnum.default('='),
  range: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

export type FieldCondition = z.infer<typeof FieldConditionSchema>;

/**
 * Glossary term - human-curated business term mapping
 */
export const GlossaryTermSchema = z.object({
  description: z.string(),
  condition: z.string(), // SOQL WHERE clause fragment
  objects: z.array(z.string()).optional(), // Objects this term applies to
  fields: z.array(FieldConditionSchema),
  inherits: z.array(z.string()).optional(), // Inherit conditions from other terms
  fiscalPeriod: z.boolean().optional(), // Is this a fiscal period term
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

/**
 * Fiscal quarter definition
 */
export const FiscalQuarterSchema = z.object({
  start: z.string(), // MM-DD format
  end: z.string(), // MM-DD format
});

export type FiscalQuarter = z.infer<typeof FiscalQuarterSchema>;

/**
 * Fiscal calendar configuration
 */
export const FiscalCalendarSchema = z.object({
  yearStart: z.string(), // MM-DD format
  quarters: z.record(z.string(), FiscalQuarterSchema),
});

export type FiscalCalendar = z.infer<typeof FiscalCalendarSchema>;

/**
 * Layer 2: Glossary Knowledge - human-curated business terms
 */
export const GlossaryKnowledgeSchema = z.object({
  version: z.string(),
  lastUpdated: z.string().datetime(),
  updatedBy: z.string().optional(),
  terms: z.record(z.string(), GlossaryTermSchema),
  aliases: z.record(z.string(), z.string()), // alias → canonical term
  fiscalCalendar: FiscalCalendarSchema.optional(),
});

export type GlossaryKnowledge = z.infer<typeof GlossaryKnowledgeSchema>;

// ============================================
// Layer 3: Pattern Knowledge Schemas
// ============================================

/**
 * Query pattern - auto-learned successful query mapping
 */
export const QueryPatternSchema = z.object({
  id: z.string(),
  naturalLanguage: z.string(),
  normalizedQuery: z.string(),
  soql: z.string(),
  glossaryTermsUsed: z.array(z.string()),
  schemaFieldsUsed: z.array(z.string()),
  createdAt: z.string().datetime(),
  lastUsed: z.string().datetime(),
  useCount: z.number().min(1),
  confidence: z.number().min(0).max(1),
});

export type QueryPattern = z.infer<typeof QueryPatternSchema>;

/**
 * Layer 3: Pattern Knowledge - auto-learned query patterns
 */
export const PatternKnowledgeSchema = z.object({
  version: z.string(),
  lastUpdated: z.string().datetime(),
  patterns: z.array(QueryPatternSchema),
  queryIndex: z.record(z.string(), z.array(z.string())), // keyword → pattern IDs
});

export type PatternKnowledge = z.infer<typeof PatternKnowledgeSchema>;

// ============================================
// Resolution Result Schema
// ============================================

/**
 * Resolution source types
 */
export const ResolutionSourceEnum = z.enum([
  'pattern_cache',
  'glossary',
  'schema',
  'tooling_api',
  'direct',
]);

export type ResolutionSource = z.infer<typeof ResolutionSourceEnum>;

/**
 * Resolution result - output from QueryResolver.resolve()
 */
export const ResolutionResultSchema = z.object({
  success: z.boolean(),
  soql: z.string().optional(),
  source: ResolutionSourceEnum,
  confidence: z.number().min(0).max(1),
  normalizedQuery: z.string().optional(),
  matchedTerms: z.array(z.string()).optional(),
  fieldsUsed: z.array(z.string()).optional(),
  error: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;

// ============================================
// Aggregate Types
// ============================================

/**
 * Complete knowledge context containing all 3 layers
 */
export interface KnowledgeContext {
  schema: SchemaKnowledge;
  glossary: GlossaryKnowledge;
  patterns: PatternKnowledge;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Input for saving a new pattern
 */
export interface SavePatternInput {
  naturalLanguage: string;
  normalizedQuery: string;
  soql: string;
  glossaryTermsUsed: string[];
  schemaFieldsUsed: string[];
  confidence: number;
}
