---
name: hydrology-domain
description: Domain knowledge for operational flood forecasting at the Environment Agency. Covers standard data structures for gauge time series and ensembles, FEWS PI-XML I/O, NWP product catalogue (UKV, MOGREPS-UK/G, ECMWF, NIMROD/STEPS), PDM rainfall-runoff, ARMA error correction, FEH flood frequency, LSTM inference conventions, validation metrics (NSE, KGE), and EA Real-Time Flood Monitoring API patterns. Load when writing any hydrological modelling, NWP processing, forecast pipeline, or flood warning code.
---

# Hydrology Domain Patterns

This skill encodes the domain-specific conventions for the EA Flood Forecasting and Warning team. It exists because wrong units, wrong time zones, and wrong data shapes in hydrological code are silent and catastrophic. General R conventions are not sufficient. Read every section relevant to your task.

---

## 1. Standard data structures

### Gauge time series

The canonical in-memory structure for a flow or level record:

```r
# Required columns and types
flow_dt <- data.table(
  station_id   = character(),                              # EA gauge ID (e.g. "4206TH")
  datetime     = as.POSIXct(character(0), tz = "UTC"),    # UTC, always -- never local time
  value        = double(),                                 # flow in m³/s, level in mAOD
  parameter    = character(),                              # "flow" | "level" | "rainfall"
  quality_code = integer()                                 # 1 = good, 2 = estimated, 3 = suspect, 4 = missing
)
```

Never drop quality-coded records silently. Flag them; let the caller decide whether to use them.

### Ensemble forecast

```r
ensemble_dt <- data.table(
  station_id  = character(),
  issued_dt   = as.POSIXct(character(0), tz = "UTC"),   # forecast issue time, UTC
  valid_dt    = as.POSIXct(character(0), tz = "UTC"),   # valid time, UTC
  lead_hours  = double(),     # lead time in hours
  member      = integer(),    # ensemble member index (1-based)
  value       = double()      # flow in m³/s
)
```

### Catchment metadata

```r
meta_dt <- data.table(
  station_id      = character(),
  river_name      = character(),
  area_km2        = double(),
  bfi             = double(),   # base flow index
  saar_mm         = double(),   # standard average annual rainfall
  centroid_lon    = double(),
  centroid_lat    = double(),
  nrfa_id         = integer()   # NRFA gauge ID where available
)
```

---

## 2. Units and time conventions

These are not suggestions. Getting units wrong in operational code causes real forecast errors.

| Variable | Unit | Variable name convention |
|---|---|---|
| River flow | m³/s | `flow_cms` |
| River level | metres above ordnance datum | `level_maod` |
| Rainfall depth | mm | `rainfall_mm` |
| Catchment area | km² | `area_km2` |
| Time step | minutes (store as integer) | `timestep_min` |
| Lead time | hours | `lead_hours` |

**Time zones: always UTC.** Operational systems run in UTC. Local time (GMT/BST) must never enter a production data pipeline. Convert at the point of ingestion if necessary; store UTC throughout.

```r
# Correct
datetime <- as.POSIXct("2024-11-01 06:00:00", tz = "UTC")

# Wrong -- silently wrong at BST boundaries
datetime <- as.POSIXct("2024-11-01 06:00:00")
```

**Water year convention (UK):** starts 1 October.

```r
flow_dt[, water_year := fifelse(month(datetime) >= 10L, year(datetime) + 1L, year(datetime))]
```

**Do not assume gauge records are regular.** Real-time records have gaps, duplicates, and irregular steps. Check completeness explicitly before any rolling operation.

---

## 3. FEWS PI-XML I/O

Delft-FEWS uses PI-XML for time series exchange. Key conventions:

- The `<Header>` block carries station metadata, parameter type, units, timestep, and miss value.
- The miss value is typically `-999.0` in PI-XML; recode to `NA` on ingest, back to `-999.0` on export.
- Timestamps in PI-XML are local FEWS time (usually UTC+0 for UK deployments, but verify per system configuration).
- Use `xml2` for reading and writing.

```r
library(xml2)
library(data.table)

read_pi_xml <- function(path) {
  # ============================================================ #
  # Tool:         read_pi_xml
  # Description:  Parse a FEWS PI-XML file to a standard flow_dt
  # Flode Module: reach.io
  # ...
  # ============================================================ #
  doc    <- read_xml(path)
  ns     <- c(pi = "http://www.wldelft.nl/fews/PI")
  events <- xml_find_all(doc, ".//pi:event", ns)

  data.table(
    datetime     = as.POSIXct(
      paste(xml_attr(events, "date"), xml_attr(events, "time")),
      format = "%Y-%m-%d %H:%M:%S", tz = "UTC"
    ),
    value        = as.double(xml_attr(events, "value")),
    quality_code = as.integer(xml_attr(events, "flag"))
  )[value == -999.0, value := NA_real_]
}
```

---

## 4. NWP product catalogue

The operational NWP products used by the team. Understand what each delivers before writing ingestion code.

| Product | Source | Resolution | Domain | Members | Lead time | Update |
|---|---|---|---|---|---|---|
| UKV | Met Office | 1.5 km | UK | 1 (deterministic) | 54 h | Hourly |
| MOGREPS-UK | Met Office | 2.2 km | UK | 36 | 126 h | 6-hourly |
| MOGREPS-G | Met Office | ~60 km | Global | 36 | 360 h | 6-hourly |
| ECMWF IFS (HRES) | ECMWF | ~9 km | Global | 1 (deterministic) | 240 h | 6-hourly |
| ECMWF IFS (ENS) | ECMWF | ~18 km | Global | 51 | 360 h | 6-hourly |
| NIMROD | Met Office | 1 km | UK | 1 | Nowcast (0-6 h) | 5-min |
| STEPS | Met Office | 1 km | UK | 24 | 6 h | 15-min |

Key decisions when writing NWP ingestion code:

- UKV and MOGREPS-UK arrive as GRIB2 or pre-processed netCDF. Use `terra` or `ncdf4` depending on format.
- MOGREPS-UK has 36 members. Do not treat it as deterministic.
- STEPS is a nowcast product with a fundamentally different temporal structure from NWP. Do not mix STEPS lead times with NWP lead times without explicit labelling.
- Catchment-area averaging from gridded fields requires areal weighting; simple cell means are not correct for irregular catchment shapes.

```r
library(terra)

# Read a netCDF rainfall field and extract catchment mean
extract_catchment_rainfall <- function(nc_path, catchment_poly) {
  r       <- rast(nc_path)
  r_proj  <- project(r, crs(catchment_poly))
  vals    <- extract(r_proj, catchment_poly, fun = mean, na.rm = TRUE)
  as.double(vals[, -1])  # drop ID column
}
```

---

## 5. PDM rainfall-runoff model

The Probability Distributed Model (PDM) is the team's primary rainfall-runoff benchmark.

Key parameters and their physical meaning:

| Parameter | Description | Typical range |
|---|---|---|
| `b` | Shape of soil moisture capacity distribution | 0.1 -- 2.0 |
| `cmax` | Maximum soil moisture capacity (mm) | 50 -- 500 |
| `cmin` | Minimum soil moisture capacity (mm) | 0 -- 50 |
| `kg` | Groundwater store time constant (h) | 10 -- 5000 |
| `bg` | Groundwater store exponent | 1 -- 3 |
| `td` | Routing lag (h) | 0 -- 48 |

Function signature convention in `reach.hydro`:

```r
# Simulate PDM for a single catchment
sim_pdm <- function(
  rainfall_mm,    # numeric vector, mm at each timestep
  pet_mm,         # numeric vector, potential evapotranspiration mm
  params,         # named list or data.table row of PDM parameters
  timestep_min,   # integer, e.g. 15L for 15-minute
  warmup_steps    # integer, steps to discard from skill calculation
) { ... }

# Returns a data.table with columns: datetime, qsim_cms, soil_moisture_mm, groundwater_mm
```

---

## 6. ARMA error correction

Real-time error correction fits an ARMA model to model residuals (observed minus simulated) and adds the corrected residual to the base forecast.

```r
library(forecast)  # acceptable for ARMA fitting in reach.hydro -- document as non-fastverse

fit_arma_correction <- function(obs_dt, sim_dt, ar_order = 1L, ma_order = 1L) {
  # Join and compute residuals
  resid_dt <- obs_dt[sim_dt, on = .(station_id, datetime), nomatch = NULL]
  resid_dt[, residual := value - qsim_cms]

  # Fit ARMA on training residuals only (not full period)
  arma_fit <- Arima(resid_dt$residual, order = c(ar_order, 0L, ma_order))
  arma_fit
}

apply_arma_correction <- function(base_forecast_dt, arma_fit, n_ahead) {
  correction <- as.double(forecast(arma_fit, h = n_ahead)$mean)
  base_forecast_dt[, value_corrected := value + correction[.I]]
}
```

Do not fit error correction on the full calibration period and apply it to the same data. Fit on a rolling training window to simulate real-time conditions.

---

## 7. FEH flood frequency

The Flood Estimation Handbook (FEH) methods are used for design flood estimation.

| Method | When to use |
|---|---|
| QMED (median annual flood) | Starting point for all FEH analysis |
| Statistical method | Gauged catchments; pooling groups for rare return periods |
| Rainfall-runoff method | Ungauged or poorly gauged catchments |

Key variables and their FEH names:

```r
# Catchment descriptors used in QMED estimation
qmed_dt <- data.table(
  station_id = character(),
  area_km2   = double(),   # AREA in FEH
  bfi        = double(),   # BFI (base flow index)
  saar_mm    = double(),   # SAAR (standard average annual rainfall, 1961-1990)
  farl       = double(),   # FARL (flood attenuation by reservoirs and lakes)
  sprhost    = double()    # SPRHOST (standard percentage runoff from HOST)
)
```

---

## 8. LSTM inference conventions

The DASH/Databricks LSTM environment uses NeuralHydrology for model training. For operational inference, the following conventions apply.

**CAMELS-GB forcing variable names** (must match exactly):

```r
camels_forcing_cols <- c(
  "precipitation_sum",   # mm/day (rescale from mm/15min for daily models)
  "peti",                # mm/day potential evapotranspiration
  "temperature_min",     # degrees C
  "temperature_max",     # degrees C
  "shortwave_rad"        # W/m²
)

camels_static_cols <- c(
  "area",         # km²
  "mean_slope",   # m/km
  "sand_perc",    # %
  "clay_perc",    # %
  "silt_perc",    # %
  "bfi"
)
```

**Warm-up period:** LSTM models require a warm-up period (typically 365 days) to spin up the hidden state. Discard warm-up period outputs before computing skill scores or applying operational corrections.

**Training vs inference distinction:**
- Training runs on Databricks (DASH), using CAMELS-GB historical data. This is an offline, batch process.
- Inference runs operationally, coupled to FEWS. Inputs are real-time NWP forcing. The adapter must translate FEWS PI-XML to the NeuralHydrology input format and return PI-XML.

---

## 9. Validation metrics

Standard metrics for the team. Use these formulations; do not invent alternatives.

```r
library(collapse)

# Nash-Sutcliffe Efficiency (NSE): 1 is perfect; < 0 worse than mean flow
calc_nse <- function(obs, sim) {
  1 - sum((obs - sim)^2, na.rm = TRUE) / sum((obs - fmean(obs, na.rm = TRUE))^2, na.rm = TRUE)
}

# Kling-Gupta Efficiency (KGE): 1 is perfect
calc_kge <- function(obs, sim) {
  r   <- cor(obs, sim, use = "complete.obs")
  a   <- fsd(sim, na.rm = TRUE) / fsd(obs, na.rm = TRUE)   # variability ratio
  b   <- fmean(sim, na.rm = TRUE) / fmean(obs, na.rm = TRUE) # bias ratio
  1 - sqrt((r - 1)^2 + (a - 1)^2 + (b - 1)^2)
}

# Root Mean Squared Error
calc_rmse <- function(obs, sim) {
  sqrt(fmean((obs - sim)^2, na.rm = TRUE))
}

# Percent bias
calc_pbias <- function(obs, sim) {
  100 * sum(sim - obs, na.rm = TRUE) / sum(obs, na.rm = TRUE)
}
```

**Benchmark:** PDM is the stated benchmark for LSTM comparisons. Report LSTM skill relative to PDM, not only in absolute terms.

---

## 10. EA Real-Time Flood Monitoring API

The EA RTFM API (`environment.data.gov.uk/flood-monitoring`) provides real-time gauge data. Key conventions from the team's archiving system:

```r
library(httr2)
library(data.table)
library(arrow)

# Polite throttling: respect rate limits
req <- request("https://environment.data.gov.uk/flood-monitoring") |>
  req_throttle(rate = 100 / 60)   # 100 requests per minute

# Idempotent Parquet archive: partition by water_year and station_id
# New records are appended; existing records are not duplicated
archive_readings <- function(readings_dt, archive_path) {
  write_dataset(
    readings_dt,
    archive_path,
    partitioning = c("water_year", "station_id"),
    format = "parquet",
    existing_data_behavior = "overwrite"
  )
}
```

Never poll the API without throttling. The API has rate limits and the team is expected to behave as a polite consumer.

---

## 11. Hydrological anti-patterns

These mistakes are specific to this domain. General R linting will not catch them.

- Mixing UTC and local time silently. Fatal at BST/GMT boundaries in autumn.
- Dropping quality-coded missing values without flagging. Use `quality_code` to filter, not silent `na.rm`.
- Using calendar months for hydrological aggregation instead of water years.
- Assuming gauge records are regular time series before checking completeness.
- Fitting ARMA error correction on the full period rather than a rolling training window.
- Applying catchment-mean rainfall as a simple cell mean without areal weighting.
- Comparing LSTM skill to a climatological benchmark only; PDM is the operational reference.
- Using daily CAMELS-GB forcing variables without rescaling for a 15-minute model.
- Discarding the LSTM warm-up period outputs without checking the warm-up length is adequate.
