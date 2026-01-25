/**
 * JADX MCP Wrappers
 *
 * Custom tools that wrap JADX MCP server for 98% token reduction in Android reverse engineering workflows.
 *
 * Architecture:
 * - Filesystem discovery (0 tokens at session start)
 * - MCP calls only when imported and used
 * - Shared MCP client for independent connections
 * - Token reduction: 20,000+ → 0 at start, ~500 when actively analyzing APK
 * - 4-layer security validation for write operations
 *
 * Key Features:
 * - Progressive disclosure: No token cost until APK analysis begins
 * - Pagination support: Large APKs analyzed incrementally (getAllClasses)
 * - Decompilation modes: Java source (default), Smali bytecode (low-level)
 * - Write confirmation workflow: Preview → verify → execute with audit logging
 * - UI state tracking: Monitors current class/selection in JADX GUI
 *
 * Usage:
 * ```typescript
 * import {
 *   getAllClasses,
 *   getClassSources,
 *   getMethodByName,
 *   getMainActivityClass,
 *   getStrings,
 *   renameField
 * } from './.claude/tools/jadx-mcp-server';
 *
 * // List all classes with pagination (large APKs)
 * const allClasses = await getAllClasses.execute({ limit: 100, offset: 0 });
 * // Returns: { classes: ['com.example.MainActivity', ...], totalCount: 1250, hasMore: true }
 *
 * // Decompile specific class to Java
 * const source = await getClassSources.execute({ className: 'com.example.MainActivity' });
 * // Returns: Java source code string
 *
 * // Find method across all classes
 * const method = await getMethodByName.execute({ methodName: 'processPayment' });
 * // Returns: { className: '...', methodSignature: '...', sourceCode: '...' }
 *
 * // Quick entry point discovery
 * const entryPoint = await getMainActivityClass.execute({});
 * // Returns: Main Activity class source (no parameters required)
 *
 * // Extract hardcoded strings
 * const strings = await getStrings.execute({});
 * // Returns: All string literals from APK
 *
 * // Write operation with confirmation workflow
 * // Step 1: Preview the change
 * const preview = await renameField.execute({
 *   className: 'com.example.User',
 *   fieldName: 'a',
 *   newName: 'userId',
 *   previewOnly: true
 * });
 * // Returns: { preview: '... shows what will change ...', requiresConfirmation: true }
 *
 * // Step 2: Confirm and execute
 * const result = await renameField.execute({
 *   className: 'com.example.User',
 *   fieldName: 'a',
 *   newName: 'userId',
 *   confirmed: true
 * });
 * // Returns: { success: true, auditLog: '...' }
 * ```
 */

// UI State Operations
export { fetchCurrentClass, type FetchCurrentClassInput, type FetchCurrentClassOutput } from './fetch-current-class.js';
export { getSelectedText, type GetSelectedTextInput, type GetSelectedTextOutput } from './get-selected-text.js';

// Class Operations
export { getAllClasses, type GetAllClassesInput, type GetAllClassesOutput } from './get-all-classes.js';
export { getClassSources, type GetClassSourcesInput, type GetClassSourcesOutput } from './get-class-sources.js';
export { getFieldsOfClass, type GetFieldsOfClassInput, type GetFieldsOfClassOutput } from './get-fields-of-class.js';
export { getMethodsOfClass, type GetMethodsOfClassInput, type GetMethodsOfClassOutput } from './get-methods-of-class.js';
export { getSmaliOfClass, type GetSmaliOfClassInput, type GetSmaliOfClassOutput } from './get-smali-of-class.js';

// Method Operations
export { getMethodByName, type GetMethodByNameInput, type GetMethodByNameOutput } from './get-method-by-name.js';
export { searchMethodByName, type SearchMethodByNameInput, type SearchMethodByNameOutput } from './search-method-by-name.js';

// Resource Operations
export { getAllResourceFileNames, type GetAllResourceFileNamesInput, type GetAllResourceFileNamesOutput } from './get-all-resource-file-names.js';
export { getResourceFile, type GetResourceFileInput, type GetResourceFileOutput } from './get-resource-file.js';

// Analysis Operations
export { getAndroidManifest, type GetAndroidManifestInput, type GetAndroidManifestOutput } from './get-android-manifest.js';
export { getMainActivityClass, type GetMainActivityClassInput, type GetMainActivityClassOutput } from './get-main-activity-class.js';
export { getMainApplicationClassesNames, type GetMainApplicationClassesNamesInput, type GetMainApplicationClassesNamesOutput } from './get-main-application-classes-names.js';
export { getMainApplicationClassesCode, type GetMainApplicationClassesCodeInput, type GetMainApplicationClassesCodeOutput } from './get-main-application-classes-code.js';
export { getStrings, type GetStringsInput, type GetStringsOutput } from './get-strings.js';

// Write Operations (Security Critical)
export { renameClass, type RenameClassInput, type RenameClassOutput } from './rename-class.js';
export { renameField, type RenameFieldInput, type RenameFieldOutput } from './rename-field.js';
export { renameMethod, type RenameMethodInput, type RenameMethodOutput } from './rename-method.js';

// Security and Shared Utilities
export { type SecurityContext, validateWriteOperation, auditWriteOperation } from './security-utils.js';
export { type ClassInfo, type MethodInfo, type FieldInfo } from './shared-schemas.js';

// Error Types
export { JadxError, JadxValidationError, JadxSecurityError } from './errors.js';

/**
 * Token Reduction Summary
 *
 * Without Custom Tools (Direct MCP):
 * - Session start: 20,000+ tokens (JADX tool schemas loaded immediately)
 * - When analyzing APK: Same 20,000 tokens
 * - Total: 20,000+ tokens from session start
 *
 * With Custom Tools (MCP Wrappers):
 * - Session start: 0 tokens (filesystem discovery, no MCP spawn)
 * - When analyzing APK: ~500 tokens per tool used
 * - Pagination: Incremental loading for large APKs (getAllClasses)
 * - Total: ~500 tokens when actively used, 0 otherwise
 *
 * Reduction: ~98% (20,000 → 0 at start, ~500 when used)
 *
 * Security Features:
 * - 4-layer validation for write operations (renameClass, renameField, renameMethod)
 * - Preview-then-confirm workflow (previewOnly: true → confirmed: true)
 * - Audit logging for all write operations (who, what, when)
 * - Confirmation requirement bypass only with explicit confirmed: true
 */
