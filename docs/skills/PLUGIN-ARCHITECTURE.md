# Claude Code Setup for Chariot Development Platform

## Quick Start (Required for All Team Members)

### 1. Install Chariot Skills (Project-Specific)

```bash
/plugin marketplace add ./
/plugin install chariot-development-platform
```

**Provides:**

- SessionStart hook (auto-loads using-superpowers)
- MANDATORY FIRST RESPONSE PROTOCOL (enforces skill checking)
- Foundation skills
- Chariot-specific skills (unique to our platform)

### 2. Restart Claude Code

Close and reopen Claude Code to load all plugins.

### 4. Verify Installation

**Check SessionStart hook loaded:**

You should see at session start:

```
<EXTREMELY_IMPORTANT>
You have superpowers...
MANDATORY FIRST RESPONSE PROTOCOL
...
```

**Check skills available:**

Ask Claude: "What skills are available?"

Should see 100+ skills from:

- superpowers (20 skills)
- chariot-development-platform (83 skills)
- Your personal ~/.claude/skills/ (if any)

**Test skill activation:**

```
"Use the systematic-debugging skill to help me debug"
```

Should load and activate the skill (not "Unknown skill" error).

---

## What This Setup Provides

**For Everyone on the Team:**

1. ✅ **Automatic skill activation** - using-superpowers enforces skill checking
2. ✅ **Consistent workflows** - Same skills for all developers
3. ✅ **TDD enforcement** - test-driven-development skill active
4. ✅ **Quality gates** - verification-before-completion active
5. ✅ **Chariot patterns** - Platform-specific best practices
6. ✅ **No manual configuration** - Plugins handle everything

**Skills activate reliably (80%+ vs 20% baseline) with MANDATORY FIRST RESPONSE PROTOCOL.**

---

## Troubleshooting

### Skills Not Loading

**Issue:** Skills show as "Unknown skill"

**Fix:**

```bash
# Reinstall plugins
/plugin uninstall superpowers
/plugin uninstall chariot-development-platform

/plugin install superpowers
/plugin install chariot-development-platform

# Restart Claude Code
```

### SessionStart Hook Not Firing

**Issue:** Don't see <EXTREMELY_IMPORTANT> message at session start

**Check:**

1. Verify superpowers installed: `/plugin list`
2. Check working directory: `pwd` (should be in project root)
3. Restart Claude Code completely

### Only 2 Skills Visible

**Issue:** Only see serverless-compute-decision-architecture and smart-eslint

**Cause:** Plugins not installed or working directory wrong

**Fix:** Run installation steps above, ensure in project root

---

## Plugin Architecture

```
Superpowers Plugin (foundation)
├── SessionStart hook → Injects using-skills
├── MANDATORY FIRST RESPONSE PROTOCOL → Enforces skill checking
└── 20 foundation skills → TDD, debugging, collaboration

Chariot Plugin (project-specific)
├── 83 Chariot skills → Platform patterns, tools, workflows
└── Plugin hooks → Future team-specific automation

Together: 83 total skills (20 foundation + 63 Chariot-specific), automatic activation, consistent workflows
```

---

## For New Team Members

**One-time setup (5 minutes):**

1. Clone chariot-development-platform repo
2. Open in Claude Code
3. Run 2 plugin install commands above
4. Restart Claude Code
5. Done - all skills active

**No per-developer configuration files needed.**
**Plugin system handles everything.**

---

## Updating Skills

**When skills are updated in the repo:**

```bash
# Pull latest changes
git pull

# Reinstall Chariot plugin to pick up changes
/plugin uninstall chariot-development-platform
/plugin install chariot-development-platform

# Restart Claude Code
```

**Superpowers updates:**

```bash
/plugin marketplace update obra/superpowers
/plugin uninstall superpowers
/plugin install superpowers
```

---

## What NOT to Do

**❌ Don't modify .claude/settings.json for hooks**

- Use plugin hooks instead (hooks/hooks.json in repo)
- Settings.json is user-local, not team-shared

**❌ Don't copy skills to ~/.claude/skills/ manually**

- Install as plugin instead
- Plugin system handles discovery

**❌ Don't skip superpowers installation**

- SessionStart hook comes from superpowers
- Foundation skills required for TDD workflows

---

## Files Created by Setup

**After installation, you'll have:**

```
~/.claude/plugins/
├── installed_plugins.json  # Registry of installed plugins
├── known_marketplaces.json # Registry of marketplaces
└── marketplaces/
    ├── obra-superpowers/  # Superpowers plugin files
    └── [local copy of chariot plugin]
```

**All automatic, no manual file creation needed.**
