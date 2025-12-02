// Chrome DevTools MCP Wrappers - Central Export
// All wrappers use shared MCP client from .claude/tools/config/lib/mcp-client.ts

export { click } from './click';
export { closePage } from './close-page';
export { drag } from './drag';
export { emulate } from './emulate';
export { evaluateScript } from './evaluate-script';
export { fillForm } from './fill-form';
export { getConsoleMessage } from './get-console-message';
export { getNetworkRequest } from './get-network-request';
export { handleDialog } from './handle-dialog';
export { hover } from './hover';
export { listConsoleMessages } from './list-console-messages';
export { listNetworkRequests } from './list-network-requests';
export { listPages } from './list-pages';
export { navigatePage } from './navigate-page';
export { newPage } from './new-page';
export { performanceAnalyzeInsight } from './performance-analyze-insight';
export { performanceStartTrace } from './performance-start-trace';
export { performanceStopTrace } from './performance-stop-trace';
export { pressKey } from './press-key';
export { resizePage } from './resize-page';
export { selectPage } from './select-page';
export { takeScreenshot } from './take-screenshot';
export { takeSnapshot } from './take-snapshot';
export { uploadFile } from './upload-file';
export { waitFor } from './wait-for';

// Export types
export type { ClickInput, ClickOutput } from './click';
export type { ClosePageInput, ClosePageOutput } from './close-page';
export type { DragInput, DragOutput } from './drag';
export type { EmulateInput, EmulateOutput } from './emulate';
export type { EvaluateScriptInput, EvaluateScriptOutput } from './evaluate-script';
export type { FillFormInput, FillFormOutput } from './fill-form';
export type { GetConsoleMessageInput, GetConsoleMessageOutput } from './get-console-message';
export type { GetNetworkRequestInput, GetNetworkRequestOutput } from './get-network-request';
export type { HandleDialogInput, HandleDialogOutput } from './handle-dialog';
export type { HoverInput, HoverOutput } from './hover';
export type { ListConsoleMessagesInput, ListConsoleMessagesOutput } from './list-console-messages';
export type { ListNetworkRequestsInput, ListNetworkRequestsOutput } from './list-network-requests';
export type { ListPagesInput, ListPagesOutput } from './list-pages';
export type { NavigatePageInput, NavigatePageOutput } from './navigate-page';
export type { NewPageInput, NewPageOutput } from './new-page';
export type { PerformanceAnalyzeInsightInput, PerformanceAnalyzeInsightOutput } from './performance-analyze-insight';
export type { PerformanceStartTraceInput, PerformanceStartTraceOutput } from './performance-start-trace';
export type { PerformanceStopTraceInput, PerformanceStopTraceOutput } from './performance-stop-trace';
export type { PressKeyInput, PressKeyOutput } from './press-key';
export type { ResizePageInput, ResizePageOutput } from './resize-page';
export type { SelectPageInput, SelectPageOutput } from './select-page';
export type { TakeScreenshotInput, TakeScreenshotOutput } from './take-screenshot';
export type { TakeSnapshotInput, TakeSnapshotOutput } from './take-snapshot';
export type { UploadFileInput, UploadFileOutput } from './upload-file';
export type { WaitForInput, WaitForOutput } from './wait-for';

// Note: Grouped exports removed to avoid reference errors
// Import directly from individual files or use named exports above
