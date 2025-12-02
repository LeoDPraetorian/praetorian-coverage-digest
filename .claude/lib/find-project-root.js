/**
 * Find Project Root - Shared Utility for ALL Claude Code Infrastructure
 *
 * Robust project root detection that works from ANY directory.
 * Handles submodules, non-git contexts, and various working directories.
 *
 * **Used by:**
 * - Skills (43 scripts in .claude/skills/star/scripts/)
 * - MCP wrappers (Linear, Currents, Context7, etc.)
 * - Custom tools (.claude/tools/)
 * - Hooks and commands
 *
 * **Works from:**
 * - Super-repo root
 * - Submodules (modules/chariot, modules/janus, etc.)
 * - Nested directories
 * - Any working directory
 *
 * Usage:
 *   import { findProjectRoot } from '../lib/find-project-root.js';
 *   const PROJECT_ROOT = findProjectRoot();
 *   const skillsDir = path.join(PROJECT_ROOT, '.claude/skills');
 */
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
/**
 * Cached project root to avoid repeated git calls
 */
let cachedProjectRoot = null;
/**
 * Get script directory for relative path resolution
 * Works with both import.meta.url (ESM) and __dirname (CJS)
 */
function getScriptDirectory(importMetaUrl) {
    if (importMetaUrl) {
        return dirname(fileURLToPath(importMetaUrl));
    }
    // Fallback for CJS
    return __dirname;
}
/**
 * Find project root using git + filesystem fallback
 *
 * Strategy:
 * 1. Try git (handles submodules via --show-superproject-working-tree)
 * 2. Fallback to filesystem search for .claude directory
 * 3. Throw error if neither works
 *
 * @returns Absolute path to project root
 * @throws Error if project root cannot be found
 *
 * @example
 * ```typescript
 * const root = findProjectRoot();
 * // From anywhere: /Users/name/chariot-development-platform
 * ```
 */
export function findProjectRoot() {
    // Return cached value if available
    if (cachedProjectRoot) {
        return cachedProjectRoot;
    }
    // 1. FIRST: Check if Claude Code set CLAUDE_PROJECT_DIR (fastest!)
    if (process.env.CLAUDE_PROJECT_DIR) {
        cachedProjectRoot = process.env.CLAUDE_PROJECT_DIR;
        return process.env.CLAUDE_PROJECT_DIR;
    }
    // 2. FALLBACK: Git-based detection (works in submodules!)
    try {
        // Try superproject first (for submodule detection)
        let gitRoot = '';
        try {
            gitRoot = execSync('git rev-parse --show-superproject-working-tree', {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
        }
        catch {
            // Not in submodule or git command failed
        }
        // If no superproject, get regular toplevel
        if (!gitRoot || gitRoot.length === 0) {
            gitRoot = execSync('git rev-parse --show-toplevel', {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
        }
        if (gitRoot && gitRoot.length > 0) {
            cachedProjectRoot = gitRoot;
            return gitRoot;
        }
    }
    catch (error) {
        // Git command failed (not a git repo), fall through to filesystem search
    }
    // Fallback: Search upward for .claude directory from cwd
    const searchPaths = [process.cwd()];
    // CRITICAL: Also search from this script's location!
    // This handles cases where the tool is invoked from outside the project
    // (e.g., npx tsx /tmp/test.ts that imports from .claude/tools/)
    try {
        const scriptDir = dirname(fileURLToPath(import.meta.url));
        if (!searchPaths.includes(scriptDir)) {
            searchPaths.push(scriptDir);
        }
    }
    catch {
        // import.meta.url not available (CJS mode)
    }
    for (const startPath of searchPaths) {
        let current = startPath;
        const root = dirname(current);
        while (current !== root && current.length > 1) {
            // Check if this directory contains .claude
            if (existsSync(join(current, '.claude'))) {
                cachedProjectRoot = current;
                return current;
            }
            // Go up one level
            current = dirname(current);
        }
    }
    throw new Error('Could not find project root (no .claude directory found)\n' +
        `Searched from: ${searchPaths.join(', ')}\n` +
        'Ensure you are inside a Chariot development platform project');
}
/**
 * Resolve a path relative to project root
 *
 * Convenience wrapper around findProjectRoot() + path.join()
 *
 * @param pathSegments - Path segments relative to project root
 * @returns Absolute path
 *
 * @example
 * ```typescript
 * // From anywhere in the repo
 * resolveProjectPath('.claude', 'tools', 'linear', 'get-issue.ts')
 * // Returns: '/Users/user/chariot-development-platform/.claude/tools/linear/get-issue.ts'
 *
 * resolveProjectPath('modules', 'chariot', 'backend')
 * // Returns: '/Users/user/chariot-development-platform/modules/chariot/backend'
 * ```
 */
export function resolveProjectPath(...pathSegments) {
    const projectRoot = findProjectRoot();
    return join(projectRoot, ...pathSegments);
}
/**
 * Check if currently running from within a submodule
 *
 * @returns True if in submodule, false if in super-repo root
 *
 * @example
 * ```typescript
 * // From modules/chariot/
 * isInSubmodule() // true
 *
 * // From super-repo root
 * isInSubmodule() // false
 * ```
 */
export function isInSubmodule() {
    try {
        const superRepoRoot = execSync('git rev-parse --show-superproject-working-tree', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        return superRepoRoot.length > 0;
    }
    catch {
        return false;
    }
}
/**
 * Get the current submodule name (if in a submodule)
 *
 * @returns Submodule name (e.g., 'chariot', 'janus') or null if not in submodule
 *
 * @example
 * ```typescript
 * // From modules/chariot/
 * getCurrentSubmoduleName() // 'chariot'
 *
 * // From super-repo root
 * getCurrentSubmoduleName() // null
 * ```
 */
export function getCurrentSubmoduleName() {
    if (!isInSubmodule()) {
        return null;
    }
    try {
        const currentRepoRoot = execSync('git rev-parse --show-toplevel', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        const superRepoRoot = findProjectRoot();
        // Extract submodule name from path difference
        // e.g., /super/modules/chariot -> 'chariot'
        const relativePath = currentRepoRoot.replace(superRepoRoot + '/', '');
        const parts = relativePath.split('/');
        // Assuming structure is modules/{submodule-name}
        if (parts[0] === 'modules' && parts.length > 1) {
            return parts[1];
        }
        // Fallback: return last part of path
        return parts[parts.length - 1];
    }
    catch {
        return null;
    }
}
/**
 * Find project root with custom marker (alternative to .claude)
 *
 * @param marker - Directory or file to search for (e.g., '.git', 'package.json')
 * @returns Absolute path to directory containing marker
 *
 * @example
 * ```typescript
 * findProjectRootByMarker('package.json')
 * // Returns directory containing package.json
 * ```
 */
export function findProjectRootByMarker(marker) {
    let current = process.cwd();
    const root = dirname(current);
    while (current !== root) {
        if (existsSync(join(current, marker))) {
            return current;
        }
        current = dirname(current);
    }
    if (existsSync(join(root, marker))) {
        return root;
    }
    throw new Error(`Could not find directory containing ${marker}`);
}
/**
 * Clear cached project root (useful for testing)
 *
 * @example
 * ```typescript
 * // In tests
 * clearCache();
 * const root = findProjectRoot(); // Re-detects from scratch
 * ```
 */
export function clearCache() {
    cachedProjectRoot = null;
}
/**
 * Recursively find a skill/agent by name in a directory tree
 * @param dir - Directory to search
 * @param name - Skill name to find
 * @returns Parent directory containing the skill, or null
 */
function findSkillInDirectory(dir, name) {
    if (!existsSync(dir)) {
        return null;
    }
    try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            if (entry.name.startsWith('.'))
                continue;
            if (entry.name === 'node_modules')
                continue;
            const entryPath = join(dir, entry.name);
            // Check if this IS the skill directory
            if (entry.name === name) {
                const skillFile = join(entryPath, 'SKILL.md');
                if (existsSync(skillFile)) {
                    return dir; // Return parent directory
                }
            }
            // Recursively search subdirectories
            const found = findSkillInDirectory(entryPath, name);
            if (found) {
                return found;
            }
        }
    }
    catch {
        return null;
    }
    return null;
}
/**
 * Find a skill/agent/command by name across standard Claude Code locations
 *
 * Searches in priority order:
 * 1. .claude/skills/ (core - flat structure)
 * 2. .claude/skill-library/ (library - recursive search, any depth)
 *
 * @param name - Skill/agent name to find
 * @returns Directory containing the skill, or null if not found
 *
 * @example
 * ```typescript
 * const skillDir = findSkillPath('claude-skill-write');
 * // Returns: '/path/.claude/skills' (found in core)
 *
 * const libSkill = findSkillPath('frontend-tanstack-query');
 * // Returns: '/path/.claude/skill-library/development/frontend' (found via recursive search)
 * ```
 */
export function findSkillPath(name) {
    const projectRoot = findProjectRoot();
    // 1. Check core skills (flat, one level)
    const coreSkillFile = join(projectRoot, '.claude/skills', name, 'SKILL.md');
    if (existsSync(coreSkillFile)) {
        return join(projectRoot, '.claude/skills');
    }
    // 2. Search library recursively (any nested structure)
    const libraryRoot = join(projectRoot, '.claude/skill-library');
    const found = findSkillInDirectory(libraryRoot, name);
    if (found) {
        return found;
    }
    return null;
}
/**
 * Recursively find all directories containing SKILL.md files
 * @param dir - Directory to search
 * @param found - Accumulator for found directories
 * @returns Array of directories containing skills
 */
function findAllSkillDirectories(dir, found = new Set()) {
    if (!existsSync(dir)) {
        return Array.from(found);
    }
    try {
        const entries = readdirSync(dir, { withFileTypes: true });
        let hasSkills = false;
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            if (entry.name.startsWith('.'))
                continue;
            if (entry.name === 'node_modules')
                continue;
            const entryPath = join(dir, entry.name);
            const skillFile = join(entryPath, 'SKILL.md');
            // If this subdirectory contains SKILL.md, this dir has skills
            if (existsSync(skillFile)) {
                hasSkills = true;
                break;
            }
        }
        // If this directory contains skill subdirectories, add it
        if (hasSkills) {
            found.add(dir);
        }
        // Recursively search subdirectories
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            if (entry.name.startsWith('.'))
                continue;
            if (entry.name === 'node_modules')
                continue;
            const entryPath = join(dir, entry.name);
            findAllSkillDirectories(entryPath, found);
        }
    }
    catch {
        // Ignore errors
    }
    return Array.from(found);
}
/**
 * Get all directories containing skills (core + library recursive)
 *
 * @returns Array of all directories containing SKILL.md files
 *
 * @example
 * ```typescript
 * const dirs = getAllSkillDirectories();
 * // Returns: [
 * //   '/path/.claude/skills',
 * //   '/path/.claude/skill-library/development/frontend',
 * //   '/path/.claude/skill-library/testing',
 * //   '/path/.claude/skill-library/claude/skills',
 * //   ... (all directories with skills)
 * // ]
 * ```
 */
export function getAllSkillDirectories() {
    const projectRoot = findProjectRoot();
    const found = new Set();
    // 1. Core skills (if exists)
    const coreDir = join(projectRoot, '.claude/skills');
    if (existsSync(coreDir)) {
        found.add(coreDir);
    }
    // 2. Library skills (recursive search)
    const libraryRoot = join(projectRoot, '.claude/skill-library');
    if (existsSync(libraryRoot)) {
        findAllSkillDirectories(libraryRoot, found);
    }
    return Array.from(found).sort();
}
/**
 * Resolve skill directory with auto-detection
 *
 * If explicitDir provided: Use that
 * If skillName provided: Auto-detect across standard locations
 * Otherwise: Returns null (caller should use getAllSkillDirectories for batch)
 *
 * @param options - Resolution options
 * @returns Resolved directory path or null for batch mode
 * @throws Error if skill not found in any location
 *
 * @example
 * ```typescript
 * // Auto-detect single skill
 * const dir = resolveSkillDirectory({ skillName: 'brainstorming' });
 * // Returns: '/path/.claude/skills' (found in core)
 *
 * // Explicit directory
 * const dir = resolveSkillDirectory({ explicitDir: '/custom/path' });
 * // Returns: '/custom/path'
 *
 * // Batch mode (no skill, no dir)
 * const dir = resolveSkillDirectory({});
 * // Returns: null (caller should use getAllSkillDirectories)
 * ```
 */
export function resolveSkillDirectory(options) {
    const projectRoot = findProjectRoot();
    // If explicit directory provided, use it
    if (options.explicitDir) {
        return options.explicitDir;
    }
    // If skill name provided, try to auto-detect
    if (options.skillName) {
        const detected = findSkillPath(options.skillName);
        if (detected) {
            return detected;
        }
        // Skill not found in any location
        throw new Error(`Skill "${options.skillName}" not found in:\n` +
            `  - .claude/skills\n` +
            `  - .claude/skill-library (searched recursively)\n` +
            `\nUse --dir to specify a custom location.`);
    }
    // No explicit dir and no skill name: Return null (batch mode)
    return null;
}
// Legacy exports for backward compatibility
export const getSuperRepoRoot = findProjectRoot;
export const resolveSuperRepoPath = resolveProjectPath;
//# sourceMappingURL=find-project-root.js.map