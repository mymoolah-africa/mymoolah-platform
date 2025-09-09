'use strict';

const { PortalUser, DualRoleFloat } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AdminController {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
  }

  /**
   * Admin Dashboard - Get comprehensive system overview
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboard(req, res) {
    try {
      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();
      
      // Get dual-role entities overview
      const dualRoleEntities = await this.getDualRoleEntitiesOverview();
      
      // Get settlement summary
      const settlementSummary = await this.getSettlementSummary();
      
      // Get recent alerts
      const recentAlerts = await this.getRecentAlerts();
      
      // Get performance analytics
      const performanceAnalytics = await this.getPerformanceAnalytics();

      res.json({
        success: true,
        data: {
          systemMetrics,
          dualRoleEntities,
          settlementSummary,
          recentAlerts,
          performanceAnalytics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin dashboard',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get system metrics
   * @returns {Object} System metrics
   */
  async getSystemMetrics() {
    try {
      // Get total portal users
      const totalPortalUsers = await PortalUser.count({
        where: { isActive: true }
      });

      // Get dual-role entities count
      const dualRoleEntitiesCount = await DualRoleFloat.count({
        where: { isActive: true }
      });

      // Get entities by type
      const entitiesByType = await PortalUser.findAll({
        attributes: [
          'entityType',
          [PortalUser.sequelize.fn('COUNT', PortalUser.sequelize.col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['entityType']
      });

      // Get recent activity (last 24 hours)
      const recentActivity = await PortalUser.count({
        where: {
          isActive: true,
          lastLoginAt: {
            [PortalUser.sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      return {
        totalPortalUsers,
        dualRoleEntitiesCount,
        entitiesByType: entitiesByType.reduce((acc, item) => {
          acc[item.entityType] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
        recentActivity,
        systemHealth: 'healthy',
        uptime: process.uptime()
      };

    } catch (error) {
      console.error('Error getting system metrics:', error);
      return {
        totalPortalUsers: 0,
        dualRoleEntitiesCount: 0,
        entitiesByType: {},
        recentActivity: 0,
        systemHealth: 'error',
        uptime: 0
      };
    }
  }

  /**
   * Get dual-role entities overview
   * @returns {Array} Dual-role entities data
   */
  async getDualRoleEntitiesOverview() {
    try {
      const dualRoleEntities = await DualRoleFloat.findAll({
        where: { isActive: true },
        attributes: [
          'entityId',
          'entityName',
          'entityType',
          'primaryRole',
          'roles',
          'supplierFloatBalance',
          'merchantFloatBalance',
          'netBalance',
          'status',
          'nextSettlementAt'
        ],
        order: [['netBalance', 'DESC']]
      });

      return dualRoleEntities.map(entity => ({
        entityId: entity.entityId,
        entityName: entity.entityName,
        entityType: entity.entityType,
        primaryRole: entity.primaryRole,
        roles: entity.roles,
        supplierBalance: parseFloat(entity.supplierFloatBalance),
        merchantBalance: parseFloat(entity.merchantFloatBalance),
        netBalance: parseFloat(entity.netBalance),
        status: entity.status,
        nextSettlementAt: entity.nextSettlementAt,
        requiresSettlement: Math.abs(parseFloat(entity.netBalance)) >= parseFloat(entity.netSettlementThreshold || 1000)
      }));

    } catch (error) {
      console.error('Error getting dual-role entities overview:', error);
      return [];
    }
  }

  /**
   * Get settlement summary
   * @returns {Object} Settlement summary data
   */
  async getSettlementSummary() {
    try {
      const settlementData = await DualRoleFloat.findAll({
        where: { isActive: true },
        attributes: [
          'entityId',
          'entityName',
          'netBalance',
          'nextSettlementAt',
          'autoSettlementEnabled'
        ]
      });

      const pendingSettlements = settlementData.filter(entity => 
        Math.abs(parseFloat(entity.netBalance)) >= parseFloat(entity.netSettlementThreshold || 1000)
      );

      const totalSettlementAmount = settlementData.reduce((sum, entity) => {
        return sum + Math.abs(parseFloat(entity.netBalance));
      }, 0);

      const nextSettlement = settlementData
        .filter(entity => entity.nextSettlementAt)
        .sort((a, b) => new Date(a.nextSettlementAt) - new Date(b.nextSettlementAt))[0];

      return {
        pendingSettlements: pendingSettlements.length,
        totalSettlementAmount: totalSettlementAmount,
        nextSettlementAt: nextSettlement?.nextSettlementAt,
        autoSettlementEnabled: settlementData.filter(entity => entity.autoSettlementEnabled).length,
        settlementBreakdown: pendingSettlements.map(entity => ({
          entityId: entity.entityId,
          entityName: entity.entityName,
          settlementAmount: Math.abs(parseFloat(entity.netBalance)),
          direction: parseFloat(entity.netBalance) > 0 ? 'payout' : 'collection'
        }))
      };

    } catch (error) {
      console.error('Error getting settlement summary:', error);
      return {
        pendingSettlements: 0,
        totalSettlementAmount: 0,
        nextSettlementAt: null,
        autoSettlementEnabled: 0,
        settlementBreakdown: []
      };
    }
  }

  /**
   * Get recent alerts
   * @returns {Array} Recent alerts
   */
  async getRecentAlerts() {
    try {
      // This would typically come from a monitoring system
      // For now, we'll generate some sample alerts based on data
      const alerts = [];

      // Check for low float balances
      const lowFloatEntities = await DualRoleFloat.findAll({
        where: {
          isActive: true,
          [DualRoleFloat.sequelize.Op.or]: [
            { supplierFloatBalance: { [DualRoleFloat.sequelize.Op.lt]: 10000 } },
            { merchantFloatBalance: { [DualRoleFloat.sequelize.Op.lt]: 10000 } }
          ]
        },
        attributes: ['entityId', 'entityName', 'supplierFloatBalance', 'merchantFloatBalance']
      });

      lowFloatEntities.forEach(entity => {
        if (parseFloat(entity.supplierFloatBalance) < 10000) {
          alerts.push({
            type: 'warning',
            category: 'float_balance',
            title: 'Low Supplier Float Balance',
            message: `${entity.entityName} has low supplier float balance: R${entity.supplierFloatBalance}`,
            entityId: entity.entityId,
            timestamp: new Date().toISOString()
          });
        }
        if (parseFloat(entity.merchantFloatBalance) < 10000) {
          alerts.push({
            type: 'warning',
            category: 'float_balance',
            title: 'Low Merchant Float Balance',
            message: `${entity.entityName} has low merchant float balance: R${entity.merchantFloatBalance}`,
            entityId: entity.entityId,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Check for pending settlements
      const pendingSettlements = await DualRoleFloat.count({
        where: {
          isActive: true,
          netBalance: {
            [DualRoleFloat.sequelize.Op.gte]: 1000
          }
        }
      });

      if (pendingSettlements > 0) {
        alerts.push({
          type: 'info',
          category: 'settlement',
          title: 'Pending Settlements',
          message: `${pendingSettlements} entities have pending settlements`,
          timestamp: new Date().toISOString()
        });
      }

      return alerts.slice(0, 10); // Return latest 10 alerts

    } catch (error) {
      console.error('Error getting recent alerts:', error);
      return [];
    }
  }

  /**
   * Get performance analytics
   * @returns {Object} Performance analytics data
   */
  async getPerformanceAnalytics() {
    try {
      // Get portal user activity over time
      const userActivity = await PortalUser.findAll({
        attributes: [
          [PortalUser.sequelize.fn('DATE', PortalUser.sequelize.col('lastLoginAt')), 'date'],
          [PortalUser.sequelize.fn('COUNT', PortalUser.sequelize.col('id')), 'count']
        ],
        where: {
          isActive: true,
          lastLoginAt: {
            [PortalUser.sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        group: [PortalUser.sequelize.fn('DATE', PortalUser.sequelize.col('lastLoginAt'))],
        order: [[PortalUser.sequelize.fn('DATE', PortalUser.sequelize.col('lastLoginAt')), 'ASC']]
      });

      // Get entity type distribution
      const entityDistribution = await PortalUser.findAll({
        attributes: [
          'entityType',
          [PortalUser.sequelize.fn('COUNT', PortalUser.sequelize.col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['entityType']
      });

      return {
        userActivity: userActivity.map(item => ({
          date: item.dataValues.date,
          count: parseInt(item.dataValues.count)
        })),
        entityDistribution: entityDistribution.map(item => ({
          type: item.entityType,
          count: parseInt(item.dataValues.count)
        })),
        totalActiveUsers: await PortalUser.count({ where: { isActive: true } }),
        dualRoleEntities: await DualRoleFloat.count({ where: { isActive: true } })
      };

    } catch (error) {
      console.error('Error getting performance analytics:', error);
      return {
        userActivity: [],
        entityDistribution: [],
        totalActiveUsers: 0,
        dualRoleEntities: 0
      };
    }
  }

  /**
   * Get all portal users with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPortalUsers(req, res) {
    try {
      const { page = 1, limit = 20, entityType, search } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = { isActive: true };
      
      if (entityType) {
        where.entityType = entityType;
      }
      
      if (search) {
        where[PortalUser.sequelize.Op.or] = [
          { entityName: { [PortalUser.sequelize.Op.iLike]: `%${search}%` } },
          { email: { [PortalUser.sequelize.Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await PortalUser.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        attributes: [
          'id',
          'entityId',
          'entityName',
          'entityType',
          'email',
          'role',
          'hasDualRole',
          'dualRoles',
          'isActive',
          'isVerified',
          'lastLoginAt',
          'createdAt'
        ]
      });

      res.json({
        success: true,
        data: {
          users: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / parseInt(limit))
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching portal users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch portal users',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create new portal user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createPortalUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        entityId,
        entityName,
        entityType,
        email,
        password,
        role = 'user',
        hasDualRole = false,
        dualRoles = [],
        permissions = {}
      } = req.body;

      // Check if user already exists
      const existingUser = await PortalUser.findOne({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Portal user with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create portal user
      const portalUser = await PortalUser.create({
        entityId,
        entityName,
        entityType,
        email,
        passwordHash,
        role,
        hasDualRole,
        dualRoles,
        permissions,
        isActive: true,
        isVerified: false
      });

      // Create dual-role float if applicable
      if (hasDualRole && dualRoles.length > 0) {
        await DualRoleFloat.create({
          entityId,
          entityName,
          entityType,
          roles: dualRoles,
          primaryRole: dualRoles[0],
          isActive: true
        });
      }

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: portalUser.id,
            entityId: portalUser.entityId,
            entityName: portalUser.entityName,
            entityType: portalUser.entityType,
            email: portalUser.email,
            role: portalUser.role,
            hasDualRole: portalUser.hasDualRole,
            dualRoles: portalUser.dualRoles,
            isActive: portalUser.isActive,
            createdAt: portalUser.createdAt
          }
        },
        message: 'Portal user created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error creating portal user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create portal user',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          portal: 'operational'
        },
        metrics: {
          totalPortalUsers: await PortalUser.count({ where: { isActive: true } }),
          dualRoleEntities: await DualRoleFloat.count({ where: { isActive: true } }),
          uptime: process.uptime()
        }
      };

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = AdminController;
