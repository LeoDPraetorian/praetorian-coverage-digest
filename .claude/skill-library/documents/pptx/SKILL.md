---
name: pptx
description: Use when working with PowerPoint presentations - creating new presentations, modifying content, working with layouts, adding comments or speaker notes, or analyzing presentation contents
allowed-tools: Read, Grep, Bash, TodoWrite, Write, Edit
---

# PowerPoint (PPTX) Creation, Editing, and Analysis

Create, edit, and analyze PowerPoint presentations using Office Open XML (OOXML) format.

## Overview

A .pptx file is a ZIP archive containing XML files and resources. Three main workflows available:

1. **Creating from scratch** - Use html2pptx to convert HTML slides to PowerPoint
2. **Using templates** - Duplicate and rearrange template slides with custom content
3. **Editing existing files** - Work with raw OOXML XML for precise modifications

---

## Quick Reference: Which Workflow?

### Create from Scratch → html2pptx

**Use when**: Building new presentation without a specific template

**Best for**: Custom designs, full creative control, data visualizations

**Workflow**: HTML slides → JavaScript conversion → PPTX output

**See**: [Creating from Scratch](#creating-from-scratch-html2pptx)

### Use Template → rearrange.py + replace.py

**Use when**: Following existing template design

**Best for**: Consistent branding, predefined layouts, quick turnaround

**Workflow**: Template analysis → Slide rearrangement → Text replacement

**See**: [Using Templates](#using-templates-rearrangepy--replacepy)

### Edit OOXML → unpack/edit/pack

**Use when**: Adding comments, speaker notes, layouts, or complex modifications

**Best for**: Precise XML edits, metadata changes, advanced features

**Workflow**: Unpack ZIP → Edit XML → Validate → Repack

**See**: [Editing OOXML](#editing-ooxml-unpackeditpack)

---

## Reading and Analyzing Content

### Text Extraction

Convert presentation to markdown for quick reading:

```bash
python -m markitdown path-to-file.pptx
```

### Raw XML Access

Access comments, speaker notes, layouts, animations, and design elements:

**Unpack**: `python ooxml/scripts/unpack.py <office_file> <output_dir>`

**Key files**:
- `ppt/presentation.xml` - Main metadata and slide references
- `ppt/slides/slide{N}.xml` - Individual slide contents
- `ppt/notesSlides/notesSlide{N}.xml` - Speaker notes
- `ppt/comments/modernComment_*.xml` - Comments
- `ppt/slideLayouts/` - Layout templates
- `ppt/theme/` - Theme and styling

**Typography/Color Analysis**:
1. Read `ppt/theme/theme1.xml` for colors (`<a:clrScheme>`) and fonts (`<a:fontScheme>`)
2. Examine `ppt/slides/slide1.xml` for actual usage
3. Grep for color (`<a:solidFill>`, `<a:srgbClr>`) and font references

---

## Creating from Scratch (html2pptx)

Convert HTML slides to PowerPoint with accurate positioning.

### Design Principles

**CRITICAL - Before creating any presentation**:
1. **Analyze content**: What subject matter? What tone/industry/mood?
2. **Check branding**: Consider company/organization brand colors
3. **Match palette**: Select colors that reflect the subject
4. **State approach**: Explain design choices BEFORE writing code

**Requirements**:
- ✅ State content-informed design approach BEFORE code
- ✅ Use web-safe fonts only: Arial, Helvetica, Times New Roman, Georgia, Courier New, Verdana, Tahoma, Trebuchet MS, Impact
- ✅ Create clear visual hierarchy (size, weight, color)
- ✅ Ensure readability (strong contrast, appropriate sizing, clean alignment)
- ✅ Be consistent (repeat patterns, spacing, visual language)

### Color Palette Selection

**Think creatively**:
- Beyond defaults: What colors genuinely match this topic?
- Consider angles: Topic, industry, mood, energy, audience, brand
- Be adventurous: Healthcare doesn't have to be green, finance doesn't have to be navy
- Build palette: 3-5 colors (dominant + supporting + accent)
- Ensure contrast: Text must be readable on backgrounds

**Example palettes** (adapt or create your own):
1. **Classic Blue**: Navy (#1C2833), slate (#2E4053), silver (#AAB7B8)
2. **Teal & Coral**: Teal (#5EA8A7), coral (#FE4447), white
3. **Bold Red**: Red (#C0392B), orange (#F39C12), yellow (#F1C40F)
4. **Warm Blush**: Mauve (#A49393), blush (#EED6D3), cream (#FAF7F2)
5. **Burgundy Luxury**: Burgundy (#5D1D2E), rust (#C15937), gold (#997929)

**Complete palette reference**: See [Design Reference](references/design-patterns.md) (coming soon)

### Layout Tips

**For slides with charts/tables**:
- **Two-column (PREFERRED)**: Header spanning full width, then text/bullets in one column, chart/table in other. Use flexbox with unequal widths (40%/60%)
- **Full-slide**: Let chart/table take entire slide for maximum impact
- **NEVER vertically stack**: Don't place charts/tables below text in single column

### Workflow

1. **READ ENTIRE FILE**: Read [`html2pptx.md`](references/html2pptx.md) completely before proceeding. **Never set range limits.**

2. **Create HTML slides**: One file per slide with proper dimensions (720pt × 405pt for 16:9)
   - Use `<p>`, `<h1>`-`<h6>`, `<ul>`, `<ol>` for text
   - Use `class="placeholder"` for chart/table areas (gray background)
   - **CRITICAL**: Rasterize gradients/icons as PNG using Sharp FIRST, then reference in HTML

3. **Convert to PowerPoint**: Run JavaScript using [`html2pptx.js`](scripts/html2pptx.js)
   - Use `html2pptx()` function for each HTML file
   - Add charts/tables to placeholders using PptxGenJS API
   - Save with `pptx.writeFile()`

4. **Visual validation**: Generate thumbnails and inspect
   ```bash
   python scripts/thumbnail.py output.pptx workspace/thumbnails --cols 4
   ```
   Check for:
   - Text cutoff by headers/shapes/edges
   - Text overlap with other elements
   - Positioning issues (too close to boundaries)
   - Contrast issues (text vs backgrounds)

   If issues found, adjust HTML and regenerate until correct.

**Complete html2pptx guide**: [html2pptx.md](references/html2pptx.md)

---

## Using Templates (rearrange.py + replace.py)

Create presentations following existing template design.

### Workflow

**1. Extract template text and create thumbnails**:
```bash
python -m markitdown template.pptx > template-content.md
python scripts/thumbnail.py template.pptx
```

Read `template-content.md` entirely (never set range limits) to understand template contents.

**2. Analyze template and save inventory**:

Create `template-inventory.md`:
```markdown
# Template Inventory Analysis
**Total Slides: [count]**
**IMPORTANT: Slides are 0-indexed (first slide = 0, last = count-1)**

## [Category Name]
- Slide 0: [Layout code] - Description/purpose
- Slide 1: [Layout code] - Description/purpose
[... EVERY slide individually with index ...]
```

Use thumbnail grid to identify:
- Layout patterns (title, content, section dividers)
- Image placeholder locations/counts
- Design consistency
- Visual hierarchy

**3. Create outline based on inventory**:
- Review available templates from step 2
- Choose intro/title template for first slide
- Choose safe, text-based layouts for other slides
- **CRITICAL - Match layout to content**:
  - Single-column: Unified narrative or single topic
  - Two-column: ONLY when exactly 2 distinct items
  - Three-column: ONLY when exactly 3 distinct items
  - Image + text: ONLY when actual images available
  - Quote layouts: ONLY for actual quotes with attribution
  - Count content pieces BEFORE selecting layout
  - Never use layouts with more placeholders than content

Save `outline.md` with content AND template mapping:
```python
# Template mapping (0-based indexing)
# WARNING: Verify indices within range! Template with 73 slides = indices 0-72
template_mapping = [
    0,   # Slide 0 (Title/Cover)
    34,  # Slide 34 (B1: Title and body)
    34,  # Slide 34 again (duplicate)
    50,  # Slide 50 (E1: Quote)
    54,  # Slide 54 (F2: Closing)
]
```

**4. Duplicate, reorder, delete slides**:
```bash
python scripts/rearrange.py template.pptx working.pptx 0,34,34,50,52
```
- Handles duplicating, deleting, reordering automatically
- Indices are 0-based
- Same index can appear multiple times for duplication

**5. Extract ALL text**:
```bash
python scripts/inventory.py working.pptx text-inventory.json
```

Read `text-inventory.json` entirely (never set range limits).

JSON structure:
```json
{
  "slide-0": {
    "shape-0": {
      "placeholder_type": "TITLE",  // or null
      "left": 1.5,                  // position in inches
      "top": 2.0,
      "width": 7.5,
      "height": 1.2,
      "paragraphs": [
        {
          "text": "Paragraph text",
          "bullet": true,           // explicit bullet
          "level": 0,               // when bullet is true
          "alignment": "CENTER",    // CENTER, RIGHT (not LEFT)
          "font_name": "Arial",
          "font_size": 14.0,
          "bold": true,
          "color": "FF0000"         // RGB color
        }
      ]
    }
  }
}
```

Key features:
- **Slides**: "slide-0", "slide-1", etc.
- **Shapes**: Ordered top-to-bottom, left-to-right as "shape-0", "shape-1", etc.
- **Placeholder types**: TITLE, CENTER_TITLE, SUBTITLE, BODY, OBJECT, or null
- **Bullets**: When `bullet: true`, `level` always included
- **Colors**: RGB ("FF0000") or theme_color ("DARK_1")

**6. Generate replacement text**:

Based on inventory:
- **CRITICAL**: Verify shapes exist in inventory first
- **VALIDATION**: replace.py validates all shapes exist
- Add "paragraphs" field to shapes needing content
- Shapes without "paragraphs" will be cleared automatically
- Don't include bullet symbols (•, -, *) in text when `bullet: true`

**Essential formatting rules**:
- Headers/titles: `"bold": true`
- List items: `"bullet": true, "level": 0`
- Preserve alignment: `"alignment": "CENTER"` for centered text
- Font properties when different from default
- Colors: `"color": "FF0000"` or `"theme_color": "DARK_1"`

Example paragraphs:
```json
"paragraphs": [
  {
    "text": "Title text",
    "alignment": "CENTER",
    "bold": true
  },
  {
    "text": "Section Header",
    "bold": true
  },
  {
    "text": "Bullet point without symbol",
    "bullet": true,
    "level": 0
  }
]
```

Save to `replacement-text.json`.

**7. Apply replacements**:
```bash
python scripts/replace.py working.pptx replacement-text.json output.pptx
```

Script will:
- Extract inventory of ALL text shapes
- Validate shapes in replacement JSON exist
- Clear text from ALL shapes
- Apply new text to shapes with "paragraphs"
- Preserve formatting (bullets, alignment, fonts, colors)
- Save updated presentation

---

## Editing OOXML (unpack/edit/pack)

Work with raw Office Open XML for precise modifications.

### When to Use

- Adding comments or speaker notes
- Modifying slide layouts
- Accessing animations
- Complex design element changes
- Metadata modifications

### Workflow

1. **READ ENTIRE FILE**: Read [`ooxml.md`](references/ooxml.md) completely before editing. **Never set range limits.**

2. **Unpack presentation**:
   ```bash
   python ooxml/scripts/unpack.py <office_file> <output_dir>
   ```

3. **Edit XML files**: Primarily `ppt/slides/slide{N}.xml` and related

4. **CRITICAL - Validate immediately**:
   ```bash
   python ooxml/scripts/validate.py <dir> --original <file>
   ```
   Fix validation errors before proceeding.

5. **Pack final presentation**:
   ```bash
   python ooxml/scripts/pack.py <input_directory> <office_file>
   ```

**Complete OOXML guide**: [ooxml.md](references/ooxml.md)

---

## Thumbnail Grids

Create visual thumbnail grids for quick analysis:

```bash
python scripts/thumbnail.py template.pptx [output_prefix]
```

**Features**:
- Creates: `thumbnails.jpg` (or `thumbnails-1.jpg`, `thumbnails-2.jpg` for large decks)
- Default: 5 columns, max 30 slides per grid (5×6)
- Custom prefix: `python scripts/thumbnail.py template.pptx my-grid`
- Adjust columns: `--cols 4` (range: 3-6)
- Grid limits: 3 cols = 12 slides, 4 cols = 20, 5 cols = 30, 6 cols = 42
- Slides are zero-indexed (Slide 0, Slide 1, etc.)

**Use cases**:
- Template analysis: Understand layouts and design patterns
- Content review: Visual overview of entire presentation
- Navigation: Find slides by appearance
- Quality check: Verify formatting

**Examples**:
```bash
# Basic usage
python scripts/thumbnail.py presentation.pptx

# Custom name and columns
python scripts/thumbnail.py template.pptx analysis --cols 4
```

---

## Converting Slides to Images

Two-step process for visual analysis:

**1. Convert PPTX to PDF**:
```bash
soffice --headless --convert-to pdf template.pptx
```

**2. Convert PDF to JPEG images**:
```bash
pdftoppm -jpeg -r 150 template.pdf slide
```
Creates: `slide-1.jpg`, `slide-2.jpg`, etc.

**Options**:
- `-r 150`: Resolution (150 DPI)
- `-jpeg`: Output JPEG (use `-png` for PNG)
- `-f N`: First page (e.g., `-f 2`)
- `-l N`: Last page (e.g., `-l 5`)

**Specific range**:
```bash
pdftoppm -jpeg -r 150 -f 2 -l 5 template.pdf slide  # Pages 2-5 only
```

---

## Code Style Guidelines

**IMPORTANT** when generating PPTX code:
- Write concise code
- Avoid verbose variable names
- Avoid redundant operations
- Avoid unnecessary print statements

---

## Scripts Reference

Available utilities in `scripts/` directory:

- **`thumbnail.py`** - Create visual thumbnail grids
- **`rearrange.py`** - Duplicate, reorder, delete slides
- **`inventory.py`** - Extract text shape inventory
- **`replace.py`** - Apply text replacements
- **`html2pptx.js`** - Convert HTML to PowerPoint

---

## Dependencies

Required (should already be installed):

- **markitdown**: `pip install "markitdown[pptx]"` (text extraction)
- **pptxgenjs**: `npm install -g pptxgenjs` (HTML conversion)
- **playwright**: `npm install -g playwright` (HTML rendering)
- **react-icons**: `npm install -g react-icons react react-dom` (icons)
- **sharp**: `npm install -g sharp` (SVG rasterization)
- **LibreOffice**: `sudo apt-get install libreoffice` (PDF conversion)
- **Poppler**: `sudo apt-get install poppler-utils` (pdftoppm)
- **defusedxml**: `pip install defusedxml` (secure XML parsing)

---

## Additional Resources

### Reference Files

Complete technical documentation:
- **[html2pptx.md](references/html2pptx.md)** - Detailed html2pptx syntax and formatting rules
- **[ooxml.md](references/ooxml.md)** - OOXML structure and editing workflows

### Scripts

Utility scripts in `scripts/` directory:
- **thumbnail.py** - Generate visual grids
- **rearrange.py** - Slide manipulation
- **inventory.py** - Text extraction
- **replace.py** - Text replacement
- **html2pptx.js** - HTML to PowerPoint conversion

### OOXML Tools

Tools in `ooxml/scripts/`:
- **unpack.py** - Extract PPTX to XML
- **pack.py** - Repack XML to PPTX
- **validate.py** - Validate XML structure
