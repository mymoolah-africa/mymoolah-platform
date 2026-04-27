'use strict';

const { evaluateSafety, isAllowedPath } = require('../../services/agentGovernance/safetyGate');

describe('agent governance safety gate', () => {
  const allowedPaths = ['.cursor/rules', '.agents/skills', 'docs/CURSOR_SKILLS.md'];

  it('allows changes inside configured governance paths', () => {
    expect(isAllowedPath('.cursor/rules/git-workflow.mdc', allowedPaths)).toBe(true);
    expect(isAllowedPath('.agents/skills/auditing/SKILL.md', allowedPaths)).toBe(true);
    expect(isAllowedPath('docs/CURSOR_SKILLS.md', allowedPaths)).toBe(true);
  });

  it('blocks changes outside configured governance paths', () => {
    const result = evaluateSafety({
      findings: [],
      fileChanges: [{ path: 'server.js', content: 'console.log("no")' }],
    }, allowedPaths);

    expect(result.passed).toBe(false);
    expect(result.blocks[0].code).toBe('PATH_NOT_ALLOWED');
  });

  it('blocks potential secrets in proposed content', () => {
    const result = evaluateSafety({
      findings: [],
      fileChanges: [{ path: '.cursor/rules/test.mdc', content: 'API_TOKEN="secret-value"' }],
    }, allowedPaths);

    expect(result.passed).toBe(false);
    expect(result.blocks[0].code).toBe('SECRET_PATTERN_DETECTED');
  });
});
