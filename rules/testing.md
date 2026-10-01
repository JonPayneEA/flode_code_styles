# Testing Rule

Automated enforcement of testing standards for all team R tools.

## Coverage requirements

| Tier | Minimum line coverage | Enforcement |
|---|---|---|
| Tier 3 | 70% via `covr` | Blocks merge |
| Tier 2 | Tests recommended | Advisory |
| Tier 1 | Inline comments sufficient | None |

70% is a floor. Operationally critical functions should exceed it. Coverage is measured with `covr::package_coverage()` and must be verified before any Tier 3 merge request.

## Test suite standards

- Use `testthat` (>= 3.0.0) for all test suites.
- Test files live in `tests/testthat/` and mirror source files with a `test-` prefix (e.g. `test-calc_flood_peak.R`).
- One `test_that()` block per behaviour, not per function.
- Every function must have tests for: expected outputs, empty inputs, `NA` values, out-of-range parameters, and known failure modes.
- All test fixtures must be embedded in the test files or in `tests/testthat/helper-*.R`. No external file dependencies in tests.
- Tests must pass in a fresh R session after `renv::restore()` with no manual setup.

## Automated checks

| Tool | Tier 3 | Tier 2 |
|---|---|---|
| `testthat` | Mandatory; blocks merge | Recommended |
| `covr` (70% threshold) | Mandatory; blocks merge | Advisory |
| `lintr` | Mandatory; blocks merge | Advisory |
| `renv::status()` | Mandatory; blocks merge | Mandatory |

## Running checks locally

```r
# Run full test suite
devtools::test()

# Measure coverage
covr::package_coverage()

# Static analysis
lintr::lint_package()

# Verify lockfile
renv::status()
```

Never submit a Tier 3 merge request without passing all four checks locally first.

## Continuous integration

Every reach package runs the shared workflow `.github/workflows/r-package-ci.yaml` in this repository, called from the package's own `.github/workflows/ci.yaml`:

```yaml
jobs:
  ci:
    uses: JonPayneEA/flode_code_styles/.github/workflows/r-package-ci.yaml@main
    with:
      tier: 3
```

`tier` is the package's governance tier. R CMD check blocks at every tier. At Tier 3 the 70% coverage floor and `lintr` also block; below Tier 3 they report to the job summary only. A package without its own `.lintr` is linted with the house config from the `r-style-guide` skill. `renv::status()` is not yet checked in CI, because no package has a lockfile.
