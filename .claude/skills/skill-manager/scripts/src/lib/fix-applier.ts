/**
 * Fix Applier for Semantic Fixes
 *
 * Applies specific semantic fixes based on fix ID and optional value.
 * Called via: npm run fix -- skill-name --apply <fix-id> --value "..."
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import type { ApplyFixResult } from './types.js';

/**
 * Apply a semantic fix by ID
 */
export async function applySemanticFix(
  skillPath: string,
  fixId: string,
  value?: string
): Promise<ApplyFixResult> {
  try {
    switch (fixId) {
      case 'phase1-description':
        return await applyDescriptionFix(skillPath, value);

      case 'phase3-wordcount':
        return {
          success: true,
          fixId,
          message: 'Word count issues require manual extraction to references/. Acknowledged.',
        };

      case 'phase9-scripts':
        return {
          success: true,
          fixId,
          message: 'Script migration acknowledged. Consider migrating to TypeScript when convenient.',
        };

      case 'phase11-command':
        return await applyCommandPortabilityFix(skillPath, value);

      case 'phase13-todowrite':
        return await applyTodoWriteMandateFix(skillPath);

      default:
        return {
          success: false,
          fixId,
          message: `Unknown fix ID: ${fixId}. Valid IDs: phase1-description, phase3-wordcount, phase9-scripts, phase11-command, phase13-todowrite`,
        };
    }
  } catch (error) {
    return {
      success: false,
      fixId,
      message: `Failed to apply fix: ${error}`,
    };
  }
}

/**
 * Phase 1: Apply description fix
 */
async function applyDescriptionFix(
  skillPath: string,
  newDescription?: string
): Promise<ApplyFixResult> {
  if (!newDescription) {
    return {
      success: false,
      fixId: 'phase1-description',
      message: 'No description value provided. Use --value "new description"',
    };
  }

  // Read and parse the skill file
  const content = readFileSync(skillPath, 'utf-8');
  const parsed = matter(content);

  // Update description
  const oldDescription = parsed.data.description || '';
  parsed.data.description = newDescription;

  // Reconstruct the file with YAML options to prevent block scalars
  const newContent = matter.stringify(parsed.content, parsed.data, {
    engines: {
      yaml: {
        parse: (input: string) => yaml.load(input) as object,
        stringify: (data: object) => yaml.dump(data, {
          lineWidth: -1,  // Never wrap lines - prevents block scalars (>-)
          quotingType: '"',  // Use double quotes for consistency
          forceQuotes: false  // Only quote when necessary
        })
      }
    }
  });
  writeFileSync(skillPath, newContent, 'utf-8');

  return {
    success: true,
    fixId: 'phase1-description',
    message: `Updated description from "${oldDescription.substring(0, 50)}..." to "${newDescription.substring(0, 50)}..."`,
  };
}

/**
 * Phase 11: Apply command portability fix
 */
async function applyCommandPortabilityFix(
  skillPath: string,
  lineInfo?: string
): Promise<ApplyFixResult> {
  const content = readFileSync(skillPath, 'utf-8');
  const lines = content.split('\n');

  // Pattern to find cd commands without repo-root detection
  const cdPattern = /cd\s+["']?(\.claude\/[^"'\s]+)["']?/g;

  let modified = false;
  const newLines = lines.map((line, index) => {
    if (cdPattern.test(line)) {
      // Replace with repo-root detection pattern
      const newLine = line.replace(
        cdPattern,
        'cd "$REPO_ROOT/$1"'
      );
      if (newLine !== line) {
        modified = true;
        return newLine;
      }
    }
    return line;
  });

  if (!modified) {
    return {
      success: true,
      fixId: 'phase11-command',
      message: 'No cd commands found that need fixing, or already fixed.',
    };
  }

  writeFileSync(skillPath, newLines.join('\n'), 'utf-8');

  return {
    success: true,
    fixId: 'phase11-command',
    message: 'Updated cd commands to use $REPO_ROOT for cross-platform compatibility.',
  };
}

/**
 * Phase 13: Apply TodoWrite mandate fix
 */
async function applyTodoWriteMandateFix(skillPath: string): Promise<ApplyFixResult> {
  const content = readFileSync(skillPath, 'utf-8');

  // Check if mandate already exists
  if (/MUST use TodoWrite|TodoWrite.*mandatory/i.test(content)) {
    return {
      success: true,
      fixId: 'phase13-todowrite',
      message: 'TodoWrite mandate already exists in skill.',
    };
  }

  // Find the best place to add the mandate
  // Priority: 1. Key Principles section, 2. After first ## heading, 3. After frontmatter
  let newContent = content;
  let insertLocation = 'unknown';

  // Try to find Key Principles section
  const keyPrinciplesMatch = content.match(/^(## Key Principles\s*\n(?:[\s\S]*?)(?=\n## |\n---|\Z))/m);
  if (keyPrinciplesMatch) {
    // Add as a new principle
    const section = keyPrinciplesMatch[1];
    const principles = section.match(/^\d+\./gm) || [];
    const nextNumber = principles.length + 1;
    const mandate = `${nextNumber}. **TodoWrite Tracking** - You MUST use TodoWrite before starting to track all workflow steps\n`;

    // Insert before the next section
    const insertPoint = content.indexOf(keyPrinciplesMatch[0]) + keyPrinciplesMatch[0].length;
    newContent = content.slice(0, insertPoint) + mandate + content.slice(insertPoint);
    insertLocation = 'Key Principles section';
  } else {
    // Add after the first ## section or create a new section
    const firstH2Match = content.match(/^## .+\n/m);
    if (firstH2Match) {
      const insertPoint = content.indexOf(firstH2Match[0]) + firstH2Match[0].length;

      // Find the end of the first paragraph after the heading
      const afterHeading = content.slice(insertPoint);
      const firstParagraphEnd = afterHeading.search(/\n\n/);
      const actualInsertPoint = insertPoint + (firstParagraphEnd > 0 ? firstParagraphEnd + 2 : 0);

      const mandate = `\n**Important:** You MUST use TodoWrite before starting to track all workflow steps.\n`;
      newContent = content.slice(0, actualInsertPoint) + mandate + content.slice(actualInsertPoint);
      insertLocation = 'after first section';
    } else {
      // Add after frontmatter
      const frontmatterEnd = content.indexOf('---', 4);
      if (frontmatterEnd > 0) {
        const insertPoint = frontmatterEnd + 4;
        const mandate = `\n**Important:** You MUST use TodoWrite before starting to track all workflow steps.\n`;
        newContent = content.slice(0, insertPoint) + mandate + content.slice(insertPoint);
        insertLocation = 'after frontmatter';
      }
    }
  }

  if (newContent === content) {
    return {
      success: false,
      fixId: 'phase13-todowrite',
      message: 'Could not find suitable location to add TodoWrite mandate.',
    };
  }

  writeFileSync(skillPath, newContent, 'utf-8');

  return {
    success: true,
    fixId: 'phase13-todowrite',
    message: `Added TodoWrite mandate in ${insertLocation}.`,
  };
}
