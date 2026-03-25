'use strict';

/**
 * IP whitelist middleware for USSD endpoint.
 * Only allows requests from Cellfind IPs configured in CELLFIND_ALLOWED_IPS.
 * Falls back to allowing all IPs in development if not configured.
 */
function ussdIpWhitelist(req, res, next) {
  const allowedRaw = process.env.CELLFIND_ALLOWED_IPS || '';
  const allowedIps = allowedRaw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (!allowedIps.length) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[USSD-SECURITY] CELLFIND_ALLOWED_IPS not configured in production — blocking request');
      return res.status(403).type('text/xml').send(
        '<?xml version="1.0"?><msg><response type="3">Service unavailable.</response></msg>'
      );
    }
    return next();
  }

  const clientIp = (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.ip ||
    ''
  ).replace(/^::ffff:/, '');

  if (allowedIps.includes(clientIp)) {
    return next();
  }

  console.warn(`[USSD-SECURITY] Blocked request from ${clientIp} — not in whitelist`);
  return res.status(403).type('text/xml').send(
    '<?xml version="1.0"?><msg><response type="3">Access denied.</response></msg>'
  );
}

module.exports = ussdIpWhitelist;
