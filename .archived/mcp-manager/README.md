# mcp-manager

CLI tool to manage Claude MCP (Model Context Protocol) servers. Easily toggle MCP servers between active and disabled states with an interactive checkbox interface.

## Installation

```bash
npm install -g mcp-manager
```

## Usage

Run the interactive MCP server manager:

```bash
mcp-manager mcp
```

This will show you a checkbox interface where you can:
- See all your MCP servers and their current status (global, disabled, and project)
- Toggle servers on/off with the spacebar
- Press `a` to toggle all servers
- Press `i` to invert selection
- Press Enter to apply changes

## How it works

### Server Configuration Locations

- **Active servers** (checked ✓) are stored in `~/.claude.json` and available in Claude
- **Disabled servers** (unchecked ✗) are moved to `~/.mcp-manager.json` and not loaded by Claude
- **Project servers** are read from `.mcp.json` in the current directory and can be copied to global config when selected
- All server configurations are preserved when toggling between states

### Token Usage Warning

Each MCP server consumes 10,000-20,000+ tokens at session initialization. These tokens are permanently allocated and cannot be freed by disabling MCPs mid-session. Each Claude Code session maintains its own isolated MCP configuration.

**Best Practice**: Select only the MCPs you need for your current session before starting Claude Code to maximize available context for your work.

## Requirements

- Node.js 16+ 
- Existing `~/.claude.json` file with MCP servers configured (or `.mcp.json` for project-specific servers)

## Example

```
❯ mcp-manager mcp

⚠️  MCP Token Usage & Session Isolation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each MCP server consumes 10,000-20,000+ tokens at session initialization.
These tokens are permanently allocated and cannot be freed by disabling MCPs mid-session.

Each Claude Code session maintains its own isolated MCP configuration.
Select only the MCPs you need for THIS session before starting Claude Code to maximize available
context for your work.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Press Enter to continue...

🔧 MCP Server Configuration
Select which MCP servers to enable for this session...

Status Legend:
  ✓ Enabled
  ✗ Disabled

Configuration Files:
  Global   → ~/.claude.json
  Disabled → ~/.mcp-manager.json
  Project  → .mcp.json

? Select servers to enable (all others will be disabled):
❯◉ ✓ google_maps_mcp_server [global]
 ◉ ✓ playwright [global]
 ◯ ✗ postgres-beta [global]
 ◯ ◯ chariot [project]
```

## Features

- **Multi-source support**: Manages servers from global (`~/.claude.json`), disabled (`~/.mcp-manager.json`), and project-specific (`.mcp.json`) configurations
- **Project server integration**: Project-specific servers can be copied to global config when enabled
- **Token usage awareness**: Displays prominent warning about MCP token consumption at session start
- **Visual status indicators**: Clear color-coded status for enabled (✓), disabled (✗), and location markers ([global]/[project])
- **Persistent configuration**: All changes are saved to appropriate configuration files

## License

MIT