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
export declare function findProjectRoot(): string;
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
export declare function resolveProjectPath(...pathSegments: string[]): string;
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
export declare function isInSubmodule(): boolean;
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
export declare function getCurrentSubmoduleName(): string | null;
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
export declare function findProjectRootByMarker(marker: string): string;
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
export declare function clearCache(): void;
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
export declare function findSkillPath(name: string): string | null;
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
export declare function getAllSkillDirectories(): string[];
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
export declare function resolveSkillDirectory(options: {
    explicitDir?: string;
    skillName?: string;
}): string | null;
export declare const getSuperRepoRoot: typeof findProjectRoot;
export declare const resolveSuperRepoPath: typeof resolveProjectPath;
//# sourceMappingURL=find-project-root.d.ts.map