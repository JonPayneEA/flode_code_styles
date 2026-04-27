#!/usr/bin/env node
// session-end.js
// Persists session state for continuity across sessions.
// Fired by the SessionEnd hook event.

const { addSession, getToolUseCount } = require("./utils.js");

try {
  const toolUseCount = getToolUseCount();

  // Build a minimal session record
  // The summary field is intentionally sparse -- Claude Code does not expose
  // the conversation content to hooks. The session record tracks metadata only.
  const sessionData = {
    toolUseCount,
    summary: toolUseCount > 0
      ? `Session ended; ${toolUseCount} tool uses`
      : "Session ended",
  };

  addSession(sessionData);

  process.exit(0);
} catch (err) {
  process.exit(0);
}
