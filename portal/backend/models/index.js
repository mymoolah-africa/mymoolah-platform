'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { Sequelize } = require('sequelize');
const PortalUser = require('./PortalUser');
const DualRoleFloat = require('./DualRoleFloat');

const dbName = process.env.PORTAL_DB_NAME || process.env.DB_NAME;
const dbUser = process.env.PORTAL_DB_USER || process.env.DB_USER;
const dbPassword = process.env.PORTAL_DB_PASSWORD || process.env.DB_PASSWORD;
const dbHost = process.env.PORTAL_DB_HOST || process.env.DB_HOST || '127.0.0.1';
const dbPort = process.env.PORTAL_DB_PORT || process.env.DB_PORT || 5432;

if (!dbName || !dbUser || !dbPassword) {
  console.error('FATAL: Database credentials not configured. Set PORTAL_DB_NAME, PORTAL_DB_USER, PORTAL_DB_PASSWORD (or DB_NAME, DB_USER, DB_PASSWORD).');
}

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    port: dbPort,
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
