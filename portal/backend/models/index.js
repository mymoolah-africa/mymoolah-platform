'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { Sequelize } = require('sequelize');
const PortalUser = require('./PortalUser');
const DualRoleFloat = require('./DualRoleFloat');

const PORTAL_ENV = process.env.PORTAL_ENV || process.env.MM_DEPLOYMENT_ENV || 'uat';

let dbConfig;
try {
  const helper = require('../../../scripts/db-connection-helper');

  if (PORTAL_ENV === 'production') {
    dbConfig = helper.getProductionConfig();
  } else if (PORTAL_ENV === 'staging') {
    dbConfig = helper.getStagingConfig();
  } else {
    dbConfig = helper.getUATConfig();
  }
  console.log(`Portal DB: ${PORTAL_ENV} via db-connection-helper (port ${dbConfig.port})`);
} catch (err) {
  console.error('db-connection-helper failed, check proxies:', err.message);
  process.exit(1);
}

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
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

const models = {
  PortalUser: PortalUser(sequelize, Sequelize.DataTypes),
  DualRoleFloat: DualRoleFloat(sequelize, Sequelize.DataTypes),
  sequelize,
  Sequelize
};

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
