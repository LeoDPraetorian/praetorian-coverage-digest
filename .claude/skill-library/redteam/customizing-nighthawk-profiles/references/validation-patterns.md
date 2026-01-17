# Validation Patterns

**Advanced validation techniques for Nighthawk profile customization.**

---

## JSON Validation

### Syntax Validation
```bash
jq . profile.json > /dev/null && echo "✅ Valid" || echo "❌ Invalid"
```

### Structural Validation
```bash
# Verify required sections
jq '.["c2-profile"] | has("api") and has("strategy") and has("general-config")' profile.json
```

### Field Type Validation
```bash
# Verify interval is number
jq '.["c2-profile"]["general-config"]["settings"]["interval"] | type == "number"' profile.json
```

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Trailing comma | `, }` or `, ]` | Remove comma before closing brace/bracket |
| Unescaped backslash | `\` in path | Use `\\` (e.g., `c:\\windows`) |
| Invalid UUID | Wrong format | Verify format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` |
| Duplicate assembly | Same stomp name | Use unique assembly for each module |

---

## Functional Validation

### Baseline Diff Check
```bash
# Compare critical settings
diff <(jq '.["c2-profile"]["general-config"]["settings"]' baseline.json) \
     <(jq '.["c2-profile"]["general-config"]["settings"]' custom.json)
```

### OPSEC Preservation Check
```bash
# Verify OPSEC unchanged
diff <(jq -S '.["c2-profile"]["general-config"]["opsec"]' baseline.json) \
     <(jq -S '.["c2-profile"]["general-config"]["opsec"]' custom.json)
```

---

## Content Validation

### User-Agent Validation
```bash
# Check for outdated browsers
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].headers["User-Agent"]' profile.json | \
  grep -E "mozilla/[0-4]|msie|chrome/[0-9]{2}\." && echo "⚠️ Outdated" || echo "✅ Current"
```

### URI REST Compliance
```bash
# Check for verbs in URIs (anti-pattern)
jq -r '.["c2-profile"]["egress-config"].commands.*.["build-request"].uri' profile.json | \
  grep -iE "get|set|do|execute" && echo "⚠️ Verb in URI" || echo "✅ REST-compliant"
```

### Assembly Format Validation
```bash
# Verify .NET assembly format
jq -r '.["c2-profile"]["general-config"]["code-modules"].encoders[].["stomp-assembly-name"]' profile.json | \
  grep -E "^[A-Za-z0-9.]+, Version=[0-9.]+, Culture=[a-z]+, PublicKeyToken=[0-9a-f]{16}" || echo "❌ Invalid format"
```

---

## Pre-Deployment Checklist (Gate)

**All must pass before deployment**:
- [ ] JSON syntax valid (jq validation)
- [ ] Required sections present (api, strategy, general-config)
- [ ] No test/placeholder data (grep check)
- [ ] User-Agents current and realistic
- [ ] URIs follow REST conventions
- [ ] Assembly names unique and legitimate
- [ ] Operational settings unchanged (unless approved)
- [ ] All UUIDs valid v4 format
- [ ] Windows paths use escaped backslashes (`\\`)

**If any fail → Fix and re-validate → Repeat until all pass**

---

## Sources

- Nighthawk Official Documentation
- Research Synthesis (Validation techniques)
