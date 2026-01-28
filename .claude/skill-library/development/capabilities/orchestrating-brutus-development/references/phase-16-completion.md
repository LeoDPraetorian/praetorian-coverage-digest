# Phase 16: Completion

**Final verification, PR creation, and cleanup.**

---

## Final Verification

```bash
cd {BRUTUS_ROOT}

# Build
go build ./...

# Vet
go vet ./...

# Test
go test -short ./...

# Lint
golangci-lint run ./...
```

---

## Checklist

- [ ] All P0 requirements met
- [ ] Tests passing
- [ ] Coverage >= 80%
- [ ] Lint clean
- [ ] Documentation updated (if P1)
- [ ] Import added to init.go

---

## PR Creation

```bash
git add internal/plugins/{protocol}/
git add internal/plugins/init.go
git commit -m "feat(plugins): add {protocol} credential testing plugin

- Implements brutus.Plugin interface
- Error classification for auth vs connection errors
- Unit tests with 80%+ coverage

Co-Authored-By: Claude <noreply@anthropic.com>"

gh pr create --title "Add {protocol} plugin" --body "..."
```

---

## Cleanup

1. User approves result
2. Merge PR (or keep for review)
3. Remove worktree (or keep per user request)

---

## Human Checkpoint

Get final approval before merge.

---

## Related

- [Phase 15: Test Quality](phase-15-test-quality.md) - Previous phase
- [Emergency Abort](emergency-abort.md) - If cleanup needed
