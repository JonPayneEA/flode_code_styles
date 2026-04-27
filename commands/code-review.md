# /code-review

Review R code against the EA Flood Forecasting and Warning governance standards.

## Instructions

When the user invokes `/code-review` on a file or selection, perform a structured review covering all of the following checks. Report findings by category. Use blocking/advisory labels consistently.

### Blocking issues (must fix before merge for Tier 3)

**Header block**
- [ ] Header block present and complete (no placeholder text remaining)
- [ ] `Tier` field populated with 1, 2, or 3
- [ ] `Modified` field updated if this is an edit to an existing file
- [ ] `Dependencies` field lists all non-base packages

**Ecosystem (Tier 3 and Flode only)**
- [ ] No `library(dplyr)`, `library(purrr)`, `library(readr)`, `library(tibble)`, `library(tidyr)`, `library(lubridate)`
- [ ] No `dplyr::`, `purrr::`, `readr::` qualified calls
- [ ] No `read.csv()`, `write.csv()` -- use `fread()`, `fwrite()`
- [ ] No `save()`, `load()`, `.RData` files -- use `saveRDS()`, `readRDS()`, Parquet
- [ ] No `sapply()` -- use `vapply()` or `data.table` `by`

**Paths**
- [ ] No hard-coded file paths -- use `here::here()`

**Testing (Tier 3)**
- [ ] Test file exists in `tests/testthat/test-[filename].R`
- [ ] Tests cover: expected output, empty input, NA values, out-of-range parameters
- [ ] No external file dependencies in tests

**Reproducibility (Tier 3)**
- [ ] `renv::status()` clean (lockfile matches installed packages)

### Advisory issues (flag, do not block)

**Naming conventions**
- [ ] Functions use `snake_case` verbs
- [ ] data.table objects have `_dt` suffix
- [ ] S7 classes use `Flode` prefix and `UpperCamelCase`
- [ ] Units embedded in variable names where ambiguous

**Style**
- [ ] Assignment uses `<-`, not `=` at top level
- [ ] Line length does not exceed 100 characters
- [ ] Script does not exceed 300 lines (if so, refactor)

**OOP (if applicable)**
- [ ] New exported Flode classes use S7, not S4 or bare S3
- [ ] S7 validators present for Tier 3 and Tier 2 classes
- [ ] R6 used only for stateful lifecycle objects

**Time handling**
- [ ] Datetimes are POSIXct UTC throughout
- [ ] No silent local time assumptions

**Performance**
- [ ] No unnecessary copying of large data.tables (use `:=` not reassignment)
- [ ] Grouped statistics use `collapse` functions (`fmean`, `fsd`) not base equivalents

## Output format

Produce a structured report:

```
## Code review: [filename]

### Blocking issues
[List with file:line references where possible]

### Advisory issues
[List with file:line references where possible]

### Summary
[One paragraph. State whether the file is merge-ready for its tier, and what
the highest-priority fix is if not.]
```

If there are no issues, say so plainly and confirm the file is merge-ready.
