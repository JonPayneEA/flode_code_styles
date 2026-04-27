# EA Flood Forecasting and Warning -- R Development Configuration

This is the Claude Code configuration for the Environment Agency Flood Forecasting and Warning team. It encodes the team's R coding standards, governance framework, and domain-specific patterns.

## Core principles

1. **Fastverse, not tidyverse.** `data.table` and `collapse` are the production standard. `dplyr`, `purrr`, `readr`, and `tibble` must not appear in Tier 3 operational tools or Flode package functions.
2. **Every file needs a header block.** No `.R` file is governance-compliant without the mandatory header. Add it before writing any other code.
3. **Profile before optimising.** Write readable code first. Use `profvis` and `bench` to identify actual bottlenecks.
4. **Test-driven development for Tier 3.** Write the failing test first, then the implementation. 70% line coverage is the minimum for a Tier 3 merge.
5. **Parquet is the default file format.** Use `arrow::write_parquet()` for large tabular outputs. `write.csv()` and `.RData` are banned.
6. **Always UTC.** Operational systems run in UTC. Local time must never enter a production data pipeline.

## Tier system

| Tier | Name | Location | Standards |
|---|---|---|---|
| Tier 1 | Experimental | `experimental/` | Header block; inline comments sufficient |
| Tier 2 | Analytical | `analytical/` | Header block; `roxygen2` for key functions; tests recommended |
| Tier 3 | Operational | `operational/` | Header block; full `roxygen2`; 70% coverage; `lintr` mandatory; `renv` mandatory |

## Flode module map

Code is developed for eventual inclusion in the Flode meta-package. Target the correct module:

- `reach.io` -- gauge records, NWP ingestion, FEWS PI-XML, EA RTFM API
- `reach.hydro` -- PDM, ARMA, FEH, flow statistics
- `reach.ensemble` -- ensemble processing, member weighting, probabilistic thresholds
- `reach.validate` -- NSE, KGE, RMSE, skill scoring, benchmark comparisons
- `reach.viz` -- flood-specific chart themes and plot functions
- `reach.utils` -- date/time, paths, logging, configuration

## Skills loaded in this configuration

- `fastverse-patterns` -- data.table/collapse/arrow patterns (replaces tidyverse)
- `reach-architecture` -- Flode module map, header block, naming conventions
- `hydrology-domain` -- gauge data, NWP products, PDM, FEWS, LSTM inference
- `r-oop` -- S7 (default), R6 (stateful), S3 (dispatch), S4 (spatial interop only)
- `r-performance` -- profvis, bench, data.table/collapse optimisation
- `r-style-guide` -- naming, spacing, function design, header block
- `r-package-development` -- roxygen2, DESCRIPTION, Flode promotion path, renv
- `tdd-workflow` -- red-green-refactor, testthat, fixtures, 70% coverage

## Rules enforced automatically

- `fastverse-enforcement` -- tidyverse banned in Tier 3 and Flode
- `header-block` -- mandatory header block; missing header blocks Tier 3 merge
- `file-format` -- Parquet/fwrite/saveRDS; write.csv and .RData banned
- `testing` -- 70% coverage minimum for Tier 3; testthat, covr, lintr

## Scientific reasoning

We test hypotheses; we do not prove them. Reason from evidence. Quantify uncertainty explicitly. Do not tell the user what they want to hear at the expense of accuracy. If a model result is surprising, say so and investigate before accepting it.

## References

- Governance framework: https://jonpayneea.github.io/Governance
- data.table: https://rdatatable.gitlab.io/data.table/
- collapse: https://fastverse.github.io/collapse/
- S7: https://rconsortium.github.io/S7/
