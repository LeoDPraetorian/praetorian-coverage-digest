# Orchestration Anti-Patterns

**Common mistakes that degrade orchestration effectiveness.**

## Pattern Catalog

1. **Over-orchestration**: Don't use orchestration for simple single-agent tasks. If a task can be completed by one specialist agent, spawn that agent directly rather than creating multi-phase orchestration.

2. **Sequential when parallel possible**: When tasks are independent, spawn agents in a single message with multiple Task calls. Sequential spawning wastes time and increases token cost.

3. **Missing context**: Always provide prior phase results to subsequent agents. Agents work in isolation - they don't have access to previous agent outputs unless explicitly provided.

4. **Scope creep**: Keep each agent focused on their specific responsibility. Don't ask implementation agents to also handle testing, or architecture agents to write code.

5. **Skipping progress tracking**: Always use TodoWrite to maintain orchestration state. Without external tracking, context drift causes forgotten phases and repeated spawns.

6. **Implementing yourself**: Orchestrators coordinate and delegate - they don't write implementation code. If you're using Edit/Write tools in an orchestration skill, you've crossed into implementation territory.

7. **Ignoring token cost**: Multi-agent orchestrations use ~15x more tokens than single-agent execution. Reserve orchestration for tasks that genuinely require coordination across multiple concerns.

## Detection Triggers

Watch for these warning signs:

- "I'll just implement this small part myself" → Violates #6
- "Let me spawn this agent, then wait to see if I need the next" → Violates #2
- "I don't need TodoWrite for just 3 phases" → Violates #5
- Agent asks "What did the previous agent find?" → Violates #3
- Single agent gets both implementation AND testing prompts → Violates #4

## Related Patterns

- **Effort Scaling** (references/effort-scaling.md) - Decision criteria for when to orchestrate vs delegate directly
- **Execution Patterns** (references/execution-patterns.md) - Sequential vs parallel vs hybrid execution patterns
- **Delegation Templates** (references/delegation-templates.md) - How to properly scope agent responsibilities
