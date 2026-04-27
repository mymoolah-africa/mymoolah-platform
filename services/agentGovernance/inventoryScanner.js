'use strict';

const fs = require('fs/promises');
const path = require('path');
const fg = require('fast-glob');

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: null, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: null, body: content };

  const raw = content.slice(3, end).trim();
  const frontmatter = {};

  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      frontmatter[match[1]] = match[2].trim();
    }
  });

  return {
    frontmatter,
    body: content.slice(end + 4),
  };
}

async function readTextFile(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const content = await fs.readFile(absolutePath, 'utf8');
  return {
    path: relativePath,
    content,
    lineCount: content.split(/\r?\n/).length,
    ...parseFrontmatter(content),
  };
}

async function scanInventory(rootDir = process.cwd()) {
  const rulePaths = await fg('.cursor/rules/*.mdc', { cwd: rootDir, onlyFiles: true });
  const skillPaths = await fg('.agents/skills/**/SKILL.md', { cwd: rootDir, onlyFiles: true });
  const referencePaths = await fg(['.agents/skills/**/reference*.md', '.agents/skills/_shared/**/*.md'], {
    cwd: rootDir,
    onlyFiles: true,
  });

  const docs = [
    'docs/CURSOR_SKILLS.md',
    'docs/CURSOR_2.0_RULES_FINAL.md',
    'CLAUDE.md',
  ];

  const [rules, skills, references, docFiles] = await Promise.all([
    Promise.all(rulePaths.sort().map((filePath) => readTextFile(rootDir, filePath))),
    Promise.all(skillPaths.sort().map((filePath) => readTextFile(rootDir, filePath))),
    Promise.all(referencePaths.sort().map((filePath) => readTextFile(rootDir, filePath))),
    Promise.all(docs.map(async (filePath) => {
      try {
        return await readTextFile(rootDir, filePath);
      } catch (error) {
        return { path: filePath, missing: true, error: error.message, content: '', lineCount: 0, frontmatter: null };
      }
    })),
  ]);

  return {
    scannedAt: new Date().toISOString(),
    rootDir,
    rules,
    skills,
    references,
    docs: docFiles,
    counts: {
      rules: rules.length,
      skills: skills.length,
      references: references.length,
      docs: docFiles.length,
    },
  };
}

module.exports = {
  parseFrontmatter,
  scanInventory,
};
