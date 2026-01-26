# Anti-Patterns - Common Failure Modes

## 1. Generic Blog Voice

**Symptom**: Post sounds corporate/template-generated

**Examples**: "It's important to note...", "In conclusion...", "Let's dive deep..."

**Fix**: Create detailed voice profile, check after each section

## 2. Shallow Technical Analysis

**Symptom**: Describes what, not how or why

**Fix**: Read actual source code, trace execution, document mechanisms

## 3. Missing the Hook

**Symptom**: Boring context instead of interesting problem

**Fix**: Start with problem/puzzle, make reader care first

## 4. Code Dumps Without Context

**Symptom**: Large uncommented code blocks

**Fix**: Excerpt to show specific points, explain before/during, keep under 20 lines

## 5. Ignoring Limitations

**Symptom**: Only positives, no edge cases

**Fix**: Dedicate section to honest limitations and trade-offs

## 6. Research Without Integration

**Symptom**: Researched but never mentioned in post

**Fix**: Plan attribution points before drafting, weave naturally

## 7. Losing Narrative Thread

**Symptom**: Collection of facts, no progression

**Fix**: Choose structure first, write in order, add causal transitions

## 8. Premature Abstraction

**Symptom**: Abstract definitions before concrete examples

**Fix**: Start concrete, add abstraction later

## 9. Inconsistent Technical Depth

**Symptom**: Some sections assume expertise, others explain basics

**Fix**: Establish depth from voice analysis, review for consistency

## 10. Missing the "So What"

**Symptom**: Technique without showing why it matters

**Fix**: After technical details, add "which means..." implications

---

## Offensive Tool Post Anti-Patterns

### 11. Implementation Over Operations

**Symptom**: Shows crypto code, build steps, template tables instead of runtime behavior

**Examples**: Full Go encryption functions, cross-compile commands, decoy template matrices

**Fix**: Explain what happens when the tool runs. "The decrypted zip overwrites the DOM" > showing the decryption code.

### 12. Obligatory Sections

**Symptom**: "Use Cases", "Security Considerations", "Building from Source" sections that add no value

**Examples**:
- "Use Cases: Red team phishing, CTF challenges, document distribution" (obvious to audience)
- "Does NOT protect against: nation-state adversaries" (reads as disclaimer)

**Fix**: Delete them. Ask "would the reader miss this?" before writing any section.

### 13. Generic Framing

**Symptom**: Describes features neutrally instead of through attacker/defender lens

**Examples**: "Provides obfuscation" instead of "Sandboxes that don't process WASM see only the decoy"

**Fix**: Always explain what each side sees and why the asymmetry matters.

### 14. Forgettable Examples

**Symptom**: Generic passwords, verbose commands, multiple variations

**Examples**: `-password "secret123"`, full `go build` with flags, three ways to do the same thing

**Fix**: One memorable example (Konami code), minimal command (`make build`), single best approach.

### 15. Missing Field Knowledge

**Symptom**: Only documents what's in the README

**Fix**: Add practitioner tips - tool integrations, workarounds, operational patterns that come from actually using it.

### 16. Forced Closing Humor

**Symptom**: Callback jokes or clever sign-offs that fall flat

**Examples**: "Unlike the Roman emperor, leave better documentation than two coins"

**Fix**: End with repo link and feedback request. Stop there.
