---
name: reach-architecture
description: Flode/reach package architecture, mandatory header blocks, repository tier structure, and naming conventions for the Environment Agency Flood Forecasting and Warning team. Load when creating any new R file, function, or package module, or when reviewing code for governance compliance. Triggers on mentions of reach.io, reach.hydro, reach.ensemble, reach.validate, reach.viz, reach.utils, Flode, Tier 1/2/3, experimental/analytical/operational, or the governance framework.
---

# Reach Architecture and Governance

This skill encodes the structural conventions from *R Tool Governance v1.3*. It covers where code lives, what it must contain, and how it moves from experimental to operational. Read every section before creating a file.

---

## 1. Mandatory header block

Every `.R` script and function file must open with this block, completed in full. No exceptions for Tier 3 or Tier 2. No script is compliant without it.

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

If you create or edit a script and it lacks the header, add it before proceeding. If the tier is 2 or 3 and the header is absent, this blocks merge.

---

## 2. Flode module map

All reusable R code should be developed with eventual inclusion in Flode in mind. Place new functions in the correct module:

| Module | Owns |
|---|---|
| `reach.io` | Reading gauge records, gridded rainfall, NWP outputs; writing standardised forecast files; FEWS PI-XML I/O; EA RTFM API archiving |
| `reach.hydro` | Core hydrological calculations: flow statistics, unit conversions, catchment aggregation, flood frequency (FEH), PDM rainfall-runoff, ARMA error correction |
| `reach.ensemble` | Ensemble processing: member weighting, quantile extraction, probabilistic thresholding, MOGREPS handling |
| `reach.viz` | Standardised ggplot2-compatible chart themes and flood-specific plot functions |
| `reach.validate` | Model validation and skill scoring: NSE, KGE, RMSE, bias metrics, threshold exceedance skill scores, benchmark comparisons |
| `reach.utils` | Date/time helpers, path management, logging, configuration loading, water year utilities |

If a function does not fit cleanly into a module, it belongs in `reach.utils` temporarily. Open a discussion with the Steward before creating a new module.

Module names are provisional; scopes are agreed.

---

## 3. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Functions | `snake_case` verbs | `calc_flood_peak()`, `load_gauge_dt()`, `fit_pdm()` |
| data.table objects | `_dt` suffix | `flow_dt`, `ensemble_dt`, `meta_dt` |
| S7 / Flode classes | `UpperCamelCase` with `Flode` prefix | `FlodeCatchment`, `FlodeForecast`, `FlodeEnsemble` |
| Variables | `snake_case` nouns | `catchment_area_km2`, `peak_flow_cms`, `water_year` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_THRESHOLD_M3S`, `TIMESTEP_MINUTES` |
| Script files | Date-prefixed, descriptive | `2026-02_flow_ensemble_aggregation.R` |
| Test files | `test-` prefix, mirrors source | `test-calc_flood_peak.R` |

Units must be explicit in variable names where ambiguity exists: `flow_cms` not `flow`, `area_km2` not `area`, `rainfall_mm` not `rainfall`.

---

## 4. Repository tier structure

```
flood-forecast-tools/
├── operational/          # Tier 3: production tools; full test coverage required
├── analytical/           # Tier 2: analytical tools; tests recommended
├── experimental/         # Tier 1: exploratory work; inline comments sufficient
├── shared-functions/     # Shared R function library (pre-Flode staging area)
├── tests/
│   └── testthat/         # testthat test suites; mirrors source structure
├── docs/                 # Documentation, runbooks, changelogs
├── renv/                 # renv lockfile
│   └── renv.lock
└── README.md
```

Scripts must not exceed 300 lines. Refactor longer scripts into functions or sub-scripts. Paths must never be hard-coded; use `here::here()`.

---

## 5. Flode promotion path

To promote a function from experimental into Flode:

1. Develop in `experimental/` as Tier 1 with full header block.
2. Peer review to Tier 2 standard: header complete, logic documented, key edge cases handled.
3. Open a GitHub issue to the Flode Steward, describing the function, its module target, and its test status.
4. Write `roxygen2` documentation covering `@param`, `@return`, `@examples`, and `@export`.
5. Achieve 70% line coverage via `covr` (`testthat` tests in `tests/testthat/`).
6. Pass `lintr` with no errors.
7. Steward merges, increments Flode's version, and updates the changelog.

Do not add functions to Flode directly. The promotion path exists to protect production stability.

---

## 6. Documentation requirements by tier

| Tier | Required |
|---|---|
| Tier 3 | Header block; `roxygen2` for all exported functions; `README.md`; user guide or runbook; changelog in Git |
| Tier 2 | Header block; `roxygen2` for key functions; `README.md` |
| Tier 1 | Header block; inline comments sufficient |

---

## 7. Reproducibility

All team R repositories must use `renv`.

```r
renv::init()        # New repository
renv::snapshot()    # Before any commit that adds or updates a package
renv::restore()     # First step for a new team member
```

`renv.lock` must always be committed with dependency changes. `renv::status()` must pass before merge on Tier 3 and Tier 2 repositories. A fresh R session must be able to run the tool after `renv::restore()` with no undeclared dependencies.

---

## 8. Anti-patterns

```r
# Hard-coded paths
data <- fread("C:/Users/jane/data/gauges.csv")   # use here::here()

# Missing header block
calc_flood_peak <- function(q, threshold) { ... } # add header to file first

# Wrong naming
flowData <- fread(...)       # should be flow_dt
FlowCatchment <- new_class() # should be FlodeCatchment
PEAK_Q <- max(flow_cms)      # variable, not constant -- use peak_q

# Script over 300 lines without refactoring into functions

# renv.lock not committed after adding a package

# Promoting to Flode without going through the promotion path
```

---

## References

- Governance framework: `jonpayneea.github.io/Governance`
- *R Tool Governance v1.3* -- authoritative source for all standards
- *Data & Digital Asset Governance Framework v1.4* -- parent framework
