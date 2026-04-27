---
name: r-performance
description: R performance profiling, benchmarking, and optimisation for the fastverse stack. Covers profvis for profiling, bench for micro-benchmarks, data.table and collapse optimisation patterns, memory efficiency, and when not to optimise. Load when investigating slow code, comparing implementations, or optimising a function that has been identified as a bottleneck. Do not load pre-emptively -- profile first.
---

# R Performance

The rule is: profile first, optimise second. Optimising code that is not a bottleneck wastes time and reduces readability. Measure before acting.

---

## 1. Profiling with profvis

```r
library(profvis)

# Profile a block of code
profvis({
  flow_dt <- fread(here("data", "gauges.csv"))
  result  <- flow_dt[
    quality_code == 1,
    .(mean_q = fmean(flow_cms), peak_q = max(flow_cms)),
    by = .(station_id, water_year)
  ]
})
```

Read the flame graph from bottom to top. Wide bars at the top of the stack are the bottlenecks. Ignore thin bars -- they are not worth optimising.

Focus on:
- Functions that appear wide and high in the stack
- Repeated calls that could be vectorised or cached
- Unexpected calls to conversion functions (suggesting unnecessary type coercion)

---

## 2. Benchmarking with bench

Use `bench::mark()` to compare candidate implementations. It measures wall time, allocations, and GC pressure.

```r
library(bench)
library(data.table)
library(collapse)

# Compare aggregation approaches
results <- bench::mark(
  data_table = flow_dt[, .(mean_q = mean(flow_cms)), by = station_id],
  collapse   = flow_dt[, .(mean_q = fmean(flow_cms)), by = station_id],
  check      = TRUE,   # verify outputs are equal
  iterations = 100L
)

print(results[, .(expression, median, mem_alloc, n_gc)])
```

Report median time, not mean. Outliers from GC spikes inflate the mean. `n_gc` shows garbage collection pressure -- high GC counts indicate excessive allocation.

---

## 3. data.table optimisation patterns

### Key optimisation: set keys for repeated joins

```r
# Set a key when you will join on the same column repeatedly
setkey(flow_dt, station_id, datetime)
setkey(meta_dt, station_id)

# Keyed joins are faster than unkeyed on large tables
meta_dt[flow_dt]  # uses key, no on = needed
```

### Use `.SD` with `.SDcols` to avoid copying unnecessary columns

```r
# Slow: .SD copies all columns
flow_dt[, lapply(.SD, mean), by = station_id]

# Fast: restrict to the columns you need
flow_dt[, lapply(.SD, fmean), by = station_id, .SDcols = c("flow_cms", "level_maod")]
```

### Avoid growing objects in loops

```r
# Wrong: growing a list in a loop allocates repeatedly
results <- list()
for (id in station_ids) {
  results[[id]] <- process_station(flow_dt[station_id == id])
}

# Correct: pre-allocate or use data.table by
result_dt <- flow_dt[, process_station(.SD), by = station_id]
```

### Update by reference instead of copying

```r
# Slow: creates a copy
flow_dt <- flow_dt[, flow_log := log(flow_cms)]  # redundant assignment

# Fast: modifies in place
flow_dt[, flow_log := log(flow_cms)]
```

### Use `set()` for repeated single-column updates in a loop

```r
# When you must update a column inside a loop, set() avoids the overhead of [<-
for (j in c("col_a", "col_b", "col_c")) {
  set(flow_dt, j = j, value = log(flow_dt[[j]]))
}
```

---

## 4. collapse optimisation patterns

`collapse` functions are consistently faster than base R equivalents for grouped operations. Use them in `j` expressions.

```r
# Base R -- slower in grouped context
flow_dt[, .(mean_q = mean(flow_cms, na.rm = TRUE)), by = station_id]

# collapse -- faster, NA-aware by default
flow_dt[, .(mean_q = fmean(flow_cms)), by = station_id]

# Pre-compute GRP when applying multiple functions over the same groups
grp <- GRP(flow_dt, by = c("station_id", "water_year"))
flow_dt[, `:=`(
  q_mean = fmean(flow_cms,  g = grp),
  q_sd   = fsd(flow_cms,    g = grp),
  q_90   = fnth(flow_cms, 0.9, g = grp)
)]
```

---

## 5. Memory efficiency

### Check object size before and after

```r
object.size(flow_dt) |> format(units = "MB")
```

### Use appropriate column types

```r
# Integer where double is not needed
flow_dt[, quality_code := as.integer(quality_code)]
flow_dt[, water_year   := as.integer(water_year)]

# Factor for low-cardinality character columns
flow_dt[, parameter := as.factor(parameter)]
```

### Parquet for large tabular data

Reading Parquet with `arrow` supports column pruning and predicate pushdown, avoiding loading the full dataset into memory.

```r
library(arrow)

# Read only the columns and rows you need
# Note: filter() and select() here are arrow query DSL, not dplyr data manipulation.
# They execute against the Parquet engine before any data reaches R.
# This use of dplyr verbs is permitted by the file-format rule; it is not a
# tidyverse dependency in the fastverse sense.
flow_subset <- open_dataset(here("archive", "flow")) |>
  filter(water_year == 2023, station_id == "4206TH") |>
  select(datetime, value, quality_code) |>
  collect() |>
  as.data.table()
```

---

## 6. Parallel execution

Use `future.apply` for embarrassingly parallel tasks (fitting models per catchment, processing independent stations). It is cross-platform -- `mclapply` uses forking and does not work on Windows.

```r
library(future)
library(future.apply)

# Set the parallel backend -- multisession works on Windows, Mac, and Linux
plan(multisession, workers = max(1L, availableCores() - 1L))

# Apply per-station model fitting in parallel
station_ids <- unique(flow_dt$station_id)
models <- future_lapply(station_ids, function(id) {
  fit_pdm(flow_dt[station_id == id])
})

# Return to sequential execution when done
plan(sequential)
```

`data.table` itself uses multiple threads for some operations. Check and set the thread count:

```r
getDTthreads()
setDTthreads(0L)  # 0 = use all available
```

Note: `data.table` threading and `future` workers both consume CPU. Do not run `future_lapply` with many workers while `data.table` is also using all threads. Either reduce `setDTthreads()` inside parallel workers, or use sequential data.table and parallelise at the outer loop.

---

## 7. When not to optimise

If a function runs in under 1 second and is called rarely, do not optimise it. The time cost of optimisation (writing, testing, reviewing) will exceed the time saved across the tool's lifetime.

Profile first. Optimise only when:
- `profvis` identifies the function as a bottleneck
- The function is in a hot path called thousands of times
- Memory pressure is causing GC to slow the pipeline

Readability is a production asset. An unreadable fast function is harder to maintain than a readable slow one that is fast enough.

---

## References

- profvis: https://rstudio.github.io/profvis/
- bench: https://bench.r-lib.org/
- data.table optimisation: https://rdatatable.gitlab.io/data.table/
- collapse benchmarks: https://fastverse.github.io/collapse/
