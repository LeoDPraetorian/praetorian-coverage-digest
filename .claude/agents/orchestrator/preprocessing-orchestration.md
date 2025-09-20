# Jira Preprocessing Orchestration Rules

## Integration with Claude Code Task Tool

This document defines how the enhanced jira-reader agent (with preprocessing mode) integrates with Claude Code's Task tool for seamless preprocessing of user input containing Jira references.

## Orchestration Pattern

### Detection-Based Conditional Execution

```javascript
// Automatic detection and conditional spawning
function processUserInput(userInput, userRequest) {
  const hasJiraRefs = /\b[A-Z]{2,10}-\d+\b/.test(userInput);
  const hasJiraUrls = /atlassian\.net.*\/browse\//.test(userInput);
  
  if (hasJiraRefs || hasJiraUrls) {
    return sequentialExecution(userInput, userRequest);
  } else {
    return directExecution(userInput, userRequest);
  }
}
```

### Sequential Execution (When Jira References Detected)

```javascript
[Message 1 - Reference Resolution]:
Task("Jira Reader (Preprocessing Mode)", 
     `Resolve all Jira references in this user input: "${userInput}"
     
     Then determine the appropriate next agent based on the resolved content.
     If the resolved content is vague or needs clarification, recommend intent-translator.
     If the resolved content is clear and actionable, recommend the appropriate implementation agent.
     
     Return:
     1. The enriched input with resolved Jira ticket details
     2. Your recommendation for the next agent to handle the enriched content`,
     "jira-reader")

[Message 2 - Continue Workflow]:
// Based on resolver's recommendation, spawn appropriate next agent
Task("Next Agent", 
     `Process this resolved input: ${enrichedContent}`, 
     resolverRecommendation)
```

### Direct Execution (No Jira References)

```javascript
[Single Message - Normal Flow]:
// Skip preprocessing, go directly to appropriate agent
Task("Intent Translator", 
     `Process user request: "${userInput}"`, 
     "intent-translator")
```

## Practical Implementation Examples

### Example 1: Simple Jira Reference
```
User: "Implement the authentication feature from CHA-1232"

Claude Code Execution:
[Message 1]:
  Task("Jira Reference Resolver",
       "Resolve Jira reference CHA-1232 in: 'Implement the authentication feature from CHA-1232'",
       "jira-reference-resolver")

[Message 2 - After resolver completes]:
  Task("Go API Developer", 
       "Implement the following authentication feature: [resolved CHA-1232 details with JWT requirements, MFA, etc.]",
       "golang-api-developer")
```

### Example 2: Vague Request with Jira Reference
```
User: "Make CHA-1232 better"

Claude Code Execution:
[Message 1]:
  Task("Jira Reference Resolver",
       "Resolve CHA-1232 in: 'Make CHA-1232 better' and determine if intent clarification is needed",
       "jira-reference-resolver")

[Message 2 - Based on resolver finding vague request]:
  Task("Intent Translator",
       "Clarify requirements for: [resolved CHA-1232 ticket details] - user wants to 'make it better'",
       "intent-translator")
```

### Example 3: Multiple Jira References
```
User: "Implement CHA-1232 and ensure it works with the API changes in CHA-1233"

Claude Code Execution:
[Message 1]:
  Task("Jira Reference Resolver",
       "Resolve both CHA-1232 and CHA-1233 in: 'Implement CHA-1232 and ensure it works with the API changes in CHA-1233'",
       "jira-reference-resolver")

[Message 2]:
  Task("System Architect",
       "Design implementation for: [CHA-1232 details] that integrates with [CHA-1233 API changes]",
       "system-architect")
```

## Agent Decision Logic

### Resolver Agent Output Format
```json
{
  "enriched_input": "Full text with resolved ticket details",
  "next_agent_recommendation": "golang-api-developer",
  "reasoning": "Content is clear technical requirements for backend API",
  "complexity_level": "medium",
  "requires_clarification": false,
  "resolved_tickets": [
    {
      "key": "CHA-1232",
      "summary": "JWT Authentication System",
      "resolved": true
    }
  ]
}
```

### Agent Selection Rules
The resolver recommends next agents based on resolved content:

```javascript
function recommendNextAgent(resolvedContent, ticketDetails) {
  if (requiresClarification(resolvedContent)) {
    return "intent-translator";
  }
  
  if (isBackendFeature(ticketDetails)) {
    return "golang-api-developer";
  }
  
  if (isFrontendFeature(ticketDetails)) {
    return "react-developer";
  }
  
  if (isInfrastructure(ticketDetails)) {
    return "devops-automator";
  }
  
  if (isComplexMultiDomain(ticketDetails)) {
    return "system-architect";
  }
  
  // Default fallback
  return "intent-translator";
}
```

## Error Handling Orchestration

### Jira Access Failed
```javascript
[Message 1 - Resolver with fallback]:
Task("Jira Reference Resolver",
     `Try to resolve CHA-1232. If access fails, explain to user and recommend they provide full requirements instead.`,
     "jira-reference-resolver")

[Message 2 - Fallback to clarification]:
Task("Intent Translator",
     "User referenced CHA-1232 but it couldn't be resolved. Help them provide complete requirements for their request.",
     "intent-translator")
```

### Partial Resolution
```javascript
// Some tickets resolved, others failed
[Message 1]:
Task("Jira Reference Resolver",
     "Resolve CHA-1232 and CHA-1233. If only partial resolution succeeds, work with what's available.",
     "jira-reference-resolver")

[Message 2]:
Task("Intent Translator", 
     "Clarify missing requirements for partially resolved request: [available details + what's missing]",
     "intent-translator")
```

## Configuration Integration

### Claude Code Settings
```json
{
  "preprocessing": {
    "enabled": true,
    "jira_detection": {
      "patterns": ["\\b[A-Z]{2,10}-\\d+\\b", "atlassian\\.net.*\\/browse\\/"],
      "timeout": 10000,
      "auto_resolve": true
    },
    "priority_agents": {
      "jira-reference-resolver": 1,
      "intent-translator": 2
    }
  }
}
```

### Agent Registry Update
```yaml
agents:
  - name: jira-reference-resolver
    priority: 1
    triggers: ["jira_reference_detected"]
    preprocessing: true
    
  - name: intent-translator  
    priority: 2
    triggers: ["vague_request", "post_preprocessing"]
```

## Performance Considerations

### Optimization Strategies
1. **Parallel Resolution**: Resolve multiple Jira tickets concurrently
2. **Caching**: Cache resolved tickets for session duration
3. **Timeout Handling**: Fail fast if Jira API is slow
4. **Smart Detection**: Only trigger for patterns that look like real tickets

### Token Optimization
```javascript
// Efficient ticket content extraction
function extractEssentialContent(jiraTicket) {
  return {
    summary: jiraTicket.fields.summary,
    description: truncateToEssentials(jiraTicket.fields.description, 500),
    acceptanceCriteria: jiraTicket.fields.customfield_acceptance_criteria,
    priority: jiraTicket.fields.priority.name,
    labels: jiraTicket.fields.labels.slice(0, 5)  // Top 5 labels only
  };
}
```

## Monitoring and Metrics

### Success Metrics
- **Resolution Rate**: % of Jira references successfully resolved
- **Processing Time**: Average time from detection to resolution
- **Agent Selection Accuracy**: % of correct next-agent recommendations
- **User Satisfaction**: Reduction in "what does ticket X mean?" clarifications

### Logging
```javascript
preprocessingLog: {
  timestamp: "2024-01-15T10:30:00Z",
  userInput: "Implement CHA-1232",
  detectedReferences: ["CHA-1232"],
  resolutionSuccess: true,
  processingTime: "2.3s",
  nextAgentRecommended: "golang-api-developer",
  tokensUsed: 150
}
```

This orchestration ensures seamless integration with existing Claude Code workflows while providing intelligent preprocessing of Jira references.