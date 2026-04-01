'use strict';

/**
 * Cloud Scheduler OIDC Authentication Middleware
 *
 * Verifies Google-signed OIDC tokens sent by Cloud Scheduler.
 * This is GCP-native authentication — no shared secrets or API keys.
 * The token is cryptographically signed by Google and verified against
 * Google's public key infrastructure.
 *
 * Cloud Scheduler sends:  Authorization: Bearer <OIDC_TOKEN>
 * This middleware verifies the token's signature, audience, and issuer.
 *
 * Required env vars:
 *   CLOUD_SCHEDULER_SERVICE_ACCOUNT — email of the SA Cloud Scheduler uses
 *                                      (defaults to the Cloud Run SA)
 *   CLOUD_RUN_SERVICE_URL           — the Cloud Run service URL (audience claim)
 */

const { OAuth2Client } = require('google-auth-library');

const oauthClient = new OAuth2Client();

async function verifyCloudSchedulerToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const expectedAudience = process.env.CLOUD_RUN_SERVICE_URL;
    if (!expectedAudience) {
      console.error('❌ CLOUD_RUN_SERVICE_URL env var not set — cannot verify OIDC audience');
      return res.status(500).json({
        success: false,
        error: 'Server misconfigured: CLOUD_RUN_SERVICE_URL not set',
      });
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: token,
      audience: expectedAudience,
    });

    const payload = ticket.getPayload();

    const expectedSA = process.env.CLOUD_SCHEDULER_SERVICE_ACCOUNT;
    if (expectedSA && payload.email !== expectedSA) {
      console.error(`❌ OIDC token email mismatch: got ${payload.email}, expected ${expectedSA}`);
      return res.status(403).json({
        success: false,
        error: 'Token service account not authorised',
      });
    }

    if (!payload.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Token email not verified',
      });
    }

    req.schedulerAuth = {
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };

    next();
  } catch (error) {
    console.error('❌ OIDC token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired OIDC token',
    });
  }
}

module.exports = { verifyCloudSchedulerToken };
