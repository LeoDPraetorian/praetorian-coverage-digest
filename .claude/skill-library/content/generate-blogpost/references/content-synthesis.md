# Content Synthesis - Combining Inputs into Structure

**Goal**: Transform analysis + voice + research into coherent blog structure.

## Narrative Structure Patterns

### Problem → Solution
1. Problem statement (with impact)
2. Why existing solutions fail
3. Your approach introduction
4. Technical details
5. Usage/deployment
6. Limitations

**Best for**: Tools, libraries, new techniques

### Journey/Discovery
1. Setup/context
2. Initial exploration
3. Obstacles encountered
4. Insights gained
5. Final solution

**Best for**: Research, reverse engineering, discoveries

### Deep Dive
1. Context (brief)
2. Core concepts
3. Technical details
4. Implementation
5. Edge cases

**Best for**: Complex topics, internals, advanced techniques

## Concept Mapping

For each concept, determine:
- Where in narrative arc?
- Reader's context when encountering?
- How much explanation needed?
- References earlier concepts?

**Rule**: Introduce concepts before depending on them.

## Technical-to-Accessible Translation

**Layer 1**: High-level statement (what it does)
**Layer 2**: Mechanism sketch (how, simplified)
**Layer 3**: Technical detail (specifics)
**Layer 4**: Implementation (code/deep specifics)

Start at Layer 1-2, add Layers 3-4 for interested readers.

## Research Integration

**Attribution patterns**:
- Direct credit: "As [Name] points out..."
- Prior work: "This builds on [Project]'s approach..."
- Community: "The security community has long known..."

Weave naturally into narrative, don't create separate "Related Work" section.

## Voice Application

Check voice profile when:
- Planning structure
- Mapping concepts
- Integrating research
- Adding personality markers

---

## Offensive Tool Posts: Operational Framing

For red team/security tools, apply additional synthesis rules:

### Attacker/Defender Asymmetry

For each feature, articulate:
1. **What defender sees**: Static analysis results, network traffic, sandbox output
2. **What attacker controls**: Timing, trigger mechanism, out-of-band channels
3. **Why asymmetry exists**: Technical mechanism that creates the gap

### Operational Model Narrative

Structure around runtime behavior, not build process:

```
❌ "Here's how we encrypt the payload..."
   [Go code showing crypto implementation]

✅ "When the page loads in a browser with WASM support,
    it decrypts and reveals automatically. Sandboxes
    that time out before WASM initializes see only the decoy."
```

### Section Necessity Test

Before including any section, ask:
- "Would a red teamer reading this miss it if removed?"
- "Is this in the README already?"
- "Does this serve the narrative or just look complete?"

Remove: Use Cases, Security Considerations, Build Instructions, Author Bio (unless specifically requested)

### Contemporary Technique Integration

Connect the tool to current attack patterns:
- Reference recent threat intel (ClickFix campaigns, HTML smuggling trends)
- Explain how tool fits operational workflows
- Note detection implications without being disclaimer-y
