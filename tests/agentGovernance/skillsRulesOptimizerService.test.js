'use strict';

jest.mock('../../models', () => ({
  AgentOptimizerRun: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../services/agentGovernance/inventoryScanner', () => ({
  scanInventory: jest.fn(),
}));

jest.mock('../../services/agentGovernance/officialDocsFetcher', () => ({
  fetchOfficialDocs: jest.fn(),
}));

const { AgentOptimizerRun } = require('../../models');
const { scanInventory } = require('../../services/agentGovernance/inventoryScanner');
const { fetchOfficialDocs } = require('../../services/agentGovernance/officialDocsFetcher');
const { SkillsRulesOptimizerService } = require('../../services/agentGovernance/skillsRulesOptimizerService');

function mockRunRecord(overrides = {}) {
  return {
    id: 123,
    status: 'processing',
    branch_name: null,
    pr_url: null,
    risk_level: 'low',
    files_changed: [],
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SkillsRulesOptimizerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MM_DEPLOYMENT_ENV = 'staging';

    scanInventory.mockResolvedValue({
      counts: { rules: 1, skills: 1, references: 0, docs: 3 },
      rules: [{
        path: '.cursor/rules/git-workflow.mdc',
        content: [
          'db-connection-helper.js',
          'parameterized',
          'HS512',
          'PII',
          'one-click-restart-and-start.sh',
          'Figma is historical',
          'real data',
          'approval before destructive',
        ].join('\n'),
        lineCount: 10,
        frontmatter: { description: 'x', alwaysApply: 'true' },
      }],
      skills: [{
        path: '.agents/skills/auditing/SKILL.md',
        content: '---\nname: auditing\ndescription: Audit skill\n---\n',
        lineCount: 4,
        frontmatter: { name: 'auditing', description: 'Audit skill' },
      }],
      references: [],
      docs: [{
        path: 'docs/CURSOR_SKILLS.md',
        content: 'trust the folder auditing',
        lineCount: 1,
        frontmatter: null,
      }],
    });

    fetchOfficialDocs.mockResolvedValue([{ url: 'https://cursor.com/docs/rules', ok: true }]);
  });

  afterEach(() => {
    delete process.env.MM_DEPLOYMENT_ENV;
  });

  it('returns skipped when optimizer is disabled', async () => {
    const service = new SkillsRulesOptimizerService({
      config: { enabled: false },
      publisher: { publish: jest.fn() },
    });

    const result = await service.run({ triggeredBy: 'scheduler@test', runKey: 'weekly:test' });

    expect(result.status).toBe('skipped');
    expect(AgentOptimizerRun.findOne).not.toHaveBeenCalled();
  });

  it('returns existing run on duplicate weekly execution', async () => {
    AgentOptimizerRun.findOne.mockResolvedValue(mockRunRecord({ status: 'no_changes' }));

    const service = new SkillsRulesOptimizerService({
      config: { enabled: true, dryRun: true, mode: 'dry_run', officialDocs: [], requiredProjectLaw: [] },
      publisher: { publish: jest.fn() },
    });

    const result = await service.run({ triggeredBy: 'scheduler@test', runKey: 'weekly:test' });

    expect(result.duplicate).toBe(true);
    expect(result.status).toBe('no_changes');
  });

  it('scans and stores a no_changes dry run', async () => {
    const run = mockRunRecord();
    AgentOptimizerRun.findOne.mockResolvedValue(null);
    AgentOptimizerRun.create.mockResolvedValue(run);

    const service = new SkillsRulesOptimizerService({
      config: {
        enabled: true,
        dryRun: true,
        mode: 'dry_run',
        officialDocs: ['https://cursor.com/docs/rules'],
        requiredProjectLaw: [
          'db-connection-helper.js',
          'parameterized',
          'HS512',
          'PII',
          'one-click-restart-and-start.sh',
          'Figma is historical',
          'real data',
          'approval before destructive',
        ],
        allowedPaths: ['.cursor/rules'],
      },
      publisher: { publish: jest.fn() },
    });

    const result = await service.run({ triggeredBy: 'scheduler@test', runKey: 'weekly:test' });

    expect(result.status).toBe('no_changes');
    expect(result.findingsCount).toBe(0);
    expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'no_changes' }));
  });
});
