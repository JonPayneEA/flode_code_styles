# /plan

Create an implementation plan before writing any code.

## Instructions

When the user invokes `/plan`, do the following before touching any files:

1. **Clarify scope.** Ask what the function, script, or module needs to do. One sentence. If the user has already described it, confirm your understanding.

2. **Identify the tier.** Ask which tier this work targets (Tier 1 Experimental, Tier 2 Analytical, Tier 3 Operational) if not stated. The tier determines testing, documentation, and ecosystem requirements.

3. **Identify the Flode module.** Which `reach.*` module does this belong to? Or is it standalone? If you are unsure, suggest the most appropriate module based on scope.

4. **Map inputs and outputs.** State the expected inputs (types, formats, units) and outputs (types, formats, units). Flag any ambiguity about units -- ambiguous units in hydrological code are a known failure mode.

5. **List dependencies.** Name every non-base R package the implementation will need. Flag any non-fastverse choice and justify it.

6. **Sketch the function signatures.** Write the function signature(s) with argument names following governance naming conventions. Do not implement -- just the signatures.

7. **Identify edge cases.** List at least three edge cases that tests must cover (empty input, `NA` values, out-of-range parameters are the minimum set).

8. **Write the header block.** Draft the mandatory header block for the file, completed as fully as possible given the information available.

9. **Present the plan.** Output the plan as a structured document. Ask the user to confirm or amend before proceeding to implementation.

Do not write implementation code until the plan is confirmed. Do not skip the header block step.

## Output format

```
## Plan: [Tool name]

**Tier:** [1 / 2 / 3] -- [Experimental / Analytical / Operational]
**Flode module:** [reach.xxx or standalone]

### Purpose
[One sentence]

### Inputs
[Table or list of inputs with types and units]

### Outputs
[Table or list of outputs with types and units]

### Dependencies
[List; flag non-fastverse choices]

### Function signatures
[Signatures only, no implementation]

### Edge cases to test
[List of at least 3]

### Header block (draft)
[Completed header block]
```
