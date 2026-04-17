'use strict';

/**
 * Integration tests for the new Cloud Scheduler endpoints:
 *   POST /api/v1/standardbank/scheduled-statement-poll
 *   POST /api/v1/standardbank/scheduled-pain002-poll
 *   POST /api/v1/reconciliation/scheduled-sftp-sweep
 *
 * Approach: mount each router onto a bare Express app and exercise via
 * supertest. Cloud Scheduler OIDC auth is stubbed out — we only care here
 * that the route wires the correct service and returns the right envelope.
 *
 * All downstream services (sbsaStatementService, pain002PollerService,
 * SFTPWatcherService, disbursement controllers, DB helpers) are mocked.
 */

// ── Mock cloudSchedulerAuth to a pass-through that injects schedulerAuth ────
jest.mock('../../middleware/cloudSchedulerAuth', () => ({
  verifyCloudSchedulerToken: (req, _res, next) => {
    req.schedulerAuth = { email: 'test-scheduler@mymoolah-db.iam.gserviceaccount.com' };
    next();
  },
}));

// ── Mock the services invoked by each endpoint ──────────────────────────────
const mockPollAndProcess = jest.fn();
jest.mock('../../services/standardbank/sbsaStatementService', () => ({
  pollAndProcess: (...args) => mockPollAndProcess(...args),
}));

const mockPollForPain002Files = jest.fn();
jest.mock('../../services/standardbank/pain002PollerService', () => ({
  pollForPain002Files: (...args) => mockPollForPain002Files(...args),
  startPolling: jest.fn(),
  stopPolling: jest.fn(),
}));

const mockCheckForNewFiles = jest.fn();
jest.mock('../../services/reconciliation/SFTPWatcherService', () => {
  return jest.fn().mockImplementation(() => ({
    checkForNewFiles: (...args) => mockCheckForNewFiles(...args),
  }));
});

// Also mock heavy controllers/services that the routers require transitively
jest.mock('../../controllers/standardbankController', () => {
  // Every handler referenced by routes/standardbank.js must exist as a function
  // so `router.post(...)` doesn't blow up at require-time.
  const stub = (_req, res) => res.status(200).json({ stub: true });
  return {
    initiatePayShapRpp: stub,
    getRppStatus: stub,
    initiatePayShapRtp: stub,
    getRtpStatus: stub,
    handlePayshapInboundCredit: stub,
    handleDepositNotification: stub,
    handleRppCallback: stub,
    handleRppCallbackWithParams: stub,
    handleRppRealtimeCallback: stub,
    handleRtpCallback: stub,
    handleRtpCallbackWithParams: stub,
    handleRtpRealtimeCallback: stub,
  };
});

// Mock the DB/models layer the reconciliation router imports at load time
jest.mock('../../models', () => ({
  sequelize: { query: jest.fn(), fn: jest.fn(), col: jest.fn() },
  Sequelize: { Op: {}, fn: jest.fn(), col: jest.fn() },
  ReconSupplierConfig: { findAll: jest.fn() },
  ReconRun: { findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
  User: {},
  Transaction: {},
  Wallet: {},
}));

jest.mock('../../scripts/db-connection-helper', () => ({
  getUATClient: jest.fn(),
  getStagingClient: jest.fn(),
  getProductionClient: jest.fn(),
}));

// Silence auth middleware for any other side-route imports
jest.mock('../../middleware/auth', () => (_req, _res, next) => next());

const express = require('express');
const request = require('supertest');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});

// ── Helper to mount routers ────────────────────────────────────────────────

function makeStandardbankApp() {
  const app = express();
  app.use(express.json());
  // Fresh require so jest.resetModules() isn't required; mocks are module-scoped.
  const router = require('../../routes/standardbank');
  app.use('/api/v1/standardbank', router);
  return app;
}

function makeReconciliationApp() {
  const app = express();
  app.use(express.json());
  const router = require('../../routes/reconciliation');
  app.use('/api/v1/reconciliation', router);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/standardbank/scheduled-statement-poll', () => {
  it('returns 200 and calls sbsaStatementService.pollAndProcess()', async () => {
    mockPollAndProcess.mockResolvedValue({ filesProcessed: 2, credited: 5 });
    const app = makeStandardbankApp();

    const res = await request(app).post('/api/v1/standardbank/scheduled-statement-poll');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.filesProcessed).toBe(2);
    expect(res.body.data.credited).toBe(5);
    expect(res.body.data.triggeredBy).toMatch(/test-scheduler@/);
    expect(mockPollAndProcess).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when pollAndProcess throws', async () => {
    mockPollAndProcess.mockRejectedValue(new Error('GCS unavailable'));
    const app = makeStandardbankApp();

    const res = await request(app).post('/api/v1/standardbank/scheduled-statement-poll');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Statement poll failed');
  });
});

describe('POST /api/v1/standardbank/scheduled-pain002-poll', () => {
  it('returns 200 and calls pain002PollerService.pollForPain002Files()', async () => {
    mockPollForPain002Files.mockResolvedValue({ processed: 1, skipped: 0, failed: 0 });
    const app = makeStandardbankApp();

    const res = await request(app).post('/api/v1/standardbank/scheduled-pain002-poll');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(1);
    expect(mockPollForPain002Files).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/v1/reconciliation/scheduled-sftp-sweep', () => {
  it('returns 200 and calls SFTPWatcherService.checkForNewFiles()', async () => {
    mockCheckForNewFiles.mockResolvedValue(undefined);
    const app = makeReconciliationApp();

    const res = await request(app).post('/api/v1/reconciliation/scheduled-sftp-sweep');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.triggeredBy).toMatch(/test-scheduler@/);
    expect(mockCheckForNewFiles).toHaveBeenCalledTimes(1);
  });
});
