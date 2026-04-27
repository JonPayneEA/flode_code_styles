# Header Block Rule

Every `.R` script and function file must open with a completed header block. This is a governance requirement from *R Tool Governance v1.3*. A missing or incomplete header blocks merge for Tier 3 and Tier 2.

## Required format

```r
# ============================================================ #
# Tool:         [Tool name]
# Description:  [One-sentence description of what this does]
# Flode Module: [Target module, e.g. reach.hydro -- or 'standalone']
# Author:       [Name, email]
# Created:      [YYYY-MM-DD]
# Modified:     [YYYY-MM-DD] - [initials]: [change summary]
# Tier:         [1 / 2 / 3]
# Inputs:       [Describe inputs and expected formats]
# Outputs:      [Describe outputs and formats]
# Dependencies: [List non-base packages; flag any non-fastverse choices]
# ============================================================ #
```

## Completion requirements

Every field must be filled. Placeholders in square brackets are not acceptable in a submitted file.

- **Tool:** the short name of the script or function file.
- **Description:** one sentence. If it takes more than one sentence, the tool is probably doing too much.
- **Flode Module:** the target `reach.*` module, or `standalone` if the script is not destined for Flode.
- **Author:** full name and EA email address.
- **Created:** ISO 8601 date (`YYYY-MM-DD`).
- **Modified:** update this field every time the file is substantively changed. Format: `YYYY-MM-DD - initials: summary of change`.
- **Tier:** 1, 2, or 3. This field drives enforcement of testing, linting, and ecosystem rules.
- **Inputs:** describe what the function or script expects. Include format (data.table, Parquet path, POSIXct) and units where relevant.
- **Outputs:** describe what the function or script produces. Include format and units.
- **Dependencies:** list every non-base package. Flag any non-fastverse choice with a brief justification (e.g. `forecast -- ARMA fitting; no fastverse equivalent`).

## Enforcement

| Tier | Missing header | Incomplete header |
|---|---|---|
| Tier 3 | Blocks merge | Blocks merge |
| Tier 2 | Blocks merge | Advisory |
| Tier 1 | Advisory | No action |

## Code review action

When reviewing any Tier 3 or Tier 2 file, check the header block first. If it is absent, add it and request the author completes it before approving. If it is present but incomplete (placeholder text remaining, Modified field not updated), flag as blocking for Tier 3, advisory for Tier 2.
