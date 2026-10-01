---
name: r-oop
description: OOP system selection and implementation for Flode package development. Covers S7 (primary for new Flode classes), R6 (stateful lifecycle objects), S3 (lightweight dispatch), and S4 (terra/sp interoperability only). Load when designing or implementing new classes, methods, or object hierarchies in R. Triggers on mentions of class, S7, S3, S4, R6, new_class, setClass, or OOP.
---

# R OOP for Flode Development

New Flode classes use S7 by default. The choice of OOP system is determined by the use case, not preference. Read the decision table before writing any class definition.

---

## 1. System decision table

| System | Use when | Do not use when |
|---|---|---|
| **S7** (default) | Defining any new exported Flode class; formal typed properties; validated contracts | Rapid Tier 1 prototyping where formality adds no value |
| **R6** | Stateful objects with a lifecycle (`initialize` / `finalize`); reference semantics genuinely required (e.g. connection objects, mutable caches) | General data representation -- use S7 instead |
| **S3** | Lightweight method dispatch: `print`, `summary`, `format` for existing Flode classes; extending external package generics; subclassing `data.table` (S7 objects cannot be data.tables) | New exported Flode classes -- use S7 |
| **S4** | Interoperability with `terra`, `sp`, `sf` only where method dispatch across these packages is required | All new development; do not use S4 for new Flode classes |

If you find yourself reaching for S4 outside of spatial interoperability, use S7 instead.

---

## 2. S7: the default for new Flode classes

```r
library(S7)

# Class definition -- properties must be typed
FlodeCatchment <- new_class(
  "FlodeCatchment",
  properties = list(
    gauge_id      = class_character,
    area_km2      = class_double,
    bfi           = class_double,
    saar_mm       = class_double
  ),
  validator = function(self) {
    if (length(self@gauge_id) == 0 || nchar(self@gauge_id) == 0)
      return("gauge_id must be a non-empty string")
    if (self@area_km2 <= 0)
      return("area_km2 must be positive")
    if (self@bfi < 0 || self@bfi > 1)
      return("bfi must be in [0, 1]")
    NULL
  }
)

# Constructor usage
thames_at_kingston <- FlodeCatchment(
  gauge_id = "4206TH",
  area_km2 = 9948.0,
  bfi      = 0.47,
  saar_mm  = 706.0
)
```

### S7 validators

Validators are mandatory for Tier 3 and Tier 2 classes. They must cover range checks for physical parameters, type coherence where properties interact, and required non-empty strings. Return a string on failure; `NULL` on success.

```r
validator = function(self) {
  if (length(self@gauge_id) == 0 || nchar(self@gauge_id) == 0)
    return("gauge_id must be a non-empty string")
  if (self@area_km2 <= 0)
    return("area_km2 must be positive")
  if (self@bfi < 0 || self@bfi > 1)
    return("bfi must be in [0, 1]")
  NULL
}
```

### S7 generics and methods

```r
# Define a generic in reach.hydro
calc_qmed <- new_generic("calc_qmed", "catchment")

# Method for FlodeCatchment
method(calc_qmed, FlodeCatchment) <- function(catchment) {
  # FEH QMED estimation from catchment descriptors
  exp(5.263 * log(catchment@area_km2) - 0.205 * log(catchment@bfi + 0.001))
}
```

### Checking classes across packages

An S7 class defined inside a package carries a namespaced class name: an object of reach.io's `FlodeFlow_Daily` has `class(x)[1] == "reach.io::FlodeFlow_Daily"`. A check against the bare name never matches a real object.

```r
# When the other package is loaded (Imports)
S7::S7_inherits(x, reach.io::FlodeFlow_Daily)

# When it is only in Suggests and may be absent, match the full name
inherits(x, "reach.io::FlodeFlow_Daily")

# Wrong: never TRUE for a real reach.io object
inherits(x, "FlodeFlow_Daily")
```

Test cross-package checks against real objects built with the other package's constructor, skipped when it is not installed. A plain list given the bare class name passes the wrong check and hides the bug.

---

## 3. R6: stateful lifecycle objects

Use R6 only when you need mutable state managed across method calls, or when object creation and destruction has side effects (opening/closing connections, acquiring/releasing resources).

```r
library(R6)

FEWSConnection <- R6Class(
  "FEWSConnection",
  public = list(
    host    = NULL,
    port    = NULL,
    session = NULL,

    initialize = function(host, port) {
      self$host    <- host
      self$port    <- port
      self$session <- private$open_session(host, port)
      message("FEWS connection opened: ", host, ":", port)
    },

    fetch_timeseries = function(location_id, parameter, start, end) {
      # ... fetch via self$session
    },

    finalize = function() {
      if (!is.null(self$session)) {
        private$close_session(self$session)
        message("FEWS connection closed")
      }
    }
  ),
  private = list(
    open_session  = function(host, port) { ... },
    close_session = function(session)   { ... }
  )
)
```

R6 classes must have a `print` method:

```r
FEWSConnection <- R6Class(
  "FEWSConnection",
  public = list(
    print = function(...) {
      cat("<FEWSConnection>\n")
      cat("  Host:", self$host, "\n")
      cat("  Port:", self$port, "\n")
      invisible(self)
    }
    # ... other methods
  )
)
```

---

## 4. S3: lightweight dispatch

Use S3 for `print`, `summary`, `format`, and `plot` methods on existing Flode classes, or to extend external generic functions.

### Print and summary methods for S7 classes

A method named `print.FlodeForecast` does not dispatch for an S7 class defined in a package, because the object's class is `"reach.hydro::FlodeForecast"` (see *Checking classes across packages*). S7's own `print.S7_object` also ignores `S7::method(print, ...)`. Register the method by its namespaced class name in `.onLoad`, as reach.io and reach.hydro do:

```r
.print_FlodeForecast <- function(x, ...) {
  cat("<FlodeForecast>\n")
  cat("  Station: ", x@station_id, "\n")
  cat("  Issued:  ", format(x@issued_dt), "\n")
  cat("  Members: ", x@n_members, "\n")
  cat("  Lead:    ", max(x@lead_hours), "h\n")
  invisible(x)
}

.onLoad <- function(libname, pkgname) {
  registerS3method("print", "reach.hydro::FlodeForecast",
                   .print_FlodeForecast, envir = asNamespace(pkgname))
}
```

### data.table subclasses

A class whose instances must still behave as a `data.table` stays S3: S7 objects cannot be data.tables, and data.table's own dispatch relies on the S3 class vector. reach.hydro's `pdm()` output is the model:

```r
new_reach_hydro_result <- function(dt, params, Smax) {
  structure(dt,
            class  = c("ReachHydroResult", "data.table", "data.frame"),
            params = params,
            Smax   = Smax)
}

print.ReachHydroResult   <- function(x, ...) { ... }
summary.ReachHydroResult <- function(object, ...) { ... }
```

Plain S3 method names work here because the class string carries no namespace.

### Parameter lists in hot loops

Leave an existing S3 parameter list alone while it is read inside a per-timestep loop, as `PdmParams` is in `pdm()`. S7's `@` access and validation cost more than `$` on a list, paid on every timestep. Profile before converting (see `r-performance`).

---

## 5. S4: spatial interoperability only

S4 is used only where method dispatch must work across `terra`, `sp`, or `sf` class hierarchies. Do not define new Flode classes in S4.

```r
# Acceptable: extending a terra method for a Flode spatial object
setMethod("extract", signature("SpatRaster", "FlodeCatchmentSpatial"), function(x, y, ...) {
  # Custom extraction logic
})
```

---

## 6. Anti-patterns

```r
# S4 for a new non-spatial class -- use S7 instead
setClass("FlodeCatchment", representation(gauge_id = "character"))

# S7 class without a validator for Tier 3
FlodeCatchment <- new_class(
  "FlodeCatchment",
  properties = list(area_km2 = class_double)
  # Missing validator -- not compliant for Tier 3
)

# R6 for a data container that has no lifecycle
FlodeCatchment <- R6Class("FlodeCatchment", ...)  # use S7

# S3 class string without a constructor
class(x) <- "FlodeCatchment"  # Use new_class() in S7 or R6Class()

# Naming without Flode prefix for exported class
Catchment <- new_class("Catchment", ...)  # should be FlodeCatchment

# Bare class name for an S7 class from another package
inherits(x, "FlodeFlow_Daily")  # use "reach.io::FlodeFlow_Daily" or S7_inherits()

# S3-style print method for an S7 class in a package
print.FlodeForecast <- function(x, ...) { ... }  # never dispatches; register in .onLoad
```

---

## References

- S7 docs: https://rconsortium.github.io/S7/
- R6 docs: https://r6.r-lib.org/
- Governance: reach-architecture skill (OOP naming conventions and promotion path)
