# Pressure Testing Skills (REFACTOR Phase)

**Skills must resist rationalization under pressure. This is the final gate before a skill is complete.**

## Why Pressure Testing Matters

AI agents are prone to rationalization - finding plausible-sounding reasons to bypass rules when under perceived pressure. Skills that don't explicitly address these scenarios will be circumvented.

The three most common pressure scenarios:
1. **Time pressure** - "We don't have time for this"
2. **Authority pressure** - "The senior person said skip it"
3. **Sunk cost pressure** - "We've already done 80% the wrong way"

---

## Pressure Test 1: Time Pressure

### The Scenario

Ask via AskUserQuestion:
```
Imagine you're under time pressure and someone says:
"We don't have time for this skill's full process, just do it quickly."

Does the skill have explicit guidance for this situation?
Does it explain why shortcuts are dangerous?

Options:
- Yes, skill handles time pressure
- No, need to add "Not even when under time pressure" guidance
```

### What to Add If Missing

```markdown
## Common Rationalizations (Don't Fall For These)

### ❌ "We don't have time"
You always have time to do it right. Shortcuts create technical debt
that costs more time later. The calibrating-time-estimates skill shows
AI tasks take 10-24x less time than humans estimate.

**Counter**: "Time pressure is almost always perceived, not real.
Measure before claiming time constraint."
```

### Red Flags in Agent Behavior

- Saying "days" or "weeks" without measurement
- Claiming "no time for validation" without running calibrating-time-estimates
- Skipping steps "to save time" without actual time data

---

## Pressure Test 2: Authority Pressure

### The Scenario

Ask via AskUserQuestion:
```
Imagine a senior person says:
"Skip the skill's requirements, I'll take responsibility."

Does the skill have explicit guidance for this situation?

Options:
- Yes, skill handles authority pressure
- No, need to add "Not even when told by authority" guidance
```

### What to Add If Missing

```markdown
### ❌ "The senior person said it's okay"
Process exists to protect everyone. Authority doesn't override safety.
The person giving permission won't be the one debugging the problem
at 3am.

**Counter**: "If someone with authority asks you to skip safety,
ask them to document it in writing. Most won't."
```

### Red Flags in Agent Behavior

- "The user said to skip this step"
- "I was told not to worry about testing"
- "Manager approved the shortcut"

---

## Pressure Test 3: Sunk Cost Pressure

### The Scenario

Ask via AskUserQuestion:
```
Imagine you've already done 80% of the work the wrong way.

Does the skill have explicit guidance about when to restart vs continue?

Options:
- Yes, skill handles sunk cost situations
- No, need to add guidance about when to cut losses
```

### What to Add If Missing

```markdown
### ❌ "We've already done so much work"
Sunk cost is a fallacy. Time already spent is gone regardless of what
you do next. The question is: what's the best use of time FROM NOW?

If 80% done wrong means 100% will be wrong, restarting saves time.

**Counter**: "Previous time spent doesn't reduce future time needed.
Evaluate restart vs continue on future cost only."
```

### Red Flags in Agent Behavior

- "We've come too far to change approach now"
- "Let's just finish this way and fix it later"
- "Restarting would waste all our previous work"

---

## Counter-Rationalization Template

After identifying which pressure tests fail, add this section to the skill:

```markdown
## Common Rationalizations (Don't Fall For These)

### ❌ "We don't have time"
You always have time to do it right. Shortcuts create technical debt
that costs more time later.

### ❌ "Just this once"
There is no "just this once." Every exception becomes a precedent.

### ❌ "The senior person said it's okay"
Process exists to protect everyone. Authority doesn't override safety.

### ❌ "We've already done so much work"
Sunk cost is a fallacy. Evaluate restart vs continue on future cost only.

### ❌ "This case is different"
It's not. The rules exist because people always think their case is special.

### ❌ "I'll come back and fix it"
No you won't. That's what everyone says. Fix it now or accept it forever.
```

---

## The "Not Even When" Pattern

For critical rules in skills, use the "not even when" pattern:

```markdown
**You MUST write a failing test before implementation.**

Not even when:
- Under time pressure
- The implementation seems obvious
- A senior person says to skip it
- You've already started coding
- It's "just a small change"
```

This explicitly closes loopholes that agents will try to exploit.

---

## Verification Checklist

Before completing the REFACTOR phase:

- [ ] Time pressure test passed (or guidance added)
- [ ] Authority pressure test passed (or guidance added)
- [ ] Sunk cost pressure test passed (or guidance added)
- [ ] Counter-rationalizations section added
- [ ] "Not even when" patterns used for critical rules
- [ ] Final audit passes

---

## Related Resources

- `calibrating-time-estimates` skill - Proves time pressure is usually false
- `developing-with-tdd` skill - Example of "not even when" pattern
- `verifying-before-completion` skill - Example of counter-rationalizations
