#!/bin/bash
# Escalation Advisor Hook
# Calls an alternative LLM to analyze stuck feedback loops
# Uses fallback chain: Local Ollama → Gemini (free) → OpenAI → Grok → Static
#
# Setup: Add API keys to ~/.zshrc:
#   export GEMINI_API_KEY="your-key"    # https://aistudio.google.com/apikey
#   export OPENAI_API_KEY="your-key"    # https://platform.openai.com/api-keys
#   export XAI_API_KEY="your-key"       # https://console.x.ai/
#
# For local models, install Ollama: https://ollama.com/download
#   ollama pull deepseek-r1:14b
#   ollama pull qwq:latest
#   ollama pull llama3.2:latest

set -uo pipefail

# Source shared utilities
source "${CLAUDE_PROJECT_DIR}/.claude/hooks/hook-utils.sh"

# Ensure jq is available (exit silently if missing - escalation is non-critical)
if ! require_jq; then
  exit 0
fi

# Ensure curl is available (exit silently if missing - escalation is non-critical)
if ! require_curl; then
  exit 0
fi

# Read hook input to get session ID
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "default"')

HOOKS_DIR="${CLAUDE_PROJECT_DIR}/.claude/hooks"
CONTEXT_FILE="${HOOKS_DIR}/escalation-context-${session_id}.json"

# ============================================================================
# Fast path: No escalation triggered
# ============================================================================
if [[ ! -f "$CONTEXT_FILE" ]]; then
  exit 0
fi

# ============================================================================
# Read escalation context
# ============================================================================
context=$(cat "$CONTEXT_FILE")
iteration=$(echo "$context" | jq -r '.iteration // "unknown"')
max_iterations=$(echo "$context" | jq -r '.max_iterations // "unknown"')
review_failures=$(echo "$context" | jq -r '.consecutive_review_failures // 0')
test_failures=$(echo "$context" | jq -r '.consecutive_test_failures // 0')
last_issues=$(echo "$context" | jq -r '.last_review_issues // "none"')
last_test_failures=$(echo "$context" | jq -r '.last_test_failures // "none"')
domains=$(echo "$context" | jq -r '.modified_domains // []')

# Build prompt for LLM analysis
read -r -d '' ANALYSIS_PROMPT << 'PROMPT_EOF'
You are analyzing a stuck feedback loop in a code review/test cycle. Claude has been trying to fix code but keeps failing.

Context:
- Iteration: %ITERATION% of %MAX_ITERATIONS% (limit exceeded)
- Consecutive review failures: %REVIEW_FAILURES%
- Consecutive test failures: %TEST_FAILURES%
- Modified domains: %DOMAINS%
- Last review issues: %LAST_ISSUES%
- Last test failures: %LAST_TEST_FAILURES%

Analyze this situation and provide:
1. ROOT CAUSE: Why is the loop stuck? (pattern recognition)
2. BLIND SPOT: What might Claude be missing or fixating on?
3. ALTERNATIVE APPROACH: What different strategy should be tried?
4. RECOMMENDATION: Should Claude continue, get user input, or try a completely different approach?

Be concise and actionable. Max 200 words.
PROMPT_EOF

# Substitute values into prompt
ANALYSIS_PROMPT="${ANALYSIS_PROMPT//%ITERATION%/$iteration}"
ANALYSIS_PROMPT="${ANALYSIS_PROMPT//%MAX_ITERATIONS%/$max_iterations}"
ANALYSIS_PROMPT="${ANALYSIS_PROMPT//%REVIEW_FAILURES%/$review_failures}"
ANALYSIS_PROMPT="${ANALYSIS_PROMPT//%TEST_FAILURES%/$test_failures}"
ANALYSIS_PROMPT="${ANALYSIS_PROMPT//%DOMAINS%/$domains}"
ANALYSIS_PROMPT="${ANALYSIS_PROMPT//%LAST_ISSUES%/$last_issues}"
ANALYSIS_PROMPT="${ANALYSIS_PROMPT//%LAST_TEST_FAILURES%/$last_test_failures}"

# ============================================================================
# LLM Call Functions
# ============================================================================

call_ollama() {
  local model="$1"
  local response

  # Check if Ollama is running
  if ! curl -s --connect-timeout 2 http://localhost:11434/api/tags &>/dev/null; then
    return 1
  fi

  # Check if model is available
  if ! curl -s http://localhost:11434/api/tags | jq -e ".models[] | select(.name | startswith(\"${model%%:*}\"))" &>/dev/null; then
    return 1
  fi

  response=$(curl -s --max-time 60 http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"${model}\",
      \"prompt\": $(echo "$ANALYSIS_PROMPT" | jq -Rs .),
      \"stream\": false
    }" 2>/dev/null | jq -r '.response // empty')

  if [[ -n "$response" ]]; then
    echo "$response"
    return 0
  fi
  return 1
}

call_gemini() {
  if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    return 1
  fi

  local response
  response=$(curl -s --max-time 30 \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"contents\": [{
        \"parts\": [{\"text\": $(echo "$ANALYSIS_PROMPT" | jq -Rs .)}]
      }]
    }" 2>/dev/null | jq -r '.candidates[0].content.parts[0].text // empty')

  if [[ -n "$response" ]]; then
    echo "$response"
    return 0
  fi
  return 1
}

call_openai() {
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    return 1
  fi

  local response
  # Try gpt-5.2-codex first, fall back to gpt-4-turbo for older keys
  for model in "gpt-5.2-codex" "gpt-4-turbo" "gpt-4"; do
    response=$(curl -s --max-time 30 https://api.openai.com/v1/chat/completions \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${OPENAI_API_KEY}" \
      -d "{
        \"model\": \"${model}\",
        \"messages\": [{\"role\": \"user\", \"content\": $(echo "$ANALYSIS_PROMPT" | jq -Rs .)}],
        \"max_tokens\": 500
      }" 2>/dev/null | jq -r '.choices[0].message.content // empty')

    if [[ -n "$response" ]]; then
      echo "$response"
      return 0
    fi
  done
  return 1
}

call_grok() {
  if [[ -z "${XAI_API_KEY:-}" ]]; then
    return 1
  fi

  local response
  response=$(curl -s --max-time 30 https://api.x.ai/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${XAI_API_KEY}" \
    -d "{
      \"model\": \"grok-3-beta\",
      \"messages\": [{\"role\": \"user\", \"content\": $(echo "$ANALYSIS_PROMPT" | jq -Rs .)}],
      \"max_tokens\": 500
    }" 2>/dev/null | jq -r '.choices[0].message.content // empty')

  if [[ -n "$response" ]]; then
    echo "$response"
    return 0
  fi
  return 1
}

static_fallback() {
  cat << 'EOF'
ROOT CAUSE: Unable to determine - no external LLM available for analysis.

RECOMMENDATION:
1. Check if the same issue keeps repeating (stuck loop)
2. Consider if the approach is fundamentally wrong
3. Ask the user for guidance on the specific failure pattern
4. Try invoking /feature for full orchestration with fresh context

To enable LLM analysis, add API keys to ~/.zshrc:
  export GEMINI_API_KEY="..."  (free tier available)
Or install Ollama with: ollama pull deepseek-r1:14b
EOF
}

# ============================================================================
# Fallback Chain Execution
# ============================================================================

analysis=""
provider=""

# Priority 1: Local Ollama models (free, private)
if [[ -z "$analysis" ]]; then
  for model in "deepseek-r1:14b" "deepseek-r1:7b" "qwq:latest" "llama3.2:latest"; do
    if analysis=$(call_ollama "$model"); then
      provider="Ollama ($model)"
      break
    fi
  done
fi

# Priority 2: Gemini (free tier available)
if [[ -z "$analysis" ]]; then
  if analysis=$(call_gemini); then
    provider="Gemini 2.5 Flash"
  fi
fi

# Priority 3: OpenAI (paid)
if [[ -z "$analysis" ]]; then
  if analysis=$(call_openai); then
    provider="OpenAI"
  fi
fi

# Priority 4: Grok (paid)
if [[ -z "$analysis" ]]; then
  if analysis=$(call_grok); then
    provider="Grok 3"
  fi
fi

# Priority 5: Static fallback
if [[ -z "$analysis" ]]; then
  analysis=$(static_fallback)
  provider="Static (no LLM available)"
fi

# ============================================================================
# Clean up and output
# ============================================================================

# Remove the trigger file
rm -f "$CONTEXT_FILE"

# Output to stderr (feeds back to Claude)
cat >&2 << EOF
═══════════════════════════════════════════════════════════════════════════════
ESCALATION ANALYSIS (via ${provider})
═══════════════════════════════════════════════════════════════════════════════

Loop Status: Iteration ${iteration}/${max_iterations} exceeded
Review Failures: ${review_failures} consecutive
Test Failures: ${test_failures} consecutive

───────────────────────────────────────────────────────────────────────────────
EXTERNAL LLM ANALYSIS:
───────────────────────────────────────────────────────────────────────────────

${analysis}

───────────────────────────────────────────────────────────────────────────────
OPTIONS:
───────────────────────────────────────────────────────────────────────────────
1. Continue with the recommended approach above
2. Ask the user for specific guidance
3. Invoke /feature for full orchestration with fresh context
4. Accept current state with known issues

Please choose an option or explain your next step.
═══════════════════════════════════════════════════════════════════════════════
EOF

exit 2
