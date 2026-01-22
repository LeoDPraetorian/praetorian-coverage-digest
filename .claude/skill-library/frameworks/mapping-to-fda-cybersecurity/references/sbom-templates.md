# SBOM Templates - Software Bill of Materials for FDA Submissions

**FDA Requirement:** Section 524B(b)(3) mandates SBOM for all cyber devices

**Format Flexibility:** FDA does NOT mandate SPDX 2.3+ or CycloneDX 1.4+ (industry best practices, not regulatory requirements)

---

## FDA-Required SBOM Content

### Minimum Content Elements (Section V, Appendix 4)

1. **Component Identification**
   - Component name
   - Component type (library, framework, OS, firmware)
   - Publisher/supplier

2. **Version Information**
   - Specific version numbers
   - Build identifiers (if applicable)
   - Release dates

3. **Known Vulnerabilities**
   - CVE identifiers
   - CVSS scores
   - Mitigation status (patched, mitigated, accepted)

4. **Support Lifecycle**
   - Support status (active, end-of-life)
   - End-of-support dates
   - Maintenance commitments

5. **Dependencies**
   - Direct dependencies
   - Transitive dependencies
   - Dependency relationships

---

## SPDX 2.3+ Format (Voluntary Standard)

### SPDX Basic Template

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "Medical-Device-SBOM-Example",
  "documentNamespace": "https://manufacturer.com/sbom/device-model-v1.0",
  "creationInfo": {
    "created": "2023-09-15T10:00:00Z",
    "creators": ["Tool: SPDX-Builder-v2.3"],
    "licenseListVersion": "3.20"
  },
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-OpenSSL",
      "name": "openssl",
      "versionInfo": "1.1.1k",
      "supplier": "Organization: OpenSSL Project",
      "downloadLocation": "https://www.openssl.org/source/openssl-1.1.1k.tar.gz",
      "filesAnalyzed": false,
      "licenseConcluded": "Apache-2.0",
      "externalRefs": [
        {
          "referenceCategory": "SECURITY",
          "referenceType": "cpe23Type",
          "referenceLocator": "cpe:2.3:a:openssl:openssl:1.1.1k:*:*:*:*:*:*:*"
        },
        {
          "referenceCategory": "SECURITY",
          "referenceType": "advisory",
          "referenceLocator": "https://nvd.nist.gov/vuln/detail/CVE-2021-3711",
          "comment": "Known vulnerability - mitigated via network segmentation"
        }
      ],
      "annotations": [
        {
          "annotationDate": "2023-09-15T10:00:00Z",
          "annotationType": "REVIEW",
          "annotator": "Person: Security Team",
          "comment": "End-of-support: 2023-09-11. Migration to 3.0.x planned for Q1 2024."
        }
      ]
    },
    {
      "SPDXID": "SPDXRef-Package-React",
      "name": "react",
      "versionInfo": "18.2.0",
      "supplier": "Organization: Meta Platforms",
      "downloadLocation": "https://registry.npmjs.org/react/-/react-18.2.0.tgz",
      "filesAnalyzed": false,
      "licenseConcluded": "MIT",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:npm/react@18.2.0"
        }
      ]
    }
  ],
  "relationships": [
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relationshipType": "DESCRIBES",
      "relatedSpdxElement": "SPDXRef-Package-OpenSSL"
    },
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relationshipType": "DESCRIBES",
      "relatedSpdxElement": "SPDXRef-Package-React"
    },
    {
      "spdxElementId": "SPDXRef-Package-React",
      "relationshipType": "DEPENDS_ON",
      "relatedSpdxElement": "SPDXRef-Package-Scheduler"
    }
  ]
}
```

### SPDX FDA-Specific Extensions

**FDA recommends including:**

- **Support lifecycle annotations**: End-of-support dates, active maintenance status
- **Vulnerability references**: CVE IDs, CVSS scores, mitigation status
- **Component criticality**: Life-sustaining components flagged
- **Update history**: Version upgrade tracking for postmarket surveillance

---

## CycloneDX 1.4+ Format (Voluntary Standard)

### CycloneDX Basic Template

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "version": 1,
  "metadata": {
    "timestamp": "2023-09-15T10:00:00Z",
    "tools": [
      {
        "vendor": "OWASP",
        "name": "CycloneDX-Generator",
        "version": "7.0.0"
      }
    ],
    "component": {
      "type": "device",
      "name": "Infusion-Pump-Model-X",
      "version": "v2.4.1",
      "description": "Smart infusion pump with network connectivity"
    }
  },
  "components": [
    {
      "type": "library",
      "bom-ref": "pkg:npm/openssl@1.1.1k",
      "name": "openssl",
      "version": "1.1.1k",
      "supplier": {
        "name": "OpenSSL Project",
        "url": ["https://www.openssl.org"]
      },
      "purl": "pkg:generic/openssl@1.1.1k",
      "licenses": [
        {
          "license": {
            "id": "Apache-2.0"
          }
        }
      ],
      "externalReferences": [
        {
          "type": "website",
          "url": "https://www.openssl.org"
        },
        {
          "type": "issue-tracker",
          "url": "https://github.com/openssl/openssl/issues"
        },
        {
          "type": "advisories",
          "url": "https://www.openssl.org/news/vulnerabilities.html"
        }
      ],
      "properties": [
        {
          "name": "fda:support-status",
          "value": "end-of-life"
        },
        {
          "name": "fda:end-of-support-date",
          "value": "2023-09-11"
        },
        {
          "name": "fda:migration-plan",
          "value": "Upgrade to OpenSSL 3.0.x planned for Q1 2024"
        }
      ]
    },
    {
      "type": "library",
      "bom-ref": "pkg:npm/react@18.2.0",
      "name": "react",
      "version": "18.2.0",
      "supplier": {
        "name": "Meta Platforms",
        "url": ["https://react.dev"]
      },
      "purl": "pkg:npm/react@18.2.0",
      "licenses": [
        {
          "license": {
            "id": "MIT"
          }
        }
      ],
      "properties": [
        {
          "name": "fda:support-status",
          "value": "active"
        }
      ]
    }
  ],
  "dependencies": [
    {
      "ref": "pkg:npm/react@18.2.0",
      "dependsOn": ["pkg:npm/scheduler@0.23.0"]
    }
  ],
  "vulnerabilities": [
    {
      "bom-ref": "vuln-CVE-2021-3711",
      "id": "CVE-2021-3711",
      "source": {
        "name": "NVD",
        "url": "https://nvd.nist.gov/vuln/detail/CVE-2021-3711"
      },
      "ratings": [
        {
          "source": {
            "name": "NVD"
          },
          "score": 9.8,
          "severity": "critical",
          "method": "CVSSv3",
          "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        },
        {
          "source": {
            "name": "FDA-Medical-Device-Rubric"
          },
          "score": 7.5,
          "severity": "high",
          "method": "CVSSv3",
          "vector": "CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "justification": "Adjacent network only due to device deployment context"
        }
      ],
      "affects": [
        {
          "ref": "pkg:npm/openssl@1.1.1k"
        }
      ],
      "analysis": {
        "state": "exploitable",
        "response": ["will_not_fix", "workaround_available"],
        "detail": "Network segmentation deployed as compensating control. Device isolated on dedicated VLAN. Migration to patched version planned for Q1 2024 software update."
      },
      "properties": [
        {
          "name": "fda:patient-harm-severity",
          "value": "minor"
        },
        {
          "name": "fda:risk-classification",
          "value": "controlled"
        },
        {
          "name": "fda:compensating-controls",
          "value": "Network segmentation, VLAN isolation, firewall rules"
        }
      ]
    }
  ]
}
```

---

## FDA-Specific SBOM Best Practices

### 1. Support Lifecycle Documentation

**FDA expects clear lifecycle information:**

- Active support vs. end-of-life status
- End-of-support (EOS) dates
- Upgrade/migration timelines
- Vendor commitments for security patches

**Example:**

```json
"properties": [
  {
    "name": "fda:support-status",
    "value": "active"
  },
  {
    "name": "fda:end-of-support-date",
    "value": "2025-12-31"
  },
  {
    "name": "fda:security-patch-commitment",
    "value": "Critical security patches within 30 days"
  }
]
```

### 2. Vulnerability Tracking with VEX

**VEX (Vulnerability Exploitability eXchange)** provides vulnerability status:

```json
"analysis": {
  "state": "in_triage|exploitable|resolved|not_affected",
  "response": ["can_not_fix", "will_not_fix", "update", "rollback", "workaround_available"],
  "detail": "Detailed remediation plan or risk acceptance rationale"
}
```

### 3. FDA Risk Classification Properties

**Custom FDA properties for medical device context:**

```json
"properties": [
  {
    "name": "fda:patient-harm-severity",
    "value": "catastrophic|critical|serious|minor|negligible"
  },
  {
    "name": "fda:exploitability-level",
    "value": "high|medium|low"
  },
  {
    "name": "fda:risk-classification",
    "value": "controlled|uncontrolled"
  },
  {
    "name": "fda:device-tier",
    "value": "tier-1|tier-2"
  },
  {
    "name": "fda:compensating-controls",
    "value": "Description of mitigations in place"
  },
  {
    "name": "fda:response-timeline",
    "value": "immediate|30-day|60-day|90-day|standard-cycle"
  }
]
```

### 4. Component Criticality Flagging

**Identify life-sustaining components:**

```json
{
  "name": "therapy-control-module",
  "version": "3.2.1",
  "properties": [
    {
      "name": "fda:component-criticality",
      "value": "life-sustaining"
    },
    {
      "name": "fda:patient-safety-impact",
      "value": "Dosage calculation and delivery control - catastrophic harm if compromised"
    }
  ]
}
```

---

## SBOM Generation Tools

### Automated SBOM Generators

1. **Syft** (Anchore) - Multi-language SBOM generator
   - Supports SPDX and CycloneDX
   - Docker image scanning
   - CI/CD integration

2. **Tern** (VMware) - Container SBOM tool
   - Container layer analysis
   - Dockerfile scanning

3. **SPDX-Builder** - Official SPDX tooling
   - SPDX 2.3 format
   - License compliance

4. **CycloneDX CLI** - OWASP official tool
   - Multi-language support
   - Vulnerability enrichment

5. **Microsoft SBOM Tool** - Microsoft open source
   - CI/CD pipeline integration
   - SPDX output

### SBOM Validation Tools

1. **NTIA SBOM Checker** - Validates NTIA minimum elements
2. **SPDX Validator** - Validates SPDX format compliance
3. **CycloneDX Validator** - Validates CycloneDX schema

---

## SBOM Update and Maintenance

### Continuous SBOM Management

**FDA expects SBOM to be a living document:**

1. **Initial Submission** (Premarket)
   - Baseline SBOM with 510(k) or PMA
   - All components documented

2. **Vulnerability Discovery** (Postmarket)
   - Update SBOM with newly discovered CVEs
   - Add VEX status (exploitable, mitigated, accepted)
   - Document compensating controls

3. **Component Updates** (Postmarket)
   - Track version upgrades
   - Document patch deployment dates
   - Update support lifecycle status

4. **Annual Review**
   - Review all component support status
   - Flag end-of-life components
   - Plan migrations for unsupported components

---

## SBOM in CVD Process

### Integration with Coordinated Vulnerability Disclosure

When external researcher reports vulnerability:

1. **SBOM Cross-Reference**
   - Match CVE to SBOM component
   - Identify affected device versions

2. **Risk Assessment**
   - Use FDA dual-axis framework (exploitability + patient harm)
   - Classify as controlled or uncontrolled risk

3. **SBOM Update**
   - Add CVE reference to component
   - Document VEX status (in_triage → exploitable → resolved)
   - Track remediation timeline

4. **Customer Communication**
   - Reference SBOM component in Field Safety Notice
   - Provide affected version list from SBOM

---

## Key References

- FDA Guidance: Section V - SBOM Requirements (September 2023)
- SPDX 2.3 Specification: https://spdx.dev/specifications/
- CycloneDX 1.4 Specification: https://cyclonedx.org/specification/overview/
- NTIA SBOM Baseline Attributes: https://www.ntia.gov/page/software-bill-materials
- VEX Specification: https://www.cisa.gov/sbom/vex
