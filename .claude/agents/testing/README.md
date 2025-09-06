# Agent Parameter Testing

This directory contains test agents designed to discover which parameters Claude Code actually supports in agent markdown files.

## Test Agents

### 1. test-simple-agent.md
- Uses ONLY officially documented parameters (name, description, tools)
- Baseline test for minimal parameter support
- Should always work if Claude Code agent system is functioning

### 2. test-advanced-agent.md
- Uses extended parameters found in existing agents throughout the codebase
- Tests undocumented features like:
  - `type`: Agent classification
  - `model`: Specific Claude model selection
  - `metadata`: Structured metadata with nested properties
  - `triggers`: Activation patterns
  - `file_patterns`: File pattern matching
  - `capabilities`: Agent capability list
  - `preferences`: Language and framework preferences
  - `workflow`: Workflow phase definitions
  - `context`: Domain and scope information
  - `constraints`: Operational constraints
  - `dependencies`: Agent and tool dependencies
  - `output_format`: Response formatting preferences

## Testing Procedure

1. **Activate Simple Agent**: 
   - Use: `claude-code agent test-simple-agent`
   - Should confirm basic parameter support
   - Verify standard tool access

2. **Activate Advanced Agent**:
   - Use: `claude-code agent test-advanced-agent`
   - Will report which extended parameters are recognized
   - Tests advanced tool access and metadata structures

3. **Compare Results**:
   - Document which parameters are actually supported
   - Note any undocumented features that work
   - Identify limitations or constraints

## Expected Outcomes

### If Only Basic Parameters Work:
- Claude Code supports minimal agent configuration
- Extended parameters in existing agents may be placeholders or future features
- Focus on using simple agent definitions

### If Extended Parameters Work:
- Claude Code has undocumented capabilities
- Can leverage advanced features for more sophisticated agents
- Should document discovered features for team use

## Notes

- These test agents are intentionally verbose to test parameter recognition
- The advanced agent includes every parameter type found across the codebase
- Results will inform how we should structure future agents

## Test Results

(To be filled in after testing)

### Simple Agent Results:
- [ ] Agent loads successfully
- [ ] Tools are accessible
- [ ] Name and description recognized
- Notes: 

### Advanced Agent Results:
- [ ] Agent loads successfully
- [ ] Extended parameters recognized
- [ ] Advanced tools accessible
- [ ] Metadata structure preserved
- Notes:

## Recommendations

(To be added based on test results)