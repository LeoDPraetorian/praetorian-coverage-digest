/**
 * VERIFY-SKILL operation
 * Validates that service skill exists and matches wrappers
 *
 * Skill Verification Requirements:
 * 1. Skill file MUST exist at expected path
 * 2. All wrappers MUST be documented in skill
 * 3. Optional: Schema sync validation
 *
 * Usage: npm run verify-skill -- <service>
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ERROR } from '../types.js';
import { findRepoRoot, getToolsDir } from '../utils.js';

/**
 * Check if file is an actual MCP tool wrapper (has export + execute)
 * Consistent with generate-skill.ts logic
 */
function isToolWrapper(content: string): boolean {
  const hasExport = /export\s+const\s+\w+\s*=\s*\{/.test(content);
  const hasExecute = /async\s+execute\s*\(/.test(content);
  return hasExport && hasExecute;
}

/**
 * Get wrapper names from service directory
 * Filters out test files, index files, and non-wrapper utilities
 */
function getWrapperNames(serviceDir: string): string[] {
  if (!fs.existsSync(serviceDir)) {
    return [];
  }

  const files = fs.readdirSync(serviceDir)
    .filter(f => f.endsWith('.ts'))
    .filter(f => !f.includes('index'))
    .filter(f => !f.endsWith('.test.ts'))
    .filter(f => !f.endsWith('.unit.test.ts'))
    .filter(f => !f.endsWith('.integration.test.ts'))
    .filter(f => !f.includes('discover'))
    .filter(f => !f.includes('validate'))
    .filter(f => !f.includes('update-all'))
    .filter(f => !f.includes('debug'))
    .filter(f => !f.includes('explore'))
    .filter(f => !f.startsWith('test-'));

  const wrappers: string[] = [];
  for (const file of files) {
    const filePath = path.join(serviceDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (isToolWrapper(content)) {
        wrappers.push(file.replace('.ts', ''));
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return wrappers;
}

/**
 * Extract tool names from skill file
 * Looks for ### tool-name headers in the skill markdown
 */
function getDocumentedTools(skillPath: string): string[] {
  if (!fs.existsSync(skillPath)) {
    return [];
  }

  const content = fs.readFileSync(skillPath, 'utf-8');

  // Match ### headers that look like tool names (lowercase with hyphens/underscores)
  const toolHeaders = content.match(/^###\s+([a-z0-9_-]+)/gim);

  if (!toolHeaders) {
    return [];
  }

  return toolHeaders.map(h => h.replace(/^###\s+/i, '').trim());
}

export async function verifySkill(options: CLIOptions): Promise<number> {
  const { service, verbose } = options;

  if (!service) {
    console.error('❌ VERIFY-SKILL requires service name');
    console.error('   Usage: npm run verify-skill -- <service>');
    return EXIT_ERROR;
  }

  const repoRoot = findRepoRoot();
  const toolsDir = getToolsDir();
  const serviceDir = path.join(toolsDir, service);
  const skillPath = path.join(
    repoRoot,
    '.claude',
    'skill-library',
    'claude',
    'mcp-tools',
    `mcp-tools-${service}`,
    'SKILL.md'
  );

  console.log(`\n🔍 Verifying Skill: ${service}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let allPassed = true;
  const issues: string[] = [];

  // Check 1: Service directory exists
  console.log('1. Checking service directory...');
  if (!fs.existsSync(serviceDir)) {
    console.log(`   ❌ Service directory not found`);
    console.log(`      Expected: .claude/tools/${service}/`);
    issues.push(`Service directory not found: .claude/tools/${service}/`);
    allPassed = false;
  } else {
    console.log(`   ✅ Service directory exists`);
  }

  // Check 2: Skill file exists
  console.log('\n2. Checking skill file...');
  if (!fs.existsSync(skillPath)) {
    console.log(`   ❌ Skill file not found`);
    console.log(`      Expected: .claude/skill-library/claude/mcp-tools/mcp-tools-${service}/SKILL.md`);
    issues.push(`Skill file not found at expected path`);
    allPassed = false;
  } else {
    console.log(`   ✅ Skill file exists`);
  }

  // Check 3: Wrapper parity (only if both exist)
  if (fs.existsSync(serviceDir) && fs.existsSync(skillPath)) {
    console.log('\n3. Checking wrapper parity...');

    const wrapperNames = getWrapperNames(serviceDir);
    const documentedTools = getDocumentedTools(skillPath);

    if (verbose) {
      console.log(`   Wrappers in code: ${wrapperNames.length}`);
      console.log(`   Tools in skill: ${documentedTools.length}`);
    }

    if (wrapperNames.length === 0) {
      console.log(`   ⚠️  No wrappers found in service directory`);
      issues.push('No wrappers found in service directory');
      allPassed = false;
    } else {
      // Find wrappers missing from skill documentation
      const missingFromSkill = wrapperNames.filter(
        w => !documentedTools.some(d => d.toLowerCase() === w.toLowerCase())
      );

      // Find stale entries in skill (documented but no wrapper exists)
      const staleInSkill = documentedTools.filter(
        d => !wrapperNames.some(w => w.toLowerCase() === d.toLowerCase())
      );

      if (missingFromSkill.length === 0) {
        console.log(`   ✅ All ${wrapperNames.length} wrappers documented in skill`);
        for (const wrapper of wrapperNames) {
          console.log(`      - ${wrapper} ✓`);
        }
      } else {
        console.log(`   ❌ ${missingFromSkill.length} wrapper(s) missing from skill:`);
        for (const wrapper of missingFromSkill) {
          console.log(`      - ${wrapper} ✗`);
        }
        issues.push(`Missing from skill: ${missingFromSkill.join(', ')}`);
        allPassed = false;
      }

      // Warn about stale entries (not a failure, just informational)
      if (staleInSkill.length > 0) {
        console.log(`\n   ⚠️  ${staleInSkill.length} stale tool(s) in skill (no wrapper found):`);
        for (const tool of staleInSkill) {
          console.log(`      - ${tool} (stale)`);
        }
        if (verbose) {
          console.log(`      Consider regenerating skill to remove stale entries`);
        }
      }
    }
  } else {
    console.log('\n3. Skipping wrapper parity check (missing files)');
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (allPassed) {
    console.log('✅ SKILL VERIFICATION PASSED\n');
    console.log(`Skill: mcp-tools-${service}`);
    const wrapperCount = getWrapperNames(serviceDir).length;
    console.log(`Wrappers documented: ${wrapperCount}/${wrapperCount}`);
    console.log('\nWorkflow complete! Next steps:');
    console.log('  1. Commit changes');
    console.log(`  2. Agents with mcp-tools-${service} skill can now discover tools\n`);
    return EXIT_SUCCESS;
  } else {
    console.log('❌ SKILL VERIFICATION FAILED\n');
    console.log('Issues found:');
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
    console.log('\nTo fix, run:');
    console.log(`  npm run generate-skill -- ${service}\n`);
    return EXIT_ERROR;
  }
}
