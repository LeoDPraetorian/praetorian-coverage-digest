# shadcn/ui CLI Features

Complete reference for CLI 3.0+ commands (August 2025).

## Core Commands

### init

Initialize shadcn/ui in a project:

```bash
# Standard (React 18 + Tailwind v3)
npx shadcn@latest init

# Canary (React 19 + Tailwind v4)
npx shadcn@canary init

# With specific style
npx shadcn@latest init --style new-york

# Non-interactive with defaults
npx shadcn@latest init -y
```

**Framework detection:** CLI auto-detects Next.js, Remix, Vite, Laravel, Astro.

### add

Add components to your project:

```bash
# Single component
npx shadcn@latest add button

# Multiple components
npx shadcn@latest add button card dialog

# All components (not recommended for production)
npx shadcn@latest add --all

# Overwrite existing
npx shadcn@latest add button --overwrite

# Specify path
npx shadcn@latest add button --path src/components/ui
```

### diff (Compare with upstream)

See what changed since you added a component:

```bash
# Single component
npx shadcn@latest diff button

# All components
npx shadcn@latest diff
```

**Use case:** After modifying components, see what upstream changes you might want to incorporate.

### search (CLI 3.0)

Search for components:

```bash
npx shadcn@latest search button
npx shadcn@latest search "date picker"
```

### view (CLI 3.0)

View component code before adding:

```bash
npx shadcn@latest view button
npx shadcn@latest view sidebar
```

### list (CLI 3.0)

List available components:

```bash
npx shadcn@latest list
```

## Namespaced Registries (CLI 3.0)

Install from community registries using `@namespace/component`:

```bash
# From shadcn registry
npx shadcn@latest add @shadcn/sidebar

# From community registries
npx shadcn@latest add @acme/custom-button
npx shadcn@latest add @myorg/data-table
```

## Remote Components (URL)

Install components from any URL:

```bash
# From custom registry
npx shadcn@latest add https://example.com/registry/navbar.json

# From GitHub raw
npx shadcn@latest add https://raw.githubusercontent.com/user/repo/main/registry/component.json
```

## Monorepo Support

CLI understands Turborepo and pnpm workspaces:

### Setup

Each workspace needs a `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@workspace/ui/components",
    "utils": "@workspace/ui/lib/utils"
  }
}
```

### Typical Structure

```
monorepo/
├── apps/
│   ├── web/
│   │   └── components.json  # Points to @workspace/ui
│   └── admin/
│       └── components.json
├── packages/
│   └── ui/
│       ├── components/
│       │   └── ui/          # Shared components install here
│       ├── lib/
│       │   └── utils.ts
│       └── package.json
├── turbo.json
└── pnpm-workspace.yaml
```

### Usage

```bash
# From app directory
cd apps/web
npx shadcn@latest add button  # Installs to packages/ui/components/ui/
```

## Private Registries

### Authentication

Set environment token:

```bash
export REGISTRY_TOKEN=your_token
npx shadcn@latest add @private/component
```

Or pass inline:

```bash
REGISTRY_TOKEN=your_token npx shadcn@latest add @private/component
```

### Testing with curl

```bash
curl -H "Authorization: Bearer your_token" https://registry.company.com/button.json
```

## Custom Registry

Create your own component registry:

### registry.json (Entry point)

```json
{
  "name": "my-registry",
  "homepage": "https://my-registry.com",
  "items": [
    {
      "name": "navbar",
      "type": "registry:ui",
      "files": ["navbar.tsx"],
      "dependencies": ["@radix-ui/react-navigation-menu"]
    }
  ]
}
```

### Component JSON

```json
{
  "name": "navbar",
  "type": "registry:ui",
  "files": [
    {
      "name": "navbar.tsx",
      "content": "// Component code..."
    }
  ],
  "dependencies": ["@radix-ui/react-navigation-menu"],
  "devDependencies": [],
  "registryDependencies": ["button"]
}
```

### Hosting

Host at any URL. Users install with:

```bash
npx shadcn@latest add https://my-registry.com/navbar.json
```

## CLI Options Reference

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation prompts |
| `-o, --overwrite` | Overwrite existing files |
| `-c, --cwd <path>` | Working directory |
| `-a, --all` | Add all components |
| `-p, --path <path>` | Component install path |
| `-s, --silent` | Suppress output |
| `--style <name>` | Style preset (new-york) |

## Configuration (components.json)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## Troubleshooting

### "Component not found"

Check registry name:
```bash
# Wrong
npx shadcn@latest add @wrong/button

# Right - check registry directory
npx shadcn@latest list
```

### "Cannot resolve path"

Verify `components.json` aliases match your `tsconfig.json` paths.

### Monorepo install to wrong location

Ensure `components.json` is in the workspace root with correct aliases:
```json
{
  "aliases": {
    "components": "@workspace/ui/components",
    "utils": "@workspace/ui/lib/utils"
  }
}
```

## Resources

- **CLI Documentation:** https://ui.shadcn.com/docs/cli
- **Registry Documentation:** https://ui.shadcn.com/docs/registry
- **Monorepo Guide:** https://ui.shadcn.com/docs/monorepo
- **Registry Directory:** https://ui.shadcn.com/docs/directory
