const test = require('node:test');
const assert = require('node:assert/strict');

test('useBestOffersCatalogDisplay: unset MM_DEPLOYMENT_ENV mirrors NODE_ENV production gate', async (t) => {
  delete process.env.MM_DEPLOYMENT_ENV;
  const orig = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    delete require.cache[require.resolve('../services/catalogDisplayPolicy')];
    const { useBestOffersCatalogDisplay } = require('../services/catalogDisplayPolicy');
    assert.equal(useBestOffersCatalogDisplay(), true);

    process.env.NODE_ENV = 'development';
    delete require.cache[require.resolve('../services/catalogDisplayPolicy')];
    const { useBestOffersCatalogDisplay: u2 } = require('../services/catalogDisplayPolicy');
    assert.equal(u2(), false);
  } finally {
    process.env.NODE_ENV = orig;
    delete require.cache[require.resolve('../services/catalogDisplayPolicy')];
  }
});

test('useBestOffersCatalogDisplay: MM_DEPLOYMENT_ENV=staging forces full catalog', async (t) => {
  const origMm = process.env.MM_DEPLOYMENT_ENV;
  const origNode = process.env.NODE_ENV;
  try {
    process.env.MM_DEPLOYMENT_ENV = 'staging';
    process.env.NODE_ENV = 'production';
    delete require.cache[require.resolve('../services/catalogDisplayPolicy')];
    const { useBestOffersCatalogDisplay } = require('../services/catalogDisplayPolicy');
    assert.equal(useBestOffersCatalogDisplay(), false);
  } finally {
    if (origMm === undefined) delete process.env.MM_DEPLOYMENT_ENV;
    else process.env.MM_DEPLOYMENT_ENV = origMm;
    process.env.NODE_ENV = origNode;
    delete require.cache[require.resolve('../services/catalogDisplayPolicy')];
  }
});

test('useBestOffersCatalogDisplay: MM_DEPLOYMENT_ENV=production forces best-offers mode', async (t) => {
  const origMm = process.env.MM_DEPLOYMENT_ENV;
  const origNode = process.env.NODE_ENV;
  try {
    process.env.MM_DEPLOYMENT_ENV = 'production';
    process.env.NODE_ENV = 'development';
    delete require.cache[require.resolve('../services/catalogDisplayPolicy')];
    const { useBestOffersCatalogDisplay } = require('../services/catalogDisplayPolicy');
    assert.equal(useBestOffersCatalogDisplay(), true);
  } finally {
    if (origMm === undefined) delete process.env.MM_DEPLOYMENT_ENV;
    else process.env.MM_DEPLOYMENT_ENV = origMm;
    process.env.NODE_ENV = origNode;
    delete require.cache[require.resolve('../services/catalogDisplayPolicy')];
  }
});
