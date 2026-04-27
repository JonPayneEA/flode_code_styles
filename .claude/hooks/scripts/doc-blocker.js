#!/usr/bin/env node
// doc-blocker.js
// Warns when Claude Code is about to write a .md file outside approved locations.
// Approved locations: README.md, NEWS.md, docs/, vignettes/, .claude/
// Stray .md files accumulate context bloat and should be challenged.

const input = JSON.parse(process.stdin.read() || "{}");

const APPROVED_PATTERNS = [
  /^README\.md$/i,
  /^NEWS\.md$/i,
  /^CHANGELOG\.md$/i,
  /^docs\//,
  /^vignettes\//,
  /^\.claude\//,
  /^rules\//,
  /^commands\//,
  /^agents\//,
];

try {
  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};
  const filePath  = toolInput.file_path || toolInput.path || "";

  const isMarkdown = filePath.endsWith(".md") || filePath.endsWith(".MD");

  if (!isMarkdown || !toolName.match(/Write|Edit|MultiEdit/)) {
    process.exit(0);
  }

  const isApproved = APPROVED_PATTERNS.some(pattern => pattern.test(filePath));

  if (!isApproved) {
    const warning = [
      "",
      `\u26a0\ufe0f  doc-blocker: Writing a .md file outside an approved location.`,
      `   File: ${filePath}`,
      "   Approved locations: README.md, NEWS.md, docs/, vignettes/, .claude/, rules/, commands/, agents/",
      "   Stray documentation files create context bloat. Is this file necessary?",
      "   Proceed only if you are certain this file belongs here.",
      "",
    ].join("\n");

    process.stderr.write(warning);
  }

  process.exit(0);
} catch (err) {
  process.exit(0);
}
