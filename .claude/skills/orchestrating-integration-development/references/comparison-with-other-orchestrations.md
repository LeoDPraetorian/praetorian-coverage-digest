# Comparison with Other Orchestration Skills

**Key differences between integration, feature, and capability orchestration workflows.**

## Comparison Matrix

| Aspect     | Feature Dev                        | Capability Dev           | Integration Dev                                |
| ---------- | ---------------------------------- | ------------------------ | ---------------------------------------------- |
| Output Dir | .output/features/                  | .output/capabilities/    | .output/integrations/                          |
| Phase 2    | Codebase discovery only            | Pattern search           | Skill check + discovery                        |
| Lead Agent | frontend-lead/backend-lead         | capability-lead          | integration-lead                               |
| Developer  | frontend/backend-developer         | capability-developer     | integration-developer                          |
| Reviewer   | frontend/backend-reviewer          | capability-reviewer      | backend-reviewer                               |
| P0 Focus   | Component size                     | Detection accuracy       | VMFilter, CheckAffiliation, pagination         |
| Phase 4.5  | Plan completion check              | Implementation review    | P0 Compliance Verification                     |
| Testing    | Unit/Integration/E2E               | Detection accuracy tests | Mock servers, sandbox APIs                     |
| Frontend   | Always (parallel with backend)     | Never                    | Conditional (Phase 7, only if UI config needed) |

## When to Use Each

### orchestrating-feature-development

Use for general feature development (frontend + backend):
- New UI components with backend API support
- Parallel frontend/backend development
- Always includes both UI and backend work

### orchestrating-capability-development

Use for security scanning capabilities:
- VQL capabilities
- Nuclei templates
- Janus tool chains
- fingerprintx modules
- No frontend component (backend only)

### orchestrating-integration-development

Use for third-party API integrations:
- Vendor API integrations (Shodan, Wiz, Qualys, etc.)
- Asset discovery or vulnerability sync
- Conditional frontend (only if user provides credentials)
- P0 compliance requirements (VMFilter, CheckAffiliation, etc.)

## Key Distinguishing Features

### Integration Dev Unique Features

1. **Phase 2 Skill Check**: Checks for/creates `integrating-with-{vendor}` skill
2. **Phase 4.5 P0 Validation**: Automated P0 compliance verification before review
3. **Conditional Frontend**: Phase 7 runs only if integration needs UI config
4. **P0 Requirements**: VMFilter, CheckAffiliation, ValidateCredentials, errgroup, pagination
5. **Vendor-Specific Patterns**: Auth, rate limiting, API quirks documented in skills

### Feature Dev Unique Features

1. **Parallel Frontend/Backend**: Both tracks run simultaneously
2. **Always Includes UI**: No conditional frontend phase
3. **Component-Size Focus**: P0 is about component size (<400 lines)

### Capability Dev Unique Features

1. **Detection Accuracy**: Primary P0 focus
2. **No Frontend**: Security capabilities are backend-only
3. **Pattern Search**: Phase 2 searches for detection patterns
4. **Capability-Specific Testing**: Detection accuracy tests, not mock servers

## Related References

- [orchestrating-feature-development](.claude/skills/orchestrating-feature-development) - Feature workflow
- [orchestrating-capability-development](.claude/skills/orchestrating-capability-development) - Capability workflow
- [orchestrating-multi-agent-workflows](.claude/skills/orchestrating-multi-agent-workflows) - General patterns
