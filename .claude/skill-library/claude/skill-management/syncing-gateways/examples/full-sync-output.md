# Full Sync Output Example

**Sample output from `--full-sync` operation.**

## Command

```
Use syncing-gateways skill with --full-sync flag
```

## Output

```
=== Gateway Sync - Full Sync Mode ===

Phase 1: Discovery
Found 112 library skills in .claude/skill-library/

Phase 2: Mapping to gateways
  - gateway-frontend: 28 skills
  - gateway-backend: 18 skills
  - gateway-testing: 15 skills
  - gateway-security: 12 skills
  - gateway-mcp-tools: 5 skills
  - gateway-integrations: 8 skills
  - gateway-capabilities: 6 skills
  - gateway-claude: 20 skills

Phase 3: Comparison
Analyzing 8 gateways...

Phase 4: Application
Updating gateways with changes...

---

Gateway: gateway-frontend

Reading current routing table... OK (25 entries)
Identifying changes...
  - ADD: 3 skills
  - REMOVE: 1 skill (broken path)

Building new routing table... OK (27 entries)
Applying edit... OK
Verifying changes... OK

Changes applied:
  ✅ Added: Frontend Performance
  ✅ Added: Frontend Accessibility
  ✅ Added: Frontend Animation
  ✅ Removed: Old React Skill (path no longer exists)

---

Gateway: gateway-backend

Reading current routing table... OK (18 entries)
No changes needed
Skipping update

---

Gateway: gateway-testing

Reading current routing table... OK (13 entries)
Identifying changes...
  - ADD: 2 skills
  - REMOVE: 0 skills

Building new routing table... OK (15 entries)
Applying edit... OK
Verifying changes... OK

Changes applied:
  ✅ Added: E2E Debugging
  ✅ Added: Visual Regression Testing

---

Gateway: gateway-security

Reading current routing table... OK (12 entries)
No changes needed
Skipping update

---

Gateway: gateway-mcp-tools

Reading current routing table... OK (5 entries)
No changes needed
Skipping update

---

Gateway: gateway-integrations

Reading current routing table... OK (7 entries)
Identifying changes...
  - ADD: 1 skill
  - REMOVE: 0 skills

Building new routing table... OK (8 entries)
Applying edit... OK
Verifying changes... OK

Changes applied:
  ✅ Added: Slack Integration

---

Gateway: gateway-capabilities

Reading current routing table... OK (6 entries)
No changes needed
Skipping update

---

Gateway: gateway-claude

Reading current routing table... OK (18 entries)
Identifying changes...
  - ADD: 4 skills
  - REMOVE: 2 skills (broken paths)

Building new routing table... OK (20 entries)
Applying edit... OK
Verifying changes... OK

Changes applied:
  ✅ Added: Creating Agents
  ✅ Added: Updating Agents
  ✅ Added: Deleting Skills
  ✅ Added: Syncing Gateways
  ✅ Removed: Old Command Skill (path no longer exists)
  ✅ Removed: Deprecated Tool (path no longer exists)

---

=== Sync Complete ===

Summary:
  - Gateways processed: 8
  - Gateways updated: 4
  - Gateways unchanged: 4
  - Total skills added: 10
  - Total skills removed: 3
  - Duration: 4.2 seconds

Updated gateways:
  ✅ gateway-frontend (3 added, 1 removed)
  ✅ gateway-testing (2 added, 0 removed)
  ✅ gateway-integrations (1 added, 0 removed)
  ✅ gateway-claude (4 added, 2 removed)

Unchanged gateways:
  ⏭️  gateway-backend
  ⏭️  gateway-security
  ⏭️  gateway-mcp-tools
  ⏭️  gateway-capabilities

All routing tables verified successfully
```

## Post-Sync Validation

After sync completes, recommended to:

1. **Audit gateways** to verify compliance:

   ```bash
   npm run audit -- gateway-frontend
   npm run audit -- gateway-testing
   npm run audit -- gateway-integrations
   npm run audit -- gateway-claude
   ```

2. **Test gateway routing** by loading a newly-added skill:

   ```
   skill: "gateway-frontend"
   # Then try to access "Frontend Performance" skill
   ```

3. **Commit changes** to version control:
   ```bash
   git add .claude/skills/gateway-*
   git commit -m "sync: Update gateway routing tables"
   ```

## Notes

- Full sync modifies gateway files
- All changes are verified before completion
- If any verification fails, sync reports error and suggests rollback
- Duration depends on number of gateways and filesystem speed
