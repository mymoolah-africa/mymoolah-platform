'use strict';

jest.mock('../../models', () => ({
  AgentOptimizerRun: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../services/agentGovernance/inventoryScanner', () => ({
  scanInventory: jest.fn().mockResolvedValue({
    counts: { rules: 0, skills: 0, references: 0, docs: 0 },
    rules: [],
    skills: [],
    references: [],
    docs: [],
  }),
}));

jest.mock('../../services/agentGovernance/officialDocsFetcher', () => ({
  fetchOfficialDocs: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../services/agentGovernance/validators', () => ({
  validateInventory: jest.fn().mockReturnValue([]),
}));

jest.mock('../../services/agentGovernance/proposalBuilder', () => ({
  buildProposal: jest.fn().mockReturnValue({
    generatedAt: '2026-04-27T18:36:00.000Z',
    riskLevel: 'low',
    summary: 'Draft rule update',
    findings: [],
    docsResults: [],
    recommendations: [],
    fileChanges: [{
      path: '.cursor/rules/example.mdc',
      content: '---\ndescription: example\nalwaysApply: false\n---\n\n# Example\n',
    }],
  }),
}));

const { AgentOptimizerRun } = require('../../models');
const { SkillsRulesOptimizerService } = require('../../services/agentGovernance/skillsRulesOptimizerService');

describe('SkillsRulesOptimizerService publisher integration', () => {
  it('uses mocked publisher for safe draft PR changes', async () => {
    const run = {
      id: 7,
      update: jest.fn().mockResolvedValue(undefined),
    };
    const publisher = {
      publish: jest.fn().mockResolvedValue({
        published: true,
        branchName: 'agent-governance/skills-rules-test',
        prUrl: 'https://github.com/mymoolah-africa/mymoolah-platform/pull/123',
      }),
    };

    AgentOptimizerRun.findOne.mockResolvedValue(null);
    AgentOptimizerRun.create.mockResolvedValue(run);

    const service = new SkillsRulesOptimizerService({
      config: {
        enabled: true,
        dryRun: false,
        mode: 'draft_pr',
        officialDocs: [],
        requiredProjectLaw: [],
        allowedPaths: ['.cursor/rules'],
      },
      publisher,
    });

    const result = await service.run({ triggeredBy: 'scheduler@test', runKey: 'weekly:test' });

    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('draft_pr_created');
    expect(result.prUrl).toContain('/pull/123');
  });
});
