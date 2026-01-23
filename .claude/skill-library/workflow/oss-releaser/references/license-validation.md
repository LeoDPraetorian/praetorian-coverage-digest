# License Validation

**Ensuring LICENSE file compliance and handling multi-license scenarios.**

## Apache 2.0 Validation

```bash
# Check if LICENSE exists and is Apache 2.0
if [ -f LICENSE ]; then
  if grep -q "Apache License" LICENSE && grep -q "Version 2.0" LICENSE; then
    echo "✓ Valid Apache 2.0 LICENSE"
  else
    echo "⚠️  LICENSE exists but may not be Apache 2.0"
  fi
else
  echo "❌ LICENSE file missing"
fi
```

## Copyright Holder Validation

**Apache 2.0 requires copyright holder in APPENDIX:**

```
Copyright [yyyy] [name of copyright owner]

Licensed under the Apache License, Version 2.0...
```

**Verify:**
```bash
if grep -q "Copyright.*Praetorian Security, Inc" LICENSE; then
  echo "✓ Copyright holder specified"
else
  echo "⚠️  Copyright holder not specified or incorrect"
fi
```

## Multi-License Scenarios

**Scenario 1: Dependencies under different licenses**

Document in README:
```markdown
## License

This project is licensed under Apache 2.0 (see [LICENSE](LICENSE)).

### Third-Party Licenses

- `library-name` - MIT License
- `another-lib` - BSD-3-Clause

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for full text.
```

**Scenario 2: Dual licensing**

Use `LICENSE-APACHE` and `LICENSE-MIT`:
```markdown
## License

This project is dual-licensed under Apache 2.0 OR MIT.

- Apache 2.0: [LICENSE-APACHE](LICENSE-APACHE)
- MIT: [LICENSE-MIT](LICENSE-MIT)

You may choose either license for your use.
```

## SPDX Identifier

**Include in all source files:**
```
SPDX-License-Identifier: Apache-2.0
```

**Benefits:**
- Machine-readable
- Standardized format
- Automatic license detection tools
