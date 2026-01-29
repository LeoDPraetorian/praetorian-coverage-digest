# LaTeX Formatting for NRF Documents

This file contains the complete LaTeX templates required for NRF-compliant documents.

## Preliminary Observations LaTeX Template

Every preliminary observation document must include confidentiality notices using this LaTeX template:

```latex
\AddToShipoutPictureBG{%
  \AtPageLowerLeft{%
    \put(0,0){%
      \rotatebox{90}{%
        \raisebox{\paperwidth}{%
          \parbox{8in}{%
            \raggedright
            \centering
            \color{PraetorianPurple}
             Privileged and Confidential; Prepared at the Direction of Counsel.
          }%
        }%
      }%
    }%
  }%
}

\lofoot*{\color{PraetorianPurple}\footnotesize\textbf{Privileged and Confidential; Prepared at the Direction of Counsel}}
```

**Placement**: This LaTeX must appear at the beginning of preliminary observation documents, before any content.

**Effect**: Creates confidentiality notices in:
- Left margin (rotated vertical text)
- Footer on every page

## Findings LaTeX Template (Standalone Documents)

For standalone finding documents delivered independently:

```markdown
# Report Title
**Privileged and Confidential**
**Prepared at the Direction of Counsel**
```

**Important**: For findings within larger reports, verify with user that confidentiality notices are present in the overall report structure. The full LaTeX footer format above must be included if delivering findings independently.

## Verification Steps

When applying LaTeX formatting:

1. **Identify document type**:
   - Preliminary observation → Use full LaTeX template (vertical margin + footer)
   - Standalone finding → Use markdown headers or LaTeX based on delivery context
   - Finding in larger report → Confirm report-level notices exist

2. **Test rendering**: LaTeX commands must compile correctly with the Praetorian report toolchain

3. **Visual verification**: Confirm notices appear:
   - On ALL pages (not just first page)
   - In correct color (PraetorianPurple)
   - With proper rotation/positioning
