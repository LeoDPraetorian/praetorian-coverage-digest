# GitHub SEO Optimization

**Strategies for maximizing repository discoverability on GitHub and search engines.**

## Description Best Practices

**Length:** 80-160 characters (GitHub displays ~160, search engines use ~160)

**Structure:**
```
[Tool Name]: [Value Proposition] [Key Features/Tech]
```

**Examples:**

✓ Good:
- "Brutus: Automated password auditing for 15+ protocols including SSH, FTP, and RDP"
- "Nebula: Cloud asset discovery and security scanning for AWS, Azure, and GCP"

❌ Bad:
- "Cool security tool" (vague, no keywords)
- "The revolutionary next-generation paradigm-shifting security platform" (marketing jargon, no substance)

## Topic Selection Strategy

**Aim for 5-8 topics across categories:**

| Category | Purpose | Examples |
|----------|---------|----------|
| Primary function | What it does | `security`, `authentication`, `scanning` |
| Technology stack | Implementation | `golang`, `python`, `typescript`, `rust` |
| Use case | Who uses it | `red-team`, `penetration-testing`, `devops` |
| Domain | Industry vertical | `cybersecurity`, `cloud-security`, `api-security` |
| Community | Discovery | `open-source`, `security-tools`, `infosec` |

**Research topics:**
```bash
# See what similar projects use
gh search repos "password audit" --json topics -q '.[].topics[]' | sort | uniq -c | sort -rn
```

## README Optimization

**Above the fold (first 500px):**
- Project name and one-line description
- Badges (license, build status, version)
- Quick start code example
- Key features (3-5 bullet points)

**Badges to include:**
```markdown
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Go Report Card](https://goreportcard.com/badge/github.com/praetorian-inc/brutus)](https://goreportcard.com/report/github.com/praetorian-inc/brutus)
[![GitHub release](https://img.shields.io/github/v/release/praetorian-inc/brutus)](https://github.com/praetorian-inc/brutus/releases)
```

## Search Keywords

**Include these naturally in README:**
- Primary use case keywords
- Common search terms in your domain
- Technology names
- Problem statements users would search for

Example: For a password auditing tool, include:
- "password auditing"
- "brute force"
- "authentication testing"
- "credential validation"
- Specific protocols (SSH, FTP, MySQL, etc.)

## Social Preview

**GitHub social preview card:**
- Set via Repository Settings → Social Preview
- Image: 1280x640px
- Include: Tool name, tagline, visual representation
- Will appear when link is shared on social media

## Metadata for Search Engines

**package.json (if Node project):**
```json
{
  "keywords": ["security", "authentication", "password-audit", "red-team"],
  "description": "Automated password auditing for 15+ protocols"
}
```

**Cargo.toml (if Rust project):**
```toml
[package]
keywords = ["security", "authentication", "password-audit"]
categories = ["command-line-utilities", "network-programming"]
```

## About Section (GitHub)

Repository → Settings → General → "About"

- Description: Same as repo description
- Website: Link to documentation or landing page
- Topics: 5-8 relevant topics
- Include in search: ✓ Enabled

## Linking Strategy

**Inbound links improve discoverability:**
- Link from company website/blog
- Add to awesome-lists (e.g., awesome-security, awesome-go)
- Mention in relevant documentation
- Reference in related projects' READMEs

## Monitoring

**Track discoverability:**
```bash
# View traffic (requires repo access)
gh api repos/praetorian-inc/brutus/traffic/views

# See referring sites
gh api repos/praetorian-inc/brutus/traffic/popular/referrers
```
