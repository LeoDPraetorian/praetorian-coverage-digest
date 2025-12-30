# macOS arm64 Architecture Fix

Solves the "mach-o file, but is an incompatible architecture" error.

## Problem

**Symptom**:
```
dlopen(/Users/.../site-packages/regex/_regex.cpython-312-darwin.so, 0x0002):
mach-o file, but is an incompatible architecture (have 'arm64', need 'x86_64')
```

**Cause**:
- Go binary running under Rosetta (x86_64 emulation)
- Python is universal binary (x86_64 + arm64)
- Python defaults to x86_64 architecture
- Python site-packages have arm64-only .so files
- Mismatch: x86_64 Python trying to load arm64 .so

## Detection

Cannot rely on `runtime.GOARCH` - Go may report "amd64" even on arm64 hardware.

**Solution**: Use sysctl to detect hardware:

```go
// Detect arm64 hardware (works even when Go runs under Rosetta)
out, err := exec.Command("sysctl", "-n", "hw.optional.arm64").Output()
if err == nil && len(out) > 0 && out[0] == '1' {
    // Running on arm64 hardware
    useArch = true
}
```

## Fix

Wrap Python calls with `arch -arm64`:

```go
func (h *PythonHarness) buildCommand(ctx context.Context, args []string) *exec.Cmd {
    fullArgs := append([]string{h.HarnessPath}, args...)

    var cmd *exec.Cmd
    if h.UseArch {
        // Force native arm64 execution
        archArgs := append([]string{"-arm64", h.PythonPath}, fullArgs...)
        cmd = exec.CommandContext(ctx, "arch", archArgs...)
    } else {
        // Direct execution
        cmd = exec.CommandContext(ctx, h.PythonPath, fullArgs...)
    }

    cmd.Env = append(cmd.Environ(), fmt.Sprintf("PYTHONPATH=%s", h.GarakPath))
    return cmd
}
```

## Verification

Test that arch wrapper works:

```bash
# Should succeed
arch -arm64 python3 -c "import regex; print('OK')"

# May fail without wrapper
python3 -c "import regex; print('OK')"
```

## When to Apply

Apply this fix on:
- macOS with Apple Silicon (M1/M2/M3 processors)
- When Go tests run but Python subprocess fails with architecture errors
- When `file $(which python3)` shows "universal binary"

Do NOT apply on:
- Linux (no arm64/x86_64 mixing)
- Windows (no `arch` command)
- macOS Intel (all x86_64)
