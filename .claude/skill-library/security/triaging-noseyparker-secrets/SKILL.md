---
name: triaging-noseyparker-secrets
description: Use when processing NoseyParker/Nebula secret scan results to identify and filter false positives across all secret types (AWS, PEM keys, passwords, API keys, MongoDB, JWTs), generating a triage report
allowed-tools: Read, Write, Bash, Grep, Glob
---

# Triaging NoseyParker Secrets

**Systematic workflow for filtering false positives from NoseyParker secret scan results across all rule types.**

## When to Use

Use this skill when:

- Processing NoseyParker/Nebula JSON output containing secrets
- Need to filter false positives from secret scan results
- Creating a triage report categorizing secrets as valid or false positive
- Validating findings before reporting

## Supported Rule Types

| Rule | Common FP Sources | Risk Level |
|------|-------------------|------------|
| AWS API Credentials | Documentation examples, EXAMPLE keywords | Critical |
| AWS Secret Access Key | Documentation examples | Critical |
| MongoDB Connection String | Rarely FP - usually valid | Critical |
| PEM-Encoded Private Key | Example docs, system libraries, test certs | High |
| Generic Password | Filtered/masked values, example docs | Medium |
| Generic API Key | EXAMPLE keywords, SDK examples | Medium |
| Generic Secret | SDK code, concatenated strings | Low |
| Generic Username and Password | README placeholders | Medium |
| JSON Web Token | SDK examples, test tokens | Medium |
| netrc Credentials | Example files | Medium |

## Quick Reference

| Phase | Action |
|-------|--------|
| 1. Load | Read NoseyParker JSON output file |
| 2. Group | Categorize findings by rule type |
| 3. Filter | Apply rule-specific FP patterns |
| 4. Validate | Check format validity for remaining secrets |
| 5. Report | Generate triage report with categorization |

---

## False Positive Patterns by Rule Type

### AWS Credentials

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| Documentation placeholder | `AKIAIOSFODNN7EXAMPLE` | Contains `EXAMPLE` |
| Documentation secret | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Contains `EXAMPLEKEY` |
| AWS CLI examples path | `awscli/examples/*` | Path match |
| Test/mock context | `test_aws_key` | Keyword match |

**Valid format:** `AKIA[A-Z234567]{16}` (20 chars, base32)

### PEM-Encoded Private Key

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| Example in content | `-----BEGIN RSA PRIVATE KEY-----EXAMPLE` | Contains `EXAMPLE` |
| AWS CLI examples | `awscli/examples/lightsail/` | Path match |
| System libraries | `libgnutls.so`, `libssl.so` | Path contains `.so` |
| Test directories | `test/`, `fixtures/`, `mock/` | Path match |

### Generic Password

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| Already filtered | `*****FILTERED*****` | Contains `FILTERED` or `*****` |
| Placeholder values | `password`, `changeme`, `dbpassword` | Exact match |
| Example docs | `awscli/examples/` | Path match |
| README files | `README.md` | Path match |

### Generic Secret

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| SDK code | `SecretCommand").f(CreateSecretRequest` | Contains code patterns |
| Concatenated strings | `SECRET_KEYAccept-CharsetApiCall` | Multiple keywords joined |
| Binary/struct data | `Secret []uint8 }` | Contains struct syntax |
| AWS SDK paths | `@aws-sdk/client-*` | Path match |

### Generic API Key

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| EXAMPLE keyword | `9drTJvcXLB89EXAMPLELB8923` | Contains `EXAMPLE` |
| AWS examples | `awscli/examples/sts/` | Path match |
| SDK documentation | `@aws-sdk/*/dist-types/` | Path match |

### Generic Username and Password

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| README placeholders | `user = dbuser\npassword = dbpassword` | Generic names |
| Documentation paths | `README.md`, `node_modules/*/README.md` | Path match |

### MongoDB Connection String

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| Localhost connections | `mongodb://user:pass@localhost` | Host is `localhost` |
| Example strings | `mongodb://example:example@` | Contains `example` |

**⚠️ RARELY FALSE POSITIVE** - MongoDB strings with cloud hosts are usually valid!

### JSON Web Token

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| SDK examples | `@aws-sdk/client-sso-oidc/` | Path match |
| TypeScript definitions | `dist-types/`, `.d.ts` | Path match |
| Test tokens | `test/`, `__tests__/` | Path match |

### netrc Credentials

| FP Pattern | Example | Detection |
|------------|---------|-----------|
| Example files | `example.netrc`, `netrc.example` | Path match |

---

## Universal FP Detection (All Rules)

Apply these checks to ALL findings before rule-specific checks:

```
1. Path contains `awscli/examples/` → FP: "AWS CLI documentation"
2. Path contains `node_modules/@aws-sdk/` → FP: "AWS SDK code"
3. Path contains `README.md` or `EXAMPLE` → FP: "Documentation"
4. Path contains `test/`, `__tests__/`, `mock/`, `fixtures/` → FP: "Test file"
5. Path ends with `.so` → FP: "System library"
6. Value contains `EXAMPLE`, `SAMPLE`, `PLACEHOLDER` → FP: "Placeholder"
7. Value is `*****FILTERED*****` → FP: "Already masked"
8. Value is `password`, `changeme`, `secret` → FP: "Generic placeholder"
```

---

## Automated Triage Commands

### Count findings by rule type

```bash
cat output.json | jq 'group_by(.rule_name) | map({rule: .[0].rule_name, count: length}) | sort_by(-.count)'
```

### Filter out all FPs (comprehensive)

```bash
cat output.json | jq '[.[] | select(
  (.snippet.matching | test("EXAMPLE|FILTERED|password|changeme|dbpassword"; "i") | not) and
  (.provenance.first_commit.blob_path // "" | test("awscli/examples|@aws-sdk|README|test/|__tests__|fixtures|mock/|\\.so$"; "i") | not)
)]'
```

### Extract valid AWS credentials only

```bash
cat output.json | jq '[.[] | select(.rule_name | test("AWS")) | select(
  (.snippet.matching | test("EXAMPLE"; "i") | not) and
  (.provenance.first_commit.blob_path // "" | test("awscli/examples"; "i") | not)
)]'
```

### Extract valid MongoDB strings only

```bash
cat output.json | jq '[.[] | select(.rule_name == "Credentials in MongoDB Connection String") | select(
  (.snippet.matching | test("localhost|127.0.0.1|example"; "i") | not)
)]'
```

### Count valid vs FP

```bash
TOTAL=$(cat output.json | jq 'length')
FP=$(cat output.json | jq '[.[] | select(
  (.snippet.matching | test("EXAMPLE|FILTERED|password|changeme"; "i")) or
  (.provenance.first_commit.blob_path // "" | test("awscli/examples|@aws-sdk|README|test/"; "i"))
)] | length')
echo "Total: $TOTAL, FP: $FP, Valid: $((TOTAL - FP))"
```

---

## Report Template

```markdown
# NoseyParker Secret Triage Report

Generated: {timestamp}
Source: {input_file}

## Summary

| Category | Valid | False Positive | Total |
|----------|-------|----------------|-------|
| AWS Credentials | X | Y | Z |
| MongoDB Connection String | X | Y | Z |
| PEM Private Keys | X | Y | Z |
| Generic Passwords | X | Y | Z |
| Generic Secrets | X | Y | Z |
| Generic API Keys | X | Y | Z |
| JWTs | X | Y | Z |
| Other | X | Y | Z |
| **TOTAL** | **X** | **Y** | **Z** |

## Critical: Valid Secrets Requiring Immediate Action

### AWS Credentials
| Resource | Access Key | Secret Key (masked) | Path |
|----------|------------|---------------------|------|

### MongoDB Connection Strings
| Resource | Connection String (masked) | Host | Path |
|----------|---------------------------|------|------|

## High: Valid Secrets Requiring Investigation

### PEM Private Keys
| Resource | Key Type | Path |
|----------|----------|------|

## False Positives by Reason

| Reason | Count | Examples |
|--------|-------|----------|
| AWS documentation placeholder | X | AKIAIOSFODNN7EXAMPLE |
| SDK example code | Y | @aws-sdk/client-* paths |
| Already filtered | Z | *****FILTERED***** |
| Test/mock file | W | test/, __tests__/ paths |
```

---

## Integration

### Called By

- Security review workflows processing NoseyParker/Nebula output
- CI/CD secret scanning pipelines
- Manual security assessments

### Pairs With

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `secrets-management` | After triage | Handle confirmed valid secrets |
| `secret-scanner` | Before triage | Run NoseyParker scan |

## References

- [references/aws-key-formats.md](references/aws-key-formats.md) - AWS credential format validation
- [references/false-positive-patterns.md](references/false-positive-patterns.md) - Detailed FP patterns
- [references/noseyparker-schema.md](references/noseyparker-schema.md) - JSON schema reference
