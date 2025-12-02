// Common types for chrome-devtools MCP wrappers

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const PageIdSchema = z.string().min(1, 'Page ID is required');

export const SelectorSchema = z.string()
  .min(1, 'Selector is required')
  .max(1000, 'Selector too long');

export const CoordinatesSchema = z.object({
  x: z.number().min(0).max(10000),
  y: z.number().min(0).max(10000)
});

export const KeySchema = z.string()
  .min(1, 'Key is required')
  .max(50, 'Key too long');

export const URLSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

export const ScriptSchema = z.string()
  .min(1, 'Script is required')
  .max(10000, 'Script too long');

export const TimeoutSchema = z.number()
  .min(0, 'Timeout cannot be negative')
  .max(300000, 'Timeout too long (max 5 minutes)')
  .default(30000);

// ============================================================================
// Common Enums
// ============================================================================

export const DeviceTypeSchema = z.enum([
  'desktop',
  'mobile',
  'tablet',
  'desktop-4k',
  'mobile-landscape'
]);

export const NetworkConditionSchema = z.enum([
  'online',
  'offline',
  'slow-3g',
  'fast-3g',
  '4g',
  '5g'
]);

export const DialogActionSchema = z.enum([
  'accept',
  'dismiss',
  'dismiss-with-text'
]);

export const KeyModifierSchema = z.enum([
  'shift',
  'ctrl',
  'alt',
  'meta'
]);

export const MouseButtonSchema = z.enum([
  'left',
  'right',
  'middle'
]);

// ============================================================================
// Result Types
// ============================================================================

export const SuccessResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.string().datetime().optional()
});

export const PageInfoSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string(),
  isActive: z.boolean()
});

export const ConsoleMessageSchema = z.object({
  type: z.enum(['log', 'error', 'warning', 'info', 'debug']),
  text: z.string(),
  timestamp: z.string().datetime(),
  url: z.string().optional(),
  lineNumber: z.number().optional()
});

export const NetworkRequestSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  method: z.string(),
  status: z.number().optional(),
  statusText: z.string().optional(),
  requestHeaders: z.record(z.string()).optional(),
  responseHeaders: z.record(z.string()).optional(),
  timing: z.object({
    startTime: z.number(),
    endTime: z.number().optional(),
    duration: z.number().optional()
  }).optional()
});

// ============================================================================
// Type Exports
// ============================================================================

export type PageId = z.infer<typeof PageIdSchema>;
export type Selector = z.infer<typeof SelectorSchema>;
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type URL = z.infer<typeof URLSchema>;
export type Script = z.infer<typeof ScriptSchema>;
export type DeviceType = z.infer<typeof DeviceTypeSchema>;
export type NetworkCondition = z.infer<typeof NetworkConditionSchema>;
export type DialogAction = z.infer<typeof DialogActionSchema>;
export type KeyModifier = z.infer<typeof KeyModifierSchema>;
export type MouseButton = z.infer<typeof MouseButtonSchema>;
export type SuccessResult = z.infer<typeof SuccessResultSchema>;
export type PageInfo = z.infer<typeof PageInfoSchema>;
export type ConsoleMessage = z.infer<typeof ConsoleMessageSchema>;
export type NetworkRequest = z.infer<typeof NetworkRequestSchema>;
