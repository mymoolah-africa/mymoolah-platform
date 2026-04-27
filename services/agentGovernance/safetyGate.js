'use strict';

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b[A-Za-z0-9_]*TOKEN[A-Za-z0-9_]*\s*=\s*['"][^'"]+['"]/i,
  /\bpassword\s*[:=]\s*['"][^'"]+['"]/i,
  /\.env(\.|$)/i,
];

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function isAllowedPath(filePath, allowedPaths) {
  const normalized = normalizePath(filePath);

  return allowedPaths.some((allowedPath) => {
    const allowed = normalizePath(allowedPath).replace(/\/+$/, '');
    return normalized === allowed || normalized.startsWith(`${allowed}/`);
  });
}

function evaluateSafety(proposal, allowedPaths) {
  const blocks = [];
  const warnings = [];

  for (const change of proposal.fileChanges || []) {
    if (!isAllowedPath(change.path, allowedPaths)) {
      blocks.push({
        code: 'PATH_NOT_ALLOWED',
        message: `Proposed change is outside the optimizer allowlist: ${change.path}`,
        path: change.path,
      });
    }

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(change.content || '')) {
        blocks.push({
          code: 'SECRET_PATTERN_DETECTED',
          message: `Potential secret or sensitive configuration detected in proposed content: ${change.path}`,
          path: change.path,
        });
      }
    }
  }

  const highFindings = (proposal.findings || []).filter((item) => item.severity === 'high');
  if (highFindings.length > 0 && (proposal.fileChanges || []).length > 0) {
    warnings.push({
      code: 'HIGH_FINDINGS_REQUIRE_REVIEW',
      message: 'High-severity findings exist; generated changes must be reviewed carefully.',
      count: highFindings.length,
    });
  }

  return {
    passed: blocks.length === 0,
    blocks,
    warnings,
  };
}

module.exports = {
  evaluateSafety,
  isAllowedPath,
};
