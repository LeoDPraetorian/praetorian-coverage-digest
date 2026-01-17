# Post-processing Transcripts

LLM-based enhancements for raw Whisper transcriptions.

## Why Post-process

Whisper produces raw transcriptions without:
- Proper punctuation
- Paragraph breaks
- Speaker identification
- Formatted structure
- Action item extraction
- Summarization

Post-processing with Claude adds these capabilities.

## Basic Formatting

### Add Punctuation and Paragraphs

**Input:** Raw transcript from Whisper (no punctuation, run-on sentences)

```
we discussed the kubernetes security model and how rbac works we need to implement pod security policies by next week the team agreed to use istio for service mesh
```

**Claude prompt:**

```
Format this transcript with proper punctuation and paragraph breaks:

[paste transcript]
```

**Output:**

```
We discussed the Kubernetes security model and how RBAC works. We need to implement pod security policies by next week. The team agreed to use Istio for service mesh.
```

### Improve Readability

**Claude prompt:**

```
Format this transcript for readability:
1. Add proper punctuation
2. Break into paragraphs
3. Capitalize proper nouns
4. Fix grammar errors

[paste transcript]
```

## Meeting Notes Extraction

### Extract Key Points

**Claude prompt:**

```
Extract key discussion points from this meeting transcript:

[paste transcript]

Format as:
- Discussion Topics
- Decisions Made
- Action Items (with assignees if mentioned)
- Open Questions
```

**Example output:**

```markdown
## Discussion Topics
- Kubernetes RBAC configuration
- Pod security policies vs. OPA Gatekeeper
- Service mesh options (Istio vs Linkerd)

## Decisions Made
- Implement pod security policies by next week
- Use Istio for service mesh (voted 5-2)
- John will lead the RBAC audit

## Action Items
- [ ] John: Complete RBAC audit by Friday
- [ ] Sarah: Research OPA Gatekeeper alternatives
- [ ] Team: Review Istio documentation

## Open Questions
- How to handle legacy applications without PSP support?
- Budget approval for Istio training?
```

### Generate Summary

**Claude prompt:**

```
Summarize this 1-hour meeting transcript in 3-5 bullet points:

[paste transcript]
```

**Example output:**

```
- Team reviewed Kubernetes security model and decided to implement pod security policies
- Voted to use Istio over Linkerd for service mesh (5-2 decision)
- John assigned to lead RBAC audit, due Friday
- Open question: How to handle legacy apps without PSP support
- Next meeting: Review Istio implementation plan
```

## Speaker Diarization (Manual)

Whisper doesn't identify speakers automatically. Claude can help format speaker-labeled transcripts:

**Input:** Transcript with speaker labels (you must add these manually or use specialized diarization tools)

```
[Speaker 1] We need to implement pod security policies
[Speaker 2] I agree but what about legacy applications
[Speaker 1] Good question let's research OPA Gatekeeper as an alternative
```

**Claude prompt:**

```
Format this speaker-labeled transcript:
1. Assign names if you can infer from context
2. Group statements by speaker
3. Add timestamps if provided

[paste transcript]
```

**Output:**

```markdown
### John (Lead Engineer)
- We need to implement pod security policies
- Good question, let's research OPA Gatekeeper as an alternative

### Sarah (Developer)
- I agree, but what about legacy applications?
```

## Action Item Extraction

### Identify Tasks and Assignees

**Claude prompt:**

```
Extract all action items from this transcript. Format as:

- [ ] Assignee: Task description (due date if mentioned)

[paste transcript]
```

**Example output:**

```markdown
- [ ] John: Complete RBAC audit (due: Friday)
- [ ] Sarah: Research OPA Gatekeeper alternatives (due: next meeting)
- [ ] Team: Review Istio documentation (due: end of week)
- [ ] Mike: Get budget approval for Istio training (due: ASAP)
```

### Priority Tagging

**Claude prompt:**

```
Extract action items and tag with priority (High/Medium/Low) based on urgency mentioned in the transcript:

[paste transcript]
```

**Example output:**

```markdown
**High Priority**
- [ ] John: Complete RBAC audit (due: Friday) - Blocking deployment

**Medium Priority**
- [ ] Sarah: Research OPA Gatekeeper alternatives (due: next meeting)
- [ ] Team: Review Istio documentation (due: end of week)

**Low Priority**
- [ ] Mike: Get budget approval for Istio training (no deadline)
```

## Technical Content Processing

### Code Snippet Extraction

If transcript mentions code, Claude can extract and format it:

**Claude prompt:**

```
Extract any code snippets mentioned in this transcript and format them properly with language tags:

[paste transcript]
```

**Example output:**

````markdown
The speaker mentioned this RBAC policy:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
```
````

### Technical Term Glossary

**Claude prompt:**

```
Create a glossary of technical terms mentioned in this transcript with brief definitions:

[paste transcript]
```

**Example output:**

```markdown
## Glossary

**RBAC** - Role-Based Access Control, a method of regulating access to resources based on roles
**Pod Security Policy** - Kubernetes feature for controlling security-sensitive aspects of pod specification
**Istio** - Open-source service mesh for microservices
**OPA Gatekeeper** - Policy controller for Kubernetes using Open Policy Agent
```

## Integration with Other Skills

### Brainstorming Session Transcripts

After transcribing a brainstorming session, feed to `brainstorming` skill:

```
I have a transcript of our brainstorming session. Use the brainstorming skill to organize ideas and create next steps.

[paste transcript]
```

### Planning Session Transcripts

After transcribing a planning session, feed to `writing-plans` skill:

```
I have a transcript of our planning session. Use the writing-plans skill to create a structured implementation plan.

[paste transcript]
```

### Security Discussion Transcripts

After transcribing security discussions, feed to security-related skills:

```
I have a transcript of our security review. Analyze it using the threat-modeling skill to identify gaps.

[paste transcript]
```

## Automated Post-processing Pipeline

### Shell Script for End-to-End Workflow

```bash
#!/usr/bin/env bash
# transcribe-and-format.sh - Record, transcribe, and format with Claude
# Usage: ./transcribe-and-format.sh <duration> <output_name>

set -e

DURATION=${1:-60}
OUTPUT=${2:-recording}

# Step 1: Record audio
echo "Recording for $DURATION seconds..."
./record-audio.sh "$DURATION" "${OUTPUT}.m4a"

# Step 2: Transcribe with Whisper
echo "Transcribing audio..."
docker run --rm \
  -v "$(pwd):/audio" \
  -v "$HOME/.cache/whisper:/root/.cache/whisper" \
  ghcr.io/praetorian-inc/whisper-transcribe:latest \
  whisper "/audio/${OUTPUT}.m4a" \
    --model base.en \
    --output_format txt \
    --fp16 False

# Step 3: Format with Claude (manual step - requires Claude Code invocation)
echo "Raw transcript saved to: ${OUTPUT}.txt"
echo ""
echo "To format with Claude, run:"
echo "  claude 'Format this transcript with proper punctuation and paragraphs: \$(cat ${OUTPUT}.txt)'"
```

### Future: Automated Claude Formatting

**Requires:** Claude API integration or CLI command

```bash
# Hypothetical command for automated formatting
claude format-transcript \
  --input ${OUTPUT}.txt \
  --output ${OUTPUT}-formatted.md \
  --extract-action-items \
  --create-summary
```

## Output Format Recommendations

### For Meeting Notes

```markdown
# Meeting: [Topic]
**Date:** YYYY-MM-DD
**Attendees:** Names
**Duration:** X minutes

## Summary
[3-5 sentence summary]

## Discussion Points
- Point 1
- Point 2

## Decisions Made
- Decision 1
- Decision 2

## Action Items
- [ ] Assignee: Task (due date)

## Transcript
[Full formatted transcript]
```

### For Interview Transcripts

```markdown
# Interview: [Candidate Name]
**Date:** YYYY-MM-DD
**Interviewer:** Name
**Duration:** X minutes

## Key Takeaways
- Takeaway 1
- Takeaway 2

## Technical Assessment
- Skill 1: Rating/Notes
- Skill 2: Rating/Notes

## Questions Asked
1. Question
   - Answer summary

## Follow-up Actions
- [ ] Action item

## Full Transcript
[Formatted transcript]
```

### For Voice Memos

```markdown
# Voice Memo: [Topic]
**Date:** YYYY-MM-DD
**Duration:** X minutes

## Key Points
- Point 1
- Point 2

## Action Items
- [ ] Task 1

## Full Transcript
[Formatted transcript]
```

## Best Practices

### 1. Preserve Original Transcript

Always keep raw Whisper output:

```
recording.txt         # Raw Whisper output (preserve)
recording-formatted.md # Claude formatted (post-processed)
```

**Why:** Raw transcript is source of truth. Post-processing may introduce errors.

### 2. Iterative Refinement

Don't expect perfect output on first pass:

```
1. Generate initial formatting
2. Review for accuracy
3. Ask Claude to fix specific issues
4. Repeat until satisfied
```

### 3. Context Matters

Provide context to Claude for better formatting:

```
Format this transcript from a technical security review meeting. Focus on:
- Extracting security findings
- Identifying risk ratings
- Listing remediation actions

[paste transcript]
```

### 4. Validate Action Items

Don't trust LLM-extracted action items blindly:

```
1. Extract action items with Claude
2. Cross-reference with raw transcript
3. Confirm assignees and due dates
4. Update based on actual agreement
```

### 5. Speaker Identification

If speakers matter, add manual labels before post-processing:

```
# In raw transcript, add [Speaker N] tags
[Speaker 1] We need to implement RBAC
[Speaker 2] I agree

# Then ask Claude to format with speaker context
```

## Limitations

### What Claude Cannot Do

1. **Correct factual errors:** If Whisper misheard "Kubernetes" as "Coobernetes", Claude won't know
2. **Add missing content:** If speaker said something not captured, Claude can't invent it
3. **Perfect speaker identification:** Claude guesses based on context, not voice
4. **Real-time processing:** Post-processing is manual, not live during recording

### Mitigation Strategies

1. **Use higher-quality Whisper models** (small.en or medium.en) for better accuracy
2. **Provide initial context** to Claude (e.g., "This is a security review meeting about...")
3. **Manual speaker labeling** before post-processing
4. **Cross-reference with notes** taken during meeting

## Future Enhancements

1. **Automated pipeline:** CLI command that records → transcribes → formats in one step
2. **Real-time formatting:** Stream Whisper output to Claude for live formatting
3. **Speaker diarization:** Integrate specialized tools (pyannote.audio) before formatting
4. **Custom templates:** User-defined output formats for different meeting types
5. **Integration with task managers:** Auto-create Linear/Jira tickets from action items
6. **Knowledge base integration:** Auto-file formatted transcripts in Notion/Confluence
