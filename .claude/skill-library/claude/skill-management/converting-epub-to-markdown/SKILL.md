---
name: converting-epub-to-markdown
description: Use when converting EPUB ebooks to markdown format compatible with the books-to-skills workflow.
allowed-tools: Bash, Read, Write, Grep, Glob, TodoWrite, AskUserQuestion
---

# Converting EPUB to Markdown

**EPUB to markdown conversion using Pandoc (recommended) or native tools (fallback), with vision-based figure descriptions.**

## When to Use

Use this skill when:

- Converting EPUB ebooks to markdown for the books-to-skills workflow
- Extracting text content from EPUB files
- Preparing ebooks for chapter splitting and skill creation

## Quick Reference

| Phase               | Purpose                                  | Output                    |
| ------------------- | ---------------------------------------- | ------------------------- |
| 0. Check Pandoc     | Verify Pandoc installed, prompt if not   | Decision on method        |
| 1. Convert          | Pandoc EPUB→markdown (or native fallback)| Raw markdown              |
| 2. Extract Images   | Unzip EPUB, count images, estimate tokens| Image manifest + stats    |
| 3. Prompt for Images| Ask user if they want image descriptions | Decision on vision        |
| 4. Describe Figures | Generate visual descriptions of images   | Enhanced markdown         |
| 5. Validate         | Verify output quality                    | Ready for books-to-skills |
| 6. Move to Final    | Copy to destination, cleanup temp files  | Completed conversion      |

## Method Comparison

| Aspect                 | Pandoc              | Native (sed/awk)         |
| ---------------------- | ------------------- | ------------------------ |
| HTML entity decoding   | Complete            | Partial (misses many)    |
| Chapter ordering       | Correct (OPF spine) | Alphabetical (incorrect) |
| Cross-references       | Preserved as links  | Plain text               |
| Figure references      | Image links + IDs   | Plain text               |
| Code formatting        | Semantic spans      | Basic backticks          |
| Dependencies           | Requires Pandoc     | None                     |
| **Recommendation**     | **Primary**         | Fallback only            |

## Workflow

### Step 0: Check for Pandoc

**IMPORTANT:** Before starting conversion, check if Pandoc is available.

```bash
# Check if Pandoc is installed
which pandoc && pandoc --version | head -1
```

**If Pandoc is NOT found**, use the AskUserQuestion tool to prompt the user:

```markdown
AskUserQuestion(
  questions: [{
    question: "Pandoc is not installed. How would you like to proceed?",
    header: "Pandoc",
    options: [
      {
        label: "Install Pandoc (Recommended)",
        description: "Run 'brew install pandoc' - provides best conversion quality with correct chapter ordering, full entity decoding, and preserved cross-references"
      },
      {
        label: "Use native conversion",
        description: "Continue with sed/awk fallback - may have incorrect chapter order, missing entities, and no cross-references"
      }
    ],
    multiSelect: false
  }]
)
```

**If user chooses "Install Pandoc":**
```bash
brew install pandoc
# Verify installation
pandoc --version | head -1
```

**If user chooses "Use native conversion":** Skip to Step 1 (Alternative) below.

### Step 1: Convert with Pandoc (Recommended)

```bash
# Set paths
EPUB_FILE="path/to/book.epub"
WORK_DIR=".tmp/epub-convert"
mkdir -p "$WORK_DIR"

# Convert EPUB to markdown
pandoc "$EPUB_FILE" -t markdown -o "$WORK_DIR/book.md"

# Check result
wc -l "$WORK_DIR/book.md"
head -100 "$WORK_DIR/book.md"
```

**Pandoc advantages:**
- Correctly follows OPF spine for chapter ordering
- Decodes all HTML entities (em-dashes, smart quotes, etc.)
- Preserves internal cross-references as markdown links
- Maintains figure IDs and image references

### Step 1 (Alternative): Native Conversion (Fallback)

Use only if Pandoc is unavailable or user chose native conversion:

```bash
EPUB_FILE="path/to/book.epub"
WORK_DIR=".tmp/epub-convert"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

# Extract EPUB (it's a ZIP file)
unzip -q "$EPUB_FILE" -d "$WORK_DIR/extracted"

# Combine HTML files (WARNING: alphabetical order may be wrong)
find "$WORK_DIR/extracted" \( -name "*.xhtml" -o -name "*.html" \) | \
  grep -v nav.xhtml | sort | xargs cat > "$WORK_DIR/combined.html"

# Multi-pass conversion
sed -e 's/<h1[^>]*>/\n# /g' -e 's/<\/h1>/\n/g' \
    -e 's/<h2[^>]*>/\n## /g' -e 's/<\/h2>/\n/g' \
    -e 's/<h3[^>]*>/\n### /g' -e 's/<\/h3>/\n/g' \
    -e 's/<p[^>]*>/\n/g' -e 's/<\/p>/\n/g' \
    -e 's/<li[^>]*>/- /g' -e 's/<\/li>/\n/g' \
    -e 's/<strong[^>]*>/**/g' -e 's/<\/strong>/**/g' \
    -e 's/<em[^>]*>/_/g' -e 's/<\/em>/_/g' \
    -e 's/<code[^>]*>/`/g' -e 's/<\/code>/`/g' \
    "$WORK_DIR/combined.html" > "$WORK_DIR/pass1.md"

sed -e 's/<[^>]*>//g' \
    -e 's/&nbsp;/ /g' -e 's/&lt;/</g' -e 's/&gt;/>/g' \
    -e 's/&amp;/\&/g' -e 's/&mdash;/—/g' -e 's/&ndash;/–/g' \
    -e 's/&#160;/ /g' -e 's/&#8212;/—/g' -e 's/&#8211;/–/g' \
    -e "s/&#8217;/'/g" -e "s/&#8216;/'/g" \
    -e 's/&#8220;/"/g' -e 's/&#8221;/"/g' \
    "$WORK_DIR/pass1.md" > "$WORK_DIR/pass2.md"

awk 'BEGIN{blank=0} /^$/{blank++; if(blank<=2) print; next} {blank=0; print}' \
    "$WORK_DIR/pass2.md" > "$WORK_DIR/book.md"
```

**Native limitations:**
- Alphabetical file sorting often produces wrong chapter order
- Many HTML entities remain unprocessed (&#8212;, &#937;, etc.)
- Cross-references become plain text
- Requires manual cleanup

### Step 2: Extract Images and Calculate Stats

```bash
# If not already extracted (Pandoc path)
unzip -q "$EPUB_FILE" -d "$WORK_DIR/extracted"

# Create image manifest
find "$WORK_DIR/extracted" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \) | sort > "$WORK_DIR/images.txt"

# Count images
IMAGE_COUNT=$(wc -l < "$WORK_DIR/images.txt")
echo "Found $IMAGE_COUNT images"

# Calculate total image size and estimate tokens
TOTAL_BYTES=$(cat "$WORK_DIR/images.txt" | xargs -I{} stat -f%z "{}" 2>/dev/null | awk '{sum+=$1} END {print sum}')
TOTAL_MB=$(echo "scale=2; $TOTAL_BYTES / 1048576" | bc)
# Token estimate: ~1 token per 4 bytes for vision, plus ~100 tokens overhead per image for description
ESTIMATED_TOKENS=$(echo "scale=0; ($TOTAL_BYTES / 4) + ($IMAGE_COUNT * 100)" | bc)
echo "Total image size: ${TOTAL_MB}MB"
echo "Estimated vision tokens: $ESTIMATED_TOKENS"
```

**Token estimation formula:**
- Vision processing: ~1 token per 4 bytes of image data
- Description overhead: ~100 tokens per image for output
- Sub-agent batching: Images processed in batches of 50-80 per agent

### Step 3: Prompt User for Image Processing

**IMPORTANT:** Before processing images, prompt the user to confirm. Image processing is time-intensive and uses significant tokens.

```bash
# Display stats for user decision
echo "Image Processing Summary:"
echo "  - Images found: $IMAGE_COUNT"
echo "  - Total size: ${TOTAL_MB}MB"
echo "  - Estimated tokens: $ESTIMATED_TOKENS"
echo "  - Estimated sub-agents needed: $((($IMAGE_COUNT + 59) / 60))"
```

Use the AskUserQuestion tool with the calculated stats:

```markdown
AskUserQuestion(
  questions: [{
    question: "Found {IMAGE_COUNT} images ({TOTAL_MB}MB, ~{ESTIMATED_TOKENS} tokens). Would you like to generate inline figure descriptions?",
    header: "Images",
    options: [
      {
        label: "Yes, process all images (Recommended)",
        description: "Generate descriptions for all {IMAGE_COUNT} images using vision. Takes ~{ESTIMATED_AGENTS} sub-agents. Provides complete coverage."
      },
      {
        label: "Yes, referenced images only",
        description: "Only process images referenced in the markdown. Faster but may miss some figures."
      },
      {
        label: "No, skip image processing",
        description: "Convert text only. Image references will remain as links without descriptions."
      }
    ],
    multiSelect: false
  }]
)
```

**If user chooses "Yes, process all images":** Continue to Step 4.

**If user chooses "Yes, referenced images only":**
```bash
# Find only images referenced in markdown
grep -oh 'images/[^)]*' "$WORK_DIR/book.md" | sort -u > "$WORK_DIR/referenced-images.txt"
REF_COUNT=$(wc -l < "$WORK_DIR/referenced-images.txt")
echo "Processing $REF_COUNT referenced images (of $IMAGE_COUNT total)"
# Use referenced-images.txt instead of images.txt in Step 4
```

**If user chooses "No, skip image processing":** Skip to Step 5 (Validate).

### Step 4: Generate Figure Descriptions (Vision via Sub-Agents)

Technical books contain valuable visual information that **neither Pandoc nor native conversion can extract**: schematics, die photos, memory maps, code listings rendered as images.

**IMPORTANT:** Reading images fills context quickly. A book with 200+ images will exhaust any single agent's context. Use sub-agents for batch processing.

#### 4.1 Create Image Manifest

```bash
# Find all images and create numbered manifest
find "$WORK_DIR/extracted" -type f \( -name "*.jpg" -o -name "*.png" \) | sort > "$WORK_DIR/images.txt"
wc -l "$WORK_DIR/images.txt"

# Create output directory for descriptions
mkdir -p "$WORK_DIR/descriptions"
```

#### 4.2 Sub-Agent Batch Processing Pattern

Spawn sub-agents to process images in batches. Each agent processes as many as it can before context fills, then reports progress.

**Parent agent workflow:**

```markdown
1. Read images.txt to get total count
2. Set START_INDEX=1
3. While START_INDEX <= TOTAL_IMAGES:
   a. Spawn sub-agent with Task tool (see prompt below)
   b. Agent returns: {"last_processed": N, "output_file": "descriptions/batch-N.md"}
   c. Set START_INDEX = N + 1
4. Concatenate all batch files into final descriptions
```

**Sub-agent prompt template:**

```
You are processing images for EPUB figure descriptions.

IMAGE_DIR: {work_dir}/extracted/OEBPS/images/
MANIFEST: {work_dir}/images.txt
START_INDEX: {start_index}
OUTPUT_FILE: {work_dir}/descriptions/batch-{start_index}.md

TASK:
1. Read the manifest file to get the list of images
2. Starting from image #{start_index}, read each image using the Read tool
3. For each image, generate a description (50-100 words) in this format:

   > **Figure {number}: {title}**
   > {description focusing on technical details, components, attack points}

4. Write descriptions to OUTPUT_FILE as you go
5. Process as many images as you can before context limits
6. When stopping, report back:
   - Last image index successfully processed
   - Path to output file
   - Count of images described in this batch

IMAGE TYPE GUIDANCE:
| Type           | Focus on                                       |
| -------------- | ---------------------------------------------- |
| Die photo      | Memory arrays, logic blocks, bond pads, scale  |
| Schematic      | Key components, connections, attack points     |
| Memory map     | Address ranges, blocks, vulnerabilities        |
| Code listing   | Language, purpose, key operations (transcribe) |
| Oscilloscope   | Signals, timing, glitch characteristics        |
| Photo          | Hardware setup, probe points, modifications    |

CRITICAL: If you cannot process more images due to context, STOP and report
your progress. The parent will spawn another agent to continue.
```

**Example Task tool invocation:**

```markdown
Task(
  subagent_type: "general-purpose",
  model: "sonnet",  # Use Sonnet for cost efficiency - image description is straightforward
  description: "Process images 1-50 for descriptions",
  prompt: "[prompt above with variables filled in]"
)
```

**Model selection:** Use `model: "sonnet"` for image processing sub-agents. Sonnet provides excellent image description quality at lower token cost than Opus. Testing showed no quality degradation for this task.

#### 4.3 Graceful Resumption

The parent agent tracks progress and spawns new sub-agents as needed:

```markdown
# Tracking state
TOTAL_IMAGES=$(wc -l < "$WORK_DIR/images.txt")
PROCESSED=0

# Loop until all processed
while [ $PROCESSED -lt $TOTAL_IMAGES ]; do
  # Spawn sub-agent starting at PROCESSED+1
  # Sub-agent returns last_processed
  # Update PROCESSED = last_processed
done

# Combine all batch files
cat "$WORK_DIR/descriptions/batch-*.md" > "$WORK_DIR/all-descriptions.md"
```

#### 4.4 Prioritization (Optional)

For very large books (500+ images), prioritize key figures:

```bash
# Find which images are referenced in markdown
grep -oh 'images/[^)]*' "$WORK_DIR/book.md" | sort -u > "$WORK_DIR/referenced-images.txt"

# Process only referenced images first
```

#### 4.5 Image Types and Description Focus

| Image Type     | Description Focus                              |
| -------------- | ---------------------------------------------- |
| Die photo      | Memory arrays, logic blocks, bond pads, scale  |
| Schematic      | Key components, connections, attack points     |
| Memory map     | Address ranges, blocks, vulnerabilities        |
| Code listing   | Language, purpose, key operations (transcribe) |
| Oscilloscope   | Signals, timing, glitch characteristics        |
| Photo          | Hardware setup, probe points, modifications    |

**Key insight:** Many technical books render code listings as images. Vision can transcribe these where text extraction fails completely.

### Step 5: Validate Output

```bash
# Check file size
wc -l "$WORK_DIR/book.md"

# Check for chapter markers
grep -n "^## " "$WORK_DIR/book.md" | head -20

# Check token count (approximate)
chars=$(wc -c < "$WORK_DIR/book.md")
tokens=$((chars / 4))
echo "Approximate tokens: $tokens"

# Check for remaining HTML artifacts
grep -c "<[a-zA-Z]" "$WORK_DIR/book.md"

# Preview content
head -200 "$WORK_DIR/book.md"
```

### Step 6: Move to Final Location

```bash
OUTPUT_FILE="path/to/BookName_full.md"
cp "$WORK_DIR/book.md" "$OUTPUT_FILE"
rm -rf "$WORK_DIR"
echo "Conversion complete: $OUTPUT_FILE"
```

## Quality Comparison

| Content Type        | Pandoc    | Native    | With Vision | Notes                              |
| ------------------- | --------- | --------- | ----------- | ---------------------------------- |
| Headers (h1-h6)     | Excellent | Good      | -           | Pandoc preserves IDs               |
| Paragraphs          | Excellent | Good      | -           | Both work well                     |
| Lists (ul/ol)       | Excellent | Fair      | -           | Pandoc handles nesting             |
| Bold/Italic         | Excellent | Good      | -           | Direct mapping                     |
| Code blocks         | Excellent | Fair      | -           | Pandoc uses semantic spans         |
| Tables              | Good      | Poor      | -           | Both may need cleanup              |
| Cross-references    | Excellent | None      | -           | Pandoc preserves links             |
| HTML entities       | Complete  | Partial   | -           | Pandoc decodes all                 |
| Chapter order       | Correct   | Wrong     | -           | Pandoc follows OPF spine           |
| Figures (images)    | Reference | Reference | **Excellent** | Vision extracts semantic meaning |
| Code as images      | None      | None      | **Excellent** | Vision can transcribe             |

**Bottom line:** Use Pandoc + Vision for best results.

## Integration with books-to-skills

After conversion, use the `converting-books-to-skills` skill:

```
Read(".claude/skill-library/claude/skill-management/converting-books-to-skills/SKILL.md")
```

The markdown file produced by this skill is compatible with that workflow's:
- Chapter detection (looks for `## ` headers)
- TOC analysis (extracts keywords)
- Chunking (splits into chapter files)

## Troubleshooting

**Problem: Pandoc not installed**
```bash
brew install pandoc
# Or on Linux: apt install pandoc
```

**Problem: Chapter order wrong (native conversion)**

The native approach sorts files alphabetically. Check OPF spine for correct order:
```bash
grep -A 100 "<spine" "$WORK_DIR/extracted/OEBPS/content.opf"
```

**Problem: HTML entities remain (native conversion)**

The native approach misses many entities. Either use Pandoc or add more sed patterns:
```bash
sed -i '' -e 's/&#937;/Ω/g' -e 's/&#8194;/ /g' "$WORK_DIR/book.md"
```

**Problem: Code blocks are images, not text**

Many technical books render code as images. Use vision to transcribe:
```markdown
Read("$WORK_DIR/extracted/OEBPS/images/f0148-01.jpg")
```

## Integration

### Called By

- Manual invocation before using `converting-books-to-skills`
- Workflows that need EPUB → markdown conversion

### Pairs With

| Skill                        | Purpose                               |
| ---------------------------- | ------------------------------------- |
| `converting-books-to-skills` | Takes this output and creates skills  |

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
