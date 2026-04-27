#!/usr/bin/env node
// suggest-compact.js
// Suggests /compact at logical breakpoints to manage context window efficiently.
// Fires on every Edit/Write/MultiEdit tool use.
// Suggests at 50 tool uses, then every 25 thereafter.

const { incrementToolUseCount } = require("./utils.js");

const FIRST_THRESHOLD      = 50;
const SUBSEQUENT_THRESHOLD = 25;

try {
  const count = incrementToolUseCount();

  const shouldSuggest =
    count === FIRST_THRESHOLD ||
    (count > FIRST_THRESHOLD && (count - FIRST_THRESHOLD) % SUBSEQUENT_THRESHOLD === 0);

  if (shouldSuggest) {
    const message = [
      "",
      `\u26a0\ufe0f  Context notice: ${count} tool uses in this session.`,
      "   Consider running /compact at a logical task boundary to preserve context.",
      "   Session state will be saved before compaction.",
      "",
    ].join("\n");

    process.stderr.write(message);
  }

  process.exit(0);
} catch (err) {
  // Never block the tool use -- fail silently
  process.exit(0);
}
