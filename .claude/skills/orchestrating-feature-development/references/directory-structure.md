# Feature Directory Structure

```text
.claude/.output/features/YYYY-MM-DD-HHMMSS-{semantic-name}/
├── metadata.json              # Status, timestamps, phase tracking
├── design.md                  # Phase 10: brainstorming output
├── frontend-discovery.md      # Phase 10: frontend pattern analysis
├── backend-discovery.md       # Phase 10: backend pattern analysis
├── plan.md                    # Phase 10: planning output
├── architecture.md            # Phase 10: frontend-lead output
├── security-assessment.md     # Phase 10: security-lead output
├── tech-debt-assessment.md    # Phase 10: tech debt analysis by leads
├── backend-architecture.md    # Phase 10: backend-lead output (if applicable)
├── implementation-log.md      # Phase 10: developer output
├── review.md                  # Phase 10: frontend-reviewer output
├── security-review.md         # Phase 10: security-reviewer output
├── test-plan.md               # Phase 11: test-lead test plan
├── test-summary-unit.md       # Phase 10: unit test output
├── test-summary-integration.md # Phase 10: integration test output
├── test-summary-e2e.md        # Phase 10: e2e test output
└── test-validation.md         # Phase 11: test-lead validation
```

## Related References

- [Phase 0: Setup](phase-1-setup.md)
- [Progress Persistence](progress-persistence.md)
