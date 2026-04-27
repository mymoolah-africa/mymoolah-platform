'use strict';

const axios = require('axios');
const { buildPullRequestBody } = require('./proposalBuilder');

class GitHubDraftPublisher {
  constructor(config) {
    this.config = config;
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (config.githubToken) {
      headers.Authorization = `Bearer ${config.githubToken}`;
    }

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 15000,
      headers,
    });
  }

  ensureConfigured() {
    if (!this.config.githubToken) {
      throw new Error('GitHub token not configured for draft PR publishing');
    }

    if (!this.config.githubRepository || !this.config.githubRepository.includes('/')) {
      throw new Error('GITHUB_REPOSITORY must be in owner/repo format');
    }
  }

  async getBaseSha() {
    const { data } = await this.client.get(`/repos/${this.config.githubRepository}/git/ref/heads/${this.config.baseBranch}`);
    return data.object.sha;
  }

  async createOrGetBranch(branchName, baseSha) {
    try {
      await this.client.get(`/repos/${this.config.githubRepository}/git/ref/heads/${branchName}`);
      return;
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }

    await this.client.post(`/repos/${this.config.githubRepository}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
  }

  async upsertFile(branchName, change) {
    let sha;
    const filePath = String(change.path || '').split('/').map(encodeURIComponent).join('/');
    try {
      const { data } = await this.client.get(`/repos/${this.config.githubRepository}/contents/${filePath}`, {
        params: { ref: branchName },
      });
      sha = data.sha;
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }

    await this.client.put(`/repos/${this.config.githubRepository}/contents/${filePath}`, {
      message: change.message || `docs: update ${change.path}`,
      content: Buffer.from(change.content || '', 'utf8').toString('base64'),
      branch: branchName,
      sha,
    });
  }

  async findExistingPullRequest(branchName) {
    const { data } = await this.client.get(`/repos/${this.config.githubRepository}/pulls`, {
      params: {
        state: 'open',
        head: `${this.config.githubRepository.split('/')[0]}:${branchName}`,
        base: this.config.baseBranch,
      },
    });
    return data[0] || null;
  }

  async publish({ proposal, safetyResult, runKey }) {
    this.ensureConfigured();

    if (!proposal.fileChanges || proposal.fileChanges.length === 0) {
      return { published: false, reason: 'NO_FILE_CHANGES' };
    }

    const branchName = `agent-governance/skills-rules-${runKey.replace(/[^A-Za-z0-9._-]/g, '-')}`;
    const baseSha = await this.getBaseSha();
    await this.createOrGetBranch(branchName, baseSha);

    for (const change of proposal.fileChanges) {
      await this.upsertFile(branchName, change);
    }

    const title = 'docs: weekly skills and rules optimization';
    const body = buildPullRequestBody(proposal, safetyResult);
    const existing = await this.findExistingPullRequest(branchName);

    if (existing) {
      await this.client.patch(`/repos/${this.config.githubRepository}/pulls/${existing.number}`, {
        title,
        body,
      });
      return { published: true, branchName, prUrl: existing.html_url, pullRequestNumber: existing.number };
    }

    const { data } = await this.client.post(`/repos/${this.config.githubRepository}/pulls`, {
      title,
      body,
      head: branchName,
      base: this.config.baseBranch,
      draft: true,
    });

    return { published: true, branchName, prUrl: data.html_url, pullRequestNumber: data.number };
  }
}

module.exports = GitHubDraftPublisher;
