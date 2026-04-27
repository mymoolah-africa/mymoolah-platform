'use strict';

const moment = require('moment-timezone');
const { AgentOptimizerRun } = require('../../models');
const { getOptimizerConfig } = require('./config');
const { scanInventory } = require('./inventoryScanner');
const { fetchOfficialDocs } = require('./officialDocsFetcher');
const { validateInventory } = require('./validators');
const { buildProposal } = require('./proposalBuilder');
const { evaluateSafety } = require('./safetyGate');
const GitHubDraftPublisher = require('./githubDraftPublisher');

function getEnvironment() {
  return process.env.MM_DEPLOYMENT_ENV || process.env.NODE_ENV || 'unknown';
}

function getWeeklyRunKey(date = new Date(), environment = getEnvironment()) {
  const week = moment(date).tz('Africa/Johannesburg').format('GGGG-[W]WW');
  return `agent-governance:${environment}:${week}`;
}

class SkillsRulesOptimizerService {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.config = options.config || getOptimizerConfig();
    this.publisher = options.publisher || new GitHubDraftPublisher(this.config);
  }

  async run({ triggeredBy = 'unknown', runKey, force = false } = {}) {
    const startTime = Date.now();
    const environment = getEnvironment();
    const effectiveRunKey = runKey || getWeeklyRunKey(new Date(), environment);

    if (!this.config.enabled) {
      return {
        success: true,
        status: 'skipped',
        runKey: effectiveRunKey,
        message: 'Agent governance optimizer is disabled',
        durationMs: Date.now() - startTime,
      };
    }

    const existingRun = await AgentOptimizerRun.findOne({ where: { run_key: effectiveRunKey } });
    if (existingRun && !force && !['failed'].includes(existingRun.status)) {
      return {
        success: true,
        status: existingRun.status,
        runId: existingRun.id,
        runKey: effectiveRunKey,
        duplicate: true,
        branchName: existingRun.branch_name,
        prUrl: existingRun.pr_url,
        riskLevel: existingRun.risk_level,
        filesChanged: existingRun.files_changed || [],
        durationMs: Date.now() - startTime,
      };
    }

    const run = existingRun || await AgentOptimizerRun.create({
      run_key: effectiveRunKey,
      status: 'processing',
      triggered_by: triggeredBy,
      environment,
      mode: this.config.mode,
      started_at: new Date(),
    });

    try {
      await run.update({
        status: 'processing',
        triggered_by: triggeredBy,
        mode: this.config.mode,
        error_message: null,
      });

      const inventory = await scanInventory(this.rootDir);
      const docsResults = await fetchOfficialDocs(this.config.officialDocs);
      const findings = validateInventory(inventory, this.config.requiredProjectLaw);
      const proposal = buildProposal({ inventory, findings, docsResults });
      const safetyResult = evaluateSafety(proposal, this.config.allowedPaths);

      let publishResult = { published: false, reason: this.config.dryRun ? 'DRY_RUN' : 'NO_FILE_CHANGES' };
      if (!this.config.dryRun && this.config.mode === 'draft_pr' && safetyResult.passed) {
        publishResult = await this.publisher.publish({
          proposal,
          safetyResult,
          runKey: effectiveRunKey,
        });
      }

      const status = publishResult.published
        ? 'draft_pr_created'
        : proposal.fileChanges.length === 0
          ? 'no_changes'
          : 'completed';

      await run.update({
        status,
        branch_name: publishResult.branchName || null,
        pr_url: publishResult.prUrl || null,
        files_changed: proposal.fileChanges.map((change) => change.path),
        findings,
        risk_level: proposal.riskLevel,
        summary: proposal.summary,
        metadata: {
          counts: inventory.counts,
          docsResults,
          safetyResult,
          publishResult,
          dryRun: this.config.dryRun,
        },
        finished_at: new Date(),
      });

      return {
        success: true,
        status,
        runId: run.id,
        runKey: effectiveRunKey,
        branchName: publishResult.branchName || null,
        prUrl: publishResult.prUrl || null,
        filesChanged: proposal.fileChanges.map((change) => change.path),
        findingsCount: findings.length,
        riskLevel: proposal.riskLevel,
        safetyPassed: safetyResult.passed,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      await run.update({
        status: 'failed',
        error_message: error.message,
        finished_at: new Date(),
      });

      throw error;
    }
  }
}

module.exports = {
  SkillsRulesOptimizerService,
  getWeeklyRunKey,
};
