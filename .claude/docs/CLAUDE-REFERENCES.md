1 Agents (Architecture, Sub-Agents, Multi-Agent Orchestration)

These are about using agents as core units, sub-agents, and multi-agent systems.

https://code.claude.com/docs/en/sub-agents
https://www.infoq.com/news/2025/08/claude-code-subagents/
https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
https://www.anthropic.com/engineering/multi-agent-research-system
https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da
https://offnote.substack.com/p/multi-agents-vs-tool-groups-a-layered

2 Prompt Engineering

Links focused on prompt design, best practices, and context management:
https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices
https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices
https://claudelog.com/faqs/what-is-todo-list-in-claude-code/
https://platform.claude.com/docs/en/agent-sdk/todo-tracking
https://www.philschmid.de/context-engineering-part-2
https://www.theaiautomators.com/context-engineering-strategies-to-build-better-ai-agents/
https://www.cometapi.com/managing-claude-codes-context/
https://www.agalanov.com/notes/efficient-claude-code-context-parallelism-sub-agents/

3 Slash Commands

CLI-like commands that interact with Claude/agents:

https://code.claude.com/docs/en/slash-commands

4 Skills (Tools, Best Practices, Skill Design)

These describe what skills are, how to build them, and best practices:
https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
https://code.claude.com/docs/en/skills
https://www.claude.com/blog/skills-explained
https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/
https://simonwillison.net/2025/Oct/16/claude-skills/
https://github.com/obra/superpowers
https://blog.fsck.com/2025/10/09/superpowers/

4 Gateways
https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/
https://tylerfolkman.substack.com/p/the-complete-guide-to-claude-skills
https://github.com/obra/superpowers
https://blog.fsck.com/2025/10/09/superpowers/
https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

5 MCP Tools & Code Execution

These focus on using MCP and code execution environments:

https://www.anthropic.com/engineering/code-execution-with-mcp
https://jangwook.net/en/blog/en/mcp-code-execution-practical-implementation/
https://blog.cloudflare.com/code-mode/
https://aardbird.ai/blog/claude-skills-vs-mcp
https://intuitionlabs.ai/articles/claude-skills-vs-mcp
https://skywork.ai/blog/ai-agent/claude-skills-vs-mcp-vs-llm-tools-comparison-2025/

6 Agent SDKs & Development

Links related to SDKs for building agents and migration guides:

https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
https://platform.claude.com/docs/en/agent-sdk/migration-guide

7 Security & Vulnerabilities in Agents

This category covers security concerns specific to agent ecosystems:

https://www.xenonstack.com/blog/vulnerabilities-in-ai-agents
https://securityboulevard.com/2025/07/emerging-agentic-ai-security-vulnerabilities-expose-enterprise-systems-to-widespread-identity-based-attacks/

8 Claude 4.5 Model Updates & Migration

Official guidance on Claude 4.5 (Opus/Sonnet) behavioral changes, tool triggering, and prompt migration:

https://www.anthropic.com/news/claude-opus-4-5
https://www.anthropic.com/news/claude-sonnet-4-5
https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-5
https://github.com/anthropics/claude-code/blob/main/plugins/claude-opus-4-5-migration/skills/claude-opus-4-5-migration/references/prompt-snippets.md

Key findings from these sources:

- Claude 4.5 is more responsive to system prompts than previous models
- Prompts designed to reduce undertriggering may now cause OVERTRIGGERING
- Solution: Dial back aggressive language (CRITICAL, MUST, ALWAYS, REQUIRED, NEVER)
- Replace "CRITICAL: You MUST use this tool when..." with "Use this tool when..."
- Claude 4.5 is "the most steerable model to date"
- Trained for "precise instruction following" - less verbose prompts work better
