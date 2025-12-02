import chalk from "chalk";
import * as readline from "readline";
import customCheckbox from "./custom-checkbox.js";
import { getAllMcpServers } from "./config.js";
import type { ServerToggleItem } from "./types.js";

export function createServerToggleItems(): ServerToggleItem[] {
	const { active, disabled, project } = getAllMcpServers();
	const items: ServerToggleItem[] = [];
	
	// Track which MCPs we've already added
	const mcpMap = new Map<string, {
		isActive: boolean;
		isDisabled: boolean;
		isProject: boolean;
		checked: boolean;
	}>();
	
	// Collect all unique MCP names and their statuses
	for (const [name] of Object.entries(active)) {
		mcpMap.set(name, {
			isActive: true,
			isDisabled: false,
			isProject: false,
			checked: true,
		});
	}
	
	for (const [name] of Object.entries(disabled)) {
		const existing = mcpMap.get(name);
		if (existing) {
			existing.isDisabled = true;
		} else {
			mcpMap.set(name, {
				isActive: false,
				isDisabled: true,
				isProject: false,
				checked: false,
			});
		}
	}
	
	for (const [name] of Object.entries(project)) {
		const existing = mcpMap.get(name);
		if (existing) {
			existing.isProject = true;
		} else {
			mcpMap.set(name, {
				isActive: false,
				isDisabled: false,
				isProject: true,
				checked: false,
			});
		}
	}
	
	// Create display items for each unique MCP
	for (const [name, status] of mcpMap.entries()) {
		let icon = "";
		let value = name;
		let location = "";
		
		// Determine status icon
		if (status.isActive) {
			icon = chalk.green("✓");
		} else if (status.isDisabled) {
			icon = chalk.red("✗");
		} else {
			icon = chalk.gray("◯");
		}
		
		// Determine location
		if (status.isProject) {
			location = chalk.gray(" [project]");
			// Use project prefix for project-only MCPs
			if (!status.isActive && !status.isDisabled) {
				value = `project:${name}`;
			}
		} else {
			location = chalk.gray(" [global]");
		}
		
		items.push({
			name: `${icon} ${name}${location}`,
			value: value,
			checked: status.checked,
		});
	}

	return items.sort((a, b) => {
		// Sort project-only servers last
		const aIsProjectOnly = a.value.startsWith("project:");
		const bIsProjectOnly = b.value.startsWith("project:");
		if (aIsProjectOnly && !bIsProjectOnly) return 1;
		if (!aIsProjectOnly && bIsProjectOnly) return -1;
		return a.value.localeCompare(b.value);
	});
}

async function showWarningMessage(): Promise<void> {
	const separator = "━".repeat(95);
	
	console.log("\n⚠️  MCP Token Usage & Session Isolation");
	console.log(chalk.gray(separator));
	console.log(chalk.gray("Each MCP server consumes 10,000-20,000+ tokens at session initialization."));
	console.log(chalk.gray("These tokens are permanently allocated and cannot be freed by disabling MCPs mid-session."));
	console.log();
	console.log(chalk.gray("Each Claude Code session maintains its own isolated MCP configuration."));
	console.log(chalk.gray("Select only the MCPs you need for THIS session before starting Claude Code to maximize available"));
	console.log(chalk.gray("context for your work."));
	console.log(chalk.gray(separator));
	console.log();
	
	// Wait for user to press Enter
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	
	await new Promise<void>((resolve) => {
		rl.question(chalk.cyan("Press Enter to continue..."), () => {
			rl.close();
			resolve();
		});
	});
	
	console.log(); // Add spacing after Enter
}

export async function showServerToggleUI(): Promise<string[]> {
	// Show warning message first and wait for Enter
	await showWarningMessage();
	
	const items = createServerToggleItems();

	if (items.length === 0) {
		console.log(
			chalk.yellow(
				"No MCP servers found in ~/.claude.json, ~/.mcp-manager.json, or .mcp.json",
			),
		);
		return [];
	}

	console.log(chalk.blue("🔧 MCP Server Configuration"));
	console.log(
		chalk.gray("Select which MCP servers to enable for this session...\n"),
	);

	console.log(chalk.gray("Status Legend:"));
	console.log(`  ${chalk.green("✓")} Enabled`);
	console.log(`  ${chalk.red("✗")} Disabled\n`);
	
	console.log(chalk.gray("Configuration Files:"));
	console.log(`  Global   → ~/.claude.json`);
	console.log(`  Disabled → ~/.mcp-manager.json`);
	console.log(`  Project  → .mcp.json\n`);

	const selectedServers = await customCheckbox({
		message: "Select servers to enable (all others will be disabled):",
		choices: items,
		pageSize: 15,
	});

	return selectedServers;
}
