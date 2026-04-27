'use strict';

function riskFromFindings(findings) {
  if (findings.some((finding) => finding.severity === 'high')) return 'high';
  if (findings.some((finding) => finding.severity === 'medium')) return 'medium';
  return 'low';
}

function buildSummary(inventory, findings, docsResults) {
  const failedDocs = docsResults.filter((doc) => !doc.ok);

  return [
    `Scanned ${inventory.counts.rules} Cursor rules, ${inventory.counts.skills} skills, ${inventory.counts.references} skill references, and ${inventory.counts.docs} governance docs.`,
    `Found ${findings.length} validation finding(s).`,
    failedDocs.length > 0
      ? `${failedDocs.length} official documentation source(s) could not be fetched.`
      : 'Official documentation sources were reachable.',
  ].join(' ');
}

function buildProposal({ inventory, findings, docsResults }) {
  const riskLevel = riskFromFindings(findings);
  const summary = buildSummary(inventory, findings, docsResults);

  return {
    generatedAt: new Date().toISOString(),
    riskLevel,
    summary,
    findings,
    docsResults,
    fileChanges: [],
    recommendations: findings.map((item) => ({
      severity: item.severity,
      code: item.code,
      path: item.path,
      recommendation: item.message,
    })),
  };
}

function buildPullRequestBody(proposal, safetyResult) {
  const findingsList = proposal.findings.length === 0
    ? '- No validation findings.'
    : proposal.findings.map((item) => `- ${item.severity.toUpperCase()} ${item.code} (${item.path}): ${item.message}`).join('\n');

  const docsList = proposal.docsResults.length === 0
    ? '- No external docs fetched.'
    : proposal.docsResults.map((item) => `- ${item.ok ? 'OK' : 'WARN'} ${item.url}`).join('\n');

  return `## Summary
${proposal.summary}

## Safety Gate
- Passed: ${safetyResult.passed ? 'yes' : 'no'}
- Blocks: ${safetyResult.blocks.length}
- Warnings: ${safetyResult.warnings.length}

## Findings
${findingsList}

## Official Sources
${docsList}

## Review Required
This PR is draft-only. André must review and merge manually. The optimizer must never auto-merge to main.
`;
}

module.exports = {
  buildProposal,
  buildPullRequestBody,
  riskFromFindings,
};
