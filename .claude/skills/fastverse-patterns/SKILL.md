---
name: fastverse-patterns
description: Core data manipulation patterns for the fastverse ecosystem (data.table, collapse, arrow). Replaces tidyverse entirely for Tier 3 operational tools and Flode package functions. Use when writing any tabular data manipulation, aggregation, joining, iteration, or file I/O in R. Covers DT[i,j,by] idiom, reference semantics, rolling joins, collapse statistical functions, and Parquet I/O. Trigger on any mention of data wrangling, aggregation, joins, or file reading/writing.
---

# Fastverse Patterns

The team's production ecosystem is the **fastverse**: `data.table` as the primary data manipulation engine, `collapse` as the statistical and transformation toolkit, and `arrow` for Parquet I/O. The tidyverse must not appear in Tier 3 operational tools or Flode package functions. It is acceptable only in Tier 1 exploratory work.

---

## 1. The core data.table idiom: DT[i, j, by]

Every data.table operation fits the triple `DT[i, j, by]`. Internalise this before writing any manipulation code.

```r
# i: filter rows (like WHERE)
flow_dt[quality_code == 1]
flow_dt[!is.na(flow_cms)]
flow_dt[datetime >= as.POSIXct("2024-10-01", tz = "UTC")]

# j: compute columns (like SELECT) -- always use .() to return a data.table
flow_dt[, .(station_id, flow_cms)]
flow_dt[, .(mean_q = fmean(flow_cms))]

# by: grouping (like GROUP BY)
flow_dt[, .(mean_q = fmean(flow_cms)), by = station_id]
flow_dt[, .(mean_q = fmean(flow_cms)), by = .(station_id, water_year)]

# Combined
flow_dt[
  quality_code == 1,
  .(mean_q = fmean(flow_cms), peak_q = max(flow_cms)),
  by = .(station_id, water_year)
]
```

### Chaining

Chain operations with `[][]`, not by piping into dplyr verbs.

```r
# Correct
flow_dt[quality_code == 1][order(datetime)][, head(.SD, 100)]

# Wrong
flow_dt |> filter(quality_code == 1) |> arrange(datetime)  # dplyr -- banned in Tier 3
```

---

## 2. Update by reference with :=

`:=` modifies the data.table in place. No copy is made. This is the correct way to add or update columns.

```r
# Add a column
flow_dt[, flow_log := log(flow_cms)]

# Conditional update
flow_dt[is.na(flow_cms), flow_log := NA_real_]

# Multiple columns at once
flow_dt[, `:=`(
  flow_log   = log(flow_cms),
  flow_scaled = (flow_cms - fmean(flow_cms)) / fsd(flow_cms)
)]

# Remove a column
flow_dt[, redundant_col := NULL]
```

### Reference semantics and copy()

Data.table modifies in place. Passing a data.table to a function modifies the original unless you copy it explicitly.

```r
# Safe: use copy() when the function must not alter the caller's data
process_flow <- function(dt) {
  dt <- copy(dt)
  dt[, flow_log := log(flow_cms)]
  dt
}

# Unsafe: this modifies the original flow_dt
bad_process <- function(dt) {
  dt[, flow_log := log(flow_cms)]
  dt
}
```

---

## 3. Joins

Data.table join syntax is `y[x, on = .(key)]`, which returns all rows of `x`.

```r
# Left join: all rows of flow_dt, matched meta where available
gauge_dt <- meta_dt[flow_dt, on = .(station_id)]

# Inner join: only matched rows
gauge_dt <- meta_dt[flow_dt, on = .(station_id), nomatch = NULL]

# Multi-key join
gauge_dt <- meta_dt[flow_dt, on = .(station_id, water_year)]

# Rolling join: align forecast timestamps to nearest observation
# roll = TRUE rolls forward; roll = "nearest" takes the closest
aligned_dt <- obs_dt[forecast_dt, on = .(station_id, datetime), roll = "nearest"]

# Non-equi join: flag records within an event window
event_dt[gauge_dt, on = .(station_id, start <= datetime, end >= datetime), nomatch = NULL]
```

---

## 4. collapse as the statistical toolkit

`collapse` provides fast, group-aware statistical functions. Use it for aggregation and transformation instead of base R equivalents.

```r
library(collapse)

# Fast grouped statistics in j
flow_dt[, .(
  q_mean  = fmean(flow_cms),
  q_med   = fmedian(flow_cms),
  q_90    = fnth(flow_cms, 0.9),
  q_sd    = fsd(flow_cms),
  q_max   = fmax(flow_cms)
), by = .(station_id, water_year)]

# fwithin: grouped demeaning (returns deviations from group mean)
flow_dt[, flow_anom := fwithin(flow_cms), by = station_id]

# Or equivalently, using grouped subtraction directly in data.table
flow_dt[, flow_anom := flow_cms - fmean(flow_cms), by = station_id]

# GRP: pre-compute group structure for repeated operations on the same key
grp <- GRP(flow_dt, by = "station_id")
fmean(flow_dt$flow_cms,  g = grp)
fsd(flow_dt$flow_cms,    g = grp)
fnth(flow_dt$flow_cms,   0.9, g = grp)

# flag() for lags and leads (collapse-native, avoids data.table::shift where collapse already loaded)
flow_dt[, flow_lag1 := flag(flow_cms, 1), by = station_id]
```

---

## 5. File I/O

One function per format. No exceptions in Tier 3.

```r
library(data.table)
library(arrow)
library(here)

# CSV -- fread / fwrite only
flow_dt <- fread(here("data", "gauges.csv"))
fwrite(flow_dt, here("outputs", "gauges_processed.csv"))

# Parquet -- preferred for all large tabular outputs
flow_dt <- read_parquet(here("data", "flow.parquet"))
write_parquet(flow_dt, here("outputs", "flow.parquet"))

# Partitioned Parquet -- for time series archives
write_dataset(
  flow_dt,
  here("archive", "flow"),
  partitioning = c("water_year", "station_id"),
  format = "parquet"
)

# Gridded / netCDF
r <- terra::rast(here("data", "rainfall.nc"))

# R objects (intermediate only)
saveRDS(model_obj, here("models", "pdm_fitted.rds"))
model_obj <- readRDS(here("models", "pdm_fitted.rds"))
```

### Banned I/O functions

```r
read.csv(...)        # use fread()
write.csv(...)       # use fwrite()
read_csv(...)        # readr -- banned in Tier 3
write_csv(...)       # readr -- banned in Tier 3
load("file.RData")   # banned -- use readRDS()
save(...)            # banned -- use saveRDS()
```

---

## 6. Iteration without purrr

`purrr::map` is banned in Tier 3 and Flode. Use data.table `by`, `vapply`, or list columns.

```r
# Preferred: grouped operation in data.table
flow_dt[, .(peak = max(flow_cms)), by = station_id]

# Where you need per-group model fitting: list column pattern
model_dt <- flow_dt[, .(data = list(.SD)), by = station_id]
model_dt[, model := lapply(data, fit_pdm)]
model_dt[, rmse  := vapply(
  seq_len(.N),
  function(i) calc_rmse(model[[i]], data[[i]]),
  numeric(1)
)]

# Scalar results across a vector: vapply, not sapply or map
station_ids  <- unique(flow_dt$station_id)
peak_flows   <- vapply(station_ids, function(id) {
  max(flow_dt[station_id == id, flow_cms], na.rm = TRUE)
}, numeric(1))
```

---

## 7. Time series operations

```r
# Lag and lead
flow_dt[, flow_lag1  := shift(flow_cms, 1L, type = "lag")]
flow_dt[, flow_lead1 := shift(flow_cms, 1L, type = "lead")]

# Rolling mean -- data.table built-in; no external dependency needed
# 7-day window at 15-minute resolution = 672 steps; align = "right" is causal
flow_dt[, flow_roll7d  := frollmean(flow_cms, n = 672L, align = "right", na.rm = TRUE)]
flow_dt[, flow_rollsum := frollsum(flow_cms,  n = 96L,  align = "right", na.rm = TRUE)]  # 24h sum

# Rolling by group -- frollmean respects the by argument inside DT[i, j, by]
flow_dt[, flow_roll7d := frollmean(flow_cms, n = 672L, align = "right"), by = station_id]

# Water year (UK convention: starts 1 October)
flow_dt[, water_year := fifelse(
  month(datetime) >= 10L,
  year(datetime) + 1L,
  year(datetime)
)]

# Range filtering with %between% (inclusive on both ends)
flow_dt[flow_cms %between% c(50, 200)]                      # threshold band
flow_dt[lead_hours %between% c(6, 48)]                      # NWP lead time slice

# Completeness check for regular 15-minute series
expected_n <- as.integer(
  difftime(max(flow_dt$datetime), min(flow_dt$datetime), units = "mins")
) %/% 15L + 1L
actual_n   <- nrow(flow_dt)
gaps_exist <- actual_n < expected_n
```

---

## 8. Reshaping: melt and dcast

`melt` and `dcast` are data.table's wide-to-long and long-to-wide operations. They replace `pivot_longer` and `pivot_wider`.

```r
# Wide to long: one row per station/datetime/parameter
# Before: columns flow_cms, level_maod, rainfall_mm per row
wide_dt[, .(station_id, datetime, flow_cms, level_maod, rainfall_mm)]

# melt: gather value columns into parameter/value pairs
long_dt <- melt(
  wide_dt,
  id.vars       = c("station_id", "datetime"),
  measure.vars  = c("flow_cms", "level_maod", "rainfall_mm"),
  variable.name = "parameter",
  value.name    = "value"
)

# Long to wide: one column per station
# Before: long_dt with station_id, datetime, value columns
wide_dt <- dcast(
  long_dt,
  datetime ~ station_id,     # rows ~ columns
  value.var = "value",
  fun.aggregate = fmean      # if multiple values per cell
)

# Multiple value columns at once
dcast(ensemble_dt, valid_dt + station_id ~ member, value.var = "value")
```

---

## 9. Set operations

Data.table provides set operations that replace `dplyr::intersect()` etc. Useful for managing station lists and comparing datasets.

```r
# Stations present in both observation and forecast datasets
common_stations <- fintersect(
  obs_dt[, .(station_id)],
  forecast_dt[, .(station_id)]
)

# Stations in observations but not in forecast
missing_from_forecast <- fsetdiff(
  obs_dt[, .(station_id)],
  forecast_dt[, .(station_id)]
)

# All stations across both datasets (deduplicated)
all_stations <- funion(
  obs_dt[, .(station_id)],
  forecast_dt[, .(station_id)]
)
```

---

## 10. Anti-patterns at a glance

| Banned | Replacement |
|---|---|
| `library(dplyr)` in Tier 3/Flode | `library(data.table)` |
| `filter()`, `mutate()`, `summarise()` | `DT[i, j, by]` |
| `group_by() |> ungroup()` | `by =` in `DT[...]` |
| `map()`, `map_dbl()`, `map_dfr()` | `vapply()`, `DT[, f(), by]`, list columns |
| `read_csv()`, `write_csv()` | `fread()`, `fwrite()` |
| `read.csv()`, `write.csv()` | `fread()`, `fwrite()` |
| `sapply()` | `vapply()` |
| `mean()`, `sd()` in grouped context | `fmean()`, `fsd()` from collapse |
| `left_join(x, y, by = ...)` | `y[x, on = .(key)]` |
| `bind_rows()` | `rbindlist(list(dt1, dt2))` |
| `pivot_longer()`, `pivot_wider()` | `melt()`, `dcast()` |
| `select()` | `DT[, .(col1, col2)]` |
| `arrange()` | `DT[order(col)]` |
| `distinct()` | `unique(DT, by = "col")` |
| `n_distinct()` | `uniqueN(col)` |
| `between(x, l, r)` from dplyr | `x %between% c(l, r)` |
| `intersect()`, `setdiff()`, `union()` | `fintersect()`, `fsetdiff()`, `funion()` |
| `library(roll)` for rolling stats | `frollmean()`, `frollsum()` from data.table |

---

## References

- data.table wiki: https://rdatatable.gitlab.io/data.table/
- collapse docs: https://fastverse.github.io/collapse/
- fastverse docs: https://fastverse.github.io/fastverse/
- arrow R docs: https://arrow.apache.org/docs/r/
