# Common Mistakes and Rationalizations

## Common Mistakes

| Mistake                            | Fix                                             |
| ---------------------------------- | ----------------------------------------------- |
| Deleting without user confirmation | MUST get explicit confirmation (Phase 4)        |
| Incomplete reference search        | Search gateways, commands, AND skills           |
| Forgetting partial name matches    | Search for skill name fragments in verification |
| Not verifying cleanup              | Re-run searches to ensure no orphans            |
| Deleting wrong directory           | Verify path contains `.claude/skill`            |
| Missing TodoWrite tracking         | Use TodoWrite for all phases                    |

---

## Rationalization to Avoid

| Excuse                                         | Reality                                                      |
| ---------------------------------------------- | ------------------------------------------------------------ |
| "No references, safe to delete"                | Must verify with grep searches, not assumptions              |
| "Just delete the directory"                    | Must clean up references or they'll break                    |
| "User knows the impact"                        | Must show references explicitly, not assume                  |
| "Quick cleanup, skip verification"             | Verification is mandatory - orphaned references break system |
| "Skill is deprecated, references don't matter" | Deprecated skills still referenced until cleanup             |
