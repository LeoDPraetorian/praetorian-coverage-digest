#!/usr/bin/env -S uv run --quiet --script
# /// script
# dependencies = ["cvss"]
# ///
"""
CVSS Score Calculator

Calculates CVSS v3.1 and v4.0 scores from vector strings using the RedHat cvss library.

Usage:
    uv run cvss-calc.py "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
    uv run cvss-calc.py "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"

Output:
    Score: 9.3
    Severity: Critical
    Vector: CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N

Requirements:
    uv (automatically installs cvss library on first run)
"""

import sys
import json

from cvss import CVSS3, CVSS4


def calculate_score(vector_string):
    """Calculate CVSS score from vector string."""

    # Detect version
    if vector_string.startswith("CVSS:4.0"):
        cvss_obj = CVSS4(vector_string)
        version = "4.0"
    elif vector_string.startswith("CVSS:3.1"):
        cvss_obj = CVSS3(vector_string)
        version = "3.1"
    elif vector_string.startswith("CVSS:3.0"):
        cvss_obj = CVSS3(vector_string)
        version = "3.0"
    else:
        print(f"Error: Unsupported CVSS version. Vector must start with CVSS:3.0, CVSS:3.1, or CVSS:4.0", file=sys.stderr)
        sys.exit(1)

    # Get scores and severities
    scores = cvss_obj.scores()
    severities = cvss_obj.severities()
    clean_vector = cvss_obj.clean_vector()

    # Return formatted output
    return {
        "version": version,
        "vector": clean_vector,
        "score": scores[0],
        "severity": severities[0]
    }


def main():
    if len(sys.argv) != 2:
        print("Usage: uv run cvss-calc.py <cvss-vector-string>", file=sys.stderr)
        print('Example: uv run cvss-calc.py "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"', file=sys.stderr)
        sys.exit(1)

    vector_string = sys.argv[1]

    try:
        result = calculate_score(vector_string)

        # Output in simple format for easy parsing
        print(f"Score: {result['score']}")
        print(f"Severity: {result['severity']}")
        print(f"Vector: {result['vector']}")

        # Also output JSON for programmatic parsing
        print(f"\nJSON: {json.dumps(result)}")

    except Exception as e:
        print(f"Error calculating CVSS score: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
