# Copyright Header Automation

**Complete implementation for adding copyright headers with year detection and idempotent operations.**

## Header Formats by Language

### C-style Comments

Used by: Go, C, C++, Java, JavaScript, TypeScript, Rust, C#

```go
// Copyright 2026 Praetorian Security, Inc.
// SPDX-License-Identifier: Apache-2.0
```

### Hash Comments

Used by: Python, Ruby, Shell scripts, YAML, Perl

```python
# Copyright 2026 Praetorian Security, Inc.
# SPDX-License-Identifier: Apache-2.0
```

### HTML/XML Comments

```html
<!-- Copyright 2026 Praetorian Security, Inc. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
```

## Year Range Detection Algorithm

**For files tracked in git:**

```bash
get_copyright_years() {
  local file="$1"

  # Get first commit year (file creation)
  first_year=$(git log --follow --diff-filter=A --format=%ad --date=format:%Y "$file" 2>/dev/null | tail -1)

  # Get last modification year
  last_year=$(git log -1 --format=%ad --date=format:%Y "$file" 2>/dev/null)

  # Current year as fallback
  current_year=$(date +%Y)

  # Determine year string
  if [ -z "$first_year" ]; then
    # File not in git yet
    echo "$current_year"
  elif [ "$first_year" = "$current_year" ]; then
    # Created this year
    echo "$current_year"
  else
    # Use range
    echo "$first_year-$current_year"
  fi
}

# Usage
years=$(get_copyright_years "src/main.go")
echo "// Copyright $years Praetorian Security, Inc."
```

## Idempotent Header Addition

**Check before adding to prevent duplicates:**

```bash
add_copyright_header() {
  local file="$1"
  local lang="$2"  # go, python, html

  # Step 1: Check if header already exists
  if head -5 "$file" | grep -q "Copyright.*Praetorian"; then
    echo "✓ $file already has copyright header (skipping)"
    return 0
  fi

  # Step 2: Get appropriate year(s)
  years=$(get_copyright_years "$file")

  # Step 3: Generate header based on language
  case "$lang" in
    go|rust|java|javascript|typescript)
      header="// Copyright $years Praetorian Security, Inc.\n// SPDX-License-Identifier: Apache-2.0\n\n"
      ;;
    python|ruby|shell)
      header="# Copyright $years Praetorian Security, Inc.\n# SPDX-License-Identifier: Apache-2.0\n\n"
      ;;
    html|xml)
      header="<!-- Copyright $years Praetorian Security, Inc. -->\n<!-- SPDX-License-Identifier: Apache-2.0 -->\n\n"
      ;;
    *)
      echo "⚠️  Unknown language: $lang"
      return 1
      ;;
  esac

  # Step 4: Handle special cases
  if head -1 "$file" | grep -q "^#!"; then
    # Shebang present - insert after it
    {
      head -1 "$file"
      echo ""
      echo -e "$header"
      tail -n +2 "$file"
    } > "$file.tmp"
    mv "$file.tmp" "$file"
    echo "✓ Added copyright header after shebang: $file"
  elif head -1 "$file" | grep -q "^# -\*- coding:"; then
    # Encoding declaration present - insert after it
    {
      head -1 "$file"
      echo ""
      echo -e "$header"
      tail -n +2 "$file"
    } > "$file.tmp"
    mv "$file.tmp" "$file"
    echo "✓ Added copyright header after encoding: $file"
  else
    # Normal case - prepend to file
    {
      echo -e "$header"
      cat "$file"
    } > "$file.tmp"
    mv "$file.tmp" "$file"
    echo "✓ Added copyright header: $file"
  fi
}
```

## Batch Processing Script

**Process all files in a repository:**

```bash
#!/bin/bash
# add-copyright-headers.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Counters
added=0
updated=0
skipped=0
errors=0

# Process Go files
echo "Processing Go files..."
while IFS= read -r -d '' file; do
  if add_copyright_header "$file" "go"; then
    ((added++))
  else
    ((errors++))
  fi
done < <(find . -type f -name "*.go" \
  ! -path "*/vendor/*" \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  -print0)

# Process Python files
echo "Processing Python files..."
while IFS= read -r -d '' file; do
  if add_copyright_header "$file" "python"; then
    ((added++))
  else
    ((errors++))
  fi
done < <(find . -type f -name "*.py" \
  ! -path "*/venv/*" \
  ! -path "*/__pycache__/*" \
  ! -path "*/.git/*" \
  -print0)

# Process TypeScript/JavaScript files
echo "Processing TypeScript/JavaScript files..."
while IFS= read -r -d '' file; do
  if add_copyright_header "$file" "typescript"; then
    ((added++))
  else
    ((errors++))
  fi
done < <(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" \
  ! -path "*/.git/*" \
  -print0)

# Summary
echo ""
echo "======================================="
echo "Copyright Header Addition Summary"
echo "======================================="
echo "Added:   $added"
echo "Skipped: $skipped"
echo "Errors:  $errors"
echo "======================================="
```

## Updating Existing Headers

**Update year range when files are modified:**

```bash
update_copyright_year() {
  local file="$1"

  # Extract existing copyright line
  copyright_line=$(head -5 "$file" | grep "Copyright.*Praetorian" || true)

  if [ -z "$copyright_line" ]; then
    echo "⚠️  No copyright header found in $file"
    return 1
  fi

  # Get current year range
  current_year=$(date +%Y)
  years=$(get_copyright_years "$file")

  # Check if update needed
  if echo "$copyright_line" | grep -q "$current_year"; then
    echo "✓ $file copyright year is current"
    return 0
  fi

  # Update the year
  # Example: "Copyright 2020-2024" -> "Copyright 2020-2026"
  sed -i '' "s/Copyright [0-9-]* Praetorian/Copyright $years Praetorian/" "$file"
  echo "✓ Updated copyright year in $file"
}
```

## Special Cases

### 1. Package Documentation (Go)

Place copyright BEFORE package comment:

```go
// Copyright 2026 Praetorian Security, Inc.
// SPDX-License-Identifier: Apache-2.0

// Package brutus implements password auditing for multiple protocols.
package brutus
```

### 2. Shebang Lines (Scripts)

Place copyright AFTER shebang:

```python
#!/usr/bin/env python3
# Copyright 2026 Praetorian Security, Inc.
# SPDX-License-Identifier: Apache-2.0

import sys
```

### 3. Encoding Declarations (Python)

Place copyright AFTER encoding:

```python
# -*- coding: utf-8 -*-
# Copyright 2026 Praetorian Security, Inc.
# SPDX-License-Identifier: Apache-2.0

def main():
    pass
```

### 4. Generated Files

Add notice that file is generated and should not be manually edited:

```go
// Copyright 2026 Praetorian Security, Inc.
// SPDX-License-Identifier: Apache-2.0

// Code generated by protoc. DO NOT EDIT.
```

## Verification

**Check all files have copyright headers:**

```bash
check_copyright_headers() {
  echo "Checking copyright headers..."

  missing=()

  # Check Go files
  while IFS= read -r file; do
    if ! head -5 "$file" | grep -q "Copyright.*Praetorian"; then
      missing+=("$file")
    fi
  done < <(find . -type f -name "*.go" ! -path "*/vendor/*" ! -path "*/.git/*")

  # Check Python files
  while IFS= read -r file; do
    if ! head -5 "$file" | grep -q "Copyright.*Praetorian"; then
      missing+=("$file")
    fi
  done < <(find . -type f -name "*.py" ! -path "*/venv/*" ! -path "*/.git/*")

  if [ ${#missing[@]} -eq 0 ]; then
    echo "✓ All files have copyright headers"
    return 0
  else
    echo "❌ ${#missing[@]} files missing copyright headers:"
    printf '%s\n' "${missing[@]}"
    return 1
  fi
}
```

## Common Issues

### Issue: sed Syntax Varies by Platform

**Problem:** `sed -i` behaves differently on macOS vs Linux

**Solution:** Use portable sed wrapper

```bash
portable_sed() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}
```

### Issue: Binary Files Modified

**Problem:** Script tries to add headers to binary files

**Solution:** Use `file` command to detect text files

```bash
is_text_file() {
  file "$1" | grep -q "text"
}

if is_text_file "$file"; then
  add_copyright_header "$file" "$lang"
fi
```

### Issue: Large File Performance

**Problem:** Processing thousands of files is slow

**Solution:** Use parallel processing

```bash
export -f add_copyright_header get_copyright_years
find . -type f -name "*.go" | parallel -j 8 add_copyright_header {} go
```
