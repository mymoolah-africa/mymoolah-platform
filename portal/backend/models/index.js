'use strict';

// Load environment variables from parent directory
require('dotenv').config({ path: '../../../.env' });

const { Sequelize } = require('sequelize');
const PortalUser = require('./PortalUser');
const DualRoleFloat = require('./DualRoleFloat');

// Database configuration
const sequelize = new Sequelize(
  process.env.PORTAL_DB_NAME || 'mymoolah',
  process.env.PORTAL_DB_USER || 'mymoolah_app',
  process.env.PORTAL_DB_PASSWORD || 'AppPass_1755005621204_ChangeMe',
  {
    host: process.env.PORTAL_DB_HOST || '127.0.0.1',
    port: process.env.PORTAL_DB_PORT || 5433,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

// Initialize models
const models = {
  PortalUser: PortalUser(sequelize, Sequelize.DataTypes),
  DualRoleFloat: DualRoleFloat(sequelize, Sequelize.DataTypes),
  sequelize,
  Sequelize
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
