# Plan: Debug Diagnose

## Jira Ticket: $ARGUMENTS

## Mission

Write a plan to diagnose a given bug, described in a Jira ticket.

## Plan Generation Process

### Step 1: Analyze Ticket

Use `jira-summarizer` to analyze the given Jira ticket.

### Step 2: Develop Diagnostic Plan

**ULTRATHINK** and develop a plan to investigate the bug further. Your plan should consist of discrete tasks that may be passed off to subagents.

For example:
- `playwright-explorer` can confirm the presence/absence of behavior in the local webserver (https://localhost:3000)
- `playwright-explorer` can also capture specific HTTP requests/responses to/from the backend
- `codebase-explorer` can find code snippets relevant to your bug
- `praetorian-cli-expert` can fetch data directly from the backend to quickly confirm database contents

Each step should include one hypothesis that can be tested by the subagent. Each hypothesis should have one or more conclusions that can be drawn, depending on the results of the experiment. 

### Step 3: Write Plan

Write your plan to ./docs/CHA-XXXX-plan.md

Your plan should include each of your above steps in the following format:
```bash
# ### Step X: [use xyz agent to abc]
# Subagent: xyz
# Hypothesis 1: ...
# Conclusion 1: ...
# Steps:
# X.1: (Substep 1)
# X.2: (Substep 2)
# ...
```

# Example Plan:

~~~markdown
# Diagnosis Plan for CHA-3490

## Jira Summary

**Ticket**: https://praetorianlabs.atlassian.net/browse/CHA-3490

**Description**: Risks incorrectly display the current severity in the "First Tracked As" message instead of the initial severity.

## Plan

### Step 1: Use Playwright Explorer to confirm the bug

**Subagent**: playwright-explorer

**Hypothesis**: Changing a risk's severity will also change the "First Tracked As" severity in the risk's History tab.

**Conclusion 1**: If the risk's "First Tracked As" severity does not change to match the current severity, this is either a false positive or a more nuanced bug.

**Conclusion 2**: If the risk's "First Tracked As" severity DOES change to match the current severity, the "First Tracked As" value is likely mapped directly from the risk's current severity.

**Substeps**:
1. Log into the local webserver: https://localhost:3000
2. Browse to the 'Vulnerabilities' page
3. Select a risk. Observe its "First Tracked As" severity from its History tab
4. Change the risk's severity. Observe the new "First Tracked As" severity
5. Report whether the "First Tracked As" severity changed to match the new severity

### Step 2: Use Codebase Explorer to confirm the bug

**Subagent**: codebase-explorer

**Hypothesis**: The "First Tracked As" value is directly rendered from the risk's current severity.

**Conclusion 1**: If the "First Tracked As" value comes directly from the risk's current severity, then this is the root cause of the bug.

**Conclusion 2**: If the "First Tracked As" value is not directly derived from the risk's current severity, then something else is causing the "First Tracked As" value to be incorrect.

**Substeps**:
1. Identify where the 'First Tracked As' value is rendered in the frontend code.
2. Trace that value back to an API call that retrieves the risk data from the backend.
3. Determine how the risk data gets mapped into the 'First Tracked As' value.
~~~