# Aho-Corasick Implementation Guide

Deep dive into Aho-Corasick pre-filtering for multi-pattern matching.

## Library Comparison

| Library                             | Performance | Memory | API Style     |
| ----------------------------------- | ----------- | ------ | ------------- |
| `github.com/cloudflare/ahocorasick` | Fastest     | Higher | Simple        |
| `github.com/anknown/ahocorasick`    | Good        | Lower  | More features |

## Implementation Pattern

```go
import "github.com/cloudflare/ahocorasick"

// Build trie once at startup (expensive)
var ac *ahocorasick.Matcher

func init() {
    keywords := collectKeywords(allDetectors)
    ac = ahocorasick.New(keywords)
}

// O(n) matching vs O(n × m) sequential regex
func prefilter(chunk []byte) bool {
    return ac.Match(chunk)
}
```

## Keyword Extraction Strategy

Extract high-signal keywords from each detector:

- API providers: "aws", "stripe", "github"
- Secret patterns: "api_key", "password", "token"
- Format markers: "-----BEGIN", "AKIA", "sk-"

## When NOT to Use

- <10 detectors (overhead not justified)
- All chunks match anyway (>90% match rate)
- Memory-constrained environments

**Content to be expanded with TruffleHog examples.**
