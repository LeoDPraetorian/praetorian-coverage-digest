#!/usr/bin/env npx tsx
/**
 * teach.ts - Manage Salesforce knowledge glossary terms
 *
 * Add, remove, and list business term definitions that map to SOQL conditions.
 *
 * Usage:
 *   npx tsx scripts/teach.ts add --term "bookings" --condition "StageName = 'Closed Won'"
 *   npx tsx scripts/teach.ts add --term "q1" --fields "CloseDate:range:2026-01-01:2026-03-31"
 *   npx tsx scripts/teach.ts alias --alias "deals" --term "bookings"
 *   npx tsx scripts/teach.ts remove --term "bookings"
 *   npx tsx scripts/teach.ts list
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import type { GlossaryKnowledge, GlossaryTerm, FieldCondition } from '../knowledge/types.js';
import { loadGlossaryKnowledge, saveGlossaryCache, getKnowledgeDir } from '../knowledge/knowledge-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI Argument Parsing
// ============================================

interface AddArgs {
  command: 'add';
  term: string;
  description?: string;
  condition?: string;
  objects?: string[];
  fields?: string[];
  inherits?: string[];
  fiscalPeriod?: boolean;
}

interface AliasArgs {
  command: 'alias';
  alias: string;
  term: string;
}

interface RemoveArgs {
  command: 'remove';
  term: string;
}

interface RemoveAliasArgs {
  command: 'remove-alias';
  alias: string;
}

interface ListArgs {
  command: 'list';
  verbose: boolean;
}

interface HelpArgs {
  command: 'help';
}

type Args = AddArgs | AliasArgs | RemoveArgs | RemoveAliasArgs | ListArgs | HelpArgs;

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    return { command: 'help' };
  }

  switch (command) {
    case 'add': {
      const result: AddArgs = { command: 'add', term: '' };
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
          case '--term':
          case '-t':
            result.term = args[++i];
            break;
          case '--description':
          case '-d':
            result.description = args[++i];
            break;
          case '--condition':
          case '-c':
            result.condition = args[++i];
            break;
          case '--objects':
          case '-o':
            result.objects = args[++i].split(',').map(s => s.trim());
            break;
          case '--fields':
          case '-f':
            result.fields = result.fields || [];
            result.fields.push(args[++i]);
            break;
          case '--inherits':
          case '-i':
            result.inherits = args[++i].split(',').map(s => s.trim());
            break;
          case '--fiscal-period':
            result.fiscalPeriod = true;
            break;
        }
      }
      return result;
    }

    case 'alias': {
      const result: AliasArgs = { command: 'alias', alias: '', term: '' };
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
          case '--alias':
          case '-a':
            result.alias = args[++i];
            break;
          case '--term':
          case '-t':
            result.term = args[++i];
            break;
        }
      }
      return result;
    }

    case 'remove': {
      const result: RemoveArgs = { command: 'remove', term: '' };
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
          case '--term':
          case '-t':
            result.term = args[++i];
            break;
        }
      }
      return result;
    }

    case 'remove-alias': {
      const result: RemoveAliasArgs = { command: 'remove-alias', alias: '' };
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
          case '--alias':
          case '-a':
            result.alias = args[++i];
            break;
        }
      }
      return result;
    }

    case 'list': {
      const result: ListArgs = { command: 'list', verbose: false };
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--verbose' || args[i] === '-v') {
          result.verbose = true;
        }
      }
      return result;
    }

    default:
      return { command: 'help' };
  }
}

function printHelp(): void {
  console.log(`
teach.ts - Manage Salesforce knowledge glossary terms

Usage:
  npx tsx scripts/teach.ts <command> [options]

Commands:
  add             Add a new glossary term
  alias           Create an alias for an existing term
  remove          Remove a glossary term
  remove-alias    Remove an alias
  list            List all terms and aliases

Add Options:
  --term, -t          Term name (required)
  --description, -d   Human-readable description
  --condition, -c     SOQL WHERE clause fragment
  --objects, -o       Comma-separated list of objects (e.g., "Opportunity,Account")
  --fields, -f        Field condition (can be repeated)
                      Format: "field:value" or "field:range:start:end"
  --inherits, -i      Comma-separated list of terms to inherit
  --fiscal-period     Mark as a fiscal period term

Alias Options:
  --alias, -a         Alias name (required)
  --term, -t          Target term (required)

Remove Options:
  --term, -t          Term name (required)

Remove-Alias Options:
  --alias, -a         Alias name (required)

List Options:
  --verbose, -v       Show detailed term definitions

Examples:
  # Add a simple term
  npx tsx scripts/teach.ts add --term "bookings" --condition "StageName = 'Closed Won'" --objects "Opportunity"

  # Add a term with field conditions
  npx tsx scripts/teach.ts add --term "q1" --description "Q1 fiscal period" \\
    --fields "CloseDate:range:2026-01-01:2026-03-31" --fiscal-period

  # Add a term that inherits from another
  npx tsx scripts/teach.ts add --term "ps_bookings" --condition "Type = 'PS'" --inherits "bookings"

  # Create an alias
  npx tsx scripts/teach.ts alias --alias "deals" --term "bookings"

  # Remove a term
  npx tsx scripts/teach.ts remove --term "bookings"

  # List all terms
  npx tsx scripts/teach.ts list --verbose
`);
}

// ============================================
// Field Parsing
// ============================================

/**
 * Parse a field condition string
 * Formats:
 *   "field:value" -> { field, value, operator: '=' }
 *   "field:range:start:end" -> { field, range: { start, end } }
 *   "field:op:value" where op is !=, <, >, etc.
 */
function parseFieldCondition(fieldStr: string): FieldCondition {
  const parts = fieldStr.split(':');

  if (parts.length < 2) {
    throw new Error(`Invalid field format: ${fieldStr}. Use "field:value" or "field:range:start:end"`);
  }

  const field = parts[0];

  if (parts[1] === 'range') {
    if (parts.length !== 4) {
      throw new Error(`Invalid range format: ${fieldStr}. Use "field:range:start:end"`);
    }
    return {
      field,
      range: { start: parts[2], end: parts[3] },
    };
  }

  // Check if second part is an operator
  const operators = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN', 'NOT IN'];
  if (operators.includes(parts[1])) {
    return {
      field,
      operator: parts[1] as FieldCondition['operator'],
      value: parts.slice(2).join(':'), // In case value contains colons
    };
  }

  // Default: simple equality
  return {
    field,
    operator: '=',
    value: parts.slice(1).join(':'),
  };
}

// ============================================
// Commands
// ============================================

async function addTerm(args: AddArgs): Promise<void> {
  if (!args.term) {
    console.error('Error: --term is required');
    process.exit(1);
  }

  if (!args.condition && (!args.fields || args.fields.length === 0)) {
    console.error('Error: Either --condition or --fields is required');
    process.exit(1);
  }

  const knowledgeDir = getKnowledgeDir();
  const result = await loadGlossaryKnowledge(knowledgeDir);

  if (!result.success || !result.data) {
    console.error('Error loading glossary:', result.error?.message);
    process.exit(1);
  }

  const glossary = result.data;

  // Validate that inherited terms exist
  if (args.inherits) {
    for (const parentTerm of args.inherits) {
      if (!glossary.terms[parentTerm]) {
        console.error(`Error: Inherited term "${parentTerm}" does not exist`);
        process.exit(1);
      }
    }
  }

  // Parse field conditions
  const fields: FieldCondition[] = [];
  if (args.fields) {
    for (const fieldStr of args.fields) {
      fields.push(parseFieldCondition(fieldStr));
    }
  }

  // Create the term
  const term: GlossaryTerm = {
    description: args.description || `Definition for ${args.term}`,
    condition: args.condition || '',
    objects: args.objects,
    fields,
    inherits: args.inherits,
    fiscalPeriod: args.fiscalPeriod,
  };

  // Add or update the term
  const isUpdate = !!glossary.terms[args.term];
  glossary.terms[args.term] = term;
  glossary.lastUpdated = new Date().toISOString();
  glossary.updatedBy = process.env.USER || 'teach.ts';

  // Save
  await saveGlossaryCache(knowledgeDir, glossary);

  console.log(`${isUpdate ? 'Updated' : 'Added'} term: ${args.term}`);
  console.log(`  Condition: ${term.condition || '(none - using field conditions)'}`);
  if (term.objects) console.log(`  Objects: ${term.objects.join(', ')}`);
  if (term.fields.length > 0) {
    console.log(`  Fields:`);
    for (const f of term.fields) {
      if (f.range) {
        console.log(`    ${f.field}: ${f.range.start} to ${f.range.end}`);
      } else {
        console.log(`    ${f.field} ${f.operator} ${f.value}`);
      }
    }
  }
  if (term.inherits) console.log(`  Inherits: ${term.inherits.join(', ')}`);
}

async function addAlias(args: AliasArgs): Promise<void> {
  if (!args.alias) {
    console.error('Error: --alias is required');
    process.exit(1);
  }
  if (!args.term) {
    console.error('Error: --term is required');
    process.exit(1);
  }

  const knowledgeDir = getKnowledgeDir();
  const result = await loadGlossaryKnowledge(knowledgeDir);

  if (!result.success || !result.data) {
    console.error('Error loading glossary:', result.error?.message);
    process.exit(1);
  }

  const glossary = result.data;

  // Validate target term exists
  if (!glossary.terms[args.term]) {
    console.error(`Error: Term "${args.term}" does not exist`);
    console.error('Create the term first with: teach.ts add --term ' + args.term);
    process.exit(1);
  }

  // Add the alias
  glossary.aliases[args.alias] = args.term;
  glossary.lastUpdated = new Date().toISOString();
  glossary.updatedBy = process.env.USER || 'teach.ts';

  // Save
  await saveGlossaryCache(knowledgeDir, glossary);

  console.log(`Added alias: "${args.alias}" -> "${args.term}"`);
}

async function removeTerm(args: RemoveArgs): Promise<void> {
  if (!args.term) {
    console.error('Error: --term is required');
    process.exit(1);
  }

  const knowledgeDir = getKnowledgeDir();
  const result = await loadGlossaryKnowledge(knowledgeDir);

  if (!result.success || !result.data) {
    console.error('Error loading glossary:', result.error?.message);
    process.exit(1);
  }

  const glossary = result.data;

  if (!glossary.terms[args.term]) {
    console.error(`Error: Term "${args.term}" does not exist`);
    process.exit(1);
  }

  // Check for terms that inherit from this one
  const dependents = Object.entries(glossary.terms)
    .filter(([, t]) => t.inherits?.includes(args.term))
    .map(([name]) => name);

  if (dependents.length > 0) {
    console.error(`Error: Cannot remove "${args.term}" - other terms depend on it:`);
    console.error(`  ${dependents.join(', ')}`);
    process.exit(1);
  }

  // Remove aliases pointing to this term
  const removedAliases: string[] = [];
  for (const [alias, target] of Object.entries(glossary.aliases)) {
    if (target === args.term) {
      delete glossary.aliases[alias];
      removedAliases.push(alias);
    }
  }

  // Remove the term
  delete glossary.terms[args.term];
  glossary.lastUpdated = new Date().toISOString();
  glossary.updatedBy = process.env.USER || 'teach.ts';

  // Save
  await saveGlossaryCache(knowledgeDir, glossary);

  console.log(`Removed term: ${args.term}`);
  if (removedAliases.length > 0) {
    console.log(`Also removed aliases: ${removedAliases.join(', ')}`);
  }
}

async function removeAlias(args: RemoveAliasArgs): Promise<void> {
  if (!args.alias) {
    console.error('Error: --alias is required');
    process.exit(1);
  }

  const knowledgeDir = getKnowledgeDir();
  const result = await loadGlossaryKnowledge(knowledgeDir);

  if (!result.success || !result.data) {
    console.error('Error loading glossary:', result.error?.message);
    process.exit(1);
  }

  const glossary = result.data;

  if (!glossary.aliases[args.alias]) {
    console.error(`Error: Alias "${args.alias}" does not exist`);
    process.exit(1);
  }

  const target = glossary.aliases[args.alias];
  delete glossary.aliases[args.alias];
  glossary.lastUpdated = new Date().toISOString();
  glossary.updatedBy = process.env.USER || 'teach.ts';

  // Save
  await saveGlossaryCache(knowledgeDir, glossary);

  console.log(`Removed alias: "${args.alias}" (was pointing to "${target}")`);
}

async function listTerms(args: ListArgs): Promise<void> {
  const knowledgeDir = getKnowledgeDir();
  const result = await loadGlossaryKnowledge(knowledgeDir);

  if (!result.success || !result.data) {
    console.error('Error loading glossary:', result.error?.message);
    process.exit(1);
  }

  const glossary = result.data;
  const termNames = Object.keys(glossary.terms).sort();
  const aliasNames = Object.keys(glossary.aliases).sort();

  console.log(`\nGlossary Terms (${termNames.length}):`);
  console.log('─'.repeat(50));

  if (termNames.length === 0) {
    console.log('  (no terms defined)');
  } else {
    for (const name of termNames) {
      const term = glossary.terms[name];
      if (args.verbose) {
        console.log(`\n  ${name}:`);
        console.log(`    Description: ${term.description}`);
        if (term.condition) console.log(`    Condition: ${term.condition}`);
        if (term.objects) console.log(`    Objects: ${term.objects.join(', ')}`);
        if (term.fields.length > 0) {
          console.log(`    Fields:`);
          for (const f of term.fields) {
            if (f.range) {
              console.log(`      ${f.field}: ${f.range.start} to ${f.range.end}`);
            } else {
              console.log(`      ${f.field} ${f.operator} ${f.value}`);
            }
          }
        }
        if (term.inherits) console.log(`    Inherits: ${term.inherits.join(', ')}`);
        if (term.fiscalPeriod) console.log(`    Fiscal Period: yes`);
      } else {
        const desc = term.condition || term.description;
        console.log(`  ${name.padEnd(20)} ${desc.substring(0, 50)}${desc.length > 50 ? '...' : ''}`);
      }
    }
  }

  console.log(`\nAliases (${aliasNames.length}):`);
  console.log('─'.repeat(50));

  if (aliasNames.length === 0) {
    console.log('  (no aliases defined)');
  } else {
    for (const alias of aliasNames) {
      console.log(`  ${alias.padEnd(20)} -> ${glossary.aliases[alias]}`);
    }
  }

  console.log();
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  switch (args.command) {
    case 'help':
      printHelp();
      break;
    case 'add':
      await addTerm(args);
      break;
    case 'alias':
      await addAlias(args);
      break;
    case 'remove':
      await removeTerm(args);
      break;
    case 'remove-alias':
      await removeAlias(args);
      break;
    case 'list':
      await listTerms(args);
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
