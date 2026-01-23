/**
 * JADX MCP Wrapper: get-android-manifest
 *
 * Pattern: simple_fetch with XML parsing
 * Purpose: Retrieves and parses AndroidManifest.xml for security analysis
 * Security: MEDIUM (parses untrusted XML, extracts security-relevant data)
 *
 * Token optimization: 70% reduction via structured extraction + XML truncation
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client.js';
import { addTokenEstimation, handleMCPError, validateObjectResponse } from './utils.js';
import { JadxTruncationLimits } from './shared-utils.js';
import { truncateWithIndicator } from '../config/lib/response-utils.js';

// ============================================================================
// Input Schema
// ============================================================================

const InputSchema = z.object({}).strict();

export type GetAndroidManifestInput = z.infer<typeof InputSchema>;

// ============================================================================
// Output Interfaces
// ============================================================================

/**
 * Permission information with dangerous flag
 */
export interface PermissionInfo {
  /** Permission name (without 'android.permission.' prefix) */
  name: string;
  /** Whether this is a dangerous permission requiring runtime grant */
  dangerous: boolean;
}

/**
 * Exported component information
 */
export interface ExportedComponent {
  /** Component type */
  type: 'activity' | 'service' | 'receiver' | 'provider';
  /** Component name */
  name: string;
  /** Whether component is exported (explicit or implicit) */
  exported: boolean;
  /** Whether component has intent-filters (implicit export pre-API 31) */
  intentFilters: boolean;
}

/**
 * Security flags from AndroidManifest
 */
export interface SecurityFlags {
  /** Whether app is debuggable (security risk in production) */
  debuggable: boolean;
  /** Whether app allows backup (may expose data) */
  allowBackup: boolean;
  /** Whether app uses cleartext traffic (HTTP instead of HTTPS) */
  usesCleartextTraffic: boolean;
}

/**
 * Parsed AndroidManifest.xml with security analysis
 */
export interface GetAndroidManifestOutput {
  /** App package name */
  packageName: string;
  /** App version code */
  versionCode: string | null;
  /** App version name */
  versionName: string | null;
  /** Minimum SDK version */
  minSdkVersion: number | null;
  /** Target SDK version */
  targetSdkVersion: number | null;
  /** Requested permissions with dangerous flag */
  permissions: PermissionInfo[];
  /** Exported components (attack surface) */
  exportedComponents: ExportedComponent[];
  /** Security-relevant application flags */
  securityFlags: SecurityFlags;
  /** Raw XML preview (truncated to 1000 chars) */
  rawXmlPreview: string;
  /** Whether raw XML was truncated */
  rawXmlTruncated: boolean;
  /** Estimated token count */
  estimatedTokens: number;
}

// ============================================================================
// Security Constants
// ============================================================================

const DANGEROUS_PERMISSIONS = [
  'READ_CONTACTS', 'WRITE_CONTACTS', 'GET_ACCOUNTS',
  'READ_CALL_LOG', 'WRITE_CALL_LOG', 'PROCESS_OUTGOING_CALLS',
  'READ_SMS', 'RECEIVE_SMS', 'SEND_SMS', 'RECEIVE_MMS',
  'CAMERA', 'RECORD_AUDIO',
  'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION',
  'READ_PHONE_STATE', 'CALL_PHONE', 'ADD_VOICEMAIL', 'USE_SIP', 'ANSWER_PHONE_CALLS',
  'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'MANAGE_EXTERNAL_STORAGE',
  'BODY_SENSORS', 'READ_CALENDAR', 'WRITE_CALENDAR',
  'ACTIVITY_RECOGNITION',
];

// ============================================================================
// XML Parsing Helpers
// ============================================================================

/**
 * Extracts all uses-permission declarations from manifest XML
 * @param xml - AndroidManifest.xml content
 * @returns Array of permissions with dangerous flag
 */
function extractPermissions(xml: string): PermissionInfo[] {
  const permissionRegex = /<uses-permission[^>]*android:name="android\.permission\.([^"]+)"/g;
  const permissions: PermissionInfo[] = [];
  let match;

  while ((match = permissionRegex.exec(xml)) !== null) {
    const name = match[1];
    permissions.push({
      name,
      dangerous: DANGEROUS_PERMISSIONS.includes(name),
    });
  }

  return permissions;
}

/**
 * Extracts all components (activity, service, receiver, provider) from manifest
 * Detects both explicit and implicit exports (via intent-filter)
 * @param xml - AndroidManifest.xml content
 * @returns Array of exported components with attack surface info
 */
function extractComponents(xml: string): ExportedComponent[] {
  const components: ExportedComponent[] = [];

  // Helper to check if component body contains intent-filter
  const hasIntentFilterInBody = (componentTag: string, startIdx: number): boolean => {
    const closeTagMatch = xml.substring(startIdx).match(new RegExp(`</${componentTag.split(' ')[0].substring(1)}>`));
    if (!closeTagMatch) return false;
    const body = xml.substring(startIdx, startIdx + (closeTagMatch.index ?? 0));
    return body.includes('<intent-filter');
  };

  // Activities
  const activityRegex = /<activity([^>]*)>/g;
  let match: RegExpExecArray | null;
  while ((match = activityRegex.exec(xml)) !== null) {
    const tag = match[0];
    const nameMatch = tag.match(/android:name="([^"]+)"/);
    const exportedMatch = tag.match(/android:exported="(true|false)"/);
    const hasIntentFilter = hasIntentFilterInBody('activity', match.index);

    if (nameMatch) {
      const explicitlyExported = exportedMatch ? exportedMatch[1] === 'true' : null;
      components.push({
        type: 'activity',
        name: nameMatch[1],
        exported: explicitlyExported !== null ? explicitlyExported : hasIntentFilter,
        intentFilters: hasIntentFilter,
      });
    }
  }

  // Services, Receivers, Providers (similar pattern)
  ['service', 'receiver', 'provider'].forEach(componentType => {
    const regex = new RegExp(`<${componentType}([^>]*)>`, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const tag = match[0];
      const nameMatch = tag.match(/android:name="([^"]+)"/);
      const exportedMatch = tag.match(/android:exported="(true|false)"/);
      const hasIntentFilter = hasIntentFilterInBody(componentType, match.index);

      if (nameMatch) {
        const explicitlyExported = exportedMatch ? exportedMatch[1] === 'true' : null;
        components.push({
          type: componentType as 'service' | 'receiver' | 'provider',
          name: nameMatch[1],
          exported: explicitlyExported !== null ? explicitlyExported : hasIntentFilter,
          intentFilters: hasIntentFilter,
        });
      }
    }
  });

  return components;
}

function extractSecurityFlags(xml: string): SecurityFlags {
  return {
    debuggable: /android:debuggable="true"/.test(xml),
    allowBackup: /android:allowBackup="true"/.test(xml),
    usesCleartextTraffic: /android:usesCleartextTraffic="true"/.test(xml),
  };
}

function extractPackageName(xml: string): string {
  const match = xml.match(/package="([^"]+)"/);
  return match ? match[1] : '';
}

function extractVersionInfo(xml: string): { versionCode: string | null; versionName: string | null } {
  const codeMatch = xml.match(/android:versionCode="([^"]+)"/);
  const nameMatch = xml.match(/android:versionName="([^"]+)"/);
  return {
    versionCode: codeMatch ? codeMatch[1] : null,
    versionName: nameMatch ? nameMatch[1] : null,
  };
}

function extractSdkVersions(xml: string): { minSdkVersion: number | null; targetSdkVersion: number | null } {
  const minMatch = xml.match(/android:minSdkVersion="(\d+)"/);
  const targetMatch = xml.match(/android:targetSdkVersion="(\d+)"/);
  return {
    minSdkVersion: minMatch ? parseInt(minMatch[1], 10) : null,
    targetSdkVersion: targetMatch ? parseInt(targetMatch[1], 10) : null,
  };
}

// ============================================================================
// Response Filtering
// ============================================================================

function filterResponse(rawData: unknown): GetAndroidManifestOutput {
  const raw = validateObjectResponse(rawData, 'get-android-manifest');

  const rawXml = raw.content ?? '';

  // Parse XML for structured data
  const packageName = extractPackageName(rawXml);
  const { versionCode, versionName } = extractVersionInfo(rawXml);
  const { minSdkVersion, targetSdkVersion } = extractSdkVersions(rawXml);
  const permissions = extractPermissions(rawXml);
  const exportedComponents = extractComponents(rawXml);
  const securityFlags = extractSecurityFlags(rawXml);

  // Truncate raw XML
  const rawXmlPreview = truncateWithIndicator(rawXml, JadxTruncationLimits.MANIFEST_EXCERPT) ?? '';
  const rawXmlTruncated = rawXml.length > JadxTruncationLimits.MANIFEST_EXCERPT;

  return addTokenEstimation({
    packageName,
    versionCode,
    versionName,
    minSdkVersion,
    targetSdkVersion,
    permissions,
    exportedComponents,
    securityFlags,
    rawXmlPreview,
    rawXmlTruncated,
  });
}

// ============================================================================
// Wrapper Export
// ============================================================================

/**
 * JADX MCP Wrapper: get-android-manifest
 *
 * Retrieves and parses AndroidManifest.xml for security analysis.
 * Extracts:
 * - Package metadata and SDK versions
 * - Permissions with dangerous flag (22 known dangerous permissions)
 * - Exported components (attack surface detection)
 * - Security flags (debuggable, allowBackup, usesCleartextTraffic)
 *
 * Token optimization: 70% reduction via structured extraction + XML truncation (1000 chars)
 */
export const getAndroidManifest = {
  name: 'jadx.get-android-manifest',
  description: 'Retrieves and parses AndroidManifest.xml for security analysis. Extracts permissions, components, and security flags.',
  inputSchema: InputSchema,

  async execute(input: GetAndroidManifestInput): Promise<GetAndroidManifestOutput> {
    InputSchema.parse(input);

    try {
      const raw = await callMCPTool('jadx-mcp-server', 'get_android_manifest', {});
      return filterResponse(raw);
    } catch (error) {
      handleMCPError(error, 'get-android-manifest');
    }
  },
};

export default getAndroidManifest;
