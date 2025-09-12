# Debug Diagnose

## Diagnostic Plan: $ARGUMENTS

## Mission

Execute the Diagnostic Plan specified in: $ARGUMENTS

## Execution Process

> During the execution process, create clear tasks and spawn as many agents and subagents as needed using the batch tools. The deeper research we do here the better the diagnosis will be. We optimize for chance of success and not for speed.

1. **Understanding the bug**
    - Read the plan's Jira Summary section to understand the bug.

2. **Subagents**
   - For each `Step`, spawn a subagent to complete the step by following all substeps.
   - Include the substeps in your prompt to the subagent
   - You may include the hypothesis in your prompt to the subagent if it seems useful

3. **Synthesis**
   - For each step that completes, re-check the step's hypothesis. 
   - Use the results from the subagent to determine which conclusion is more likely
     - If no listed conclusion seems likely, feel free to conclude a new one
   - Use your conclusions to build up a diagnosis
   - For each step, save a general summary of what happened and what conclusion is more likely. Record this information in ./docs/CHA-XXXX-diagnosis.md

4. **Completion**
   - Complete all listed steps. 
   - Rereview the current diagnosis markdown: ./docs/CHA-XXXX-diagnosis.md 
   - Note any final conclusions you may realize from reading the entire document in its entirety. 
   - DO NOT ADD MORE STEPS TO EXECUTE. 
   - If you do not learn anything conclusive, that is okay. Your observations will be helpful for another agent or human developer.

## Project Structure

### Chariot Backend Code

Chariot backend code "lives" in `./modules/chariot/backend`.

### Chariot Frontend Code

Chariot backend code "lives" in `./modules/chariot/ui`.