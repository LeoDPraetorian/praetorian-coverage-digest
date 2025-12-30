# Embedded Resources

## Basic Usage

```go
package jailbreak

import "embed"

//go:embed prompts/*.txt
var promptFS embed.FS

//go:embed data/triggers.json
var triggersData []byte
```

## Security Considerations

- Never use `dir/*` - use `dir` or `dir/*.ext`
- Go won't follow symlinks
- Embedded files are read-only and goroutine-safe

## Good Patterns

```go
// ✅ Explicit patterns
//go:embed prompts/dan_11.txt prompts/grandma.txt
var specificPrompts embed.FS

// ✅ Extension filter
//go:embed data/*.json
var jsonData embed.FS
```

## Bad Patterns

```go
// ❌ May include .DS_Store, etc.
//go:embed prompts/*
var allFiles embed.FS
```
