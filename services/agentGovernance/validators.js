'use strict';

const path = require('path');

function finding(severity, code, message, filePath, metadata = {}) {
  return { severity, code, message, path: filePath, metadata };
}

function validateRules(rules, requiredProjectLaw) {
  const findings = [];

  for (const rule of rules) {
    if (!rule.frontmatter) {
      findings.push(finding('high', 'RULE_FRONTMATTER_MISSING', 'Rule is missing YAML frontmatter.', rule.path));
      continue;
    }

    if (!rule.frontmatter.description) {
      findings.push(finding('medium', 'RULE_DESCRIPTION_MISSING', 'Rule frontmatter is missing description.', rule.path));
    }

    if (!Object.prototype.hasOwnProperty.call(rule.frontmatter, 'alwaysApply')) {
      findings.push(finding('medium', 'RULE_ALWAYS_APPLY_MISSING', 'Rule frontmatter is missing alwaysApply.', rule.path));
    }

    const isAlwaysApply = String(rule.frontmatter.alwaysApply).trim() === 'true';
    if (isAlwaysApply && rule.lineCount > 50) {
      findings.push(finding('medium', 'RULE_TOO_LONG', 'Always-on rule should stay under 50 lines.', rule.path, {
        lineCount: rule.lineCount,
      }));
    }
  }

  const combinedRules = rules.map((rule) => rule.content).join('\n');
  for (const required of requiredProjectLaw) {
    if (!combinedRules.toLowerCase().includes(required.toLowerCase())) {
      findings.push(finding('high', 'PROJECT_LAW_MISSING_FROM_RULES', `Required project law is not visible in Cursor rules: ${required}`, '.cursor/rules'));
    }
  }

  return findings;
}

function validateSkills(skills, references) {
  const findings = [];
  const referenceSet = new Set(references.map((reference) => reference.path));

  for (const skill of skills) {
    if (!skill.frontmatter) {
      findings.push(finding('medium', 'SKILL_FRONTMATTER_MISSING', 'Skill is missing YAML frontmatter.', skill.path));
      continue;
    }

    if (!skill.frontmatter.name) {
      findings.push(finding('medium', 'SKILL_NAME_MISSING', 'Skill frontmatter is missing name.', skill.path));
    }

    if (!skill.frontmatter.description) {
      findings.push(finding('medium', 'SKILL_DESCRIPTION_MISSING', 'Skill frontmatter is missing description.', skill.path));
    }

    const links = [...skill.content.matchAll(/\]\(([^)]+\.md)\)/g)].map((match) => match[1]);
    for (const link of links) {
      if (link.startsWith('http://') || link.startsWith('https://')) continue;
      const skillDir = path.posix.dirname(skill.path);
      const linkedPath = path.posix.normalize(path.posix.join(skillDir, link));
      if (!referenceSet.has(linkedPath) && !linkedPath.endsWith('/SKILL.md')) {
        findings.push(finding('low', 'SKILL_REFERENCE_NOT_SCANNED', `Referenced markdown file was not found in scanned skill references: ${link}`, skill.path));
      }
    }
  }

  return findings;
}

function validateDocs(inventory) {
  const findings = [];
  const cursorSkills = inventory.docs.find((doc) => doc.path === 'docs/CURSOR_SKILLS.md');

  if (cursorSkills?.missing) {
    findings.push(finding('high', 'CURSOR_SKILLS_DOC_MISSING', 'docs/CURSOR_SKILLS.md is missing.', cursorSkills.path));
  } else if (cursorSkills && !cursorSkills.content.includes('trust the folder')) {
    findings.push(finding('low', 'CURSOR_SKILLS_SOURCE_OF_TRUTH_MISSING', 'Skills inventory should remind agents that the live folder wins if docs drift.', cursorSkills.path));
  }

  const liveSkillNames = inventory.skills
    .map((skill) => skill.frontmatter?.name)
    .filter(Boolean)
    .sort();

  if (cursorSkills) {
    for (const skillName of liveSkillNames) {
      if (!cursorSkills.content.includes(skillName)) {
        findings.push(finding('medium', 'SKILL_NOT_LISTED_IN_DOCS', `Live skill is not mentioned in docs/CURSOR_SKILLS.md: ${skillName}`, cursorSkills.path));
      }
    }
  }

  return findings;
}

function validateInventory(inventory, requiredProjectLaw) {
  return [
    ...validateRules(inventory.rules, requiredProjectLaw),
    ...validateSkills(inventory.skills, inventory.references),
    ...validateDocs(inventory),
  ];
}

module.exports = {
  validateInventory,
  validateRules,
  validateSkills,
  validateDocs,
};
