# Sizing Commands Reference

Complete command reference for codebase sizing across operating systems.

## File Counting Commands

### Total Files

```bash
# Unix/Linux/macOS
find {scope} -type f | wc -l

# With depth limit (faster for large repos)
find {scope} -maxdepth 3 -type f | wc -l

# Exclude hidden files
find {scope} -type f -not -path '*/\.*' | wc -l
```

### Files by Extension

```bash
# Count by specific extension
find {scope} -type f -name "*.go" | wc -l

# Multiple extensions
find {scope} -type f \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" \) | wc -l

# Count all extensions
find {scope} -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
```

### Per-Directory Counts

```bash
# Top-level directories only
for dir in {scope}/*/; do
  echo "$dir: $(find "$dir" -type f | wc -l)"
done

# With sorting by file count
for dir in {scope}/*/; do
  count=$(find "$dir" -type f | wc -l)
  echo "$count $dir"
done | sort -rn
```

## Component Discovery

### Standard Patterns

```bash
# Common component directories
ls -d {scope}/*/ 2>/dev/null | grep -E "(api|backend|frontend|ui|web|cmd|pkg|internal|src|lib|services|handlers|controllers|models|database|auth|infra)"

# Case-insensitive
ls -d {scope}/*/ 2>/dev/null | grep -iE "(api|backend|frontend)"
```

### Technology-Specific

```bash
# Go projects
find {scope} -name "go.mod" -exec dirname {} \;

# Node.js projects
find {scope} -name "package.json" -exec dirname {} \;

# Python projects
find {scope} -name "setup.py" -o -name "pyproject.toml" | xargs -n1 dirname

# Rust projects
find {scope} -name "Cargo.toml" -exec dirname {} \;
```

## Security Relevance Scoring

### Authentication Files

```bash
# Find auth-related files
find {scope} -type f \( -name "*auth*" -o -name "*jwt*" -o -name "*token*" -o -name "*session*" \) | wc -l

# List with paths
find {scope} -type f \( -name "*auth*" -o -name "*jwt*" -o -name "*token*" \)
```

### Cryptography Files

```bash
# Find crypto-related files
find {scope} -type f \( -name "*crypto*" -o -name "*encrypt*" -o -name "*hash*" -o -name "*key*" \) | wc -l
```

### Entry Point Files

```bash
# Find handlers/controllers
find {scope} -type f \( -name "*handler*" -o -name "*controller*" -o -name "*route*" \) | wc -l

# API endpoints
find {scope} -type f -name "*api*" | wc -l
```

## Lines of Code (Optional)

### Using cloc (if available)

```bash
# Install cloc
# macOS: brew install cloc
# Linux: apt-get install cloc

# Count LOC
cloc --quiet --sum-one {scope}

# By language
cloc --by-file --json {scope}
```

### Using wc (fallback)

```bash
# Total LOC (approximate, includes comments/blanks)
find {scope} -type f \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) -exec wc -l {} + | tail -1
```

## Performance Optimization

### For Very Large Codebases

```bash
# Limit depth to 3 levels
find {scope} -maxdepth 3 -type f | wc -l

# Exclude common large directories
find {scope} -type f -not -path "*/node_modules/*" -not -path "*/vendor/*" -not -path "*/.git/*" | wc -l

# Parallel processing (requires GNU parallel)
find {scope} -type d -maxdepth 1 | parallel 'echo {}: $(find {} -type f | wc -l)'
```

## Windows Compatibility

### PowerShell Commands

```powershell
# Total files
(Get-ChildItem -Path {scope} -Recurse -File).Count

# Files by extension
(Get-ChildItem -Path {scope} -Recurse -Filter *.go).Count

# Per-directory counts
Get-ChildItem -Path {scope} -Directory | ForEach-Object {
    $count = (Get-ChildItem -Path $_.FullName -Recurse -File).Count
    "$($_.Name): $count"
}
```

## Output Formatting

### JSON Output

```bash
# Create JSON with file counts
cat <<EOF
{
  "total_files": $(find {scope} -type f | wc -l),
  "go_files": $(find {scope} -name "*.go" | wc -l),
  "ts_files": $(find {scope} -name "*.ts" -o -name "*.tsx" | wc -l)
}
EOF
```

### CSV Output

```bash
# Component, Files, Priority
for dir in {scope}/*/; do
  count=$(find "$dir" -type f | wc -l)
  auth=$(find "$dir" -type f -name "*auth*" | wc -l)
  priority="low"
  [ "$auth" -gt 10 ] && priority="high"
  [ "$auth" -ge 5 ] && [ "$auth" -le 10 ] && priority="medium"
  echo "$dir,$count,$priority"
done
```
