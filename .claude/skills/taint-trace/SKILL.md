# Taint Trace Skill

**Status:** Under development
**Design:** `.claude/.output/designs/2026-01-21-taint-trace-skill-design.md`

## Purpose

Interactive binary taint analysis orchestration for security researchers. Trace user input through binaries to identify security vulnerabilities by listing where data is used.

## Usage

```
/taint-trace "Trace TCP input in /path/to/server.exe"
/taint-trace "Trace all inputs in malware.exe and flag crypto functions"
/taint-trace "Where does argv[1] go in ./target"
```

## Implementation Notes

This file will be populated during implementation phase with:
- Intent parsing logic
- Cache management
- Orchestration agent spawning
- Progress monitoring
- Follow-up query handling
