'use strict';

const DEFAULT_ALLOWED_PATHS = [
  '.cursor/rules',
  '.agents/skills',
  'docs/CURSOR_SKILLS.md',
  'docs/CURSOR_2.0_RULES_FINAL.md',
  'docs/AGENT_GOVERNANCE_OPTIMIZER.md',
  'CLAUDE.md',
];

const OFFICIAL_DOCS = [
  'https://cursor.com/docs/rules',
  'https://cursor.com/docs/skills',
];

const REQUIRED_PROJECT_LAW = [
  'db-connection-helper.js',
  'parameterized',
  'HS512',
  'PII',
  'one-click-restart-and-start.sh',
  'Figma is historical',
  'real data',
  'approval before destructive',
];

function parseCsv(value, fallback) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOptimizerConfig() {
  return {
    enabled: process.env.AGENT_GOVERNANCE_OPTIMIZER_ENABLED === 'true',
    dryRun: process.env.AGENT_GOVERNANCE_OPTIMIZER_DRY_RUN !== 'false',
    mode: process.env.AGENT_GOVERNANCE_OPTIMIZER_MODE || 'dry_run',
    allowedPaths: parseCsv(process.env.AGENT_GOVERNANCE_OPTIMIZER_ALLOWED_PATHS, DEFAULT_ALLOWED_PATHS),
    officialDocs: parseCsv(process.env.AGENT_GOVERNANCE_OPTIMIZER_OFFICIAL_DOCS, OFFICIAL_DOCS),
    githubRepository: process.env.GITHUB_REPOSITORY || process.env.AGENT_GOVERNANCE_GITHUB_REPOSITORY || 'mymoolah-africa/mymoolah-platform',
    githubToken: process.env.AGENT_GOVERNANCE_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
    baseBranch: process.env.AGENT_GOVERNANCE_BASE_BRANCH || 'main',
    requiredProjectLaw: REQUIRED_PROJECT_LAW,
  };
}

module.exports = {
  DEFAULT_ALLOWED_PATHS,
  OFFICIAL_DOCS,
  REQUIRED_PROJECT_LAW,
  getOptimizerConfig,
};
