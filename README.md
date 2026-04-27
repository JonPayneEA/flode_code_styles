# EA Flood Forecasting and Warning: R Skills for Claude Code

Claude Code configuration for the Environment Agency Flood Forecasting and Warning team. Encodes the team's R coding standards, governance framework, and domain-specific hydrological patterns.

Built on the structure of [ab604/claude-code-r-skills](https://github.com/ab604/claude-code-r-skills). Adapted to replace tidyverse with the fastverse, align with *R Tool Governance v1.3*, and add EA-specific domain knowledge.

---

## Contents

- [Skills](#skills)
- [Rules](#rules)
- [Commands](#commands)
- [Agents](#agents)
- [Hooks](#hooks)
- [Tier system](#tier-system)
- [Recommended workflow](#recommended-workflow)
- [Installation](#installation)
- [References](#references)

---

## Skills

Skills are Markdown files that Claude Code loads into context when they are relevant to your task. They encode team standards, patterns, and domain knowledge that Claude Code would otherwise have to infer, or get wrong.

Claude Code selects skills automatically based on the `description:` field at the top of each file. You can also reference a skill explicitly by name in your prompt if you want to force it into context.

| Skill | Loads when you are... |
|---|---|
| `fastverse-patterns` | Writing any tabular data manipulation, aggregation, joins, iteration, or file I/O |
| `reach-architecture` | Creating a new R file, function, or package; reviewing for governance compliance |
| `hydrology-domain` | Working with gauge data, NWP products, FEWS, PDM, LSTM inference, or validation metrics |
| `r-oop` | Designing or implementing S7 classes, R6 objects, or method dispatch |
| `r-performance` | Investigating slow code, benchmarking implementations, or optimising a hot path |
| `r-style-guide` | Writing, reviewing, or formatting any R code |
| `r-package-development` | Developing a Flode module or team package; writing roxygen2 docs |
| `tdd-workflow` | Writing tests, practising TDD, or checking coverage |

### Skill detail

**`fastverse-patterns`** is the most important skill in the set. It encodes the full `DT[i,j,by]` idiom, update-by-reference with `:=`, rolling and non-equi joins, `collapse` statistical functions, `frollmean`/`frollsum` for time series, `melt`/`dcast` for reshaping, `%between%` for range filtering, set operations, and Parquet I/O. It ends with a banned-to-replacement table covering 17 tidyverse anti-patterns. This skill is what stops Claude Code defaulting to `dplyr` and `purrr`.

**`reach-architecture`** is the governance skill. It contains the mandatory header block in full, the Flode module map with ownership descriptions, naming conventions (including the `_dt` suffix and `Flode` prefix), the repository tier structure, the seven-step Flode promotion path, and `renv` requirements.

**`hydrology-domain`** is the most bespoke skill. Nothing like it exists publicly. It defines the canonical data.table shapes for gauge records and ensemble forecasts, unit conventions (always m³/s, always UTC), the FEWS PI-XML parsing pattern, the full NWP product catalogue (seven products with resolution, members, and lead time), PDM parameters and function signatures, ARMA error correction, FEH catchment descriptors, LSTM/CAMELS-GB variable names, the four validation metrics with correct formulations, and the EA RTFM API throttling pattern. The anti-patterns section covers eleven domain-specific failure modes that general R linting will never catch.

---

## Rules

Rules are Markdown files that Claude Code enforces automatically during code review and generation. They apply whenever relevant without needing to be loaded explicitly.

| Rule | What it enforces |
|---|---|
| `fastverse-enforcement` | Tidyverse packages banned in Tier 3 and Flode. Provides a replacement for every banned function. |
| `header-block` | Mandatory header block in every `.R` file. Specifies what each field must contain. Blocks Tier 3 merge if absent. |
| `file-format` | `fwrite`/`fread` for CSV; `write_parquet` for large tabular outputs; `saveRDS` for R objects. `write.csv` and `.RData` banned. |
| `testing` | 70% line coverage minimum for Tier 3 via `covr`. `testthat`, `lintr`, and `renv::status()` all required. |

---

## Commands

Commands are invoked directly in the Claude Code chat with a `/` prefix. They trigger structured, multi-step workflows.

### `/plan`

Run before writing any code. Produces a governance-compliant implementation plan covering tier, Flode module assignment, typed inputs and outputs with units, dependencies (flagging non-fastverse choices), function signatures, at least three edge cases, and a completed header block draft. Claude Code will not write implementation code until you confirm the plan.

```
/plan

I need a function that reads all gauge records for a list of station IDs from
the Parquet archive, filters to quality_code == 1, and returns a single
data.table with a water_year column added.
```

### `/code-review`

Runs the full governance checklist against a file or selection. Reports blocking issues (must fix before Tier 3 merge) and advisory issues (recommended improvements) with file and line references. Checks: header block, ecosystem compliance, file format, hard-coded paths, naming conventions, OOP system, time zone handling, test coverage, and `renv` status.

```
/code-review R/load_gauge_archive.R
```

### `/tdd`

Runs the strict red-green-refactor cycle. Step 1 defines behaviour and edge cases. Step 2 writes failing tests first. Step 3 writes minimal implementation to pass. Step 4 refactors. Step 5 checks coverage and flags if below 70% for Tier 3. Step 6 runs `lintr`. Step 7 confirms merge readiness.

```
/tdd

Function: calc_kge
Inputs: obs (numeric vector, m³/s), sim (numeric vector, m³/s)
Output: double, KGE score
Edge cases: perfect forecast, all-NA obs, zero variance in obs
```

---

## Agents

Agents are specialist sub-processes Claude Code can invoke for specific tasks. They have defined tool access and a constrained role.

**`planner`** has read-only access to the codebase. It searches for existing similar functions before producing a plan, avoiding duplication with code already in Flode or `shared-functions/`. Its output is a structured plan document. It does not write code.

**`code-reviewer`** has read and Bash access. It uses `grep` and `wc` to inspect files directly rather than relying on Claude Code's interpretation, making its line-number references reliable. It also runs `renv::status()` where possible. Its output is a structured report. It does not modify code.

---

## Hooks

Hooks are Node.js scripts that fire automatically at defined points in the Claude Code session lifecycle. They activate as soon as you open a project that contains this configuration and require no manual invocation. All hooks are advisory: they warn and inform but never block an operation.

Hook state is stored in `~/.claude/flode_code_styles/` in the user's home directory, not in the project. State persists across sessions and compactions without cluttering the repository.

### How hooks work

Claude Code fires hooks at four lifecycle events:

- **PreToolUse**: before any file edit or write
- **PreCompact**: before context window compaction
- **SessionStart**: when you open a project
- **SessionEnd**: when you close

Hooks write to `stderr` to communicate back to the terminal. They exit `0` to allow the operation to proceed. A non-zero exit would block; none of these hooks do that.

### `session-start`

Fires when you open the project. Prints a summary showing active skills and rules by name, recent session history (last 3 sessions with dates and tool use counts), total compactions for the project, and a reminder of the tier numbering. This gives immediate orientation without needing to ask what configuration is loaded.

Example output:

```
📊 EA Flood Forecasting and Warning: R Development
═══════════════════════════════════════════════════════

Active skills (8): fastverse-patterns, reach-architecture, hydrology-domain, ...
Active rules  (4): fastverse-enforcement, header-block, file-format, testing

Recent sessions (2):
  1. 26/04/2026: Session ended; 47 tool uses
  2. 25/04/2026: Session ended; 83 tool uses

Tier system: Tier 1 = Experimental, Tier 2 = Analytical, Tier 3 = Operational
```

### `suggest-compact`

Fires on every file edit or write. Counts tool uses across the session and suggests `/compact` at 50 uses, then every 25 thereafter. The suggestion appears in the terminal:

```
⚠️  Context notice: 50 tool uses in this session.
   Consider running /compact at a logical task boundary to preserve context.
   Session state will be saved before compaction.
```

Context management matters for long sessions. A compaction at a natural boundary (after a function is complete and tested, for instance) preserves the most relevant context and avoids degraded output late in a session.

### `pre-compact`

Fires before a `/compact` operation. Saves a state snapshot to `~/.claude/flode_code_styles/snapshots/`, resets the tool use counter for the new context window, and keeps the five most recent snapshots. When the new context opens, `session-start` reads the persisted state and reports it.

### `session-end`

Fires when the session closes. Writes a session record (tool use count, timestamp) to `~/.claude/flode_code_styles/session-state.json` for `session-start` to report next time.

### `doc-blocker`

Fires before any Markdown file write. Checks whether the path is in an approved location: `README.md`, `NEWS.md`, `docs/`, `vignettes/`, `.claude/`, `rules/`, `commands/`, `agents/`. Warns if not. Stray `.md` files accumulate in R project directories and add context bloat; this hook surfaces the question before the file is created.

---

## Tier system

| Tier | Name | Location | Standards |
|---|---|---|---|
| Tier 1 | Experimental | `experimental/` | Header block; inline comments sufficient; no test requirement |
| Tier 2 | Analytical | `analytical/` | Header block; `roxygen2` for key functions; tests recommended |
| Tier 3 | Operational | `operational/` | Full `roxygen2`; 70% coverage; `lintr` mandatory; `renv` mandatory; `devtools::check()` before merge |

The tier is declared in the header block of every file and drives which rules apply. A function is promoted up the tier ladder. It does not start at Tier 3.

---

## Recommended workflow

This is the intended development cycle from first idea to Flode promotion.

### 1. Plan before you write

Open the project and run `/plan` with a description of what you need. The planner confirms the tier, assigns the Flode module, defines typed inputs and outputs with units, flags non-fastverse dependencies, sketches function signatures, lists edge cases, and drafts the header block. Confirm or amend before proceeding.

This step takes two minutes and prevents the most common failure modes: wrong units, wrong data shapes, unnecessary dependencies, and missing edge cases in tests.

### 2. Start with the tests

Run `/tdd` and follow the red-green-refactor cycle. Write failing tests before writing any implementation code. Tests written after the fact tend to test what the code does rather than what it should do.

For Tier 3 functions, 70% line coverage is the minimum. For operationally critical functions (a QMED estimator, an ARMA correction, a FEWS file writer), aim higher. The workflow will flag if you are below threshold before letting you proceed.

### 3. Keep context clean with `/compact`

For longer sessions, use `/compact` at natural task boundaries: after a function is complete and tested, after a code review is resolved. The `suggest-compact` hook will prompt at 50 tool uses. Do not wait for the prompt if you know you are at a boundary.

Compact before starting a substantially different task within the same session. A context that mixes PDM fitting code and FEWS file writing is less reliable than two focused ones.

### 4. Review before promoting

Before moving a function from Tier 1 or Tier 2 toward Tier 3 or Flode, run `/code-review`. The reviewer checks everything the automated tools do not: header block completeness, ecosystem compliance, time zone handling, naming conventions, and `renv` status. Fix blocking issues before opening a merge request.

The command is also useful for reviewing contributions from others. Run it on a PR branch before approving.

### 5. Promote via the Flode path

Functions ready for Flode follow the seven-step promotion path defined in `reach-architecture`:

1. Develop in `experimental/` as Tier 1
2. Peer review to Tier 2 standard
3. Open a GitHub issue to the Steward
4. Write full `roxygen2` documentation
5. Achieve 70% coverage via `covr`
6. Pass `lintr` with no errors
7. Run `devtools::check()` clean

The Steward owns merges into Flode. Do not add functions directly.

### Skill loading in practice

You do not need to think about which skills to load for most tasks. Claude Code reads each skill's `description:` field and loads what is relevant. A few patterns worth knowing:

Writing a new function from scratch will auto-load `reach-architecture`, `fastverse-patterns`, and `r-style-guide`. If you mention FEWS, NWP, PDM, LSTM, gauge, or flood forecasting, `hydrology-domain` will also load. If it does not, mention it explicitly: *"using the hydrology-domain skill, write a function to..."*.

Designing a new S7 class will load `r-oop`. If you need to choose between S7, R6, and S3, describe the use case and ask Claude Code to recommend a system.

For performance work, say so explicitly. `r-performance` loads on mentions of "slow", "profiling", "benchmark", or "optimise". Do not load it pre-emptively; the skill itself says to profile first.

---

## Installation

**Note: the `.claude` directory is a dotfolder and will not appear in Finder or Windows Explorer drag-and-drop. Use git on the command line.**

```bash
git clone https://github.com/[your-org]/flode_code_styles.git
cd /path/to/your/project

# Copy configuration into your project
cp -r /path/to/flode_code_styles/.claude .
cp -r /path/to/flode_code_styles/rules .
cp -r /path/to/flode_code_styles/commands .
cp -r /path/to/flode_code_styles/agents .

# Stage and commit (git handles dotfiles without issue)
git add .claude rules commands agents
git commit -m "Add Claude Code R skills configuration"
git push
```

Verify `.claude` is present before committing:

```bash
ls -la | grep claude
# Should show: drwxr-xr-x  .claude
```

### Option 2: Global config

To make skills and rules available across all your projects:

```bash
cp -r .claude/skills/* ~/.claude/skills/
cp -r rules/* ~/.claude/rules/
cp -r commands/* ~/.claude/commands/
cp -r agents/* ~/.claude/agents/
```

Global config does not include the hooks or `settings.json`, which are project-scoped.

---

## References

- Governance framework: https://jonpayneea.github.io/Governance
- *R Tool Governance v1.3*: authoritative source for team standards
- data.table: https://rdatatable.gitlab.io/data.table/
- collapse: https://fastverse.github.io/collapse/
- S7: https://rconsortium.github.io/S7/
- arrow (R): https://arrow.apache.org/docs/r/
- future.apply: https://future.apply.futureverse.org/
- logger: https://daroczig.github.io/logger/

---

## Acknowledgements

Structure and hooks adapted from [ab604/claude-code-r-skills](https://github.com/ab604/claude-code-r-skills), which itself builds on work by Sarah Johnson, Jeremy Allen, and Affaan Mustafa.
# EA Flood Forecasting and Warning -- R Skills for Claude Code

Claude Code configuration for the Environment Agency Flood Forecasting and Warning team. Encodes the team's R coding standards, governance framework, and domain-specific hydrological patterns.

Built on the structure of [ab604/claude-code-r-skills](https://github.com/ab604/claude-code-r-skills). Adapted to replace tidyverse with the fastverse, align with *R Tool Governance v1.3*, and add EA-specific domain knowledge.

---

## Contents

- [Skills](#skills)
- [Rules](#rules)
- [Commands](#commands)
- [Agents](#agents)
- [Hooks](#hooks)
- [Tier system](#tier-system)
- [Recommended workflow](#recommended-workflow)
- [Installation](#installation)
- [References](#references)

---

## Skills

Skills are Markdown files that Claude Code loads into context when they are relevant to your task. They encode team standards, patterns, and domain knowledge that Claude Code would otherwise have to infer -- or get wrong.

Claude Code selects skills automatically based on the `description:` field at the top of each file. You can also reference a skill explicitly by name in your prompt if you want to force it into context.

| Skill | Loads when you are... |
|---|---|
| `fastverse-patterns` | Writing any tabular data manipulation, aggregation, joins, iteration, or file I/O |
| `reach-architecture` | Creating a new R file, function, or package; reviewing for governance compliance |
| `hydrology-domain` | Working with gauge data, NWP products, FEWS, PDM, LSTM inference, or validation metrics |
| `r-oop` | Designing or implementing S7 classes, R6 objects, or method dispatch |
| `r-performance` | Investigating slow code, benchmarking implementations, or optimising a hot path |
| `r-style-guide` | Writing, reviewing, or formatting any R code |
| `r-package-development` | Developing a Flode module or team package; writing roxygen2 docs |
| `tdd-workflow` | Writing tests, practising TDD, or checking coverage |

### Skill detail

**`fastverse-patterns`** is the most important skill in the set. It encodes the full `DT[i,j,by]` idiom, update-by-reference with `:=`, rolling and non-equi joins, `collapse` statistical functions, `frollmean`/`frollsum` for time series, `melt`/`dcast` for reshaping, `%between%` for range filtering, set operations, and Parquet I/O. It ends with a banned-to-replacement table covering 17 tidyverse anti-patterns. This skill is what stops Claude Code defaulting to `dplyr` and `purrr`.

**`reach-architecture`** is the governance skill. It contains the mandatory header block in full, the Flode module map with ownership descriptions, naming conventions (including the `_dt` suffix and `Flode` prefix), the repository tier structure, the seven-step Flode promotion path, and `renv` requirements.

**`hydrology-domain`** is the most bespoke skill -- nothing like it exists publicly. It defines the canonical data.table shapes for gauge records and ensemble forecasts, unit conventions (always m³/s, always UTC), the FEWS PI-XML parsing pattern, the full NWP product catalogue (seven products with resolution/members/lead time), PDM parameters and function signatures, ARMA error correction, FEH catchment descriptors, LSTM/CAMELS-GB variable names, the four validation metrics with correct formulations, and the EA RTFM API throttling pattern. The anti-patterns section covers eleven domain-specific failure modes that general R linting will never catch.

---

## Rules

Rules are Markdown files that Claude Code enforces automatically during code review and generation. Unlike skills, they do not need to be loaded explicitly -- they apply whenever relevant.

| Rule | What it enforces |
|---|---|
| `fastverse-enforcement` | Tidyverse packages banned in Tier 3 and Flode. Provides a replacement for every banned function. |
| `header-block` | Mandatory header block in every `.R` file. Specifies what each field must contain. Blocks Tier 3 merge if absent. |
| `file-format` | `fwrite`/`fread` for CSV; `write_parquet` for large tabular outputs; `saveRDS` for R objects. `write.csv` and `.RData` banned. |
| `testing` | 70% line coverage minimum for Tier 3 via `covr`. `testthat`, `lintr`, and `renv::status()` all required. |

---

## Commands

Commands are invoked directly in the Claude Code chat with a `/` prefix. They trigger structured, multi-step workflows.

### `/plan`

Run before writing any code. Produces a governance-compliant implementation plan covering tier, Flode module assignment, typed inputs and outputs with units, dependencies (flagging non-fastverse choices), function signatures, at least three edge cases, and a completed header block draft. Claude Code will not write implementation code until you confirm the plan.

```
/plan

I need a function that reads all gauge records for a list of station IDs from
the Parquet archive, filters to quality_code == 1, and returns a single
data.table with a water_year column added.
```

### `/code-review`

Runs the full governance checklist against a file or selection. Reports blocking issues (must fix before Tier 3 merge) and advisory issues (recommended improvements) with file and line references. Checks: header block, ecosystem compliance, file format, hard-coded paths, naming conventions, OOP system, time zone handling, test coverage, and `renv` status.

```
/code-review R/load_gauge_archive.R
```

### `/tdd`

Runs the strict red-green-refactor cycle. Step 1 defines behaviour and edge cases. Step 2 writes failing tests first. Step 3 writes minimal implementation to pass. Step 4 refactors. Step 5 checks coverage and flags if below 70% for Tier 3. Step 6 runs `lintr`. Step 7 confirms merge readiness.

```
/tdd

Function: calc_kge
Inputs: obs (numeric vector, m³/s), sim (numeric vector, m³/s)
Output: double, KGE score
Edge cases: perfect forecast, all-NA obs, zero variance in obs
```

---

## Agents

Agents are specialist sub-processes Claude Code can invoke for specific tasks. They have defined tool access and a constrained role.

**`planner`** has read-only access to the codebase. It searches for existing similar functions before producing a plan, avoiding duplication with code already in Flode or `shared-functions/`. Its output is a structured plan document -- it does not write code.

**`code-reviewer`** has read and Bash access. It uses `grep` and `wc` to inspect files directly rather than relying on Claude Code's interpretation, making its line-number references reliable. It also runs `renv::status()` where possible. Its output is a structured report -- it does not modify code.

---

## Hooks

Hooks are Node.js scripts that fire automatically at defined points in the Claude Code session lifecycle. They require no manual invocation -- they activate as soon as you open a project that contains this configuration. All hooks are advisory: they warn and inform but never block an operation.

Hook state is stored in `~/.claude/flode_code_styles/` in the user's home directory, not in the project. This means state persists across sessions and compactions without cluttering the repository.

### How hooks work

Claude Code fires hooks at four lifecycle events:

- **PreToolUse** -- before any file edit or write
- **PreCompact** -- before context window compaction
- **SessionStart** -- when you open a project
- **SessionEnd** -- when you close

Hooks write to `stderr` to communicate back to the terminal. They exit `0` to allow the operation to proceed. A non-zero exit would block; none of these hooks do that.

### `session-start`

Fires when you open the project. Prints a summary showing active skills and rules by name, recent session history (last 3 sessions with dates and tool use counts), total compactions for the project, and a reminder of the tier numbering. This gives immediate orientation without needing to ask what configuration is loaded.

Example output:

```
📊 EA Flood Forecasting and Warning -- R Development
═══════════════════════════════════════════════════════

Active skills (8): fastverse-patterns, reach-architecture, hydrology-domain, ...
Active rules  (4): fastverse-enforcement, header-block, file-format, testing

Recent sessions (2):
  1. 26/04/2026 -- Session ended; 47 tool uses
  2. 25/04/2026 -- Session ended; 83 tool uses

Tier system: Tier 1 = Experimental, Tier 2 = Analytical, Tier 3 = Operational
```

### `suggest-compact`

Fires on every file edit or write. Counts tool uses across the session and suggests `/compact` at 50 uses, then every 25 thereafter. The suggestion appears in the terminal:

```
⚠️  Context notice: 50 tool uses in this session.
   Consider running /compact at a logical task boundary to preserve context.
   Session state will be saved before compaction.
```

Context management matters for long sessions. A compaction at a natural boundary -- after a function is complete and tested, for instance -- preserves the most relevant context and avoids degraded output late in a session.

### `pre-compact`

Fires before a `/compact` operation. Saves a state snapshot to `~/.claude/flode_code_styles/snapshots/`, resets the tool use counter for the new context window, and keeps the five most recent snapshots. When the new context opens, `session-start` reads the persisted state and reports it.

### `session-end`

Fires when the session closes. Writes a session record (tool use count, timestamp) to `~/.claude/flode_code_styles/session-state.json` for `session-start` to report next time.

### `doc-blocker`

Fires before any Markdown file write. Checks whether the path is in an approved location: `README.md`, `NEWS.md`, `docs/`, `vignettes/`, `.claude/`, `rules/`, `commands/`, `agents/`. Warns if not. Stray `.md` files accumulate in R project directories and add context bloat; this hook surfaces the question before the file is created.

---

## Tier system

| Tier | Name | Location | Standards |
|---|---|---|---|
| Tier 1 | Experimental | `experimental/` | Header block; inline comments sufficient; no test requirement |
| Tier 2 | Analytical | `analytical/` | Header block; `roxygen2` for key functions; tests recommended |
| Tier 3 | Operational | `operational/` | Full `roxygen2`; 70% coverage; `lintr` mandatory; `renv` mandatory; `devtools::check()` before merge |

The tier is declared in the header block of every file. It drives which rules apply. A function is promoted up the tier ladder -- it does not start at Tier 3.

---

## Recommended workflow

This is the intended development cycle from first idea to Flode promotion.

### 1. Plan before you write

Open the project and run `/plan` with a description of what you need. The planner confirms the tier, assigns the Flode module, defines typed inputs and outputs with units, flags non-fastverse dependencies, sketches function signatures, lists edge cases, and drafts the header block. Confirm or amend before proceeding.

This step takes two minutes and prevents the most common failure modes: wrong units, wrong data shapes, unnecessary dependencies, and missing edge cases in tests.

### 2. Start with the tests

Run `/tdd` and follow the red-green-refactor cycle. Write failing tests before writing any implementation code. Tests written after the fact tend to test what the code does rather than what it should do.

For Tier 3 functions, 70% line coverage is the minimum. For operationally critical functions -- a QMED estimator, an ARMA correction, a FEWS file writer -- aim higher. The workflow will flag if you are below threshold before letting you proceed.

### 3. Keep context clean with `/compact`

For longer sessions, use `/compact` at natural task boundaries: after a function is complete and tested, after a code review is resolved. The `suggest-compact` hook will prompt at 50 tool uses. Do not wait for the prompt if you know you are at a boundary.

Compact before starting a substantially different task within the same session. A context that mixes PDM fitting code and FEWS file writing is less reliable than two focused ones.

### 4. Review before promoting

Before moving a function from Tier 1 or Tier 2 toward Tier 3 or Flode, run `/code-review`. The reviewer checks everything the automated tools do not: header block completeness, ecosystem compliance, time zone handling, naming conventions, and `renv` status. Fix blocking issues before opening a merge request.

The command is also useful for reviewing contributions from others. Run it on a PR branch before approving.

### 5. Promote via the Flode path

Functions ready for Flode follow the seven-step promotion path defined in `reach-architecture`:

1. Develop in `experimental/` as Tier 1
2. Peer review to Tier 2 standard
3. Open a GitHub issue to the Steward
4. Write full `roxygen2` documentation
5. Achieve 70% coverage via `covr`
6. Pass `lintr` with no errors
7. Run `devtools::check()` clean

The Steward owns merges into Flode. Do not add functions directly.

### Skill loading in practice

You do not need to think about which skills to load for most tasks. Claude Code reads each skill's `description:` field and loads what is relevant. A few patterns worth knowing:

Writing a new function from scratch will auto-load `reach-architecture`, `fastverse-patterns`, and `r-style-guide`. If you mention FEWS, NWP, PDM, LSTM, gauge, or flood forecasting, `hydrology-domain` will also load. If it does not, mention it explicitly: *"using the hydrology-domain skill, write a function to..."*.

Designing a new S7 class will load `r-oop`. If you need to choose between S7, R6, and S3, describe the use case and ask Claude Code to recommend a system.

For performance work, say so explicitly -- `r-performance` loads on mentions of "slow", "profiling", "benchmark", or "optimise". Do not load it pre-emptively; the skill itself says to profile first.

---

## Installation

**Note: the `.claude` directory is a dotfolder and will not appear in Finder or Windows Explorer drag-and-drop. Use git on the command line.**

```bash
git clone https://github.com/JonPayneEA/flode_code_styles.git
cd /path/to/your/project

# Copy configuration into your project
cp -r /path/to/flode_code_styles/.claude .
cp -r /path/to/flode_code_styles/rules .
cp -r /path/to/flode_code_styles/commands .
cp -r /path/to/flode_code_styles/agents .

# Stage and commit -- git handles dotfiles without issue
git add .claude rules commands agents
git commit -m "Add Claude Code R skills configuration"
git push
```

Verify `.claude` is present before committing:

```bash
ls -la | grep claude
# Should show: drwxr-xr-x  .claude
```

### Option 2: Global config

To make skills and rules available across all your projects:

```bash
cp -r .claude/skills/* ~/.claude/skills/
cp -r rules/* ~/.claude/rules/
cp -r commands/* ~/.claude/commands/
cp -r agents/* ~/.claude/agents/
```

Global config does not include the hooks or `settings.json`, which are project-scoped.

---

## References

- Governance framework: https://jonpayneea.github.io/Governance
- *R Tool Governance v1.3* -- authoritative source for team standards
- data.table: https://rdatatable.gitlab.io/data.table/
- collapse: https://fastverse.github.io/collapse/
- S7: https://rconsortium.github.io/S7/
- arrow (R): https://arrow.apache.org/docs/r/
- future.apply: https://future.apply.futureverse.org/
- logger: https://daroczig.github.io/logger/

---

## Acknowledgements

Structure and hooks adapted from [ab604/claude-code-r-skills](https://github.com/ab604/claude-code-r-skills), which itself builds on work by Sarah Johnson, Jeremy Allen, and Affaan Mustafa.
