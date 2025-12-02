/**
 * Phase 11: Skill-Schema Synchronization
 *
 * Validates that service skills (mcp-tools-{service}) documentation
 * stays in sync with actual wrapper Zod schemas.
 *
 * Checks:
 * - Service skill exists for wrapper
 * - InputSchema fields match Parameters documentation
 * - OutputSchema fields match Returns documentation
 * - Field types match
 * - Field optionality matches
 *
 * Reports mismatches as warnings with specific field differences.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AuditResult, Issue, SchemaField, SchemaMismatch } from '../types.js';
import { extractSchemasFromWrapper } from '../lib/schema-parser.js';
import { extractToolFieldsFromSkill, getServiceSkillPath } from '../lib/skill-parser.js';

/**
 * Compare wrapper schema fields with skill documented fields
 */
function compareSchemas(
  wrapperFields: SchemaField[],
  skillFields: SchemaField[],
  context: string
): SchemaMismatch[] {
  const mismatches: SchemaMismatch[] = [];

  // Check for missing fields (in wrapper but not in skill)
  for (const wrapperField of wrapperFields) {
    const skillField = skillFields.find(f => f.name === wrapperField.name);

    if (!skillField) {
      mismatches.push({
        field: wrapperField.name,
        issue: 'missing',
        wrapperValue: `${wrapperField.name}${wrapperField.optional ? '?' : ''}: ${wrapperField.type}`,
      });
      continue;
    }

    // Check type mismatch
    if (wrapperField.type !== skillField.type) {
      mismatches.push({
        field: wrapperField.name,
        issue: 'type',
        wrapperValue: wrapperField.type,
        skillValue: skillField.type,
      });
    }

    // Check optionality mismatch
    if (wrapperField.optional !== skillField.optional) {
      mismatches.push({
        field: wrapperField.name,
        issue: 'optionality',
        wrapperValue: wrapperField.optional ? 'optional' : 'required',
        skillValue: skillField.optional ? 'optional' : 'required',
      });
    }
  }

  // Check for extra fields (in skill but not in wrapper)
  for (const skillField of skillFields) {
    const wrapperField = wrapperFields.find(f => f.name === skillField.name);

    if (!wrapperField) {
      mismatches.push({
        field: skillField.name,
        issue: 'extra',
        skillValue: `${skillField.name}${skillField.optional ? '?' : ''}: ${skillField.type}`,
      });
    }
  }

  return mismatches;
}

/**
 * Format mismatch as human-readable message
 */
function formatMismatch(mismatch: SchemaMismatch, schemaType: 'Input' | 'Output'): string {
  switch (mismatch.issue) {
    case 'missing':
      return `${schemaType}Schema has '${mismatch.wrapperValue}' but skill missing this field`;

    case 'type':
      return `${schemaType}Schema field '${mismatch.field}' type mismatch: wrapper='${mismatch.wrapperValue}', skill='${mismatch.skillValue}'`;

    case 'optionality':
      return `${schemaType}Schema field '${mismatch.field}' optionality mismatch: wrapper=${mismatch.wrapperValue}, skill=${mismatch.skillValue}`;

    case 'extra':
      return `Skill has '${mismatch.skillValue}' but ${schemaType}Schema missing this field`;
  }
}

/**
 * Audit Phase 11: Skill-Schema Synchronization
 */
export async function auditPhase11(wrapperPath: string): Promise<AuditResult> {
  const issues: Issue[] = [];

  // Extract service and tool name from wrapper path
  // Example: .claude/tools/context7/get-library-docs.ts
  const parts = wrapperPath.split(path.sep);
  const toolsIndex = parts.indexOf('tools');
  if (toolsIndex === -1 || toolsIndex + 2 >= parts.length) {
    return {
      issues: [{
        severity: 'CRITICAL',
        phase: 11,
        message: 'Could not extract service/tool from wrapper path',
        suggestion: 'Ensure wrapper is in .claude/tools/{service}/{tool}.ts format',
      }],
      status: 'FAIL',
    };
  }

  const service = parts[toolsIndex + 1];
  const toolFile = parts[toolsIndex + 2];
  const tool = path.basename(toolFile, '.ts');

  // Check if service skill exists
  const skillPath = getServiceSkillPath(service);
  if (!fs.existsSync(skillPath)) {
    return {
      issues: [{
        severity: 'WARNING',
        phase: 11,
        message: `Service skill not found: ${skillPath}`,
        suggestion: `Run: npm run generate-skill -- ${service}`,
      }],
      status: 'WARN',
    };
  }

  // Extract wrapper schemas
  const { inputFields, outputFields } = extractSchemasFromWrapper(wrapperPath);

  // Extract skill documentation
  const { inputFields: skillInputFields, outputFields: skillOutputFields } =
    extractToolFieldsFromSkill(skillPath, tool);

  // Compare InputSchema with Parameters documentation
  const inputMismatches = compareSchemas(inputFields, skillInputFields, 'Input');
  if (inputMismatches.length > 0) {
    for (const mismatch of inputMismatches) {
      issues.push({
        severity: 'WARNING',
        phase: 11,
        message: formatMismatch(mismatch, 'Input'),
        suggestion: `Run: npm run fix -- ${service}/${tool} --apply phase11-regenerate-skill`,
      });
    }
  }

  // Compare OutputSchema with Returns documentation
  const outputMismatches = compareSchemas(outputFields, skillOutputFields, 'Output');
  if (outputMismatches.length > 0) {
    for (const mismatch of outputMismatches) {
      issues.push({
        severity: 'WARNING',
        phase: 11,
        message: formatMismatch(mismatch, 'Output'),
        suggestion: `Run: npm run fix -- ${service}/${tool} --apply phase11-regenerate-skill`,
      });
    }
  }

  // If no mismatches, report success
  if (issues.length === 0) {
    return {
      issues: [],
      status: 'PASS',
    };
  }

  return {
    issues,
    status: 'WARN',
  };
}
