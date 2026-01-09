# Feature Directory Structure

```text
.claude/.output/features/YYYY-MM-DD-HHMMSS-{semantic-name}/
├── metadata.json              # Status, timestamps, phase tracking
├── design.md                  # Phase 1: brainstorming output
├── frontend-discovery.md      # Phase 2: frontend pattern analysis
├── backend-discovery.md       # Phase 2: backend pattern analysis
├── plan.md                    # Phase 3: planning output
├── architecture.md            # Phase 4: frontend-lead output
├── security-assessment.md     # Phase 4: security-lead output
├── tech-debt-assessment.md    # Phase 4: tech debt analysis by leads
├── backend-architecture.md    # Phase 4: backend-lead output (if applicable)
├── implementation-log.md      # Phase 5: developer output
├── review.md                  # Phase 6: frontend-reviewer output
├── security-review.md         # Phase 6: security-reviewer output
├── test-plan.md               # Phase 7: test-lead test plan
├── test-summary-unit.md       # Phase 8: unit test output
├── test-summary-integration.md # Phase 8: integration test output
├── test-summary-e2e.md        # Phase 8: e2e test output
└── test-validation.md         # Phase 9: test-lead validation
```

## Related References

- [Phase 0: Setup](phase-0-setup.md)
- [Progress Persistence](progress-persistence.md)
