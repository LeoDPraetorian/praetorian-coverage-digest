/**
 * Generate Service-Specific Skill
 *
 * Creates/updates mcp-tools-{service} skill in skill-library
 * for granular agent access control.
 *
 * Ported from archived mcp-code-2-skill/generate-service-skill.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { findRepoRoot, getToolsDir } from '../utils.js';
import { EXIT_SUCCESS, EXIT_ERROR, EXIT_ISSUES, type CLIOptions } from '../types.js';
import { extractSchemasFromWrapper, formatSchemaAsInterface } from '../lib/schema-parser.js';

/**
 * Convert kebab-case filename to camelCase export name
 * list-issues → listIssues, create-comment → createComment
 */
function toCamelCase(kebabCase: string): string {
  return kebabCase
    .split('-')
    .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Check if file is an actual MCP tool wrapper (has export + execute)
 */
function isToolWrapper(content: string): boolean {
  const hasExport = /export\s+const\s+\w+\s*=\s*\{/.test(content);
  const hasExecute = /async\s+execute\s*\(/.test(content);
  return hasExport && hasExecute;
}

/**
 * Extract tool metadata from wrapper file
 */
function extractToolMetadata(filePath: string, service: string): {
  name: string;
  exportName: string;
  purpose: string;
  tokens: string;
  inputInterface?: string;
  outputInterface?: string;
} | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (!isToolWrapper(content)) {
    return null;
  }

  const toolName = path.basename(filePath, '.ts');

  // Convert kebab-case to camelCase for export name
  const camelCaseName = toCamelCase(toolName);

  // Fallback: regex extraction for non-standard cases
  const constMatch = content.match(/export\s+const\s+(\w+)\s*=\s*\{[\s\S]*?async\s+execute/);
  const exportMatch = content.match(/export\s*{\s*(\w+)\s*}/);
  const actualExportName = camelCaseName || constMatch?.[1] || exportMatch?.[1] || toolName.replace(/-/g, '');

  // Extract purpose from comments (lines 1-5)
  const purpose = content.split('\n').slice(0, 5)
    .filter(l => l.startsWith('//'))
    .map(l => l.replace(/^\/\/\s*/, ''))
    .join(' ')
    .trim();

  // Extract token estimate
  const tokenMatch =
    content.match(/estimatedTokens[:\s]+(\d+)/) ||
    content.match(/estimated_tokens[:\s]+(\d+)/) ||
    content.match(/Token\s+savings:\s*~(\d+)%/);
  const tokens = tokenMatch ? tokenMatch[1] : 'unknown';

  // Extract schemas for documentation
  const { inputFields, outputFields } = extractSchemasFromWrapper(filePath);

  // Generate interface documentation
  const pascalToolName = toolName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const inputInterface = inputFields.length > 0
    ? formatSchemaAsInterface(inputFields, `${pascalToolName}Input`)
    : undefined;

  const outputInterface = outputFields.length > 0
    ? formatSchemaAsInterface(outputFields, `${pascalToolName}Output`)
    : undefined;

  return { name: toolName, exportName: actualExportName, purpose, tokens, inputInterface, outputInterface };
}

/**
 * Generate skill content from tool metadata
 */
function generateSkillContent(service: string, tools: Array<{
  name: string;
  exportName: string;
  purpose: string;
  tokens: string;
  inputInterface?: string;
  outputInterface?: string;
}>): string {
  const serviceName = service.charAt(0).toUpperCase() + service.slice(1).replace(/-/g, ' ');
  const toolList = tools.map(t => t.name).slice(0, 3).join(', ');
  const moreText = tools.length > 3 ? ', and more' : '';

  return `---
name: mcp-tools-${service}
description: Use when accessing ${service} services - provides ${tools.length} tools for ${toolList}${moreText}. References mcp-tools-registry for Bash + tsx execution patterns. Enables granular agent access control.
allowed-tools: Read, Bash
skills: [mcp-tools-registry]
---

# ${serviceName} MCP Tools

**GRANULAR ACCESS CONTROL:** Include this skill to give agent ${service} access ONLY.

> **Execution patterns:** See mcp-tools-registry for Bash + npx tsx usage
> This skill provides ${service}-specific tool catalog.

## Purpose

Enable granular agent access control for ${service} operations.

**Include this skill when:** Agent needs ${service} access
**Exclude this skill when:** Agent should NOT access ${service}

## Available Tools (Auto-discovered: ${tools.length} wrappers)

${tools.map(t => {
  let doc = `### ${t.name}\n- **Purpose:** ${t.purpose || 'MCP wrapper for ' + t.name}\n- **Import:** \`import { ${t.exportName} } from './.claude/tools/${service}/${t.name}.ts'\`\n- **Token cost:** ~${t.tokens} tokens\n`;

  // Add Parameters section if available
  if (t.inputInterface) {
    doc += `\n**Parameters:**\n\`\`\`typescript\n${t.inputInterface}\n\`\`\`\n`;
  }

  // Add Returns section if available
  if (t.outputInterface) {
    doc += `\n**Returns:**\n\`\`\`typescript\n${t.outputInterface}\n\`\`\`\n`;
  }

  return doc;
}).join('\n')}

## Quick Examples

See mcp-tools-registry for complete Bash + tsx execution patterns.

**Inline execution:**
\`\`\`bash
# Note: 2>/dev/null suppresses MCP debug logs
npx tsx -e "(async () => {
  const { ${tools[0]?.exportName} } = await import('./.claude/tools/${service}/${tools[0]?.name}.ts');
  const result = await ${tools[0]?.exportName}.execute({ /* params */ });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
\`\`\`

## Related Skills

- **mcp-tools-registry** - Execution patterns (REQUIRED - see for Bash + tsx usage)
- **mcp-code-create** - Create new wrappers
- **mcp-code-test** - Test wrappers
`;
}

export async function generateSkill(options: CLIOptions): Promise<number> {
  const { service, dryRun, verbose } = options;

  if (!service) {
    console.error('❌ GENERATE-SKILL requires service name');
    console.error('   Usage: npm run generate-skill -- <service>');
    return EXIT_ERROR;
  }

  const repoRoot = findRepoRoot();
  const toolsDir = getToolsDir();
  const serviceDir = path.join(toolsDir, service);

  // Verify service directory exists
  if (!fs.existsSync(serviceDir)) {
    console.error(`❌ Service directory not found: ${serviceDir}`);
    console.error(`   Available services:`);
    const services = fs.readdirSync(toolsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'config' && d.name !== 'scripts')
      .map(d => d.name);
    services.forEach(s => console.error(`     - ${s}`));
    return EXIT_ERROR;
  }

  console.log(`\n🔍 GENERATE-SKILL: ${service}`);
  console.log('─'.repeat(50));

  // Scan wrapper files
  const files = fs.readdirSync(serviceDir)
    .filter(f => f.endsWith('.ts'))
    .filter(f => !f.includes('index'))
    .filter(f => !f.endsWith('.test.ts'))
    .filter(f => !f.endsWith('.unit.test.ts'))
    .filter(f => !f.endsWith('.integration.test.ts'))
    .filter(f => !f.includes('discover'))
    .filter(f => !f.includes('validate'))
    .filter(f => !f.includes('update-all'))
    .filter(f => !f.includes('debug'));

  console.log(`Found ${files.length} potential wrapper files`);

  // Extract metadata from each wrapper
  const tools: Array<{
    name: string;
    exportName: string;
    purpose: string;
    tokens: string;
  }> = [];

  for (const file of files) {
    const filePath = path.join(serviceDir, file);
    const metadata = extractToolMetadata(filePath, service);

    if (metadata) {
      tools.push(metadata);
      if (verbose) {
        console.log(`  ✅ ${file} → ${metadata.exportName}`);
      }
    } else {
      console.log(`  ⏭️  Skipping ${file} (not a tool wrapper)`);
    }
  }

  if (tools.length === 0) {
    console.error(`\n⚠️  Tool Error - No tool wrappers found in ${serviceDir}`);
    console.error('   Create wrappers first: npm run --silent create -- <service> <tool>');
    return EXIT_ERROR;
  }

  console.log(`\n✅ Found ${tools.length} tool wrappers`);

  // Generate skill content
  const skillContent = generateSkillContent(service, tools);

  // Determine output path (skill-library for service skills)
  const skillDir = path.join(repoRoot, '.claude', 'skill-library', 'claude', 'mcp-tools', `mcp-tools-${service}`);
  const skillPath = path.join(skillDir, 'SKILL.md');

  if (dryRun) {
    console.log('\n' + '='.repeat(60));
    console.log('DRY RUN - Would generate:');
    console.log(`File: ${skillPath}`);
    console.log('='.repeat(60) + '\n');
    console.log(skillContent);
    console.log('='.repeat(60));
    console.log(`\n✅ Dry run complete (no files written)`);
    return EXIT_SUCCESS;
  }

  // Check if skill already exists
  const exists = fs.existsSync(skillPath);

  // Create directory and write file
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillPath, skillContent);

  console.log(`\n✅ ${exists ? 'Updated' : 'Generated'}: ${skillPath}`);
  console.log(`   Tools: ${tools.length}`);
  console.log(`\n📋 NEXT STEPS:`);
  console.log(`   1. Review generated skill: ${skillPath}`);
  console.log(`   2. Commit changes`);
  console.log(`   3. Agents with this skill can now discover ${service} tools\n`);

  return EXIT_SUCCESS;
}
