#!/usr/bin/env node
'use strict';

/**
 * Guard that keeps the support FAQ/RAG source current with the latest changelog.
 *
 * The live AI support KB is generated from docs/FAQ_MASTER.md and embedded into
 * ai_knowledge_base. This check is intentionally local/read-only: it prevents
 * commits/pushes when FAQ_MASTER.md is dated before the newest CHANGELOG entry.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const changelogPath = path.join(repoRoot, 'docs', 'CHANGELOG.md');
const faqPath = path.join(repoRoot, 'docs', 'FAQ_MASTER.md');
const plainMode = process.argv.includes('--plain');

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function emitHook(payload, exitCode) {
  if (plainMode) {
    if (payload.permission === 'allow') {
      console.log(payload.user_message || 'Support KB freshness check passed.');
    } else {
      console.error(payload.user_message || 'Support KB freshness check failed.');
    }
  } else {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }
  process.exit(exitCode);
}

function parseIsoDate(value) {
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function parseFaqDate(value) {
  const text = String(value).trim();
  const iso = parseIsoDate(text);
  if (iso) return iso;

  const match = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;

  const [, day, monthName, year] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;

  return new Date(Date.UTC(Number(year), month, Number(day)));
}

function fmt(date) {
  return date.toISOString().slice(0, 10);
}

try {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const faq = fs.readFileSync(faqPath, 'utf8');

  const changelogDate = parseIsoDate(changelog);
  const faqDateMatch = faq.match(/_Last updated:\s*([^_]+)_/i);
  const faqDate = faqDateMatch ? parseFaqDate(faqDateMatch[1]) : null;

  if (!changelogDate) {
    emitHook({
      permission: 'deny',
      user_message: 'Could not find the latest YYYY-MM-DD heading in docs/CHANGELOG.md. Update the changelog before committing or pushing.',
      agent_message: 'Support KB freshness guard could not parse CHANGELOG.md.',
    }, 2);
  }

  if (!faqDate) {
    emitHook({
      permission: 'deny',
      user_message: 'Could not parse the `_Last updated:` date in docs/FAQ_MASTER.md. Update the support FAQ date before committing or pushing.',
      agent_message: 'Support KB freshness guard could not parse FAQ_MASTER.md.',
    }, 2);
  }

  if (faqDate < changelogDate) {
    emitHook({
      permission: 'deny',
      user_message: `Support KB is stale: docs/FAQ_MASTER.md is dated ${fmt(faqDate)}, but docs/CHANGELOG.md has a newer ${fmt(changelogDate)} entry. Update FAQ_MASTER.md and regenerate/re-embed the KB before committing or pushing to main.`,
      agent_message: 'Update docs/FAQ_MASTER.md, then run npm run generate:kb and npm run embed:kb for the target environment after approval.',
    }, 2);
  }

  emitHook({
    permission: 'allow',
    user_message: `Support KB freshness check passed: FAQ ${fmt(faqDate)} covers latest changelog date ${fmt(changelogDate)}.`,
  }, 0);
} catch (error) {
  emitHook({
    permission: 'deny',
    user_message: `Support KB freshness check failed: ${error.message}`,
    agent_message: 'Fix the local docs/filesystem issue before committing or pushing.',
  }, 2);
}
