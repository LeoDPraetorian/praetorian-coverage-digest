---
name: link-chariot-ui-components
description: Link local build of chariot-ui-components in chariot for development
---

## Usage

```
/link-chariot-ui-components
```

## Purpose

This command creates a symlink between the local `chariot-ui-components` package and the main `chariot` application, enabling real-time development and testing of UI components without publishing to npm.

## Process

### Step 1: Build and Link UI Components
Navigate to the UI components module and create a global npm link:
```bash
cd modules/chariot-ui-components
npm run build && npm link
```

### Step 2: Link in Main Chariot App
Navigate to the main chariot application and link the local UI package:
```bash
cd modules/chariot
npm link "@praetorian-chariot/ui"
```

## Verification

After linking, verify the connection by checking:
- `node_modules/@praetorian-chariot/ui` should be a symlink pointing to your local build
- Import statements in chariot should resolve to your local components
- Changes in UI components should reflect immediately after rebuilding

## Troubleshooting

**If link fails:**
1. Ensure both packages use the exact same package name: `"@praetorian-chariot/ui"`
2. Check that UI components package.json has correct "name" field
3. Verify build completed successfully and created dist/ files

**To unlink:**
```bash
cd modules/chariot
npm unlink "@praetorian-chariot/ui"
npm install  # Restore npm registry version
```

**If changes don't appear:**
- Rebuild UI components: `npm run build` in modules/chariot-ui-components
- Restart chariot dev server
- Clear any bundler/build caches

## Best Practices

1. Always build UI components before testing changes
2. Use Storybook (`npm run storybook`) for isolated component development
3. Test components in actual chariot app before committing
4. Remember to unlink before deploying to avoid symlink issues