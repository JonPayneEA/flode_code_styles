#!/usr/bin/env node
// pre-compact.js
// Saves a snapshot of session state before context compaction.
// Fired by the PreCompact hook event.

const { loadState, saveState, resetToolUseCount } = require("./utils.js");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

try {
  const state = loadState();

  // Record the compaction event
  state.lastCompaction = new Date().toISOString();
  state.compactionCount = (state.compactionCount || 0) + 1;

  // Save a pre-compaction snapshot for continuity
  const snapshotDir  = path.join(os.homedir(), ".claude", "ea-flood-r-skills", "snapshots");
  const snapshotFile = path.join(snapshotDir, `pre-compact-${Date.now()}.json`);

  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const snapshot = {
    timestamp:       state.lastCompaction,
    toolUseCount:    state.toolUseCount,
    compactionCount: state.compactionCount,
    sessions:        (state.sessions || []).slice(0, 3),
  };

  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), "utf8");

  // Keep only the 5 most recent snapshots
  const snapshots = fs.readdirSync(snapshotDir)
    .filter(f => f.startsWith("pre-compact-"))
    .sort()
    .reverse();

  snapshots.slice(5).forEach(f => {
    try { fs.unlinkSync(path.join(snapshotDir, f)); } catch {}
  });

  // Reset tool use count for the new context window
  resetToolUseCount();
  saveState(state);

  process.stderr.write(`\u2139\ufe0f  Session state saved before compaction (snapshot ${state.compactionCount}).\n`);
  process.exit(0);
} catch (err) {
  process.exit(0);
}
