#!/usr/bin/env node
/**
 * Agent Manager - Fix CLI
 * Auto-fix agent compliance issues with deterministic fixes only:
 * 1. Phase 0: Block scalar → single-line
 * 2. Phase 0: Name mismatch → update frontmatter
 * 3. Phase 2: Frontmatter field reordering
 * 4. Phase 16: Table separator format
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import { execSync } from 'child_process';

/**
 * Find project root using git
 */
function getRepoRoot(): string {
  // Try superproject first (for submodule detection)
  try {
    const superRoot = execSync('git rev-parse --show-superproject-working-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (superRoot) return superRoot;
  } catch {
    // Not in submodule
  }

  return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
}

/**
 * Find agent file by name in .claude/agents/
 */
function findAgent(name: string): string | null {
  const repoRoot = getRepoRoot();
  const agentsDir = join(repoRoot, '.claude', 'agents');

  // Recursively search for agent file
  function searchDir(dir: string): string | null {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const result = searchDir(fullPath);
          if (result) return result;
        } else if (entry.isFile() && entry.name === `${name}.md`) {
          return fullPath;
        }
      }
    } catch {
      // Skip unreadable directories
    }

    return null;
  }

  return searchDir(agentsDir);
}

/**
 * Create backup in .local directory with timestamp
 */
function createBackup(agentPath: string, agentName: string): string {
  const agentDir = dirname(agentPath);
  const localDir = join(agentDir, '.local');

  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

  const backupPath = join(localDir, `${timestamp}-${agentName}.bak`);
  const content = readFileSync(agentPath, 'utf-8');
  writeFileSync(backupPath, content, 'utf-8');

  return backupPath;
}

/**
 * Phase 0: Fix block scalar description
 */
function fixBlockScalar(content: string): { fixed: boolean; content: string; message?: string } {
  // Detect block scalar pipe (|) or folded (>)
  const pipePattern = /^description:\s*\|[-+]?\s*$/m;
  const foldedPattern = /^description:\s*>[-+]?\s*$/m;

  let hasBlockScalar = false;
  let blockType = '';

  if (pipePattern.test(content)) {
    hasBlockScalar = true;
    blockType = 'pipe';
  } else if (foldedPattern.test(content)) {
    hasBlockScalar = true;
    blockType = 'folded';
  }

  if (!hasBlockScalar) {
    return { fixed: false, content };
  }

  // Extract the content after the block scalar marker
  // This is simplified - assumes single-line description after marker
  const lines = content.split('\n');
  const descIndex = lines.findIndex((line) =>
    line.match(/^description:\s*[|>][-+]?\s*$/)
  );

  if (descIndex === -1 || descIndex + 1 >= lines.length) {
    return {
      fixed: false,
      content,
      message: 'Could not extract description content after block scalar',
    };
  }

  // Get the description content (next line after block scalar marker)
  const descContent = lines[descIndex + 1].trim();

  // Replace block scalar with single-line format
  lines[descIndex] = `description: ${descContent}`;
  // Remove the line that had the actual content
  lines.splice(descIndex + 1, 1);

  return {
    fixed: true,
    content: lines.join('\n'),
    message: `Block scalar ${blockType} converted to single-line format`,
  };
}

/**
 * Phase 0: Fix name mismatch
 */
function fixNameMismatch(
  content: string,
  expectedName: string
): { fixed: boolean; content: string; message?: string } {
  const namePattern = /^name:\s*(.+?)$/m;
  const match = content.match(namePattern);

  if (!match) {
    return { fixed: false, content, message: 'No name field found in frontmatter' };
  }

  const currentName = match[1].trim();

  if (currentName === expectedName) {
    return { fixed: false, content }; // Already correct
  }

  // Replace name with correct value
  const fixed = content.replace(namePattern, `name: ${expectedName}`);

  return {
    fixed: true,
    content: fixed,
    message: `Name updated from '${currentName}' to '${expectedName}'`,
  };
}

/**
 * Phase 2: Fix frontmatter field order
 */
function fixFieldOrder(content: string): { fixed: boolean; content: string; message?: string } {
  // Canonical order: name, description, type, permissionMode, tools, skills, model, color
  const canonicalOrder = [
    'name',
    'description',
    'type',
    'permissionMode',
    'tools',
    'skills',
    'model',
    'color',
  ];

  const lines = content.split('\n');
  const frontmatterStart = lines.findIndex((line) => line.trim() === '---');
  const frontmatterEnd = lines.findIndex(
    (line, idx) => idx > frontmatterStart && line.trim() === '---'
  );

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    return { fixed: false, content, message: 'Could not find frontmatter boundaries' };
  }

  // Extract frontmatter lines
  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);

  // Parse fields
  const fields: Array<{ key: string; lines: string[] }> = [];
  let currentField: { key: string; lines: string[] } | null = null;

  for (const line of frontmatterLines) {
    // Check if this is a new field (starts with key:)
    const fieldMatch = line.match(/^([a-zA-Z]+):\s*/);

    if (fieldMatch) {
      // Save previous field
      if (currentField) {
        fields.push(currentField);
      }

      // Start new field
      currentField = {
        key: fieldMatch[1],
        lines: [line],
      };
    } else if (currentField) {
      // Continuation of current field (multiline value)
      currentField.lines.push(line);
    }
  }

  // Save last field
  if (currentField) {
    fields.push(currentField);
  }

  // Sort fields by canonical order
  const sortedFields = fields.sort((a, b) => {
    const aIndex = canonicalOrder.indexOf(a.key);
    const bIndex = canonicalOrder.indexOf(b.key);

    // If field not in canonical list, put at end
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });

  // Check if order changed
  const originalOrder = fields.map((f) => f.key).join(',');
  const sortedOrder = sortedFields.map((f) => f.key).join(',');

  if (originalOrder === sortedOrder) {
    return { fixed: false, content }; // Already in correct order
  }

  // Reconstruct frontmatter with sorted fields
  const sortedFrontmatter = sortedFields.flatMap((f) => f.lines);

  // Reconstruct full content
  const before = lines.slice(0, frontmatterStart + 1);
  const after = lines.slice(frontmatterEnd);
  const newLines = [...before, ...sortedFrontmatter, ...after];

  return {
    fixed: true,
    content: newLines.join('\n'),
    message: 'Frontmatter fields reordered to canonical order',
  };
}

/**
 * Phase 16: Fix table separator format
 */
function fixTableSeparators(content: string): { fixed: boolean; content: string; message?: string } {
  const lines = content.split('\n');
  let fixCount = 0;

  const fixed = lines.map((line) => {
    // Match separator row with < 3 dashes: | - | - | or |--|--|
    if (line.match(/^\|[\s-]*\|[\s-]*\|/)) {
      // Check if any cell has < 3 dashes
      const cells = line.split('|').filter((c) => c.trim());
      const needsFix = cells.some((cell) => {
        const dashCount = (cell.match(/-/g) || []).length;
        return dashCount > 0 && dashCount < 3;
      });

      if (needsFix) {
        // Replace with proper format: |---|---|---|
        const columnCount = cells.length;
        fixCount++;
        return '|' + '---|'.repeat(columnCount);
      }
    }

    return line;
  });

  if (fixCount === 0) {
    return { fixed: false, content };
  }

  return {
    fixed: true,
    content: fixed.join('\n'),
    message: `Fixed ${fixCount} table separator(s) with < 3 dashes`,
  };
}

const program = new Command();

program
  .name('agent-manager-fix')
  .description('Fix agent compliance issues (deterministic fixes only)')
  .argument('<name>', 'Agent name')
  .option('--dry-run', 'Preview fixes without applying')
  .option('--phase <number>', 'Fix specific phase (0, 2, 16, or all)')
  .action(async (name: string, options?: { dryRun?: boolean; phase?: string }) => {
    try {
      console.log(chalk.blue('\n🔧 Agent Manager - Fix\n'));

      // Find agent
      const agentPath = findAgent(name);
      if (!agentPath) {
        console.error(chalk.red(`\n⚠️  Tool Error - Agent '${name}' not found`));
        console.log(chalk.gray('  Searched in .claude/agents/ directory'));
        process.exit(2);
      }

      console.log(chalk.gray(`Fixing agent: ${name}`));
      console.log(chalk.gray(`Path: ${agentPath}`));

      if (options?.dryRun) {
        console.log(chalk.yellow('\n🔍 Dry run mode - no changes will be made\n'));
      } else {
        // Create backup before applying any fixes
        const backupPath = createBackup(agentPath, name);
        console.log(chalk.gray(`\n📦 Backup created: ${backupPath}`));
        console.log(chalk.blue('\n🔧 Applying fixes...\n'));
      }

      let content = readFileSync(agentPath, 'utf-8');
      const results: string[] = [];
      const phase = options?.phase || 'all';

      // Phase 0: Block scalar + Name mismatch
      if (phase === '0' || phase === 'all') {
        const blockScalarResult = fixBlockScalar(content);
        if (blockScalarResult.fixed) {
          content = blockScalarResult.content;
          results.push(`✅ ${blockScalarResult.message}`);
        }

        const nameMismatchResult = fixNameMismatch(content, name);
        if (nameMismatchResult.fixed) {
          content = nameMismatchResult.content;
          results.push(`✅ ${nameMismatchResult.message}`);
        }
      }

      // Phase 2: Field order
      if (phase === '2' || phase === 'all') {
        const fieldOrderResult = fixFieldOrder(content);
        if (fieldOrderResult.fixed) {
          content = fieldOrderResult.content;
          results.push(`✅ ${fieldOrderResult.message}`);
        }
      }

      // Phase 16: Table separators
      if (phase === '16' || phase === 'all') {
        const tableSeparatorResult = fixTableSeparators(content);
        if (tableSeparatorResult.fixed) {
          content = tableSeparatorResult.content;
          results.push(`✅ ${tableSeparatorResult.message}`);
        }
      }

      // Apply fixes if not dry-run
      if (!options?.dryRun && results.length > 0) {
        writeFileSync(agentPath, content, 'utf-8');
      }

      // Report results
      if (results.length === 0) {
        console.log(chalk.green('✅ No issues found - agent already compliant\n'));
      } else {
        console.log(chalk.green(`\nFixed ${results.length} issue(s):\n`));
        results.forEach((result) => console.log(`  ${result}`));
        console.log();

        if (options?.dryRun) {
          console.log(chalk.yellow('Run without --dry-run to apply fixes\n'));
        } else {
          console.log(chalk.green('✅ Fixes applied successfully\n'));
          console.log(chalk.gray('Run audit to verify: npm run agent:audit -- ' + name + '\n'));
        }
      }

      process.exit(0);
    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - Fix failed'));
      console.error(chalk.gray(error instanceof Error ? error.message : String(error)));
      process.exit(2);
    }
  });

program.parse();

// Missing import
import { readdirSync } from 'fs';
