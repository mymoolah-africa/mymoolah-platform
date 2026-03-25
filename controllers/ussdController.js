'use strict';

const ussdSessionService = require('../services/ussdSessionService');
const ussdMenuService = require('../services/ussdMenuService');

const CELLFIND_TYPES = {
  REQUEST: '1',   // New session
  RESPONSE: '2',  // User replied
  RELEASE: '3',   // User cancelled
  TIMEOUT: '4',   // Session timed out
};

function maskMsisdn(msisdn) {
  if (!msisdn || msisdn.length < 7) return '***';
  return msisdn.slice(0, 4) + '***' + msisdn.slice(-4);
}

function buildXmlResponse(sessionId, text, type) {
  const responseType = type === 'end' ? '3' : '2';
  const escaped = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<msg>',
    `  <sessionid>${sessionId}</sessionid>`,
    `  <response type="${responseType}">${escaped}</response>`,
    '</msg>',
  ].join('\n');
}

async function handleUssdRequest(req, res) {
  const startTime = Date.now();
  const { msisdn, sessionid, type, request, networkid } = req.query;

  if (!msisdn || !sessionid) {
    console.warn('[USSD] Missing msisdn or sessionid');
    return res.status(400).type('text/xml').send(
      buildXmlResponse(sessionid || '0', 'System error.', 'end')
    );
  }

  const maskedMsisdn = maskMsisdn(msisdn);
  console.log(`[USSD] ${maskedMsisdn} type=${type} session=${sessionid} input=${(request || '').substring(0, 20)}`);

  try {
    if (type === CELLFIND_TYPES.RELEASE || type === CELLFIND_TYPES.TIMEOUT) {
      await ussdSessionService.destroySession(sessionid);
      console.log(`[USSD] Session ${sessionid} cleaned up (type=${type}) ${Date.now() - startTime}ms`);
      return res.type('text/xml').send(
        buildXmlResponse(sessionid, 'Session ended.', 'end')
      );
    }

    let session;
    if (type === CELLFIND_TYPES.REQUEST) {
      session = await ussdSessionService.createSession(sessionid, msisdn, networkid || '0');
    } else {
      session = await ussdSessionService.getSession(sessionid);
    }

    if (!session) {
      console.warn(`[USSD] No session found for ${sessionid}`);
      return res.type('text/xml').send(
        buildXmlResponse(sessionid, 'Session expired.\nPlease dial again.', 'end')
      );
    }

    if (session.msisdn !== msisdn) {
      console.error(`[USSD] MSISDN mismatch: session=${maskMsisdn(session.msisdn)} request=${maskedMsisdn}`);
      await ussdSessionService.destroySession(sessionid);
      return res.type('text/xml').send(
        buildXmlResponse(sessionid, 'Security error.\nPlease dial again.', 'end')
      );
    }

    const userInput = type === CELLFIND_TYPES.REQUEST ? null : (request || '').trim();
    const result = await ussdMenuService.processInput(session, userInput);

    if (result.sessionUpdates && Object.keys(result.sessionUpdates).length > 0) {
      await ussdSessionService.updateSession(sessionid, result.sessionUpdates);
    }

    if (result.type === 'end') {
      await ussdSessionService.destroySession(sessionid);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[USSD] ${maskedMsisdn} -> ${result.type} ${elapsed}ms state=${result.sessionUpdates?.menuState || 'end'}`);

    return res.type('text/xml').send(
      buildXmlResponse(sessionid, result.response, result.type)
    );
  } catch (err) {
    console.error(`[USSD] Error for ${maskedMsisdn}:`, err.message);
    return res.type('text/xml').send(
      buildXmlResponse(sessionid, 'Service unavailable.\nPlease try again.', 'end')
    );
  }
}

module.exports = { handleUssdRequest };
