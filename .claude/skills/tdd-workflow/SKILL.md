---
name: tdd-workflow
description: Test-driven development workflow for R using testthat. Covers the red-green-refactor cycle, test structure, fixture design, edge case coverage, snapshot testing, and the 70% coverage requirement for Tier 3 tools. Load when writing tests, practising TDD, or reviewing test coverage. Triggers on mentions of testthat, TDD, unit tests, test coverage, or covr.
---

# TDD Workflow for R

Test-driven development means writing a failing test before writing implementation code. The cycle is: red (failing test), green (minimal code to pass), refactor (clean up without breaking). Repeat.

---

## 1. The red-green-refactor cycle

```r
# Step 1: RED -- write a failing test
# tests/testthat/test-calc_flood_peak.R

test_that("calc_flood_peak returns expected QMED for Thames at Kingston", {
  catchment <- FlodeCatchment(
    gauge_id = "4206TH",
    area_km2 = 9948.0,
    bfi      = 0.47,
    saar_mm  = 706.0
  )
  result <- calc_flood_peak(catchment)
  expect_equal(result, 242.0, tolerance = 1.0)
})

# Run: devtools::test() -- it fails because calc_flood_peak does not exist yet

# Step 2: GREEN -- write the minimal implementation to pass the test
calc_flood_peak <- function(catchment) {
  exp(5.263 * log(catchment@area_km2) - 0.205 * log(catchment@bfi + 0.001))
}

# Run: devtools::test() -- it passes

# Step 3: REFACTOR -- clean up, add validation, improve naming
# Tests still pass
```

---

## 2. Test file structure

```r
# tests/testthat/test-fit_pdm.R

# One test_that() block per behaviour
test_that("fit_pdm returns a named list with required model components", {
  result <- fit_pdm(
    rainfall_mm  = test_rainfall,
    pet_mm       = test_pet,
    params       = default_params,
    timestep_min = 15L,
    warmup_steps = 100L
  )
  expect_type(result, "list")
  expect_named(result, c("params", "qsim_dt", "diagnostics"), ignore.order = TRUE)
})

test_that("fit_pdm errors on mismatched rainfall and PET lengths", {
  expect_error(
    fit_pdm(
      rainfall_mm  = test_rainfall[1:10],
      pet_mm       = test_pet,          # different length
      params       = default_params,
      timestep_min = 15L,
      warmup_steps = 100L
    ),
    regexp = "length"
  )
})

test_that("fit_pdm handles all-NA rainfall without error", {
  expect_no_error(
    fit_pdm(
      rainfall_mm  = rep(NA_real_, 100),
      pet_mm       = test_pet[1:100],
      params       = default_params,
      timestep_min = 15L,
      warmup_steps = 10L
    )
  )
})
```

---

## 3. Fixtures and test data

Tests must not depend on external files. Use embedded fixtures.

```r
# Define fixtures at the top of the test file or in tests/testthat/helper-fixtures.R

# Small embedded time series (50 steps of 15-minute data)
test_rainfall <- c(0, 0, 2.1, 5.3, 8.4, 6.2, 3.1, 1.0, rep(0, 42))
test_pet      <- rep(0.05, 50)

default_params <- list(
  b    = 0.4,
  cmax = 250.0,
  cmin = 10.0,
  kg   = 500.0,
  bg   = 2.0,
  td   = 3.0
)

# For data.table fixtures -- use fixed values, not runif, for deterministic tests
make_flow_dt <- function(n = 100L) {
  # Fixed seed ensures reproducible random-looking values without hard-coding 100 numbers
  set.seed(42L)
  data.table(
    station_id   = "TEST01",
    datetime     = seq(
      as.POSIXct("2024-01-01", tz = "UTC"),
      by = "15 min",
      length.out = n
    ),
    value        = round(runif(n, 1, 50), 3),
    quality_code = 1L
  )
}
```

---

## 4. Edge cases to cover for every function

For every function, write tests for:

- **Happy path:** expected inputs producing expected outputs
- **Empty input:** zero-row data.table, length-0 vector, `NULL`
- **NA values:** `NA` in key columns; all-NA inputs
- **Out-of-range parameters:** negative areas, BFI > 1, zero timestep
- **Type errors:** character where numeric expected
- **Boundary values:** minimum and maximum valid inputs

```r
test_that("calc_kge handles empty input", {
  expect_error(calc_kge(numeric(0), numeric(0)))
})

test_that("calc_kge returns NA when obs contains NA", {
  result <- calc_kge(c(1, 2, NA, 4), c(1, 2, 3, 4))
  expect_true(is.na(result))
})

test_that("calc_kge returns 1 for perfect forecast", {
  obs <- c(10, 20, 30, 40, 50)
  expect_equal(calc_kge(obs, obs), 1.0)
})
```

---

## 5. Snapshot testing

Use snapshots for outputs where the exact structure matters but is too complex to specify inline.

```r
test_that("calc_flow_stats output matches expected structure", {
  result <- calc_flow_stats(make_flow_dt(), by_cols = "station_id")
  expect_snapshot(result)
})
```

Update snapshots deliberately, not automatically:

```r
# Review changes before accepting
testthat::snapshot_review()

# Accept after confirming the change is intentional
testthat::snapshot_accept()
```

---

## 6. Coverage requirements

| Tier | Minimum coverage | Enforcement |
|---|---|---|
| Tier 3 | 70% line coverage | Blocks merge |
| Tier 2 | Tests recommended | Advisory |
| Tier 1 | Inline comments sufficient | None |

Measure coverage locally before submitting for review:

```r
library(covr)

# Package coverage
pkg_cov <- package_coverage()
print(pkg_cov)

# Coverage for a single file
file_coverage("R/calc_flood_peak.R", "tests/testthat/test-calc_flood_peak.R")

# Report as percentage
percent_coverage(pkg_cov)
```

70% is a floor, not a target. If a function is complex and operationally critical, cover it more thoroughly.

---

## 7. Running tests

```r
# Run all tests in the package
devtools::test()

# Run tests for a single file
devtools::test_file("tests/testthat/test-calc_flood_peak.R")

# Run a single test interactively
testthat::test_that("...", { ... })

# Check full package including tests
devtools::check()
```

`lintr` must pass before committing Tier 3 code. Run it alongside tests:

```r
lintr::lint_package()
```

---

## 8. Common mistakes

- **Testing implementation details instead of behaviour.** Test what the function returns, not how it computes it internally.
- **External file dependencies in tests.** All fixtures must be embedded. Tests must pass on any machine after `renv::restore()`.
- **One giant `test_that()` block per function.** One block per behaviour. Smaller blocks produce clearer failure messages.
- **Skipping edge cases because they seem unlikely.** Hydrological data has gaps, NAs, and out-of-range values. Test them.
- **Accepting snapshots without reviewing.** Always inspect `snapshot_review()` output before accepting.
