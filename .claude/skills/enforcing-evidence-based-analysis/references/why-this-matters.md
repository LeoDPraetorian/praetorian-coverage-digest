# Why This Matters

## The Wizard Modal Failure

A real-world example of hallucination cost:

- **Plan:** 48KB "comprehensive" implementation plan
- **Claim:** Agent said it "analyzed 10 files" and provided detailed TypeScript types
- **Reality:** Every single API call was wrong
- **Root cause:** Agent ASSUMED what `useWizard` returns based on "common patterns" instead of READING `useWizard.ts`
- **Validation:** Three independent reviewers confirmed the plan wouldn't compile
- **Cost:** Hours of wasted implementation time would have been spent, trust destroyed, broken plan had to be rewritten

## The Time Investment

**The 30 seconds to read a file prevents 30 hours debugging a broken plan.**

Reading source files before making claims is not optional. It's the difference between:

- ✅ Plan that compiles and works on first try
- ❌ Plan that looks comprehensive but is fundamentally broken

## Verification Checklist

Before completing any plan, verify:

- [ ] I READ every file I reference (used Read tool, not memory)
- [ ] I QUOTED actual code with line numbers
- [ ] I did NOT assume API shapes from patterns
- [ ] I LISTED all assumptions in Assumptions section
- [ ] My example code uses APIs that ACTUALLY EXIST
