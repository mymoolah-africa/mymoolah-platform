/**
 * Product Availability Logger Service
 * 
 * Logs product availability issues and generates daily reports
 * Tracks when products are unavailable from suppliers and whether
 * alternatives were used successfully
 */

const models = require('../models');
const { ProductAvailabilityLog, Supplier, ProductVariant } = models;

class ProductAvailabilityLogger {
  constructor() {
    this.enabled = process.env.PRODUCT_AVAILABILITY_LOGGING_ENABLED !== 'false';
  }

  /**
   * Log a product availability issue
   * @param {Object} logData - Log data
   * @param {number} logData.variantId - Product variant ID that failed
   * @param {string} logData.supplierCode - Supplier code (MOBILEMART, FLASH, etc.)
   * @param {string} logData.productName - Product name
   * @param {string} logData.productType - Product type (airtime, data, etc.)
   * @param {string} logData.errorCode - Error code from supplier
   * @param {string} logData.errorMessage - Error message from supplier
   * @param {number} logData.userId - User ID who attempted purchase
   * @param {number} logData.beneficiaryId - Beneficiary ID
   * @param {number} logData.amountInCents - Purchase amount in cents
   * @param {boolean} logData.alternativeUsed - Whether alternative was used
   * @param {string} logData.alternativeSupplierCode - Alternative supplier code
   * @param {number} logData.alternativeVariantId - Alternative variant ID
   * @param {Object} logData.metadata - Additional metadata
   */
  async logAvailabilityIssue(logData) {
    if (!this.enabled) {
      return null;
    }

    try {
      // Get supplier ID from supplier code
      const supplier = await Supplier.findOne({
        where: { code: logData.supplierCode }
      });

      if (!supplier) {
        console.error(`❌ Supplier not found for code: ${logData.supplierCode}`);
        return null;
      }

      const availabilityLog = await ProductAvailabilityLog.create({
        variantId: logData.variantId || null,
        supplierId: supplier.id,
        supplierCode: logData.supplierCode,
        productName: logData.productName,
        productType: logData.productType,
        errorCode: logData.errorCode || null,
        errorMessage: logData.errorMessage || null,
        userId: logData.userId || null,
        beneficiaryId: logData.beneficiaryId || null,
        amountInCents: logData.amountInCents || null,
        alternativeUsed: logData.alternativeUsed || false,
        alternativeSupplierCode: logData.alternativeSupplierCode || null,
        alternativeVariantId: logData.alternativeVariantId || null,
        logDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        metadata: logData.metadata || {}
      });

      console.log(`📝 Logged product availability issue: ${logData.productName} from ${logData.supplierCode}`);
      return availabilityLog;
    } catch (error) {
      console.error('❌ Failed to log product availability issue:', error.message);
      return null;
    }
  }

  /**
   * Generate daily report of unavailable products
   * @param {Date} date - Date to generate report for (defaults to yesterday)
   * @returns {Object} Daily report
   */
  async generateDailyReport(date = null) {
    if (!this.enabled) {
      return null;
    }

    try {
      const reportDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const dateString = reportDate.toISOString().split('T')[0];

      // Get all logs for the date
      const logs = await ProductAvailabilityLog.findAll({
        where: {
          logDate: dateString
        },
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'code', 'name']
          },
          {
            model: ProductVariant,
            as: 'variant',
            attributes: ['id', 'productName', 'supplierProductId'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Aggregate statistics
      const stats = {
        date: dateString,
        totalIssues: logs.length,
        bySupplier: {},
        byProductType: {},
        byErrorCode: {},
        alternativesUsed: 0,
        alternativesNotUsed: 0,
        uniqueProducts: new Set(),
        uniqueUsers: new Set()
      };

      logs.forEach(log => {
        // By supplier
        const supplierCode = log.supplierCode;
        if (!stats.bySupplier[supplierCode]) {
          stats.bySupplier[supplierCode] = {
            count: 0,
            products: []
          };
        }
        stats.bySupplier[supplierCode].count++;
        if (!stats.bySupplier[supplierCode].products.includes(log.productName)) {
          stats.bySupplier[supplierCode].products.push(log.productName);
        }

        // By product type
        if (!stats.byProductType[log.productType]) {
          stats.byProductType[log.productType] = 0;
        }
        stats.byProductType[log.productType]++;

        // By error code
        const errorCode = log.errorCode || 'UNKNOWN';
        if (!stats.byErrorCode[errorCode]) {
          stats.byErrorCode[errorCode] = {
            count: 0,
            message: log.errorMessage || 'No message'
          };
        }
        stats.byErrorCode[errorCode].count++;

        // Alternatives
        if (log.alternativeUsed) {
          stats.alternativesUsed++;
        } else {
          stats.alternativesNotUsed++;
        }

        // Unique counts
        if (log.variantId) {
          stats.uniqueProducts.add(log.variantId);
        }
        if (log.userId) {
          stats.uniqueUsers.add(log.userId);
        }
      });

      stats.uniqueProductsCount = stats.uniqueProducts.size;
      stats.uniqueUsersCount = stats.uniqueUsers.size;
      delete stats.uniqueProducts;
      delete stats.uniqueUsers;

      // Convert to arrays for JSON serialization
      Object.keys(stats.bySupplier).forEach(code => {
        stats.bySupplier[code] = {
          count: stats.bySupplier[code].count,
          products: stats.bySupplier[code].products,
          supplierName: logs.find(l => l.supplierCode === code)?.supplier?.name || code
        };
      });

      return {
        report: stats,
        logs: logs.map(log => ({
          id: log.id,
          productName: log.productName,
          supplierCode: log.supplierCode,
          supplierName: log.supplier?.name || log.supplierCode,
          productType: log.productType,
          errorCode: log.errorCode,
          errorMessage: log.errorMessage,
          alternativeUsed: log.alternativeUsed,
          alternativeSupplierCode: log.alternativeSupplierCode,
          createdAt: log.createdAt
        }))
      };
    } catch (error) {
      console.error('❌ Failed to generate daily report:', error.message);
      return null;
    }
  }

  /**
   * Get unavailable products for a specific date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Unavailable products
   */
  async getUnavailableProducts(startDate, endDate) {
    if (!this.enabled) {
      return [];
    }

    try {
      const logs = await ProductAvailabilityLog.findAll({
        where: {
          logDate: {
            [require('sequelize').Op.between]: [
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            ]
          }
        },
        include: [
          {
            model: ProductVariant,
            as: 'variant',
            attributes: ['id', 'productName', 'supplierProductId'],
            required: false
          }
        ],
        order: [['logDate', 'DESC'], ['createdAt', 'DESC']]
      });

      return logs;
    } catch (error) {
      console.error('❌ Failed to get unavailable products:', error.message);
      return [];
    }
  }
}

module.exports = new ProductAvailabilityLogger();

