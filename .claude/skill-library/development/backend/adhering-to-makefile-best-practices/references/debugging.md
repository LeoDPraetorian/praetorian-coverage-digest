# Debugging Makefiles

**Strategies and tools for troubleshooting build issues.**

## Quick Debugging Commands

| Command                           | Purpose                                    | When to Use                |
| --------------------------------- | ------------------------------------------ | -------------------------- |
| `make -n`                         | Dry-run (print commands without executing) | Preview what will run      |
| `make -p`                         | Print database (all rules and variables)   | Understand rule resolution |
| `make -d`                         | Debug mode (shows why targets rebuilt)     | Find dependency issues     |
| `make --trace`                    | Trace execution (shows rule entry/exit)    | Follow execution flow      |
| `make -w`                         | Print working directory                    | Debug recursive makes      |
| `make --warn-undefined-variables` | Warn on undefined vars                     | Catch typos early          |

## Common Debugging Scenarios

### 1. Target Not Rebuilding

**Problem:** You changed source files but Make says "up to date"

**Debug steps:**

```bash
# Step 1: Check what Make thinks about dependencies
make -d target 2>&1 | grep -A5 "Considering target"

# Step 2: Check file timestamps
ls -lh --time-style=full-iso source.c build/target

# Step 3: Dry-run to see what would execute
make -n target

# Step 4: Force rebuild
make -B target  # -B = unconditional rebuild
```

**Common causes:**

```makefile
# ❌ WRONG: Missing dependencies
build/app:
	go build -o $@ ./cmd/app

# ✅ FIX: Add source dependencies
GO_SOURCES := $(shell find . -name '*.go')
build/app: $(GO_SOURCES)
	go build -o $@ ./cmd/app
```

---

### 2. Wrong Rule Being Used

**Problem:** Make uses unexpected pattern rule

**Debug steps:**

```bash
# Show all rules that could match
make -p | grep "%.o:"

# Trace execution to see which rule matched
make --trace build/foo.o
```

**Common causes:**

```makefile
# Multiple pattern rules, first one wins
%.o: %.c
	gcc -c $< -o $@

%.o: %.cpp  # This never matches if .c rule exists
	g++ -c $< -o $@

# ✅ FIX: Use static pattern rules
C_OBJS := foo.o bar.o
CPP_OBJS := baz.o qux.o

$(C_OBJS): %.o: %.c
	gcc -c $< -o $@

$(CPP_OBJS): %.o: %.cpp
	g++ -c $< -o $@
```

---

### 3. Variable Has Wrong Value

**Problem:** Variable doesn't contain what you expect

**Debug steps:**

```bash
# Print variable value
make print-VAR
# Requires this in Makefile:
print-%:
	@echo $* = $($*)

# Or inline
make -p | grep "^VARIABLE :="

# Show all variables
make -p | grep "^[A-Z]"
```

**Debug target pattern:**

```makefile
# Add to Makefile for quick variable inspection
.PHONY: debug debug/%

debug: ## Print all variables
	@echo "GO = $(GO)"
	@echo "CFLAGS = $(CFLAGS)"
	@echo "SOURCES = $(SOURCES)"
	@echo "OBJECTS = $(OBJECTS)"

debug/%: ## Print specific variable (e.g., make debug/SOURCES)
	@echo $* = $($*)
```

---

### 4. Shell Command Failing

**Problem:** Recipe command fails but error message unclear

**Debug steps:**

```makefile
# Add set -x to see exact commands
target:
	set -x; \
	SOME_VAR=value; \
	complex-command $$SOME_VAR

# Or use $(info) to print variables
target:
	$(info Building target with sources: $(SOURCES))
	$(CC) $(SOURCES) -o $@
```

**Better: Use Make's built-in tracing**

```bash
# See every command before execution
make --trace

# Print commands as executed
make -x
```

---

### 5. Dependency Not Found

**Problem:** Make can't find prerequisite file

**Debug steps:**

```bash
# Check if file exists
ls -la path/to/dep.c

# Check VPATH search paths
make -p | grep VPATH

# Verify pattern rule expectations
make -n target 2>&1 | grep "No rule to make target"
```

**Common causes:**

```makefile
# ❌ WRONG: Typo in path
build/app: src/mian.go  # Typo: "mian" not "main"
	go build -o $@ $<

# ❌ WRONG: Relative path from wrong directory
build/app: cmd/app/main.go
	cd cmd/app && go build -o ../../$@ .
	# Fails if run from different dir

# ✅ FIX: Use absolute paths or $(CURDIR)
build/app: $(CURDIR)/cmd/app/main.go
	go build -o $@ ./cmd/app
```

---

## Debugging Techniques

### Using $(info) and $(warning)

```makefile
# Print during Makefile parsing (happens before any rules run)
$(info Starting Makefile execution)
$(info SOURCES = $(SOURCES))

# Warning doesn't stop execution
$(warning This is deprecated syntax)

# Error stops execution
ifeq ($(GO),)
$(error GO is not set)
endif

# Use in targets
target:
	$(info Building target with $(words $(SOURCES)) source files)
	$(CC) $(SOURCES) -o $@
```

### Debugging Pattern Rules

```makefile
# Add diagnostic output to pattern rules
%.o: %.c
	@echo "=== Pattern rule %.o: %.c ==="
	@echo "Target: $@"
	@echo "Source: $<"
	@echo "Stem: $*"
	@echo "All prerequisites: $^"
	$(CC) $(CFLAGS) -c $< -o $@
```

### Debugging Includes

```makefile
# Check if include files are found
$(info Including config.mk)
-include config.mk
$(info config.mk included successfully)

# Or make includes verbose
include config.mk
	@echo "Loaded variables from config.mk"
```

### Debugging Conditionals

```makefile
ifdef DEBUG
$(info DEBUG is defined: $(DEBUG))
CFLAGS += -g -O0
else
$(info DEBUG is not defined, using release flags)
CFLAGS += -O2 -DNDEBUG
endif

$(info Final CFLAGS: $(CFLAGS))
```

---

## Advanced Debugging

### Remake - Enhanced GNU Make

Install `remake` (GNU Make debugger):

```bash
# Ubuntu/Debian
apt-get install remake

# macOS
brew install remake

# Use like make but with debug commands
remake --debugger target
```

**Remake commands:**

```bash
(remake) break target      # Set breakpoint
(remake) step              # Step through rules
(remake) print VAR         # Print variable
(remake) continue          # Continue execution
```

### Make Debug Files

```makefile
# Write debug info to file
debug.txt:
	@echo "=== Debug Info ===" > $@
	@echo "SOURCES: $(SOURCES)" >> $@
	@echo "OBJECTS: $(OBJECTS)" >> $@
	@make -p >> $@

.PHONY: save-debug
save-debug: debug.txt
	@echo "Debug info saved to debug.txt"
```

### Tracing Variable Changes

```makefile
# Track where variables are modified
$(info [1] CFLAGS = $(CFLAGS))

CFLAGS += -Wall
$(info [2] After -Wall: $(CFLAGS))

include config.mk
$(info [3] After config.mk: $(CFLAGS))

ifdef DEBUG
CFLAGS += -g
$(info [4] After DEBUG: $(CFLAGS))
endif
```

---

## Common Issues and Solutions

### Issue: "make: Nothing to be done for 'target'"

**Cause:** Target is up-to-date or is a file that exists

**Debug:**

```bash
# Check if file exists
ls -la target

# Force rebuild
make -B target

# Check dependencies
make -d target 2>&1 | grep "Newer than"
```

**Solution:**

```makefile
# Mark as phony if it's not a file
.PHONY: target
```

---

### Issue: "No rule to make target 'foo', needed by 'bar'"

**Cause:** Prerequisite file doesn't exist and no rule to create it

**Debug:**

```bash
# Check if file exists
find . -name "foo"

# Check if rule exists
make -p | grep "^foo:"
```

**Solution:**

```makefile
# Either create the file or add rule to generate it
foo:
	touch foo

# Or remove from prerequisites if not needed
```

---

### Issue: Recipe fails but Make continues

**Cause:** Command prefixed with `-` or `.IGNORE` used

**Debug:**

```bash
# Check for ignore prefixes
grep -n "^\s*-" Makefile
```

**Solution:**

```makefile
# Remove - prefix to catch errors
target:
	-command_that_fails  # ❌ WRONG: Ignores failure
	command_that_fails   # ✅ CORRECT: Stops on failure
```

---

### Issue: Parallel builds fail randomly

**Cause:** Missing dependencies or race conditions

**Debug:**

```bash
# Run serial build to check if it passes
make -j1

# Check dependencies
make -d target 2>&1 | grep "Considering target"
```

**Solution:**

```makefile
# Add missing dependencies
obj1.o obj2.o: common_header.h

# Or serialize specific targets
.NOTPARALLEL: target1 target2
```

---

### Issue: Recursive Make problems

**Cause:** Submakes don't see parent variables or cause multiple evaluations

**Debug:**

```bash
# Export variables to submakes
export VAR := value

# Or pass explicitly
$(MAKE) -C subdir VAR=$(VAR)
```

**Solution:**

```makefile
# Avoid recursive make, use includes instead
include subdir/module.mk

# If must use recursive make, export needed vars
export CC CFLAGS LDFLAGS
```

---

## Debugging Checklist

When build fails, check in order:

1. [ ] Run `make -n` to see what commands would execute
2. [ ] Check file existence: `ls -la` on prerequisites
3. [ ] Verify dependencies: `make -d target 2>&1 | grep Considering`
4. [ ] Check variable values: `make debug/VARNAME`
5. [ ] Test in clean environment: `make clean && make`
6. [ ] Try serial build: `make -j1`
7. [ ] Enable tracing: `make --trace`
8. [ ] Check for typos: `make --warn-undefined-variables`
9. [ ] Review timestamps: `ls -lh --time-style=full-iso`
10. [ ] Force rebuild: `make -B target`

---

## Related References

- [Anti-Patterns](anti-patterns.md) - Common mistakes to avoid
- [Best Practices](best-practices.md) - Correct patterns
- [Safety Patterns](safety-patterns.md) - Error prevention
