#!/usr/bin/env node
// session-start.js
// Reports available session history and active skills at the start of each session.
// Fired by the SessionStart hook event.

const { getRecentSessions, loadState } = require("./utils.js");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

try {
  const state    = loadState();
  const sessions = getRecentSessions(3);

  const skills = [
    "fastverse-patterns",
    "reach-architecture",
    "hydrology-domain",
    "r-oop",
    "r-performance",
    "r-style-guide",
    "r-package-development",
    "tdd-workflow",
  ];

  const rules = [
    "fastverse-enforcement",
    "header-block",
    "file-format",
    "testing",
  ];

  const lines = [
    "",
    "\u{1F4CA} EA Flood Forecasting and Warning -- R Development",
    "\u2550".repeat(55),
    "",
    `Active skills (${skills.length}): ${skills.join(", ")}`,
    `Active rules  (${rules.length}): ${rules.join(", ")}`,
    "",
  ];

  if (sessions.length > 0) {
    lines.push(`Recent sessions (${sessions.length}):`);
    sessions.forEach((s, i) => {
      const when = s.timestamp ? new Date(s.timestamp).toLocaleDateString("en-GB") : "unknown";
      lines.push(`  ${i + 1}. ${when} -- ${s.summary || "no summary"}`);
    });
    lines.push("");
  }

  if (state.compactionCount > 0) {
    lines.push(`Context compactions this project: ${state.compactionCount}`);
    lines.push("");
  }

  lines.push("Tier system: Tier 1 = Experimental, Tier 2 = Analytical, Tier 3 = Operational");
  lines.push("");

  process.stderr.write(lines.join("\n"));
  process.exit(0);
} catch (err) {
  process.exit(0);
}
