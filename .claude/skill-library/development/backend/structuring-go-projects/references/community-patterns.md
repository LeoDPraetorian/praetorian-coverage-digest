# Community Patterns (golang-standards/project-layout)

**Status:** Community-driven, NOT official Go standard
**Source:** https://github.com/golang-standards/project-layout

## Important Disclaimer

From the project itself:

> "This is NOT an official standard defined by the core Go dev team. This is a set of common historical and emerging project layout patterns in the Go ecosystem."

**Use critically, not blindly.**

## The Standard Layout Pattern

### Application Directories

**`/cmd`**

- Main applications for the project
- Directory name matches executable name
- Example: `cmd/myapp/main.go` builds to `myapp`

**`/internal`**

- Private application and library code
- Go compiler enforces: external projects cannot import
- Can have your own internal structure: `internal/pkg/`

**`/pkg`**

- Library code that's safe for external applications
- **CONTROVERSIAL** - see "The /pkg Debate" section below

### Service Application Directories

**`/api`**

- OpenAPI/Swagger specs, JSON schema files, protocol definition files

### Web Application Directories

**`/web`**

- Web application specific components: static files, server-side templates, SPAs

### Common Application Directories

**`/configs`**

- Configuration file templates or default configs

**`/init`**

- System init (systemd, upstart, sysv) and process manager (runit, supervisord) configs

**`/scripts`**

- Scripts for build, install, analysis, etc.

**`/build`**

- Packaging and Continuous Integration

**`/deployments`**

- IaaS, PaaS, system and container orchestration deployment configs

**`/test`**

- Additional external test apps and test data
- Go allows `_test.go` files in any directory

### Other Directories

**`/docs`**

- Design and user documents

**`/tools`**

- Supporting tools for this project

**`/examples`**

- Examples for your applications and libraries

**`/third_party`**

- External helper tools, forked code

**`/assets`**

- Other assets (images, logos, etc.)

## The `/pkg` Debate

### Pro-`/pkg` Arguments

1. **Clear Intent**
   - Signals "this is public API"
   - Prevents accidental internal code exposure

2. **Large Project Examples**
   - Kubernetes uses `/pkg`
   - Many HashiCorp projects use it
   - Docker used it (before moby split)

3. **Organizational Clarity**
   - Separates public from private clearly
   - Mirrors other languages' conventions

### Anti-`/pkg` Arguments

1. **Not Idiomatic Go**
   - Not in official Go guidance
   - Adds unnecessary nesting
   - Go default: everything is public unless in `internal/`

2. **Redundant with `internal/`**
   - If you have `internal/`, everything else is already public
   - `/pkg` doesn't add compiler-enforced semantics

3. **Community Division**
   - Russ Cox (Go team): "I don't like /pkg"
   - Many Go developers avoid it
   - Creates inconsistency across projects

### When to Use `/pkg`

**Consider `/pkg` if:**

- You have a large project with many packages
- You need clear public API separation
- Your team/org already uses this pattern
- You're building a multi-project shared library

**Skip `/pkg` if:**

- You're building a simple application
- You prefer flat structure
- You want to follow minimalist Go style
- Your project is primarily internal

## Adoption in Real Projects

**Projects using golang-standards layout:**

- Kubernetes (with modifications)
- Istio
- NATS
- Many enterprise Go projects

**Projects NOT using it:**

- Go standard library itself
- Many successful Go tools (hugo, cobra, etc.)
- Smaller focused projects

## Key Takeaway

golang-standards/project-layout is **descriptive, not prescriptive:**

- It describes patterns used in the wild
- It's not the "one true way"
- Context matters more than rigid adherence

**Choose patterns that serve your project, not patterns because they exist.**

## Sources

- https://github.com/golang-standards/project-layout
- Community discussion: https://github.com/golang-standards/project-layout/issues
