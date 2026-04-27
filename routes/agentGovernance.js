'use strict';

const express = require('express');
const router = express.Router();
const { verifyCloudSchedulerToken } = require('../middleware/cloudSchedulerAuth');
const { SkillsRulesOptimizerService } = require('../services/agentGovernance/skillsRulesOptimizerService');

/**
 * @route   POST /api/v1/agent-governance/scheduled-skills-rules-optimizer
 * @desc    Cloud Scheduler-triggered weekly optimizer for Cursor rules and agent skills.
 *          Authenticated by Google OIDC. Draft-only; never merges to main.
 * @access  Cloud Scheduler only
 */
router.post('/scheduled-skills-rules-optimizer', verifyCloudSchedulerToken, async (req, res) => {
  const startTime = Date.now();
  const triggeredBy = req.schedulerAuth?.email || 'unknown';

  try {
    const optimizer = new SkillsRulesOptimizerService();
    const result = await optimizer.run({
      triggeredBy,
      force: req.body?.force === true,
    });

    return res.json({
      success: true,
      message: 'Agent governance optimizer completed',
      data: {
        ...result,
        triggeredBy,
        completedAt: new Date().toISOString(),
        durationMs: result.durationMs ?? Date.now() - startTime,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`Agent governance optimizer failed after ${durationMs}ms:`, error.message);

    return res.status(500).json({
      success: false,
      error: 'Agent governance optimizer failed',
      errorCode: 'AGENT_GOVERNANCE_OPTIMIZER_FAILED',
      message: 'Scheduled governance optimization could not be completed.',
      data: { durationMs, triggeredBy },
    });
  }
});

module.exports = router;
