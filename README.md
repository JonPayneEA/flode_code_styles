# EA Flood Forecasting and Warning -- R Skills for Claude Code

Claude Code configuration for the Environment Agency Flood Forecasting and Warning team. Encodes the team's R coding standards, governance framework, and domain-specific hydrological patterns.

Built on the structure of [ab604/claude-code-r-skills](https://github.com/ab604/claude-code-r-skills). Adapted to replace tidyverse with the fastverse, align with *R Tool Governance v1.3*, and add EA-specific domain knowledge.

---

## Overview

### Skills

| Skill | Description |
|---|---|
| `fastverse-patterns` | data.table / collapse / arrow patterns. Replaces tidyverse for Tier 3 and Flode. |
| `reach-architecture` | Flode module map, mandatory header block, naming conventions, repo structure. |
| `hydrology-domain` | Gauge data structures, FEWS PI-XML, NWP catalogue, PDM, ARMA, FEH, LSTM, validation metrics, EA RTFM API. |
| `r-oop` | S7 (default), R6 (stateful), S3 (dispatch), S4 (spatial interop only). |
| `r-performance` | profvis, bench, data.table / collapse optimisation, memory efficiency. |
| `r-style-guide` | Naming, spacing, function design, mandatory header block. |
| `r-package-development` | roxygen2, DESCRIPTION, Flode promotion path, renv, 70% coverage. |
| `tdd-workflow` | Red-green-refactor, testthat, embedded fixtures, 70% coverage for Tier 3. |

### Rules (automatically enforced)

| Rule | Description |
|---|---|
| `fastverse-enforcement` | Tidyverse banned in Tier 3 and Flode. Lists replacements. |
| `header-block` | Mandatory header block. Missing header blocks Tier 3 merge. |
| `file-format` | Parquet / fwrite / saveRDS. write.csv and .RData banned. |
| `testing` | 70% coverage minimum for Tier 3. testthat, covr, lintr, renv all required. |

### Commands

| Command | Description |
|---|---|
| `/plan` | Create a governance-compliant implementation plan before writing code. |
| `/code-review` | Review R code against EA governance standards. |
| `/tdd` | Run the full red-green-refactor TDD workflow. |

### Agents

| Agent | Description |
|---|---|
| `planner` | Implementation planning specialist. Produces detailed plans including header blocks, signatures, and edge cases. |
| `code-reviewer` | Governance-aware reviewer. Reports blocking and advisory issues with line references. |

### Hooks

| Hook | Trigger | Description |
|---|---|---|
| `suggest-compact` | PreToolUse (Edit/Write) | Suggests `/compact` after 50 tool uses, then every 25. |
| `pre-compact` | PreCompact | Saves session state before context compaction. |
| `session-start` | SessionStart | Reports active skills, rules, and recent session history. |
| `session-end` | SessionEnd | Persists session state for continuity. |
| `doc-blocker` | PreToolUse (Write .md) | Warns about creating markdown files outside approved locations. |

---

## Tier system

| Tier | Name | Location | Standards |
|---|---|---|---|
| Tier 1 | Experimental | `experimental/` | Header block; inline comments sufficient |
| Tier 2 | Analytical | `analytical/` | Header block; `roxygen2` for key functions; tests recommended |
| Tier 3 | Operational | `operational/` | Full standards; 70% coverage; `lintr` and `renv` mandatory |

---

## Installation

### Option 1: Copy to your project

```bash
git clone https://github.com/[your-org]/ea-flood-r-skills.git

# Copy Claude Code configuration
cp -r ea-flood-r-skills/.claude/ /path/to/your/project/
cp -r ea-flood-r-skills/rules/ /path/to/your/project/
cp -r ea-flood-r-skills/commands/ /path/to/your/project/
cp -r ea-flood-r-skills/agents/ /path/to/your/project/
```

### Option 2: Copy skills to global config

```bash
cp -r .claude/skills/* ~/.claude/skills/
cp -r rules/* ~/.claude/rules/
cp -r commands/* ~/.claude/commands/
cp -r agents/* ~/.claude/agents/
```

---

## References

- Governance framework: https://jonpayneea.github.io/Governance
- *R Tool Governance v1.3* -- authoritative source for team standards
- data.table: https://rdatatable.gitlab.io/data.table/
- collapse: https://fastverse.github.io/collapse/
- S7: https://rconsortium.github.io/S7/
- arrow (R): https://arrow.apache.org/docs/r/

---

## Acknowledgements

Structure and hooks adapted from [ab604/claude-code-r-skills](https://github.com/ab604/claude-code-r-skills), which itself builds on work by Sarah Johnson, Jeremy Allen, and Affaan Mustafa.
