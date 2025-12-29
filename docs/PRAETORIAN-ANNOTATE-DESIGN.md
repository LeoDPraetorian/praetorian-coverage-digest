# Praetorian Annotate - Implementation Design

> Visual annotations for AI-assisted frontend development

## Overview

A Chrome extension that enables developers to annotate UI elements directly in the browser, generating structured tasks with screenshots and DOM context for Claude Code agents to process.

```
Developer browses localhost:3000 → Spots UI issue
→ Press C, click element, describe bug
→ Screenshot + CSS selector + context captured
→ Task synced to .praetorian-annotations/
→ /annotate command routes to frontend-developer agent
→ Agent fixes issue with full visual context
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                         │
├──────────────┬──────────────────┬───────────────────────────────┤
│ Content      │ Background       │ Popup                         │
│ Script       │ Service Worker   │ UI                            │
├──────────────┴──────────────────┴───────────────────────────────┤
│                    File System Access API                       │
├─────────────────────────────────────────────────────────────────┤
│              .praetorian-annotations/ directory                 │
│  ├── tasks.json          (machine-readable)                     │
│  ├── tasks.md            (human-readable)                       │
│  ├── screenshots/        (visual evidence)                      │
│  └── config.json         (connection settings)                  │
├─────────────────────────────────────────────────────────────────┤
│                    Claude Code Integration                      │
│  ├── /annotate command     (task processing)                    │
│  ├── Agent routing       (category → agent)                     │
│  └── Status updates      (task lifecycle)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User Action
   └─→ Press C (comment) or R (rectangle)

2. Element Selection
   └─→ Highlight DOM element on hover
   └─→ Generate CSS selector + XPath
   └─→ Extract computed styles, bounding rect

3. Annotation
   └─→ Show comment input near element
   └─→ Capture screenshot (element + context)
   └─→ User enters description + category

4. Sync
   └─→ Write to tasks.json
   └─→ Update tasks.md
   └─→ Save screenshots to disk

5. Processing
   └─→ /annotate command reads tasks
   └─→ Routes to appropriate agent
   └─→ Agent receives visual + DOM context
   └─→ Fix applied, status updated
```

---

## File Structure

### Chrome Extension

```
praetorian-annotate/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── content/                    # Injected into pages
│   │   ├── index.ts               # Entry point
│   │   ├── annotator.ts           # Main controller
│   │   ├── modes/
│   │   │   ├── comment.ts         # Element comment mode (C key)
│   │   │   ├── rectangle.ts       # Freeform drawing mode (R key)
│   │   │   └── base.ts            # Base mode class
│   │   ├── capture/
│   │   │   ├── screenshot.ts      # html2canvas wrapper
│   │   │   ├── selector.ts        # CSS/XPath generation
│   │   │   └── context.ts         # DOM context extraction
│   │   ├── ui/
│   │   │   ├── overlay.ts         # Element highlight overlay
│   │   │   ├── comment-box.ts     # Comment input component
│   │   │   ├── task-bar.ts        # Bottom task list
│   │   │   ├── toolbar.ts         # Mode selection toolbar
│   │   │   └── styles.css         # Isolated styles (shadow DOM)
│   │   └── utils/
│   │       ├── dom.ts             # DOM utilities
│   │       └── keyboard.ts        # Shortcut handling
│   │
│   ├── background/                 # Service worker
│   │   ├── index.ts               # Entry point
│   │   └── messages.ts            # Message routing
│   │
│   ├── popup/                      # Extension popup
│   │   ├── index.html
│   │   ├── popup.ts               # Connection management
│   │   └── styles.css
│   │
│   └── shared/                     # Shared code
│       ├── types.ts               # TypeScript interfaces
│       ├── constants.ts           # Shared constants
│       ├── storage.ts             # Chrome storage wrapper
│       ├── file-system.ts         # File System Access API
│       └── task-store.ts          # Task management
│
├── public/
│   ├── manifest.json
│   └── icons/
│
└── scripts/
    └── build.ts                   # Build automation
```

### Project Integration

```
.praetorian-annotations/              # Created in user's project
├── tasks.json                     # Machine-readable task list
├── tasks.md                       # Human-readable markdown
├── screenshots/                   # Visual evidence
│   ├── task-001-element.png      # Cropped element
│   ├── task-001-context.png      # Element + surroundings
│   └── task-001-full.png         # Full page (optional)
└── config.json                    # Connection settings
```

### Claude Code Integration

```
.claude/
├── commands/
│   └── annotate.md                  # /annotate slash command
└── skills/
    └── processing-visual-annotations/
        └── SKILL.md               # Annotation processing skill
```

---

## Core Types

### Task Schema

```typescript
// src/shared/types.ts

export interface AnnotationTask {
  // Identity
  id: string; // UUID v4
  version: number; // Schema version (1)

  // Classification
  type: "element" | "region"; // Annotation type
  category: TaskCategory; // Bug, enhancement, security, etc.
  priority: TaskPriority; // Low, medium, high, critical
  status: TaskStatus; // Pending, in_progress, done, failed

  // Content
  comment: string; // User's description

  // Location
  url: string; // Full URL including path
  pathname: string; // Just the path
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };

  // Element context (type: 'element')
  element?: {
    selector: SelectorInfo;
    tagName: string;
    boundingRect: BoundingRect;
    computedStyles: Record<string, string>; // Relevant styles only
    attributes: Record<string, string>;
    innerText?: string; // Truncated to 500 chars
    innerHTML?: string; // Truncated to 1000 chars
  };

  // Region context (type: 'region')
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Screenshots
  screenshots: {
    element?: string; // Relative path: screenshots/task-001-element.png
    context?: string; // Relative path: screenshots/task-001-context.png
    full?: string; // Relative path: screenshots/task-001-full.png
  };

  // Metadata
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  processedAt?: string; // When agent processed
  processedBy?: string; // Which agent processed
  error?: string; // Error message if failed

  // Browser context
  browser: {
    userAgent: string;
    language: string;
  };
}

export interface SelectorInfo {
  // Primary selectors (in priority order)
  testId?: string; // data-testid attribute (most stable)
  css: string; // Generated CSS selector
  xpath: string; // Generated XPath

  // Fallback info
  id?: string; // Element ID if present
  classNames: string[]; // Class list

  // Confidence score (0-100)
  confidence: number; // How stable is this selector?
}

export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type TaskCategory =
  | "bug" // UI bug, misalignment, broken functionality
  | "enhancement" // Improvement suggestion
  | "security" // Security concern (future extension)
  | "a11y" // Accessibility issue (future extension)
  | "performance"; // Performance concern (future extension)

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "pending" | "in_progress" | "done" | "failed" | "cancelled";
```

### Configuration Schema

```typescript
// src/shared/types.ts

export interface AnnotationConfig {
  version: number;
  projectName: string;
  projectPath: string;

  // Preferences
  screenshotQuality: "low" | "medium" | "high";
  captureFullPage: boolean;
  defaultCategory: TaskCategory;
  defaultPriority: TaskPriority;

  // Selector preferences
  preferTestIds: boolean; // Prefer data-testid over CSS

  // Connection
  lastConnected: string;
  connectionCount: number;
}
```

---

## Chrome Extension Implementation

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Praetorian Annotate",
  "version": "1.0.0",
  "description": "Visual annotations for AI-assisted frontend development",

  "permissions": ["activeTab", "scripting", "storage"],

  "host_permissions": [
    "http://localhost:*/*",
    "https://localhost:*/*",
    "http://127.0.0.1:*/*",
    "https://127.0.0.1:*/*"
  ],

  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },

  "content_scripts": [
    {
      "matches": ["http://localhost:*/*", "https://localhost:*/*", "http://127.0.0.1:*/*"],
      "js": ["content/index.js"],
      "css": ["content/styles.css"],
      "run_at": "document_end"
    }
  ],

  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },

  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Content Script - Main Controller

```typescript
// src/content/annotator.ts

import { CommentMode } from "./modes/comment";
import { RectangleMode } from "./modes/rectangle";
import { TaskBar } from "./ui/task-bar";
import { Toolbar } from "./ui/toolbar";
import { TaskStore } from "../shared/task-store";
import { KeyboardHandler } from "./utils/keyboard";

export class Annotator {
  private mode: "idle" | "comment" | "rectangle" = "idle";
  private commentMode: CommentMode;
  private rectangleMode: RectangleMode;
  private taskBar: TaskBar;
  private toolbar: Toolbar;
  private taskStore: TaskStore;
  private keyboard: KeyboardHandler;
  private shadowRoot: ShadowRoot;

  constructor() {
    // Create shadow DOM to isolate styles
    this.shadowRoot = this.createShadowRoot();

    // Initialize components
    this.taskStore = new TaskStore();
    this.commentMode = new CommentMode(this.shadowRoot, this.taskStore);
    this.rectangleMode = new RectangleMode(this.shadowRoot, this.taskStore);
    this.taskBar = new TaskBar(this.shadowRoot, this.taskStore);
    this.toolbar = new Toolbar(this.shadowRoot, this.setMode.bind(this));

    // Setup keyboard shortcuts
    this.keyboard = new KeyboardHandler({
      c: () => this.setMode("comment"),
      r: () => this.setMode("rectangle"),
      Escape: () => this.setMode("idle"),
    });
  }

  private createShadowRoot(): ShadowRoot {
    const host = document.createElement("div");
    host.id = "chariot-annotation-root";
    document.body.appendChild(host);
    return host.attachShadow({ mode: "closed" });
  }

  private setMode(mode: "idle" | "comment" | "rectangle") {
    // Deactivate current mode
    if (this.mode === "comment") this.commentMode.deactivate();
    if (this.mode === "rectangle") this.rectangleMode.deactivate();

    // Activate new mode
    this.mode = mode;
    if (mode === "comment") this.commentMode.activate();
    if (mode === "rectangle") this.rectangleMode.activate();

    // Update toolbar state
    this.toolbar.setActiveMode(mode);

    // Update cursor
    document.body.style.cursor =
      mode === "comment" ? "crosshair" : mode === "rectangle" ? "crosshair" : "";
  }

  async initialize() {
    // Check if connected to a project
    const connected = await this.taskStore.isConnected();

    if (connected) {
      await this.taskStore.loadTasks();
      this.taskBar.render();
    }

    this.toolbar.render();
    this.keyboard.attach();

    console.log("[Praetorian] Annotation tool initialized");
  }

  destroy() {
    this.keyboard.detach();
    this.shadowRoot.host.remove();
  }
}

// Initialize on page load
const annotator = new Annotator();
annotator.initialize();
```

### Comment Mode

```typescript
// src/content/modes/comment.ts

import { AnnotationTask, SelectorInfo } from "../../shared/types";
import { generateSelector } from "../capture/selector";
import { captureScreenshot } from "../capture/screenshot";
import { extractContext } from "../capture/context";
import { Overlay } from "../ui/overlay";
import { CommentBox } from "../ui/comment-box";
import { TaskStore } from "../../shared/task-store";

export class CommentMode {
  private shadowRoot: ShadowRoot;
  private taskStore: TaskStore;
  private overlay: Overlay;
  private commentBox: CommentBox;
  private hoveredElement: HTMLElement | null = null;
  private isActive = false;

  constructor(shadowRoot: ShadowRoot, taskStore: TaskStore) {
    this.shadowRoot = shadowRoot;
    this.taskStore = taskStore;
    this.overlay = new Overlay(shadowRoot);
    this.commentBox = new CommentBox(shadowRoot, this.onSubmit.bind(this));
  }

  activate() {
    this.isActive = true;
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("click", this.onClick, true);
    this.overlay.show();
  }

  deactivate() {
    this.isActive = false;
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("click", this.onClick, true);
    this.overlay.hide();
    this.commentBox.hide();
    this.hoveredElement = null;
  }

  private onMouseMove = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Skip our own UI elements
    if (this.isOwnElement(target)) return;

    // Skip if same element
    if (target === this.hoveredElement) return;

    this.hoveredElement = target;
    this.overlay.highlightElement(target);
  };

  private onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Skip our own UI elements
    if (this.isOwnElement(target)) return;

    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();

    // Show comment box near element
    const rect = target.getBoundingClientRect();
    this.commentBox.show({
      x: rect.right + 10,
      y: rect.top,
      element: target,
    });
  };

  private onSubmit = async (data: {
    comment: string;
    category: string;
    priority: string;
    element: HTMLElement;
  }) => {
    const { comment, category, priority, element } = data;

    // Generate selector
    const selector = generateSelector(element);

    // Capture screenshots
    const screenshots = await captureScreenshot(element);

    // Extract DOM context
    const context = extractContext(element);

    // Create task
    const task: Partial<AnnotationTask> = {
      id: crypto.randomUUID(),
      version: 1,
      type: "element",
      category: category as any,
      priority: priority as any,
      status: "pending",
      comment,
      url: window.location.href,
      pathname: window.location.pathname,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      element: {
        selector,
        tagName: element.tagName.toLowerCase(),
        boundingRect: element.getBoundingClientRect().toJSON(),
        computedStyles: context.computedStyles,
        attributes: context.attributes,
        innerText: context.innerText,
        innerHTML: context.innerHTML,
      },
      screenshots: {
        element: `screenshots/${task.id}-element.png`,
        context: `screenshots/${task.id}-context.png`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
      },
    };

    // Save task
    await this.taskStore.addTask(task as AnnotationTask, screenshots);

    // Hide comment box
    this.commentBox.hide();

    // Show success feedback
    this.showFeedback("Task created!");
  };

  private isOwnElement(el: HTMLElement): boolean {
    return el.closest("#praetorian-annotate-root") !== null;
  }

  private showFeedback(message: string) {
    // Brief toast notification
    const toast = document.createElement("div");
    toast.className = "praetorian-toast";
    toast.textContent = message;
    this.shadowRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}
```

### Selector Generation

```typescript
// src/content/capture/selector.ts

import { SelectorInfo } from "../../shared/types";

export function generateSelector(element: HTMLElement): SelectorInfo {
  const selectors: SelectorInfo = {
    css: "",
    xpath: "",
    classNames: Array.from(element.classList),
    confidence: 0,
  };

  // Priority 1: data-testid (most stable, designed for testing)
  const testId = element.getAttribute("data-testid");
  if (testId) {
    selectors.testId = testId;
    selectors.css = `[data-testid="${testId}"]`;
    selectors.confidence = 95;
    selectors.xpath = `//*[@data-testid="${testId}"]`;
    return selectors;
  }

  // Priority 2: ID (if not auto-generated)
  if (element.id && !isAutoGeneratedId(element.id)) {
    selectors.id = element.id;
    selectors.css = `#${CSS.escape(element.id)}`;
    selectors.confidence = 90;
    selectors.xpath = `//*[@id="${element.id}"]`;
    return selectors;
  }

  // Priority 3: Unique aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    const selector = `[aria-label="${ariaLabel}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      selectors.css = selector;
      selectors.confidence = 85;
      selectors.xpath = `//*[@aria-label="${ariaLabel}"]`;
      return selectors;
    }
  }

  // Priority 4: Unique class combination
  if (element.classList.length > 0) {
    const uniqueClasses = findUniqueClassCombination(element);
    if (uniqueClasses) {
      selectors.css = uniqueClasses;
      selectors.confidence = 70;
      selectors.xpath = generateXPathFromCSS(uniqueClasses);
      return selectors;
    }
  }

  // Priority 5: Structural selector (least stable)
  selectors.css = generateStructuralSelector(element);
  selectors.xpath = generateXPath(element);
  selectors.confidence = 50;

  return selectors;
}

function isAutoGeneratedId(id: string): boolean {
  // Common patterns for auto-generated IDs
  const patterns = [
    /^:r[0-9a-z]+:$/, // React useId()
    /^[a-f0-9]{8,}$/i, // UUID-like
    /^[a-z]+-\d+$/, // prefix-number
    /^__[a-z]+_\d+$/, // __prefix_number
    /^ember\d+$/, // Ember
    /^ng-/, // Angular
  ];
  return patterns.some((p) => p.test(id));
}

function findUniqueClassCombination(element: HTMLElement): string | null {
  const classes = Array.from(element.classList).filter((c) => !isUtilityClass(c));

  // Try single class first
  for (const cls of classes) {
    const selector = `.${CSS.escape(cls)}`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Try combinations of 2 classes
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const selector = `.${CSS.escape(classes[i])}.${CSS.escape(classes[j])}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  return null;
}

function isUtilityClass(cls: string): boolean {
  // Tailwind and common utility class patterns
  const patterns = [
    /^(p|m|w|h|min|max)-/, // Spacing/sizing
    /^(flex|grid|block|hidden)/, // Display
    /^(text|font|bg|border)-/, // Typography/colors
    /^(hover|focus|active):/, // State variants
  ];
  return patterns.some((p) => p.test(cls));
}

function generateStructuralSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add nth-child if needed
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((el) => el.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(" > ");
}

function generateXPath(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((el) => el.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `[${index}]`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return "//" + path.join("/");
}

function generateXPathFromCSS(css: string): string {
  // Basic CSS to XPath conversion for simple selectors
  if (css.startsWith("#")) {
    return `//*[@id="${css.slice(1)}"]`;
  }
  if (css.startsWith(".")) {
    const classes = css.split(".").filter(Boolean);
    const conditions = classes.map((c) => `contains(@class, "${c}")`).join(" and ");
    return `//*[${conditions}]`;
  }
  return `//*`;
}
```

### Screenshot Capture

```typescript
// src/content/capture/screenshot.ts

import html2canvas from "html2canvas";

export interface ScreenshotResult {
  element: string; // Base64 PNG - cropped to element
  context: string; // Base64 PNG - element + surrounding area
  full?: string; // Base64 PNG - full page (optional)
}

export async function captureScreenshot(
  element: HTMLElement,
  options: { captureFull?: boolean } = {}
): Promise<ScreenshotResult> {
  const rect = element.getBoundingClientRect();
  const dpr = window.devicePixelRatio;

  // Capture full viewport
  const fullCanvas = await html2canvas(document.body, {
    useCORS: true,
    logging: false,
    scale: dpr,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Crop to element with padding
  const padding = 10;
  const elementCanvas = cropCanvas(fullCanvas, {
    x: (rect.x - padding) * dpr,
    y: (rect.y - padding) * dpr,
    width: (rect.width + padding * 2) * dpr,
    height: (rect.height + padding * 2) * dpr,
  });

  // Crop to context (element + surrounding area)
  const contextPadding = 100;
  const contextCanvas = cropCanvas(fullCanvas, {
    x: Math.max(0, (rect.x - contextPadding) * dpr),
    y: Math.max(0, (rect.y - contextPadding) * dpr),
    width: (rect.width + contextPadding * 2) * dpr,
    height: (rect.height + contextPadding * 2) * dpr,
  });

  const result: ScreenshotResult = {
    element: elementCanvas.toDataURL("image/png"),
    context: contextCanvas.toDataURL("image/png"),
  };

  if (options.captureFull) {
    result.full = fullCanvas.toDataURL("image/png");
  }

  return result;
}

function cropCanvas(
  source: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = region.width;
  canvas.height = region.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  );

  return canvas;
}
```

### File System Integration

```typescript
// src/shared/file-system.ts

export class FileSystemManager {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private annotationsHandle: FileSystemDirectoryHandle | null = null;
  private screenshotsHandle: FileSystemDirectoryHandle | null = null;

  async connect(): Promise<boolean> {
    try {
      // Prompt user to select project directory
      this.rootHandle = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });

      // Create .praetorian-annotations directory
      this.annotationsHandle = await this.rootHandle.getDirectoryHandle(".praetorian-annotations", {
        create: true,
      });

      // Create screenshots subdirectory
      this.screenshotsHandle = await this.annotationsHandle.getDirectoryHandle("screenshots", {
        create: true,
      });

      // Initialize files if needed
      await this.initializeFiles();

      // Update .gitignore
      await this.updateGitignore();

      return true;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User cancelled
        return false;
      }
      console.error("[Praetorian] Connection failed:", err);
      throw err;
    }
  }

  isConnected(): boolean {
    return this.annotationsHandle !== null;
  }

  async disconnect(): Promise<void> {
    this.rootHandle = null;
    this.annotationsHandle = null;
    this.screenshotsHandle = null;
  }

  private async initializeFiles(): Promise<void> {
    // Initialize tasks.json if not exists
    try {
      await this.annotationsHandle!.getFileHandle("tasks.json");
    } catch {
      await this.writeFile("tasks.json", "[]");
    }

    // Initialize tasks.md
    try {
      await this.annotationsHandle!.getFileHandle("tasks.md");
    } catch {
      await this.writeFile("tasks.md", this.getInitialMarkdown());
    }

    // Initialize config.json
    try {
      await this.annotationsHandle!.getFileHandle("config.json");
    } catch {
      await this.writeFile(
        "config.json",
        JSON.stringify(
          {
            version: 1,
            projectName: this.rootHandle!.name,
            screenshotQuality: "high",
            captureFullPage: false,
            defaultCategory: "bug",
            defaultPriority: "medium",
            preferTestIds: true,
            lastConnected: new Date().toISOString(),
            connectionCount: 1,
          },
          null,
          2
        )
      );
    }
  }

  private getInitialMarkdown(): string {
    return `# Praetorian Annotations

Visual annotations captured from the browser.

## Pending Tasks

_No tasks yet. Press \`C\` in browser to add a comment._

---

## Processing

Run \`/annotate\` in Claude Code to process these tasks.

Modes:
- \`/annotate step\` - One task at a time (default)
- \`/annotate batch\` - Group related tasks
- \`/annotate yolo\` - Process all autonomously
`;
  }

  private async updateGitignore(): Promise<void> {
    const gitignorePath = ".gitignore";
    const entry = ".praetorian-annotations/screenshots/";

    try {
      const fileHandle = await this.rootHandle!.getFileHandle(gitignorePath);
      const file = await fileHandle.getFile();
      const content = await file.text();

      if (!content.includes(entry)) {
        const newContent = content.trimEnd() + "\n\n# Praetorian Annotate\n" + entry + "\n";
        const writable = await fileHandle.createWritable();
        await writable.write(newContent);
        await writable.close();
      }
    } catch {
      // .gitignore doesn't exist, that's fine
    }
  }

  async readFile(filename: string): Promise<string> {
    const fileHandle = await this.annotationsHandle!.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file.text();
  }

  async writeFile(filename: string, content: string): Promise<void> {
    const fileHandle = await this.annotationsHandle!.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async saveScreenshot(taskId: string, type: string, dataUrl: string): Promise<string> {
    const filename = `${taskId}-${type}.png`;
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileHandle = await this.screenshotsHandle!.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(binaryData);
    await writable.close();

    return `screenshots/${filename}`;
  }
}
```

### Task Store

```typescript
// src/shared/task-store.ts

import { AnnotationTask } from "./types";
import { FileSystemManager } from "./file-system";
import { ScreenshotResult } from "../content/capture/screenshot";

export class TaskStore {
  private fs: FileSystemManager;
  private tasks: AnnotationTask[] = [];

  constructor() {
    this.fs = new FileSystemManager();
  }

  async connect(): Promise<boolean> {
    return this.fs.connect();
  }

  isConnected(): boolean {
    return this.fs.isConnected();
  }

  async loadTasks(): Promise<AnnotationTask[]> {
    const content = await this.fs.readFile("tasks.json");
    this.tasks = JSON.parse(content);
    return this.tasks;
  }

  async addTask(task: AnnotationTask, screenshots: ScreenshotResult): Promise<void> {
    // Save screenshots
    if (screenshots.element) {
      task.screenshots.element = await this.fs.saveScreenshot(
        task.id,
        "element",
        screenshots.element
      );
    }
    if (screenshots.context) {
      task.screenshots.context = await this.fs.saveScreenshot(
        task.id,
        "context",
        screenshots.context
      );
    }
    if (screenshots.full) {
      task.screenshots.full = await this.fs.saveScreenshot(task.id, "full", screenshots.full);
    }

    // Add to list
    this.tasks.push(task);

    // Save
    await this.save();
  }

  async updateTaskStatus(
    taskId: string,
    status: AnnotationTask["status"],
    error?: string
  ): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date().toISOString();
      if (error) task.error = error;
      if (status === "done" || status === "failed") {
        task.processedAt = new Date().toISOString();
      }
      await this.save();
    }
  }

  private async save(): Promise<void> {
    // Save JSON
    await this.fs.writeFile("tasks.json", JSON.stringify(this.tasks, null, 2));

    // Update markdown
    await this.fs.writeFile("tasks.md", this.generateMarkdown());
  }

  private generateMarkdown(): string {
    const pending = this.tasks.filter((t) => t.status === "pending");
    const inProgress = this.tasks.filter((t) => t.status === "in_progress");
    const done = this.tasks.filter((t) => t.status === "done");
    const failed = this.tasks.filter((t) => t.status === "failed");

    let md = `# Praetorian Annotations

> Generated ${new Date().toISOString()}

## Pending (${pending.length})

${pending.length === 0 ? "_No pending tasks_\n" : pending.map((t) => this.taskToMarkdown(t)).join("\n")}

## In Progress (${inProgress.length})

${inProgress.length === 0 ? "_None_\n" : inProgress.map((t) => this.taskToMarkdown(t)).join("\n")}

## Done (${done.length})

${done.length === 0 ? "_None_\n" : done.map((t) => this.taskToMarkdown(t)).join("\n")}

${failed.length > 0 ? `## Failed (${failed.length})\n\n${failed.map((t) => this.taskToMarkdown(t)).join("\n")}` : ""}
`;

    return md;
  }

  private taskToMarkdown(task: AnnotationTask): string {
    const priority =
      task.priority === "critical"
        ? "🔴"
        : task.priority === "high"
          ? "🟠"
          : task.priority === "medium"
            ? "🟡"
            : "🟢";

    return `### ${priority} ${task.comment}

- **ID**: \`${task.id}\`
- **Category**: ${task.category}
- **URL**: ${task.pathname}
- **Selector**: \`${task.element?.selector.css || "N/A"}\`
- **Screenshot**: ${task.screenshots.context || "N/A"}
- **Created**: ${task.createdAt}
${task.error ? `- **Error**: ${task.error}` : ""}
`;
  }

  getTasks(): AnnotationTask[] {
    return this.tasks;
  }

  getPendingTasks(): AnnotationTask[] {
    return this.tasks.filter((t) => t.status === "pending");
  }
}
```

---

## Claude Code Integration

### /annotate Command

```markdown
---
name: annotate
description: Process visual annotations from Praetorian Annotate
allowed-tools: Read, Edit, Write, Bash, Task, Glob, Grep
---

# Annotate Command

Process pending UI annotations from `.praetorian-annotations/`.

## Usage

/annotate [mode]

**Modes:**

- `step` (default) - Process one task at a time with approval
- `batch` - Group related tasks by file/component
- `yolo` - Process all tasks autonomously

## Workflow

1. **Load Tasks**
   - Read `.praetorian-annotations/tasks.json`
   - Filter for `status: "pending"`
   - Load screenshot context

2. **For Each Task**
   - Read screenshot at `.praetorian-annotations/{task.screenshots.context}`
   - Analyze visual context + DOM info
   - Identify target file from selector/URL
   - Apply fix using Edit tool
   - Verify change (visual inspection if possible)
   - Update task status

3. **Report Summary**
   - Tasks processed
   - Tasks failed (with errors)
   - Suggestions for manual review

## Task Processing

For each pending task:

1. **Understand Context**
   - View screenshot: `Read .praetorian-annotations/{screenshots.context}`
   - Parse selector: `{element.selector.css}`
   - Note viewport: `{viewport.width}x{viewport.height}`

2. **Locate Source**
   - Search for selector in codebase
   - Use URL path to narrow down component
   - Check for data-testid matches

3. **Apply Fix**
   - Use Edit tool to modify CSS/component
   - Keep changes minimal and focused
   - Preserve existing functionality

4. **Update Status**
   - Mark task as `done` or `failed`
   - Record any errors encountered

## Example
```

/annotate step

> Found 3 pending tasks in .praetorian-annotations/tasks.json
>
> Task 1/3: "Button misaligned on mobile"
>
> - URL: /settings
> - Selector: [data-testid="save-button"]
> - Screenshot: screenshots/abc123-context.png
>
> Analyzing... Found in ui/src/sections/settings/SaveButton.tsx
> Fix: Add responsive margin class
>
> Apply this fix? [y/n]

```

## Error Handling

If tasks.json not found:
> No annotations found. Use the Praetorian Annotate browser extension to create annotations.

If screenshot missing:
> Screenshot not found for task {id}. Processing without visual context.

If selector not found in codebase:
> Could not locate element with selector `{selector}`. Please verify the component exists.
```

### Processing Skill

````markdown
---
name: processing-visual-annotations
description: Process visual annotations with DOM context and screenshots
allowed-tools: Read, Edit, Write, Bash, Task, Glob, Grep
---

# Processing Visual Annotations

## Loading Tasks

```typescript
// Read task list
const tasksJson = await Read(".praetorian-annotations/tasks.json");
const tasks: AnnotationTask[] = JSON.parse(tasksJson);
const pending = tasks.filter((t) => t.status === "pending");
```
````

## Screenshot Analysis

Screenshots provide visual context:

- `{id}-element.png` - Cropped to the annotated element
- `{id}-context.png` - Element with surrounding area (100px padding)

Load with: `Read .praetorian-annotations/screenshots/{filename}`

## Selector-Based File Location

Priority order for finding source file:

1. **data-testid** - Search for `data-testid="{testId}"` in .tsx files
2. **Component name** - Derive from URL path (e.g., /settings → SettingsPage)
3. **CSS class** - Search for class names in component files
4. **Structural** - Follow component hierarchy from App root

```bash
# Find file by testid
grep -r 'data-testid="save-button"' ui/src --include="*.tsx"

# Find by URL path
ls ui/src/sections/settings/
```

## Fix Categories

| Category    | Agent                      | Approach                   |
| ----------- | -------------------------- | -------------------------- |
| bug         | frontend-developer         | Direct fix with Edit tool  |
| enhancement | frontend-developer         | Implement improvement      |
| security    | frontend-security-reviewer | Security analysis first    |
| a11y        | uiux-designer              | Accessibility review first |

## Status Updates

After processing each task:

```typescript
// Update in tasks.json
task.status = "done"; // or 'failed'
task.updatedAt = new Date().toISOString();
task.processedAt = new Date().toISOString();
task.processedBy = "frontend-developer";
task.error = undefined; // or error message
```

## Best Practices

1. **Minimal changes** - Fix only what's described
2. **Preserve behavior** - Don't refactor surrounding code
3. **Test first** - Run existing tests before changes
4. **Visual verify** - Check screenshot matches fix intent
5. **One task at a time** - Don't batch unrelated fixes

````

---

## UI Components

### Comment Box

```typescript
// src/content/ui/comment-box.ts

export class CommentBox {
  private shadowRoot: ShadowRoot;
  private container: HTMLDivElement | null = null;
  private onSubmitCallback: (data: any) => void;
  private currentElement: HTMLElement | null = null;

  constructor(shadowRoot: ShadowRoot, onSubmit: (data: any) => void) {
    this.shadowRoot = shadowRoot;
    this.onSubmitCallback = onSubmit;
  }

  show(options: { x: number; y: number; element: HTMLElement }) {
    this.currentElement = options.element;

    if (this.container) this.container.remove();

    this.container = document.createElement('div');
    this.container.className = 'praetorian-comment-box';
    this.container.innerHTML = `
      <div class="praetorian-comment-header">
        <span class="praetorian-comment-title">Add Annotation</span>
        <button class="praetorian-close-btn" aria-label="Close">×</button>
      </div>
      <textarea
        class="praetorian-comment-input"
        placeholder="Describe the issue..."
        rows="3"
      ></textarea>
      <div class="praetorian-comment-options">
        <select class="praetorian-select" name="category">
          <option value="bug">🐛 Bug</option>
          <option value="enhancement">✨ Enhancement</option>
          <option value="security">🔒 Security</option>
          <option value="a11y">♿ Accessibility</option>
        </select>
        <select class="praetorian-select" name="priority">
          <option value="low">🟢 Low</option>
          <option value="medium" selected>🟡 Medium</option>
          <option value="high">🟠 High</option>
          <option value="critical">🔴 Critical</option>
        </select>
      </div>
      <div class="praetorian-comment-actions">
        <button class="praetorian-btn praetorian-btn-secondary praetorian-cancel-btn">Cancel</button>
        <button class="praetorian-btn praetorian-btn-primary praetorian-submit-btn">Submit</button>
      </div>
    `;

    // Position near element
    const style = this.container.style;
    style.position = 'fixed';
    style.left = `${Math.min(options.x, window.innerWidth - 320)}px`;
    style.top = `${Math.min(options.y, window.innerHeight - 250)}px`;
    style.zIndex = '2147483647';

    // Attach event listeners
    const textarea = this.container.querySelector('textarea')!;
    const closeBtn = this.container.querySelector('.praetorian-close-btn')!;
    const cancelBtn = this.container.querySelector('.praetorian-cancel-btn')!;
    const submitBtn = this.container.querySelector('.praetorian-submit-btn')!;
    const categorySelect = this.container.querySelector('[name="category"]') as HTMLSelectElement;
    const prioritySelect = this.container.querySelector('[name="priority"]') as HTMLSelectElement;

    closeBtn.addEventListener('click', () => this.hide());
    cancelBtn.addEventListener('click', () => this.hide());

    submitBtn.addEventListener('click', () => {
      const comment = textarea.value.trim();
      if (!comment) {
        textarea.focus();
        return;
      }

      this.onSubmitCallback({
        comment,
        category: categorySelect.value,
        priority: prioritySelect.value,
        element: this.currentElement,
      });
    });

    // Submit on Cmd/Ctrl+Enter
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        submitBtn.click();
      }
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    this.shadowRoot.appendChild(this.container);
    textarea.focus();
  }

  hide() {
    this.container?.remove();
    this.container = null;
    this.currentElement = null;
  }
}
````

### Styles (Shadow DOM Isolated)

```css
/* src/content/ui/styles.css */

/* Comment Box */
.praetorian-comment-box {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  color: #e0e0e0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.praetorian-comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.praetorian-comment-title {
  font-weight: 600;
  font-size: 13px;
}

.praetorian-close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.praetorian-close-btn:hover {
  color: #fff;
}

.praetorian-comment-input {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  color: #e0e0e0;
  font-size: 13px;
  resize: none;
  font-family: inherit;
}

.praetorian-comment-input:focus {
  outline: none;
  border-color: #4a9eff;
}

.praetorian-comment-options {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.praetorian-select {
  flex: 1;
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 6px 8px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
}

.praetorian-comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.praetorian-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.praetorian-btn-primary {
  background: #4a9eff;
  color: #fff;
}

.praetorian-btn-primary:hover {
  background: #3a8eef;
}

.praetorian-btn-secondary {
  background: #333;
  color: #e0e0e0;
}

.praetorian-btn-secondary:hover {
  background: #444;
}

/* Element Overlay */
.praetorian-overlay {
  position: fixed;
  pointer-events: none;
  border: 2px solid #4a9eff;
  background: rgba(74, 158, 255, 0.1);
  border-radius: 2px;
  z-index: 2147483646;
  transition: all 0.1s ease;
}

/* Task Bar */
.praetorian-task-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border-top: 1px solid #333;
  padding: 8px 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  color: #e0e0e0;
  z-index: 2147483645;
  max-height: 150px;
  overflow-y: auto;
}

.praetorian-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.praetorian-task-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.praetorian-task-status.pending {
  background: #f59e0b;
}
.praetorian-task-status.done {
  background: #10b981;
}
.praetorian-task-status.failed {
  background: #ef4444;
}

/* Toast */
.praetorian-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #10b981;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  animation:
    praetorian-toast-in 0.2s ease,
    praetorian-toast-out 0.2s ease 1.8s forwards;
  z-index: 2147483647;
}

@keyframes praetorian-toast-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes praetorian-toast-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Toolbar */
.praetorian-toolbar {
  position: fixed;
  top: 10px;
  right: 10px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 4px;
  display: flex;
  gap: 4px;
  z-index: 2147483645;
}

.praetorian-toolbar-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.praetorian-toolbar-btn:hover {
  background: #333;
  color: #fff;
}

.praetorian-toolbar-btn.active {
  background: #4a9eff;
  color: #fff;
}
```

---

## Development Phases

### Phase 1: Core Extension (MVP) - 5 days

**Goal**: Basic element commenting with file sync

- [ ] Chrome extension scaffold with Vite
- [ ] Content script injection on localhost
- [ ] Element hover highlighting
- [ ] Comment mode (C key)
- [ ] Comment box UI
- [ ] Selector generation
- [ ] Screenshot capture (html2canvas)
- [ ] File System Access API connection
- [ ] tasks.json write
- [ ] tasks.md generation
- [ ] Basic popup UI (connect/disconnect)

**Deliverable**: Working extension that creates annotations

### Phase 2: Claude Code Integration - 3 days

**Goal**: Full processing pipeline

- [ ] `/annotate` command
- [ ] `processing-visual-annotations` skill
- [ ] Task status updates
- [ ] Agent routing by category
- [ ] Screenshot loading in Claude Code
- [ ] Error handling and recovery

**Deliverable**: End-to-end workflow from annotation to fix

### Phase 3: Enhanced Annotation - 3 days

**Goal**: Rectangle drawing and improved UX

- [ ] Rectangle drawing mode (R key)
- [ ] Freeform region annotations
- [ ] Task bar at bottom of page
- [ ] Keyboard shortcut help
- [ ] Improved selector confidence scoring
- [ ] Better styling/dark mode

**Deliverable**: Full annotation feature set

### Phase 4: Polish & Distribution - 2 days

**Goal**: Team-ready tool

- [ ] Build pipeline (vite build)
- [ ] Installation documentation
- [ ] Team distribution guide
- [ ] Error reporting
- [ ] Usage analytics (optional)

**Deliverable**: Packaged extension ready for team use

---

## Future Extensions

### Security Annotations (Phase 5)

```typescript
interface SecurityAnnotation extends AnnotationTask {
  category: "security";
  securityType:
    | "xss_concern" // Potential XSS vector
    | "auth_issue" // Auth/authz concern
    | "input_validation" // Missing validation
    | "sensitive_data" // Data exposure
    | "csrf_concern" // CSRF risk
    | "injection_risk"; // Injection vulnerability

  // Additional context
  eventHandlers?: string[]; // onclick, onsubmit
  inputType?: string; // text, password, hidden
  formAction?: string; // Form submission URL
  cookieAccess?: boolean; // JS cookie access
}
```

Routes to: `frontend-security-reviewer` agent

### Penetration Testing Mode (Phase 6)

```typescript
interface PentestAnnotation extends AnnotationTask {
  category: "pentest";
  findingType:
    | "information_disclosure"
    | "authentication_bypass"
    | "authorization_flaw"
    | "injection_point"
    | "sensitive_endpoint";

  // Pentest context
  requestInfo?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };
  responseInfo?: {
    status: number;
    headers: Record<string, string>;
  };
}
```

Routes to: `security-risk-assessor` or dedicated pentest agent

### GitHub Integration (Phase 7)

```typescript
interface GitHubAnnotation extends AnnotationTask {
  github?: {
    repository: string;
    branch: string;
    commitSha: string;

    // Source mapping (if available via sourcemaps)
    sourceFile?: string;
    sourceLine?: number;

    // Issue creation
    createIssue: boolean;
    issueLabels: string[];
    assignees: string[];
  };
}
```

Creates GitHub issues directly from annotations.

---

## Technology Stack

| Component           | Technology             | Rationale                  |
| ------------------- | ---------------------- | -------------------------- |
| Extension Framework | Manifest V3            | Chrome's current standard  |
| Build Tool          | Vite                   | Fast builds, good DX       |
| Language            | TypeScript             | Type safety                |
| Screenshot          | html2canvas            | Reliable DOM rendering     |
| Styling             | CSS (Shadow DOM)       | Isolation from page styles |
| File Storage        | File System Access API | Direct project access      |
| State               | In-memory + file sync  | Simple, no external deps   |

---

## Security Considerations

1. **localhost only** - Only inject on localhost/127.0.0.1
2. **User-initiated** - File access requires user action
3. **No network calls** - All data stays local
4. **Shadow DOM** - UI isolated from page
5. **CSP compliant** - No inline scripts
6. **Read-only page** - Don't modify user's DOM

---

## Success Metrics

1. **Time to annotate** - < 10 seconds per annotation
2. **Selector accuracy** - > 90% selectors work first try
3. **Fix success rate** - > 80% tasks fixed by agent
4. **Developer satisfaction** - Positive feedback from team

---

## Open Questions

1. **Multi-page annotations** - How to handle SPAs with client routing?
2. **Responsive variants** - Separate annotations for mobile/desktop?
3. **Team sync** - Should annotations sync via git?
4. **Version control** - How to handle annotation drift after code changes?
