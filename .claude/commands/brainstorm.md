---
description: Use when refining ideas or designs interactively - Socratic method for collaborative exploration
model: sonnet
allowed-tools: Skill, Read, Write
---

Use and follow the brainstorming skill exactly as written

---

## Example Usage

**Example 1: Refining vague feature request**

```
> /brainstorm "Make the dashboard better"

→ Asks: "What specific problems are users experiencing with the dashboard?"
→ User: "It loads slowly with large datasets"
→ Explores: 3 approaches (virtualization, pagination, data aggregation)
→ Validates: Performance targets and user workflows
→ Outputs: Refined design with clear technical approach
→ Saves: docs/designs/2025-01-15-dashboard-optimization.md
```

**Example 2: Exploring architectural alternatives**

```
> /brainstorm "Add real-time updates to asset list"

→ Asks: "What's the expected update frequency and user count?"
→ Explores alternatives: WebSocket vs Server-Sent Events vs Polling
→ Discusses tradeoffs: Complexity vs scalability vs latency
→ Validates assumptions about infrastructure constraints
→ Presents: Recommended approach with reasoning
```

**Example 3: Clarifying unclear requirements**

```
> /brainstorm "Users want better notifications"

→ Series of questions (one at a time):
   - Which notification types? (email, in-app, Slack?)
   - What triggers notifications? (new risks, status changes?)
   - Who controls preferences? (user, admin, team?)
→ Iteratively refines understanding
→ Outputs: Clear requirements with user stories
```
