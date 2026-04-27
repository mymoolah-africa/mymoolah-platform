'use strict';

jest.mock('../../services/agentGovernance/skillsRulesOptimizerService', () => ({
  SkillsRulesOptimizerService: jest.fn().mockImplementation(() => ({
    run: jest.fn(),
  })),
}));

const express = require('express');
const request = require('supertest');

describe('agent governance scheduler auth', () => {
  it('rejects unauthenticated scheduler calls', async () => {
    const app = express();
    app.use(express.json());
    const router = require('../../routes/agentGovernance');
    app.use('/api/v1/agent-governance', router);

    const res = await request(app)
      .post('/api/v1/agent-governance/scheduled-skills-rules-optimizer')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
