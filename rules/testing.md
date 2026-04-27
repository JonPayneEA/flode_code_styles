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
