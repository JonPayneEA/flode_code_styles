# Fastverse Enforcement Rule

The team's production ecosystem is the fastverse. Tidyverse packages are banned in Tier 3 operational tools and all Flode package functions. This rule is automatically enforced during code review.

## Banned packages in Tier 3 and Flode

The following packages must not appear in `library()` calls, `Imports:` in `DESCRIPTION`, or `::` qualified calls in any file with `Tier: 1` in its header block, or in any file under `operational/`, or in any `reach.*` module:

- `dplyr`
- `tidyr`
- `purrr`
- `readr`
- `tibble`
- `stringr` (use base R or `collapse` string functions)
- `forcats`
- `lubridate` (use `data.table` date functions)
- `ggplot2` is the exception: acceptable in `reach.viz` and Tier 2 analytical work

## Required replacements

| Banned | Replacement |
|---|---|
| `dplyr::filter()`, `mutate()`, `summarise()` | `data.table` `DT[i, j, by]` |
| `dplyr::left_join()`, `inner_join()` | `y[x, on = .(key)]` in data.table |
| `purrr::map()`, `map_dbl()`, `map_dfr()` | `vapply()`, `DT[, f(), by]`, `lapply()` |
| `readr::read_csv()`, `write_csv()` | `data.table::fread()`, `fwrite()` |
| `tidyr::pivot_longer()`, `pivot_wider()` | `data.table::melt()`, `dcast()` |
| `tibble::tibble()` | `data.table::data.table()` |
| `lubridate::year()` etc. | `data.table::year()`, `month()`, `yday()` |
| `stringr::str_detect()` | `grepl()` or `collapse` equivalents |
| `purrr::map2()`, `pmap()` | `mapply()` or list column patterns |

## Acceptable uses of tidyverse

Tidyverse packages are acceptable only in:

- **Tier 1 exploratory scripts** in `experimental/`
- **Vignettes** where readability for a non-team audience is the priority
- **One-off analysis scripts** that will not be promoted to Tier 2 or above

If a Tier 1 function is being promoted to Tier 2 or Tier 3, tidyverse dependencies must be replaced before the merge request is opened.

## Code review action

When reviewing code, flag any tidyverse import in a Tier 3 file or Flode module as a blocking issue. Provide the replacement pattern from the table above. Do not approve until the dependency is removed.
