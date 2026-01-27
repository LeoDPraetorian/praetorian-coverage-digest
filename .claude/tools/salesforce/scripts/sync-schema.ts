#!/usr/bin/env npx tsx
/**
 * sync-schema.ts - Sync Salesforce schema to knowledge layer
 *
 * Parses Salesforce describe files (HTML tables) and updates schema.yaml
 *
 * Usage:
 *   npx tsx scripts/sync-schema.ts --from-files
 *   npx tsx scripts/sync-schema.ts --from-files --verbose
 *
 * Future: --from-org option for live introspection
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { SchemaKnowledge, ObjectDefinition, FieldDefinition } from '../knowledge/types.js';
import { saveSchemaCache, getKnowledgeDir } from '../knowledge/knowledge-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI Argument Parsing
// ============================================

interface Args {
  fromFiles: boolean;
  fromOrg: boolean;
  targetOrg?: string;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    fromFiles: false,
    fromOrg: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--from-files':
        result.fromFiles = true;
        break;
      case '--from-org':
        result.fromOrg = true;
        break;
      case '--target-org':
        result.targetOrg = args[++i];
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
sync-schema.ts - Sync Salesforce schema to knowledge layer

Usage:
  npx tsx scripts/sync-schema.ts [options]

Options:
  --from-files     Parse *.xls describe files in schemas/ directory (default)
  --from-org       Refresh from Salesforce org (requires auth) [NOT IMPLEMENTED]
  --target-org     Specify target org alias for --from-org
  --verbose, -v    Show detailed output
  --help, -h       Show this help message

Examples:
  npx tsx scripts/sync-schema.ts --from-files
  npx tsx scripts/sync-schema.ts --from-files --verbose
`);
}

// ============================================
// HTML Parsing Functions
// ============================================

/**
 * Map Salesforce SOAP types to our FieldType enum
 */
function mapSoapType(soapType: string, type: string): string {
  const typeMap: Record<string, string> = {
    'xsd:string': 'String',
    'xsd:boolean': 'Checkbox',
    'xsd:double': 'Number',
    'xsd:int': 'Number',
    'xsd:date': 'Date',
    'xsd:dateTime': 'DateTime',
    'tns:ID': 'Id',
    'xsd:base64Binary': 'String',
    'xsd:anyType': 'String',
  };

  // Check if type contains special keywords
  if (type.toLowerCase().includes('picklist')) {
    return 'Picklist';
  }
  if (type.toLowerCase().includes('reference')) {
    return 'Reference';
  }
  if (type.toLowerCase().includes('lookup')) {
    return 'Lookup';
  }
  if (type.toLowerCase().includes('formula')) {
    return 'Formula';
  }
  if (type.toLowerCase().includes('currency')) {
    return 'Currency';
  }
  if (type.toLowerCase().includes('percent')) {
    return 'Percent';
  }
  if (type.toLowerCase().includes('phone')) {
    return 'Phone';
  }
  if (type.toLowerCase().includes('email')) {
    return 'Email';
  }
  if (type.toLowerCase().includes('url')) {
    return 'URL';
  }
  if (type.toLowerCase().includes('textarea')) {
    return 'TextArea';
  }
  if (type.toLowerCase().includes('autonumber')) {
    return 'AutoNumber';
  }

  return typeMap[soapType] || 'String';
}

/**
 * Extract text content from an HTML cell
 */
function extractCellText(cell: string): string {
  // Remove HTML tags and decode entities
  return cell
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Parse an HTML table and extract rows
 */
function parseTable(html: string): string[][] {
  const rows: string[][] = [];

  // Find all table rows
  const rowMatches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];

    // Find all cells (th or td)
    const cellMatches = rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
    for (const cellMatch of cellMatches) {
      cells.push(extractCellText(cellMatch[1]));
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * Parse a describe file and extract object and field definitions
 */
function parseDescribeFile(filePath: string, verbose: boolean): ObjectDefinition | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract object name from filename
  const filename = path.basename(filePath);
  const objectNameMatch = filename.match(/^(.+)_describe\.xls$/i);
  if (!objectNameMatch) {
    if (verbose) console.log(`  Skipping ${filename} - not a describe file`);
    return null;
  }

  // Capitalize object name (account -> Account)
  const objectApiName =
    objectNameMatch[1].charAt(0).toUpperCase() + objectNameMatch[1].slice(1).toLowerCase();

  // Find the object metadata table (first table)
  const tables = content.split(/<table[^>]*>/gi);

  if (tables.length < 2) {
    if (verbose) console.log(`  No tables found in ${filename}`);
    return null;
  }

  // Parse first table for object metadata
  const objectTable = parseTable(tables[1]);
  let objectLabel = objectApiName;
  let keyPrefix = '';
  let isQueryable = true;
  let isCreateable = true;
  let isUpdateable = true;
  let isDeletable = true;

  // Find header row and data row
  if (objectTable.length >= 2) {
    const headers = objectTable[0].map((h) => h.toLowerCase());
    const data = objectTable[1];

    const labelIdx = headers.findIndex((h) => h.includes('label') && !h.includes('plural'));
    const nameIdx = headers.findIndex((h) => h === 'name' || h === 'local name');
    const keyPrefixIdx = headers.findIndex((h) => h.includes('key prefix'));
    const queryableIdx = headers.findIndex((h) => h.includes('queryable'));
    const createableIdx = headers.findIndex((h) => h.includes('createable'));
    const updateableIdx = headers.findIndex((h) => h.includes('updateable'));
    const deletableIdx = headers.findIndex((h) => h.includes('deletable'));

    if (labelIdx >= 0 && data[labelIdx]) objectLabel = data[labelIdx];
    if (keyPrefixIdx >= 0 && data[keyPrefixIdx]) keyPrefix = data[keyPrefixIdx];
    if (queryableIdx >= 0) isQueryable = data[queryableIdx]?.toLowerCase() === 'true';
    if (createableIdx >= 0) isCreateable = data[createableIdx]?.toLowerCase() === 'true';
    if (updateableIdx >= 0) isUpdateable = data[updateableIdx]?.toLowerCase() === 'true';
    if (deletableIdx >= 0) isDeletable = data[deletableIdx]?.toLowerCase() === 'true';
  }

  // Find the fields table (usually the 4th table, after object, child relationships, record types)
  // Look for a table with headers that include "Name", "Label", "Type"
  const fields: Record<string, FieldDefinition> = {};

  for (let i = 2; i < tables.length; i++) {
    const table = parseTable(tables[i]);
    if (table.length < 2) continue;

    const headers = table[0].map((h) => h.toLowerCase());

    // Check if this looks like a fields table
    const hasName =
      headers.some((h) => h === 'name' || h === 'local name') &&
      !headers.some((h) => h.includes('child'));
    const hasLabel = headers.some((h) => h.includes('label'));
    const hasType = headers.some((h) => h === 'type');

    if (!hasName || !hasLabel || !hasType) continue;

    // This is the fields table
    const nameIdx = headers.findIndex((h) => h === 'name' || h === 'local name');
    const labelIdx = headers.findIndex((h) => h === 'label');
    const typeIdx = headers.findIndex((h) => h === 'type');
    const soapTypeIdx = headers.findIndex((h) => h.includes('soap type'));
    const lengthIdx = headers.findIndex((h) => h === 'length');
    const precisionIdx = headers.findIndex((h) => h === 'precision');
    const scaleIdx = headers.findIndex((h) => h === 'scale');
    const accessibleIdx = headers.findIndex((h) => h.includes('accessible'));
    const filterableIdx = headers.findIndex((h) => h.includes('filterable'));
    const customIdx = headers.findIndex((h) => h.includes('custom'));
    const referenceIdx = headers.findIndex((h) => h.includes('reference'));

    // Parse each field row (skip header)
    for (let j = 1; j < table.length; j++) {
      const row = table[j];
      if (!row[nameIdx]) continue;

      const fieldApiName = row[nameIdx];
      const fieldLabel = row[labelIdx] || fieldApiName;
      const rawType = row[typeIdx] || 'String';
      const soapType = row[soapTypeIdx] || '';
      const fieldType = mapSoapType(soapType, rawType);

      const field: FieldDefinition = {
        type: fieldType as FieldDefinition['type'],
        label: fieldLabel,
        apiName: fieldApiName,
        required: false, // Would need nillable field to determine
      };

      // Add optional fields
      if (lengthIdx >= 0 && row[lengthIdx]) {
        const len = parseInt(row[lengthIdx], 10);
        if (!isNaN(len) && len > 0) field.length = len;
      }
      if (precisionIdx >= 0 && row[precisionIdx]) {
        const prec = parseInt(row[precisionIdx], 10);
        if (!isNaN(prec) && prec > 0) field.precision = prec;
      }
      if (scaleIdx >= 0 && row[scaleIdx]) {
        const scl = parseInt(row[scaleIdx], 10);
        if (!isNaN(scl)) field.scale = scl;
      }
      if (accessibleIdx >= 0) {
        field.isAccessible = row[accessibleIdx]?.toLowerCase() === 'true';
      }
      if (filterableIdx >= 0) {
        field.isFilterable = row[filterableIdx]?.toLowerCase() === 'true';
      }
      if (customIdx >= 0) {
        field.isCustom = row[customIdx]?.toLowerCase() === 'true';
      }
      if (referenceIdx >= 0 && row[referenceIdx]) {
        field.referenceTo = row[referenceIdx];
      }

      fields[fieldApiName] = field;
    }

    // Found fields table, stop searching
    break;
  }

  const objectDef: ObjectDefinition = {
    label: objectLabel,
    apiName: objectApiName,
    fields,
    keyPrefix: keyPrefix || undefined,
    isQueryable,
    isCreateable,
    isUpdateable,
    isDeletable,
  };

  if (verbose) {
    console.log(`  ${objectApiName}: ${Object.keys(fields).length} fields`);
  }

  return objectDef;
}

/**
 * Build field index for fast keyword lookup
 */
function buildFieldIndex(objects: Record<string, ObjectDefinition>): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  for (const [objectName, objectDef] of Object.entries(objects)) {
    for (const [fieldName, fieldDef] of Object.entries(objectDef.fields)) {
      const fieldPath = `${objectName}.${fieldName}`;

      // Index by field API name (lowercase)
      const apiNameKey = fieldName.toLowerCase();
      if (!index[apiNameKey]) index[apiNameKey] = [];
      if (!index[apiNameKey].includes(fieldPath)) {
        index[apiNameKey].push(fieldPath);
      }

      // Index by field label words
      const labelWords = fieldDef.label.toLowerCase().split(/\s+/);
      for (const word of labelWords) {
        if (word.length > 2) {
          // Skip short words
          if (!index[word]) index[word] = [];
          if (!index[word].includes(fieldPath)) {
            index[word].push(fieldPath);
          }
        }
      }
    }
  }

  return index;
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.fromFiles && !args.fromOrg) {
    // Default to --from-files
    args.fromFiles = true;
  }

  if (args.fromOrg) {
    console.error('Error: --from-org is not yet implemented');
    console.error('Use --from-files to parse local describe files');
    process.exit(1);
  }

  // Parse describe files
  const schemasDir = path.resolve(__dirname, '../schemas');

  if (!fs.existsSync(schemasDir)) {
    console.error(`Error: Schemas directory not found: ${schemasDir}`);
    process.exit(1);
  }

  console.log('Syncing schema from describe files...');
  if (args.verbose) {
    console.log(`Reading from: ${schemasDir}`);
  }

  const files = fs.readdirSync(schemasDir).filter((f) => f.endsWith('_describe.xls'));

  if (files.length === 0) {
    console.error('Error: No describe files found in schemas directory');
    process.exit(1);
  }

  console.log(`Found ${files.length} describe files`);

  const objects: Record<string, ObjectDefinition> = {};

  for (const file of files) {
    const filePath = path.join(schemasDir, file);
    const objectDef = parseDescribeFile(filePath, args.verbose);
    if (objectDef) {
      objects[objectDef.apiName] = objectDef;
    }
  }

  // Build the schema knowledge
  const fieldIndex = buildFieldIndex(objects);

  const schema: SchemaKnowledge = {
    version: '1.0.0',
    syncedAt: new Date().toISOString(),
    orgId: 'local-describe-files',
    objects,
    fieldIndex,
  };

  // Save to knowledge/schema.yaml
  const knowledgeDir = getKnowledgeDir();
  await saveSchemaCache(knowledgeDir, schema);

  console.log(`\nSchema synced successfully!`);
  console.log(`  Objects: ${Object.keys(objects).length}`);
  console.log(
    `  Fields: ${Object.values(objects).reduce((sum, o) => sum + Object.keys(o.fields).length, 0)}`
  );
  console.log(`  Index terms: ${Object.keys(fieldIndex).length}`);
  console.log(`  Saved to: ${path.join(knowledgeDir, 'schema.yaml')}`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
