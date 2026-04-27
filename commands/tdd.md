# /tdd

Run a test-driven development workflow for a new R function or module.

## Instructions

When the user invokes `/tdd`, follow this strict sequence. Do not skip steps or reorder them.

### Step 1: Define the behaviour

Ask the user what the function must do. Capture:
- Function name (must be a `snake_case` verb)
- Inputs: names, types, units
- Expected output: type, structure, units
- At least three edge cases

Do not proceed until these are confirmed.

### Step 2: Write the tests first (RED)

Create the test file at `tests/testthat/test-[function_name].R`.

Write `test_that()` blocks for:
1. Expected output for a known input (at least one concrete numerical check)
2. Empty input behaviour
3. All-NA input behaviour
4. Out-of-range or invalid parameter
5. Any domain-specific edge cases identified in Step 1

Use embedded fixtures only. No external file dependencies.

Run the tests. Confirm they fail (red). If they pass without implementation, the tests are testing nothing.

### Step 3: Write the minimal implementation (GREEN)

Create or edit the source file. Before any implementation code, add the mandatory header block (complete all fields).

Write the minimum code needed to pass the tests. Do not over-engineer. Do not add features not covered by a test.

Run the tests. Confirm they all pass (green).

### Step 4: Refactor (CLEAN)

With tests green, refactor for:
- Readability: clear variable names, units in names, comments explaining why not what
- Governance compliance: naming conventions, line length, no tidyverse, no hard-coded paths
- Input validation at the top of Tier 3 functions

Run the tests after every refactor step. Tests must remain green.

### Step 5: Check coverage

```r
covr::file_coverage(
  "R/[function_name].R",
  "tests/testthat/test-[function_name].R"
)
```

If coverage is below 70% and this is a Tier 3 function, write additional tests before proceeding. Report the coverage percentage.

### Step 6: Run lintr

```r
lintr::lint("R/[function_name].R")
```

Fix all errors. Flag warnings for review.

### Step 7: Confirm merge readiness

State:
- Test count and pass rate
- Coverage percentage
- lintr status
- Whether the header block is complete

The function is ready for peer review once all Tier 3 checks pass.
