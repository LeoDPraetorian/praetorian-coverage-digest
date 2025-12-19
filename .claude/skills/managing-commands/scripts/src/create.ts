/**
 * Command Create Module
 * Creates new commands with Router Pattern enforcement
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CreateOptions } from './types.js';

const ROUTER_TEMPLATE = `---
description: {{DESCRIPTION}}
argument-hint: {{ARGUMENT_HINT}}
allowed-tools: Skill, AskUserQuestion
skills: {{SKILL}}
---

# {{NAME}}

**Subcommand:** $1
**Arguments:** $2, $3

## ACTION

Invoke the \`{{SKILL}}\` skill.

**Arguments:**
- \`operation\`: $1 (Required)
- \`target\`: $2 (Optional)

**Output:** Display the tool output verbatim.

## Error Handling

If $1 invalid or missing:
  Explain valid options.
  Show usage: /{{COMMAND_NAME}} <subcommand> [args]
`;

const SYSTEM_TEMPLATE = `---
description: {{DESCRIPTION}}
argument-hint: {{ARGUMENT_HINT}}
allowed-tools: {{TOOLS}}
---

# {{NAME}}

Execute the requested operation.

## Usage

\`/{{COMMAND_NAME}} {{ARGUMENT_HINT}}\`

## Implementation

{{IMPLEMENTATION}}

## Error Handling

Handle errors gracefully and report to user.
`;

export function createCommand(
  commandsDir: string,
  options: CreateOptions
): { success: boolean; path: string; content: string } {
  const commandPath = path.join(commandsDir, `${options.name}.md`);

  // Check if command already exists
  if (fs.existsSync(commandPath)) {
    return {
      success: false,
      path: commandPath,
      content: `Command already exists at ${commandPath}`,
    };
  }

  // Choose template based on Router Pattern
  let content: string;

  if (options.useRouterPattern && options.backingSkill) {
    content = ROUTER_TEMPLATE
      .replace(/{{NAME}}/g, formatName(options.name))
      .replace(/{{COMMAND_NAME}}/g, options.name)
      .replace(/{{DESCRIPTION}}/g, options.description || `${formatName(options.name)} operations`)
      .replace(/{{ARGUMENT_HINT}}/g, '<subcommand> [args]')
      .replace(/{{SKILL}}/g, options.backingSkill);
  } else {
    content = SYSTEM_TEMPLATE
      .replace(/{{NAME}}/g, formatName(options.name))
      .replace(/{{COMMAND_NAME}}/g, options.name)
      .replace(/{{DESCRIPTION}}/g, options.description || `${formatName(options.name)} operations`)
      .replace(/{{ARGUMENT_HINT}}/g, '[args]')
      .replace(/{{TOOLS}}/g, 'Bash(git:*)')
      .replace(/{{IMPLEMENTATION}}/g, '<!-- Add implementation here -->');
  }

  // Ensure commands directory exists
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }

  fs.writeFileSync(commandPath, content, 'utf-8');

  return {
    success: true,
    path: commandPath,
    content,
  };
}

export function formatCreateReport(
  result: { success: boolean; path: string; content: string },
  options: CreateOptions
): string {
  const lines: string[] = [];

  lines.push(`# Create Command: ${options.name}`);
  lines.push('');

  if (!result.success) {
    lines.push(`❌ **Failed:** ${result.content}`);
    return lines.join('\n');
  }

  lines.push(`✅ **Created:** ${result.path}`);
  lines.push('');

  lines.push('## Configuration');
  lines.push(`- **Pattern:** ${options.useRouterPattern ? 'Router Pattern' : 'Direct Implementation'}`);
  if (options.backingSkill) {
    lines.push(`- **Backing Skill:** ${options.backingSkill}`);
  }
  lines.push(`- **Description:** ${options.description || '(default)'}`);
  lines.push('');

  lines.push('## Generated Content');
  lines.push('');
  lines.push('```markdown');
  lines.push(result.content);
  lines.push('```');
  lines.push('');

  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review and customize the generated command');
  lines.push('2. Run `npm run audit -- ' + options.name + '` to validate');
  lines.push('3. Test the command with `/help` to verify discovery');

  return lines.join('\n');
}

function formatName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
