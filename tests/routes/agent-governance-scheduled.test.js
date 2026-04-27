'use strict';

jest.mock('../../middleware/cloudSchedulerAuth', () => ({
  verifyCloudSchedulerToken: (req, _res, next) => {
    req.schedulerAuth = { email: 'test-scheduler@mymoolah-db.iam.gserviceaccount.com' };
    next();
  },
}));

const mockRun = jest.fn();
jest.mock('../../services/agentGovernance/skillsRulesOptimizerService', () => ({
  SkillsRulesOptimizerService: jest.fn().mockImplementation(() => ({
    run: (...args) => mockRun(...args),
  })),
}));

const express = require('express');
const request = require('supertest');

function makeApp() {
  const app = express();
  app.use(express.json());
  const router = require('../../routes/agentGovernance');
  app.use('/api/v1/agent-governance', router);
  return app;
}

describe('POST /api/v1/agent-governance/scheduled-skills-rules-optimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('returns optimizer result envelope', async () => {
    mockRun.mockResolvedValue({
      status: 'no_changes',
      runId: 42,
      runKey: 'agent-governance:staging:2026-W18',
      filesChanged: [],
      riskLevel: 'low',
      safetyPassed: true,
      durationMs: 25,
    });

    const res = await request(makeApp())
      .post('/api/v1/agent-governance/scheduled-skills-rules-optimizer')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('no_changes');
    expect(res.body.data.triggeredBy).toMatch(/test-scheduler@/);
    expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({
      triggeredBy: 'test-scheduler@mymoolah-db.iam.gserviceaccount.com',
      force: false,
    }));
  });

  it('passes force flag only when explicitly true', async () => {
    mockRun.mockResolvedValue({ status: 'no_changes', durationMs: 1 });

    await request(makeApp())
      .post('/api/v1/agent-governance/scheduled-skills-rules-optimizer')
      .send({ force: true });

    expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
  });

  it('returns safe 500 envelope when service fails', async () => {
    mockRun.mockRejectedValue(new Error('network unavailable'));

    const res = await request(makeApp())
      .post('/api/v1/agent-governance/scheduled-skills-rules-optimizer')
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('AGENT_GOVERNANCE_OPTIMIZER_FAILED');
    expect(res.body.message).not.toContain('network unavailable');
  });
});
