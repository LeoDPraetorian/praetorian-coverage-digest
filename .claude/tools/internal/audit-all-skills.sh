#!/bin/bash

# Comprehensive skill audit script
# Checks all skills against 6-check compliance protocol

SKILLS_DIR="/Users/nathansportsman/chariot-development-platform/.claude/skills"
OUTPUT_FILE="/tmp/skill-audit-results.txt"

echo "=== Skill Compliance Audit ===" > "$OUTPUT_FILE"
echo "Audit Date: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

CRITICAL_COUNT=0
WARNING_COUNT=0
INFO_COUNT=0
TOTAL_SKILLS=0

for skill_dir in "$SKILLS_DIR"/*; do
    # Skip non-directories and cache directories
    if [ ! -d "$skill_dir" ] || [[ "$(basename "$skill_dir")" == "__pycache__" ]] || [[ "$(basename "$skill_dir")" == ".pytest_cache" ]]; then
        continue
    fi

    SKILL_NAME=$(basename "$skill_dir")
    TOTAL_SKILLS=$((TOTAL_SKILLS + 1))

    echo "----------------------------------------" >> "$OUTPUT_FILE"
    echo "SKILL: $SKILL_NAME" >> "$OUTPUT_FILE"
    echo "----------------------------------------" >> "$OUTPUT_FILE"

    # CHECK 1: Progressive Disclosure Structure
    if [ ! -f "$skill_dir/SKILL.md" ]; then
        echo "❌ CRITICAL: SKILL.md missing" >> "$OUTPUT_FILE"
        CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
    else
        echo "✅ SKILL.md exists" >> "$OUTPUT_FILE"
    fi

    # Check for orphaned files at root
    ORPHANED_FILES=$(find "$skill_dir" -maxdepth 1 -type f -name "*.md" ! -name "SKILL.md" ! -name "README.md" | wc -l)
    if [ "$ORPHANED_FILES" -gt 0 ]; then
        echo "⚠️  WARNING: $ORPHANED_FILES orphaned .md files at root" >> "$OUTPUT_FILE"
        WARNING_COUNT=$((WARNING_COUNT + 1))
        find "$skill_dir" -maxdepth 1 -type f -name "*.md" ! -name "SKILL.md" ! -name "README.md" >> "$OUTPUT_FILE"
    fi

    # Check for progressive disclosure directories
    HAS_REFERENCES=false
    HAS_EXAMPLES=false
    HAS_TEMPLATES=false
    [ -d "$skill_dir/references" ] && HAS_REFERENCES=true
    [ -d "$skill_dir/examples" ] && HAS_EXAMPLES=true
    [ -d "$skill_dir/templates" ] && HAS_TEMPLATES=true

    echo "ℹ️  Progressive disclosure: references=$HAS_REFERENCES, examples=$HAS_EXAMPLES, templates=$HAS_TEMPLATES" >> "$OUTPUT_FILE"

    # CHECK 2: SKILL.md Word Count
    if [ -f "$skill_dir/SKILL.md" ]; then
        WORD_COUNT=$(wc -w < "$skill_dir/SKILL.md" | tr -d ' ')
        echo "Word count: $WORD_COUNT" >> "$OUTPUT_FILE"

        if [ "$WORD_COUNT" -gt 2500 ]; then
            echo "❌ CRITICAL: SKILL.md >2,500 words ($WORD_COUNT)" >> "$OUTPUT_FILE"
            CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
        elif [ "$WORD_COUNT" -lt 1000 ] || [ "$WORD_COUNT" -gt 2000 ]; then
            echo "⚠️  WARNING: Word count outside optimal range (1,500-2,000): $WORD_COUNT" >> "$OUTPUT_FILE"
            WARNING_COUNT=$((WARNING_COUNT + 1))
        else
            echo "✅ Word count within optimal range: $WORD_COUNT" >> "$OUTPUT_FILE"
        fi
    fi

    # CHECK 3: Frontmatter Compliance
    if [ -f "$skill_dir/SKILL.md" ]; then
        # Extract frontmatter
        FRONTMATTER=$(awk '/^---$/{f=!f;next}f' "$skill_dir/SKILL.md" | head -10)

        # Check for name field
        if echo "$FRONTMATTER" | grep -q "^name:"; then
            echo "✅ name field present" >> "$OUTPUT_FILE"
        else
            echo "❌ CRITICAL: Missing name field in frontmatter" >> "$OUTPUT_FILE"
            CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
        fi

        # Check for description field
        if echo "$FRONTMATTER" | grep -q "^description:"; then
            DESCRIPTION=$(echo "$FRONTMATTER" | grep "^description:" | cut -d: -f2- | tr -d '\n')
            DESC_LENGTH=${#DESCRIPTION}

            echo "✅ description field present ($DESC_LENGTH chars)" >> "$OUTPUT_FILE"

            if [ "$DESC_LENGTH" -gt 1024 ]; then
                echo "❌ CRITICAL: Description >1,024 chars ($DESC_LENGTH)" >> "$OUTPUT_FILE"
                CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
            fi

            if ! echo "$DESCRIPTION" | grep -qi "Use when\|Use this skill when"; then
                echo "⚠️  WARNING: Description doesn't start with 'Use when'" >> "$OUTPUT_FILE"
                WARNING_COUNT=$((WARNING_COUNT + 1))
            fi
        else
            echo "❌ CRITICAL: Missing description field in frontmatter" >> "$OUTPUT_FILE"
            CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
        fi

        # Check for allowed-tools field
        if echo "$FRONTMATTER" | grep -q "^allowed-tools:"; then
            echo "✅ allowed-tools field present" >> "$OUTPUT_FILE"
        else
            echo "ℹ️  INFO: Missing allowed-tools field (recommended)" >> "$OUTPUT_FILE"
            INFO_COUNT=$((INFO_COUNT + 1))
        fi
    fi

    # CHECK 4: File Organization
    # Already covered in CHECK 1

    # CHECK 5: Reference Link Quality
    if [ -f "$skill_dir/SKILL.md" ]; then
        LINKS=$(grep -o '\[.*\](.*\.md)' "$skill_dir/SKILL.md" | grep -o '(.*\.md)' | tr -d '()' || echo "")
        if [ ! -z "$LINKS" ]; then
            BROKEN_LINKS=0
            while IFS= read -r link; do
                if [ ! -z "$link" ]; then
                    LINK_PATH="$skill_dir/$link"
                    if [ ! -f "$LINK_PATH" ]; then
                        echo "⚠️  WARNING: Broken link: $link" >> "$OUTPUT_FILE"
                        BROKEN_LINKS=$((BROKEN_LINKS + 1))
                    fi
                fi
            done <<< "$LINKS"

            if [ "$BROKEN_LINKS" -gt 0 ]; then
                WARNING_COUNT=$((WARNING_COUNT + BROKEN_LINKS))
            fi
        fi
    fi

    # CHECK 6: Progressive Disclosure Usage
    if [ -f "$skill_dir/SKILL.md" ]; then
        WORD_COUNT=$(wc -w < "$skill_dir/SKILL.md" | tr -d ' ')
        if [ "$WORD_COUNT" -gt 2500 ] && [ "$HAS_REFERENCES" = false ]; then
            echo "⚠️  WARNING: Large SKILL.md ($WORD_COUNT words) with no references/ directory" >> "$OUTPUT_FILE"
            WARNING_COUNT=$((WARNING_COUNT + 1))
        elif [ "$HAS_REFERENCES" = true ]; then
            echo "✅ Uses progressive disclosure (has references/)" >> "$OUTPUT_FILE"
        fi
    fi

    echo "" >> "$OUTPUT_FILE"
done

# Summary
echo "========================================" >> "$OUTPUT_FILE"
echo "AUDIT SUMMARY" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "Total Skills Audited: $TOTAL_SKILLS" >> "$OUTPUT_FILE"
echo "Critical Issues: $CRITICAL_COUNT" >> "$OUTPUT_FILE"
echo "Warnings: $WARNING_COUNT" >> "$OUTPUT_FILE"
echo "Info Items: $INFO_COUNT" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [ "$CRITICAL_COUNT" -eq 0 ]; then
    echo "✅ Overall Status: PASS (no critical issues)" >> "$OUTPUT_FILE"
elif [ "$CRITICAL_COUNT" -lt 5 ]; then
    echo "⚠️  Overall Status: NEEDS IMPROVEMENT ($CRITICAL_COUNT critical issues)" >> "$OUTPUT_FILE"
else
    echo "❌ Overall Status: FAIL ($CRITICAL_COUNT critical issues)" >> "$OUTPUT_FILE"
fi

cat "$OUTPUT_FILE"
