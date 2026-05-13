const jwt = require('jsonwebtoken');
const { easypayAuthMiddleware, isStagingEnvironment } = require('../middleware/easypayAuth');

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createRequest(headers = {}) {
  return {
    headers,
    ip: '127.0.0.1',
    requestId: 'test-request-id',
  };
}

describe('EasyPay auth middleware', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('treats STAGING=false as production and blocks Bearer fallback', () => {
    process.env.NODE_ENV = 'production';
    process.env.STAGING = 'false';
    process.env.EASYPAY_API_KEY = 'prod-session-token';
    const token = jwt.sign({ sub: 'test' }, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const req = createRequest({ authorization: `Bearer ${token}` });
    const res = createResponse();
    const next = jest.fn();

    easypayAuthMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.details).toBe('Authorization: SessionToken {token} header is required');
  });

  it('detects only STAGING=true as staging', () => {
    process.env.STAGING = 'true';
    expect(isStagingEnvironment()).toBe(true);
    process.env.STAGING = 'false';
    expect(isStagingEnvironment()).toBe(false);
    delete process.env.STAGING;
    expect(isStagingEnvironment()).toBe(false);
  });

  it('accepts the configured SessionToken', () => {
    process.env.NODE_ENV = 'production';
    process.env.STAGING = 'false';
    process.env.EASYPAY_API_KEY = 'prod-session-token';
    const req = createRequest({ authorization: 'SessionToken prod-session-token' });
    const res = createResponse();
    const next = jest.fn();

    easypayAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });
});
