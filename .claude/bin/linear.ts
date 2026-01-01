#!/usr/bin/env -S npx tsx
/**
 * Linear CLI - Directory-independent access to Linear issue tracking
 *
 * Usage:
 *   npx claude-linear issues [--limit N]
 *   npx claude-linear issue <id>
 *   npx claude-linear create <title> [--description DESC]
 *   npx claude-linear update <id> [--status STATUS] [--priority PRIORITY]
 *   npx claude-linear comment <id> <body>
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve paths relative to this script, not cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = resolve(__dirname, '../tools/linear');

interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function showHelp(): void {
  console.log(`
Linear CLI - Issue tracking and project management

USAGE:
  npx claude-linear <command> [options]

COMMANDS:
  issues                      List recent issues
  issue <id>                  Get issue details (e.g., CHARIOT-1234)
  create <title>              Create new issue
  update <id>                 Update issue
  comment <id> <body>         Add comment to issue
  comments <id>               List comments on issue
  find <query>                Search for issues
  teams                       List all teams
  team <id>                   Get team details
  projects                    List all projects
  project <id>                Get project details
  users                       List all users
  user <query>                Find user by name/email
  cycles                      List cycles

OPTIONS:
  --limit N              Number of results (default: 20)
  --description DESC     Issue description (for create)
  --status STATUS        Issue status (for update)
  --priority PRIORITY    Issue priority: 0-4 (for update)
  --assignee ID          Assignee user ID (for create/update)
  --team ID              Team ID (for create)
  --json                 Output raw JSON
  --help                 Show this help message

EXAMPLES:
  npx claude-linear issues --limit 10
  npx claude-linear issue CHARIOT-1234
  npx claude-linear create "Fix auth bug" --description "OAuth migration needed"
  npx claude-linear update CHARIOT-1234 --status "In Progress"
  npx claude-linear comment CHARIOT-1234 "Working on this now"
  npx claude-linear find "authentication"
`);
}

function parseArgs(args: string[]): {
  command: string;
  positional: string[];
  options: Record<string, string | boolean>;
} {
  const options: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = args[++i];
    } else if (arg === '--description' && args[i + 1]) {
      options.description = args[++i];
    } else if (arg === '--status' && args[i + 1]) {
      options.status = args[++i];
    } else if (arg === '--priority' && args[i + 1]) {
      options.priority = args[++i];
    } else if (arg === '--assignee' && args[i + 1]) {
      options.assignee = args[++i];
    } else if (arg === '--team' && args[i + 1]) {
      options.team = args[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return {
    command: positional[0] || '',
    positional: positional.slice(1),
    options,
  };
}

async function runListIssues(limit: number): Promise<CliResult> {
  const { listIssues } = await import(`${toolsDir}/list-issues.ts`);
  const result = await listIssues.execute({ limit });
  return { success: true, data: result };
}

async function runGetIssue(id: string): Promise<CliResult> {
  const { getIssue } = await import(`${toolsDir}/get-issue.ts`);
  const result = await getIssue.execute({ id });
  return { success: true, data: result };
}

async function runCreateIssue(
  title: string,
  description?: string,
  teamId?: string,
  assigneeId?: string
): Promise<CliResult> {
  const { createIssue } = await import(`${toolsDir}/create-issue.ts`);
  const params: Record<string, unknown> = { title };
  if (description) params.description = description;
  if (teamId) params.team = teamId;
  if (assigneeId) params.assignee = assigneeId;
  const result = await createIssue.execute(params);
  return { success: true, data: result };
}

async function runUpdateIssue(
  id: string,
  options: Record<string, string | boolean>
): Promise<CliResult> {
  const { updateIssue } = await import(`${toolsDir}/update-issue.ts`);
  const params: Record<string, unknown> = { id };
  if (options.status) params.status = options.status;
  if (options.priority) params.priority = parseInt(options.priority as string);
  if (options.assignee) params.assignee = options.assignee;
  if (options.project) params.project = options.project;
  const result = await updateIssue.execute(params);
  return { success: true, data: result };
}

async function runCreateComment(issueId: string, body: string): Promise<CliResult> {
  const { createComment } = await import(`${toolsDir}/create-comment.ts`);
  const result = await createComment.execute({ issueId, body });
  return { success: true, data: result };
}

async function runListComments(issueId: string): Promise<CliResult> {
  const { listComments } = await import(`${toolsDir}/list-comments.ts`);
  const result = await listComments.execute({ issueId });
  return { success: true, data: result };
}

async function runFindIssue(query: string): Promise<CliResult> {
  const { findIssue } = await import(`${toolsDir}/find-issue.ts`);
  const result = await findIssue.execute({ query });
  return { success: true, data: result };
}

async function runListTeams(): Promise<CliResult> {
  const { listTeams } = await import(`${toolsDir}/list-teams.ts`);
  const result = await listTeams.execute({});
  return { success: true, data: result };
}

async function runGetTeam(id: string): Promise<CliResult> {
  const { getTeam } = await import(`${toolsDir}/get-team.ts`);
  const result = await getTeam.execute({ id });
  return { success: true, data: result };
}

async function runListProjects(): Promise<CliResult> {
  const { listProjects } = await import(`${toolsDir}/list-projects.ts`);
  const result = await listProjects.execute({});
  return { success: true, data: result };
}

async function runGetProject(id: string): Promise<CliResult> {
  const { getProject } = await import(`${toolsDir}/get-project.ts`);
  const result = await getProject.execute({ id });
  return { success: true, data: result };
}

async function runListUsers(): Promise<CliResult> {
  const { listUsers } = await import(`${toolsDir}/list-users.ts`);
  const result = await listUsers.execute({});
  return { success: true, data: result };
}

async function runFindUser(query: string): Promise<CliResult> {
  const { findUser } = await import(`${toolsDir}/find-user.ts`);
  const result = await findUser.execute({ query });
  return { success: true, data: result };
}

async function runListCycles(): Promise<CliResult> {
  const { listCycles } = await import(`${toolsDir}/list-cycles.ts`);
  const result = await listCycles.execute({});
  return { success: true, data: result };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, positional, options } = parseArgs(args);

  if (options.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  const limit = parseInt(options.limit as string) || 20;

  try {
    let result: CliResult;

    switch (command) {
      case 'issues':
        result = await runListIssues(limit);
        break;

      case 'issue':
        if (!positional[0]) {
          console.error('Error: issue command requires an ID (e.g., CHARIOT-1234)');
          process.exit(1);
        }
        result = await runGetIssue(positional[0]);
        break;

      case 'create':
        if (!positional[0]) {
          console.error('Error: create command requires a title');
          console.error('Usage: npx claude-linear create "Issue title" --description "..."');
          process.exit(1);
        }
        result = await runCreateIssue(
          positional.join(' '),
          options.description as string,
          options.team as string,
          options.assignee as string
        );
        break;

      case 'update':
        if (!positional[0]) {
          console.error('Error: update command requires an issue ID');
          console.error('Usage: npx claude-linear update CHARIOT-1234 --status "In Progress"');
          process.exit(1);
        }
        result = await runUpdateIssue(positional[0], options);
        break;

      case 'comment':
        if (!positional[0] || !positional[1]) {
          console.error('Error: comment command requires issue ID and body');
          console.error('Usage: npx claude-linear comment CHARIOT-1234 "Comment text"');
          process.exit(1);
        }
        result = await runCreateComment(positional[0], positional.slice(1).join(' '));
        break;

      case 'comments':
        if (!positional[0]) {
          console.error('Error: comments command requires an issue ID');
          process.exit(1);
        }
        result = await runListComments(positional[0]);
        break;

      case 'find':
        if (!positional[0]) {
          console.error('Error: find command requires a search query');
          process.exit(1);
        }
        result = await runFindIssue(positional.join(' '));
        break;

      case 'teams':
        result = await runListTeams();
        break;

      case 'team':
        if (!positional[0]) {
          console.error('Error: team command requires a team ID');
          process.exit(1);
        }
        result = await runGetTeam(positional[0]);
        break;

      case 'projects':
        result = await runListProjects();
        break;

      case 'project':
        if (!positional[0]) {
          console.error('Error: project command requires a project ID');
          process.exit(1);
        }
        result = await runGetProject(positional[0]);
        break;

      case 'users':
        result = await runListUsers();
        break;

      case 'user':
        if (!positional[0]) {
          console.error('Error: user command requires a search query');
          process.exit(1);
        }
        result = await runFindUser(positional.join(' '));
        break;

      case 'cycles':
        result = await runListCycles();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run with --help for usage information');
        process.exit(1);
    }

    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
