# Flode code style, explained

This is the plain-language version of the team's R standards. It is written for anyone new to the team, or new to writing R that other people depend on. The full rules live in [`rules/`](../rules) and the skills in [`.claude/skills/`](../.claude/skills); where this guide and those files disagree, those files win.

Every rule here exists for one of three reasons: forecasts must be right, they must arrive on time, and someone other than you must be able to fix your code at 3am during a flood. Keep those in mind and most of the rules stop looking arbitrary.

---

## The five-minute version

If you read nothing else, read this.

1. **Every `.R` file starts with a header block.** No exceptions.
2. **Use `data.table`, not the tidyverse.** No `dplyr`, `purrr`, `readr` or `tibble` in anything operational.
3. **Times are UTC. Flows are m³/s.** Put the unit in the variable name: `flow_cms`, not `flow`.
4. **Save tables as Parquet.** Never `write.csv()`, never `.RData`.
5. **Name things in `snake_case`.** Classes are the exception: `FlodeSomething`.
6. **Assign with `<-`.** Keep lines under 100 characters.
7. **Write the test first** for anything operational.
8. **No hard-coded paths or settings.** Use `here::here()` and a YAML config file.

The rest of this guide explains each of these, with examples.

---

## 1. Tiers: how serious is your code?

Almost every rule depends on the tier of the code you are writing. Decide the tier before you write anything.

| Tier | Name | What it means | What you must do |
|---|---|---|---|
| 1 | Experimental | Exploring an idea. Nobody relies on it. | Header block. Comments where helpful. |
| 2 | Analytical | Used for analysis others will read or act on. | Header block. Document key functions. Tests recommended. |
| 3 | Operational | Feeds live forecasts or warnings. | Header block. Full documentation. 70% test coverage. Clean `lintr`. `renv`. |

Code moves up the tiers; it does not start at the top. A function begins as Tier 1, gets reviewed into Tier 2, and earns Tier 3 once it is documented, tested and linted.

If you are unsure, ask yourself: *if this breaks overnight, does a forecast go wrong?* If yes, it is Tier 3.

---

## 2. The header block

Every `.R` file opens with this block. It tells the next reader what the file does, who owns it and how much they can trust it, before they read a line of code.

```r
# ============================================================ #
# Tool:         calc_flood_peak
# Description:  Estimates the annual peak flow for a gauged catchment.
# Flode Module: reach.hydro
# Author:       Jane Smith, jane.smith@environment-agency.gov.uk
# Created:      2026-10-01
# Modified:     2026-10-01 - JS: initial version
# Tier:         2
# Inputs:       flow_dt (data.table: datetime POSIXct UTC, flow_cms numeric)
# Outputs:      data.table of water_year and peak_flow_cms
# Dependencies: data.table, collapse
# ============================================================ #
```

What each field is for:

- **Description** is one sentence. If you need two, the file probably does too much.
- **Flode Module** is the `reach.*` package this belongs in, or `standalone`.
- **Modified** changes every time you make a meaningful edit. Date, initials, what changed.
- **Tier** decides which other rules apply to the file.
- **Inputs and Outputs** say the format *and the units*.
- **Dependencies** lists every package that is not base R. If one is not part of the fastverse, say why.

Leave no `[placeholder]` text behind. At Tier 2 and 3, a missing header blocks your merge.

---

## 3. Naming things

Good names remove the need for most comments.

| What | Style | Example |
|---|---|---|
| Functions | `snake_case`, starting with a verb | `calc_flood_peak()`, `load_gauge_dt()` |
| Variables | `snake_case` nouns | `catchment_area_km2`, `water_year` |
| data.tables | end in `_dt` | `flow_dt`, `ensemble_dt` |
| True/false values | start with `is_` or `has_` | `is_complete`, `has_gaps` |
| Constants | `UPPER_SNAKE_CASE` | `TIMESTEP_MINUTES` |
| Classes | `UpperCamelCase` with a `Flode` prefix | `FlodeCatchment`, `FlodeForecast` |
| Test files | `test-` plus the source file name | `test-calc_flood_peak.R` |

**Put the unit in the name** whenever there could be doubt:

```r
# Good: nobody has to guess
flow_cms     <- 125.3
area_km2     <- 9948.0
timestep_min <- 15L

# Bad: m³/s? Ml/d? cfs?
flow <- 125.3
```

A wrong unit does not throw an error. It produces a plausible, wrong forecast. The name is your cheapest defence.

---

## 4. Layout and formatting

These rules are about making everyone's code look the same, so reviewers read the logic rather than the layout.

- **Assign with `<-`**, never `=`.
- **One space around operators and after commas.** `x <- a + b`, not `x<-a+b`.
- **Lines under 100 characters.** Break long calls after a comma, one argument per line.
- **No space between a function and its bracket.** `mean(x)`, not `mean (x)`.

Long data.table operations read best broken vertically:

```r
peaks_dt <- flow_dt[
  quality_code == 1 & !is.na(flow_cms),
  .(peak_flow_cms = fmax(flow_cms)),
  by = water_year
]
```

You do not have to police this by hand. `styler::style_file()` reformats a file for you, and `lintr::lint_package()` lists anything it disagrees with.

---

## 5. data.table, not the tidyverse

This is the rule newcomers notice first. The team uses the *fastverse*: `data.table` for tables, `collapse` for statistics, `arrow` for files.

**Why:** `data.table` is fast on large gauge records and ensembles, it changes data in place instead of copying it, and it has very few dependencies. Fewer dependencies means fewer things that can break when a package updates the night before a flood.

**The banned list**, for Tier 3 code and every `reach.*` package: `dplyr`, `tidyr`, `purrr`, `readr`, `tibble`, `stringr`, `forcats` and `lubridate`.

**The common translations:**

| You might write | Write this instead |
|---|---|
| `filter(df, x > 5)` | `dt[x > 5]` |
| `mutate(df, y = x * 2)` | `dt[, y := x * 2]` |
| `summarise(group_by(df, g), m = mean(x))` | `dt[, .(m = fmean(x)), by = g]` |
| `left_join(a, b, by = "id")` | `b[a, on = "id"]` |
| `read_csv("f.csv")` | `fread("f.csv")` |
| `map(xs, f)` | `lapply(xs, f)` |
| `pivot_longer()` / `pivot_wider()` | `melt()` / `dcast()` |

One thing catches people out: **`:=` changes the original table**, not a copy. If you need the original intact, take a copy first with `copy(dt)`.

**Where the tidyverse is allowed:** Tier 1 exploration, vignettes written for outside readers, and one-off scripts that will never be promoted. `ggplot2` is allowed in `reach.viz` and Tier 2 work. When reading Parquet with `arrow`, you may use `dplyr::filter()` and `select()` before `collect()`; that is `arrow`'s query language, not data manipulation.

The [`fastverse-patterns`](../.claude/skills/fastverse-patterns/SKILL.md) skill has the full set of patterns.

---

## 6. Saving and loading files

| Data | Format | How |
|---|---|---|
| Large tables and time series | Parquet | `arrow::write_parquet()` |
| Small tables to share | CSV | `data.table::fwrite()` |
| R objects, such as model fits | RDS | `saveRDS()` and `readRDS()` |
| Gridded data | netCDF | `terra` |

**Never use:** `write.csv()`, `read.csv()`, `save()`, `load()`, or `.RData` files.

An `.RData` file is a suitcase packed by someone else: you only find out what is in it once it is open on your desk, and by then it has quietly overwritten your own objects. `saveRDS()` stores one object, under the name you choose when you read it back.

Paths are never typed out in full. `C:/Users/jane/data` works on exactly one machine. Use `here::here("data", "flow.parquet")`, which works from the project root on any machine.

---

## 7. Time and units

**All times are UTC.** Operational systems run in UTC, and local time must never enter a pipeline. The clocks change twice a year; your pipeline should not notice.

```r
# Good
issued <- as.POSIXct("2026-10-01 06:00:00", tz = "UTC")

# Bad: silently uses whatever time zone the machine is set to
issued <- as.POSIXct("2026-10-01 06:00:00")
```

If data arrives in local time, convert it to UTC the moment you read it in, and keep it in UTC from then on.

**Flow is m³/s** (`flow_cms`). Level is in metres above ordnance datum. Rainfall is in millimetres (`rainfall_mm`).

---

## 8. Writing functions

- **One function, one job.** A function that reads, cleans, models and writes is four functions.
- **Arguments in a standard order:** the data first, then the parameters that define the job, then optional settings with defaults.
- **Check inputs at the top** of Tier 3 functions, so bad data fails loudly and early.
- **Handle errors deliberately.** Use `tryCatch()`, never `try()`. A silent failure in a pipeline is worse than a loud one.
- **Scripts stay under 300 lines.** Past that, split them into functions.

```r
calc_flood_peak <- function(flow_dt) {
  stopifnot(
    is.data.table(flow_dt),
    all(c("water_year", "flow_cms") %in% names(flow_dt))
  )
  flow_dt[, .(peak_flow_cms = fmax(flow_cms)), by = water_year]
}
```

**Comments explain why, not what.** The code already says what it does.

```r
# Bad: repeats the code
flow_dt[, flow_log := log(flow_cms)]  # take the log of flow

# Good: explains a decision a reader could not guess
# Log-transform to stabilise variance before ARMA fitting;
# residuals are right-skewed at high flows.
flow_dt[, flow_log := log(flow_cms)]
```

---

## 9. Classes

You will not need classes often. When you do, pick the system by what the class is for:

| Use | When |
|---|---|
| **S7** | The default for any new class. Typed properties, validated on creation. |
| **R6** | Objects that hold changing state over their life, such as a connection or a cache. |
| **S3** | Small methods like `print()` and `summary()`, or building on another package's S3 class, such as subclassing a data.table, which S7 cannot do. |
| **S4** | Only to work with `terra` or `sf` spatial classes. |

New classes take the `Flode` prefix: `FlodeCatchment`, not `Catchment`. Read properties with `@`, as in `catchment@area_km2`.

---

## 10. Settings and logging

**No hard-coded settings.** Gauge lists, thresholds and paths go in a YAML config file, not in the code. Inside reach packages, `reach.utils::load_config()` reads it, and `reach.utils::run_pipeline()` can run a whole sequence of steps from one file.

```yaml
# config/pipeline.yml
archive_path: data/archive
timestep_min: 15
threshold_cms: 50.0
```

**Log, do not print.** `print()`, `cat()` and `message()` leave no record of severity and cannot be sent to a file. Use the `logger` package, or the `log_info()`, `log_warn()` and `log_error()` helpers in reach.utils.

---

## 11. Testing

For Tier 3, **write the test before the code.** Writing the test first forces you to decide what the function should do before you decide how it does it. Tests written afterwards tend to check what the code happens to do.

The cycle has three steps:

1. **Red.** Write a test that fails, because the function does not exist yet.
2. **Green.** Write the least code that makes it pass.
3. **Refactor.** Tidy the code. The test tells you if you broke it.

The rules:

- Tests live in `tests/testthat/`, named after the file they test.
- One `test_that()` block per behaviour.
- Test the awkward cases, not just the happy path: empty input, `NA` values, out-of-range numbers, wrong types.
- Test data lives inside the test file or in `tests/testthat/helper-*.R`. No tests that need a file on someone's drive.
- **Tier 3 needs at least 70% line coverage.** Treat that as a floor, not a target.

---

## 12. Before you open a pull request

Run these from the package root:

```r
devtools::document()        # rebuild the documentation
devtools::test()            # run the tests
covr::package_coverage()    # check coverage (Tier 3: at least 70%)
lintr::lint_package()       # check style (Tier 3: no lints)
devtools::check()           # the full package check
```

Then check by eye:

- [ ] Every `.R` file has a complete header block, with `Modified` updated.
- [ ] No tidyverse in Tier 3 code.
- [ ] No `write.csv()`, `.RData` or hard-coded paths.
- [ ] Every time is UTC and every unit is in a name.
- [ ] New classes are S7 with a `Flode` prefix.

**CI runs the same checks for you.** Every reach package runs the shared workflow in this repository on each pull request. R CMD check always has to pass. At Tier 3, coverage below 70% or any lint also fails the build; below Tier 3 they are reported but do not block. Passing locally first saves a round trip.

---

## Where to go next

| For | Read |
|---|---|
| The enforced rules | [`rules/`](../rules) |
| Full style detail | [`r-style-guide`](../.claude/skills/r-style-guide/SKILL.md) |
| data.table patterns | [`fastverse-patterns`](../.claude/skills/fastverse-patterns/SKILL.md) |
| Headers, tiers and the Flode modules | [`reach-architecture`](../.claude/skills/reach-architecture/SKILL.md) |
| Classes | [`r-oop`](../.claude/skills/r-oop/SKILL.md) |
| Testing | [`tdd-workflow`](../.claude/skills/tdd-workflow/SKILL.md) |
| Hydrological conventions | [`hydrology-domain`](../.claude/skills/hydrology-domain/SKILL.md) |
| The governance framework | <https://jonpayneea.github.io/Governance> |
