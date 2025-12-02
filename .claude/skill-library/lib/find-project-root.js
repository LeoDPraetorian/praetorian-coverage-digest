/**
 * Find Project Root - Skills Compatibility Layer
 *
 * **DEPRECATED: This file is kept for backward compatibility with 43+ skill scripts.**
 *
 * **New code should import from:** `.claude/lib/find-project-root.js`
 *
 * This file re-exports the consolidated project root utility at `.claude/lib/find-project-root.ts`
 * to maintain backward compatibility with existing skill scripts that import from this location.
 *
 * **Migration:**
 * - Old: `import { findProjectRoot } from '../../lib/find-project-root.js';` (skills)
 * - New: `import { findProjectRoot } from '../lib/find-project-root.js';` (consolidated)
 *
 * **Why consolidated?**
 * - Single source of truth for path resolution
 * - Used by skills, MCP wrappers, custom tools, hooks, commands
 * - Consistent behavior across all Claude Code infrastructure
 * - Easier to maintain and test
 */
// Re-export everything from consolidated location
export { findProjectRoot, resolveProjectPath, isInSubmodule, getCurrentSubmoduleName, findProjectRootByMarker, clearCache } from '../../lib/find-project-root';
//# sourceMappingURL=find-project-root.js.map