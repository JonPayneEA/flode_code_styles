# File Format Rule

The team's file format standards apply to all scripts and tools regardless of tier. Some are hard bans; others are format-by-use-case requirements.

## Approved formats by use case

| Format | Use | Function |
|---|---|---|
| Parquet (`.parquet`) | Preferred for all large tabular outputs and time series archives | `arrow::write_parquet()`, `arrow::write_dataset()` |
| CSV (`.csv`) | Small exchange files under ~10,000 rows; stakeholder data delivery | `data.table::fwrite()` only |
| netCDF (`.nc`) | Gridded spatial outputs | `terra` or `ncdf4` |
| RDS (`.rds`) | R-specific intermediate objects (model fits, S7 class instances) | `saveRDS()` / `readRDS()` |
| Feather (`.feather`) | High-speed intermediate files within a single pipeline | `arrow::write_feather()` |
| Excel (`.xlsx`) | Final-output reports and stakeholder deliverables only | `openxlsx2` |

## Hard bans

These are banned in all tiers without exception:

| Banned | Reason | Replacement |
|---|---|---|
| `.RData` files | Opaque; loads into global environment silently; not reproducible | `saveRDS()` for R objects; Parquet for tabular data |
| `save(...)` | Creates `.RData`; same problems | `saveRDS()` |
| `load(...)` | Loads `.RData`; pollutes environment silently | `readRDS()` |
| `write.csv(...)` | Slow; no control over encoding or quoting | `data.table::fwrite()` |
| `read.csv(...)` | Slow; poor defaults | `data.table::fread()` |
| `readr::read_csv(...)` | Tidyverse; banned in Tier 3 | `data.table::fread()` |
| `readr::write_csv(...)` | Tidyverse; banned in Tier 3 | `data.table::fwrite()` |

## Parquet partitioning for archives

Time series archives must use partitioned Parquet with `water_year` and `station_id` as partition keys. This enables efficient predicate pushdown when reading subsets.

```r
arrow::write_dataset(
  flow_dt,
  here::here("archive", "flow"),
  partitioning = c("water_year", "station_id"),
  format = "parquet",
  existing_data_behavior = "overwrite"
)
```

## Reading Parquet efficiently

Use `open_dataset()` with filter and column selection before `collect()` to avoid loading the full dataset.

```r
flow_subset <- arrow::open_dataset(here::here("archive", "flow")) |>
  dplyr::filter(water_year == 2024, station_id == "4206TH") |>
  dplyr::select(datetime, value, quality_code) |>
  dplyr::collect() |>
  data.table::as.data.table()
```

Note: `dplyr` verbs are acceptable here as `arrow` query DSL only -- the `collect()` call materialises the result before any further data.table operations. The `dplyr` dependency is on `arrow`, not on the team's data manipulation stack.

## Code review action

Flag any use of `.RData`, `save()`, `load()`, `write.csv()`, `read.csv()`, `read_csv()`, or `write_csv()` as a blocking issue in Tier 3 and Tier 2. Provide the replacement from the table above.
