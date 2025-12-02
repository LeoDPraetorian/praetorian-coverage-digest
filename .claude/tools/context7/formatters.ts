/**
 * Context7 Documentation Formatters
 *
 * Pre-built formatters to avoid agents spending 6k+ tokens on markdown generation
 */

/**
 * Format library documentation as markdown
 */
export function formatLibraryDocsAsMarkdown(docs: {
  summary: string;
  tableOfContents?: string[];
  keyFunctions?: Array<{ name: string; description: string }>;
  examples?: Array<{ title: string; code: string }>;
}): string {
  const sections = [];

  // Summary
  sections.push(`# Library Documentation\n`);
  sections.push(docs.summary);
  sections.push('');

  // Table of Contents
  if (docs.tableOfContents && docs.tableOfContents.length > 0) {
    sections.push(`## Table of Contents\n`);
    docs.tableOfContents.forEach(item => {
      sections.push(`- ${item}`);
    });
    sections.push('');
  }

  // Key Functions
  if (docs.keyFunctions && docs.keyFunctions.length > 0) {
    sections.push(`## Key Functions\n`);
    docs.keyFunctions.forEach(func => {
      sections.push(`### ${func.name}\n`);
      sections.push(func.description);
      sections.push('');
    });
  }

  // Examples
  if (docs.examples && docs.examples.length > 0) {
    sections.push(`## Examples\n`);
    docs.examples.forEach(ex => {
      sections.push(`### ${ex.title}\n`);
      sections.push('```typescript');
      sections.push(ex.code);
      sections.push('```\n');
    });
  }

  return sections.join('\n');
}

/**
 * Format library search results as table
 */
export function formatLibrarySearchResults(results: Array<{
  id: string;
  name: string;
  ecosystem: string;
  version?: string;
}>): string {
  const rows = ['| Name | Ecosystem | Version | ID |'];
  rows.push('|------|-----------|---------|-----|');

  for (const lib of results) {
    rows.push(`| ${lib.name} | ${lib.ecosystem} | ${lib.version || 'latest'} | \`${lib.id}\` |`);
  }

  return rows.join('\n');
}

/**
 * Format documentation summary (compact)
 */
export function formatDocsSummary(docs: {
  libraryName: string;
  summary: string;
  keyFunctions?: any[];
}): string {
  const funcCount = docs.keyFunctions?.length || 0;
  return `**${docs.libraryName}**: ${docs.summary.substring(0, 150)}...\n` +
         `Functions documented: ${funcCount}`;
}
