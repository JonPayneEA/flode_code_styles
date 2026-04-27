---
name: r-style-guide
description: R code style, naming conventions, and formatting standards for the Environment Agency Flood Forecasting and Warning team. Covers the mandatory header block, snake_case naming, data.table object suffixes, Flode class naming, file naming, line length, spacing, and function design principles. Load when writing, reviewing, or formatting any R code. Triggers on mentions of style, naming, formatting, lintr, or styler.
---

# R Style Guide

Style consistency reduces cognitive load during code review and makes automated linting reliable. These standards derive from the EA R Tool Governance framework. Where this guide conflicts with the tidyverse style guide, this guide takes precedence.

---

## 1. Mandatory header block (first priority)

Every script and function file opens with this block, completed in full. This is a governance requirement, not a style preference.

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

If creating or editing a file that lacks this block, add it before writing any other code.

---

## 2. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Functions | `snake_case` verbs | `calc_flood_peak()`, `load_gauge_dt()`, `fit_pdm()` |
| data.table objects | `_dt` suffix | `flow_dt`, `ensemble_dt`, `meta_dt`, `event_dt` |
| S7 / Flode classes | `UpperCamelCase` with `Flode` prefix | `FlodeCatchment`, `FlodeForecast`, `FlodeEnsemble` |
| Variables | `snake_case` nouns | `catchment_area_km2`, `peak_flow_cms`, `water_year` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_THRESHOLD_M3S`, `TIMESTEP_MINUTES` |
| Script files | Date-prefixed, descriptive | `2026-02_flow_ensemble_aggregation.R` |
| Test files | `test-` prefix, mirrors source | `test-calc_flood_peak.R` |
| Boolean variables | `is_` or `has_` prefix | `is_complete`, `has_gaps`, `is_operational` |

**Units in variable names.** Where ambiguity exists, embed the unit:

```r
# Correct
flow_cms        <- 125.3
area_km2        <- 9948.0
rainfall_mm     <- 12.5
lead_hours      <- 48L
timestep_min    <- 15L

# Wrong
flow            <- 125.3   # m³/s? cumecs? cfs?
area            <- 9948.0
```

---

## 3. Assignment and spacing

Use `<-` for assignment. Never use `=` at the top level.

```r
# Correct
flow_dt <- fread(here("data", "gauges.csv"))

# Wrong
flow_dt = fread(here("data", "gauges.csv"))
```

One space around operators. One space after commas. No space before a comma.

```r
# Correct
x <- 1 + 2
flow_dt[, .(mean_q = fmean(flow_cms)), by = station_id]

# Wrong
x<-1+2
flow_dt[,.(mean_q=fmean(flow_cms)),by=station_id]
```

No space between a function name and its opening parenthesis. Space inside `[` and `[[` is optional but must be consistent within a file.

---

## 4. Line length and breaking

Maximum line length: 100 characters. Break long expressions at natural join points (after commas, after operators, after pipes).

```r
# Correct: break data.table operations vertically for readability
result_dt <- flow_dt[
  quality_code == 1 & !is.na(flow_cms),
  .(
    mean_q  = fmean(flow_cms),
    peak_q  = fmax(flow_cms),
    q_90    = fnth(flow_cms, 0.9)
  ),
  by = .(station_id, water_year)
]

# Correct: break function arguments
fit_pdm(
  rainfall_mm  = rainfall_dt$value,
  pet_mm       = pet_dt$value,
  params       = params_dt[station_id == "4206TH"],
  timestep_min = 15L,
  warmup_steps = 2880L
)
```

---

## 5. Function design

### One function, one responsibility

Functions must do one thing. If a function reads data, cleans it, fits a model, and writes output, it should be split into four functions.

### Explicit return

Use explicit `return()` only when returning early. The last evaluated expression is the return value. Both conventions are acceptable; be consistent within a file.

```r
# Early return on validation failure
calc_qmed <- function(catchment) {
  if (catchment@area_km2 <= 0) {
    return(NA_real_)
  }
  exp(5.263 * log(catchment@area_km2))
}
```

### Argument ordering convention

1. Primary data input (the data.table or object being operated on)
2. Key parameters that define the operation
3. Optional arguments with defaults

```r
calc_flow_stats <- function(
  flow_dt,           # primary data
  by_cols,           # key parameter
  quantiles = c(0.1, 0.5, 0.9),  # optional with default
  na_rm     = TRUE
) { ... }
```

### Validate inputs at the top of Tier 3 functions

```r
calc_flood_peak <- function(flow_dt, station_id, water_year) {
  stopifnot(
    is.data.table(flow_dt),
    "flow_cms" %in% names(flow_dt),
    is.character(station_id),
    is.integer(water_year)
  )
  # ... body
}
```

---

## 6. Comments

Comment the *why*, not the *what*. Code should explain what it does; comments explain why a decision was made.

```r
# Wrong: restates the code
flow_dt[, flow_log := log(flow_cms)]  # take log of flow

# Correct: explains a non-obvious choice
# Log-transform to stabilise variance before ARMA fitting;
# PDM residuals are right-skewed at high flows
flow_dt[, flow_log := log(flow_cms)]
```

Use a blank line before a comment that introduces a new logical section.

---

## 7. Script structure

Scripts follow this order:

```r
# 1. Header block (mandatory)

# 2. Library calls (alphabetical within ecosystem groups)
library(arrow)
library(collapse)
library(data.table)
library(here)
library(terra)

# 3. Source any local functions
source(here("shared-functions", "hydro_utils.R"))

# 4. Configuration / constants
TIMESTEP_MIN     <- 15L
ARCHIVE_PATH     <- here("archive", "flow")

# 5. Main script body
```

Scripts must not exceed 300 lines. If a script exceeds this, refactor into functions and source them.

---

## 8. Error handling

Tier 3 functions must handle errors explicitly. Silent failure in an operational pipeline is worse than a loud one.

```r
# tryCatch for recoverable errors -- return NA or a sentinel, log the failure
load_gauge_safe <- function(station_id, archive_path) {
  tryCatch(
    {
      read_parquet(file.path(archive_path, station_id, "flow.parquet")) |>
        as.data.table()
    },
    error = function(e) {
      warning("Failed to load gauge ", station_id, ": ", conditionMessage(e))
      NULL
    }
  )
}

# withCallingHandlers for logging warnings without stopping execution
fit_pdm_logged <- function(...) {
  withCallingHandlers(
    fit_pdm(...),
    warning = function(w) {
      log_warn("PDM fitting warning: {conditionMessage(w)}")
      invokeRestart("muffleWarning")
    }
  )
}
```

Never use `try()` in Tier 3 code. It returns the error object silently; `tryCatch` is explicit about intent.

---

## 9. Logging

Use `logger` for structured logging in operational tools. It produces machine-readable output suitable for log aggregation.

```r
library(logger)

# Set log level for the script (INFO for operational runs; DEBUG for diagnostics)
log_threshold(INFO)

# Structured log messages -- use glue-style interpolation
log_info("Processing station {station_id}: {nrow(flow_dt)} records")
log_warn("Gap detected in station {station_id}: {gap_n} missing steps")
log_error("Failed to load NWP grid: {nc_path}")

# Redirect log output to a file for operational pipelines
log_appender(appender_file(here("logs", paste0(Sys.Date(), "_pipeline.log"))))
```

Do not use `message()`, `cat()`, or `print()` for operational logging. They produce unstructured output with no severity level and cannot be redirected or filtered.

---

## 10. Configuration loading

Hard-coded constants are a Tier 3 violation. Separate configuration from code using a YAML config file.

```r
library(yaml)
library(here)

# config/pipeline.yml
# ---
# archive_path: data/archive
# timestep_min: 15
# threshold_cms: 50.0
# stations:
#   - "4206TH"
#   - "4202TH"

# Load at script start, after the header block and library calls
cfg <- yaml::read_yaml(here("config", "pipeline.yml"))

# Access with explicit types -- do not trust YAML type inference for numerics
archive_path  <- cfg$archive_path
timestep_min  <- as.integer(cfg$timestep_min)
threshold_cms <- as.double(cfg$threshold_cms)
station_ids   <- as.character(cfg$stations)
```

One config file per pipeline. Keep defaults in the file; override via environment variables for deployment differences (test vs production archive paths).

---

## 11. Automated tools

| Tool | Purpose | When |
|---|---|---|
| `lintr` | Static analysis; catches style violations and common errors | Before every Tier 3 commit; advisory for Tier 2 |
| `styler` | Auto-reformatting to consistent style | Run on new files; advisory, not mandatory |
| `renv::status()` | Lockfile consistency check | Before merge on Tier 3 and Tier 2 |

Configure `lintr` to enforce line length and assignment operator:

```r
# .lintr file at repository root
linters: linters_with_defaults(
  line_length_linter(100),
  assignment_linter()
)
```
