process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/mymoolah_test';

const test = require('node:test');
const assert = require('node:assert/strict');

const tierFeeService = require('../services/tierFeeService');
const { sequelize } = require('../models');

test('dev override forces user 1 to platinum while preserving other tiers', async (t) => {
  const originalEnv = process.env.NODE_ENV;
  const originalQuery = sequelize.query;

  process.env.NODE_ENV = 'development';

  // Simple stub for sequelize.query to avoid hitting the database
  sequelize.query = async (sql) => {
    if (sql.includes('information_schema')) {
      return [{ column_name: 'tier_level' }];
    }
    if (sql.includes('FROM users')) {
      return [{ tier_level: 'silver' }];
    }
    throw new Error(`Unexpected query executed in test: ${sql}`);
  };

  try {
    const platinumTier = await tierFeeService.determineUserTierLevel(1);
    assert.equal(platinumTier, 'platinum');

    const regularTier = await tierFeeService.determineUserTierLevel(2);
    assert.equal(regularTier, 'silver');
  } finally {
    sequelize.query = originalQuery;
    process.env.NODE_ENV = originalEnv;
  }
});

