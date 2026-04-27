// Shared utilities for EA Flood R Skills hooks
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const STATE_DIR  = path.join(os.homedir(), ".claude", "flode_code_styles");
const STATE_FILE = path.join(STATE_DIR, "session-state.json");

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function loadState() {
  ensureStateDir();
  if (!fs.existsSync(STATE_FILE)) {
    return { toolUseCount: 0, sessions: [], learnedPatterns: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { toolUseCount: 0, sessions: [], learnedPatterns: [] };
  }
}

function saveState(state) {
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function getToolUseCount() {
  const state = loadState();
  return state.toolUseCount || 0;
}

function incrementToolUseCount() {
  const state = loadState();
  state.toolUseCount = (state.toolUseCount || 0) + 1;
  saveState(state);
  return state.toolUseCount;
}

function resetToolUseCount() {
  const state = loadState();
  state.toolUseCount = 0;
  saveState(state);
}

function addSession(sessionData) {
  const state = loadState();
  state.sessions = state.sessions || [];
  state.sessions.unshift({ ...sessionData, timestamp: new Date().toISOString() });
  // Keep last 10 sessions only
  state.sessions = state.sessions.slice(0, 10);
  saveState(state);
}

function getRecentSessions(n = 3) {
  const state = loadState();
  return (state.sessions || []).slice(0, n);
}

module.exports = {
  loadState,
  saveState,
  getToolUseCount,
  incrementToolUseCount,
  resetToolUseCount,
  addSession,
  getRecentSessions,
};
