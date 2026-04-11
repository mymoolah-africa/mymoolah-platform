'use strict';

/**
 * Supplier Failover Service — Banking-Grade
 *
 * Provides automatic supplier failover for VAS purchases:
 *   1. Find equivalent products from alternative suppliers
 *   2. Rank alternatives by commission (highest first), then price (lowest)
 *   3. Execute purchase with failover chain
 *
 * Product equivalence uses deterministic composite keys — NOT product names.
 * Airtime (variable): vasType + provider + priceType
 * Data bundles: vasType + provider + closest minAmount
 * Other: vasType + provider
 */

const { ProductVariant, Supplier, Product } = require('../models');
const { Op } = require('sequelize');
const circuitBreaker = require('./supplierCircuitBreaker');
const productAvailabilityLogger = require('./productAvailabilityLogger');

const AMOUNT_TOLERANCE_PCT = 0.20; // 20% tolerance for data bundle matching

class SupplierFailoverService {

  /**
   * Find equivalent product variants from alternative suppliers.
   *
   * @param {Object} failedVariant - The ProductVariant that failed (with supplier + product includes)
   * @param {number} amountCents   - Requested amount in cents
   * @returns {Promise<Array>} Alternative variants sorted by commission DESC, minAmount ASC
   */
  async findAlternativeVariants(failedVariant, amountCents) {
    const vasType = failedVariant.product?.type || failedVariant.vasType;
    const provider = failedVariant.provider;
    const failedSupplierCode = failedVariant.supplier?.code;
    const priceType = failedVariant.priceType || 'variable';

    if (!vasType || !failedSupplierCode) {
      console.warn('[SupplierFailover] Missing fields for alternative lookup', {
        vasType, provider, failedSupplierCode
      });
      return [];
    }

    // Electricity is not network-specific — any supplier with an electricity
    // product is a valid failover candidate regardless of provider name.
    const isElectricity = vasType === 'electricity';

    if (!isElectricity && !provider) {
      console.warn('[SupplierFailover] Missing provider for non-electricity lookup', { vasType });
      return [];
    }

    const where = {
      status: 'active',
    };

    if (!isElectricity) {
      where.provider = { [Op.iLike]: provider };
    }

    if (vasType === 'airtime' && priceType === 'variable') {
      where.priceType = 'variable';
    } else if (amountCents > 0 && !isElectricity) {
      where.minAmount = { [Op.lte]: amountCents };
      where.maxAmount = { [Op.gte]: amountCents };
    }

    const alternatives = await ProductVariant.findAll({
      where,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'code', 'name'],
          where: { code: { [Op.ne]: failedSupplierCode } },
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'type'],
          where: { type: vasType },
        },
      ],
      order: [
        ['commission', 'DESC'],
        ['minAmount', 'ASC'],
      ],
    });

    // For data bundles with no exact match, widen search with tolerance
    if (alternatives.length === 0 && vasType === 'data' && amountCents > 0) {
      const lowerBound = Math.floor(amountCents * (1 - AMOUNT_TOLERANCE_PCT));
      const upperBound = Math.ceil(amountCents * (1 + AMOUNT_TOLERANCE_PCT));

      const tolerantAlts = await ProductVariant.findAll({
        where: {
          status: 'active',
          provider: { [Op.iLike]: provider },
          minAmount: { [Op.lte]: upperBound },
          maxAmount: { [Op.gte]: lowerBound },
        },
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'code', 'name'],
            where: { code: { [Op.ne]: failedSupplierCode } },
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'type'],
            where: { type: vasType },
          },
        ],
        order: [
          ['commission', 'DESC'],
          ['minAmount', 'ASC'],
        ],
      });

      return tolerantAlts;
    }

    return alternatives;
  }

  /**
   * Execute a purchase with automatic failover.
   *
   * @param {Object} opts
   * @param {Object} opts.primaryVariant   - The preferred ProductVariant (includes supplier, product)
   * @param {number} opts.amountCents      - Amount in cents
   * @param {Function} opts.purchaseFn     - async (variant, supplierCode) => result — the actual API call
   * @param {Object} opts.context          - { userId, beneficiaryId, network } for logging
   * @param {number} opts.maxAttempts      - Max failover attempts (default 3)
   * @returns {Promise<Object>} { success, result, variant, supplierCode, failoverUsed }
   */
  async executeWithFailover({ primaryVariant, amountCents, purchaseFn, context = {}, maxAttempts = 3 }) {
    const triedSupplierCodes = new Set();
    const triedVariantIds = new Set();
    let attempts = 0;
    let lastError = null;

    // Build ordered list: primary first, then alternatives
    const candidates = [];

    const primarySupplierCode = primaryVariant.supplier?.code;

    // Check if primary supplier circuit is open
    if (!circuitBreaker.isOpen(primarySupplierCode)) {
      candidates.push(primaryVariant);
    } else {
      console.log(`[SupplierFailover] Skipping primary ${primarySupplierCode} — circuit OPEN`);
    }

    // Pre-fetch alternatives (deduplicate skip logs per supplier)
    const alternatives = await this.findAlternativeVariants(primaryVariant, amountCents);
    const skippedReasons = {};
    for (const alt of alternatives) {
      const altCode = alt.supplier?.code;
      if (!altCode) continue;

      if (circuitBreaker.isOpen(altCode)) {
        skippedReasons[altCode] = 'circuit OPEN';
        continue;
      }

      const envKey = `${altCode.toUpperCase()}_LIVE_INTEGRATION`;
      if (process.env[envKey] !== 'true') {
        skippedReasons[altCode] = `${envKey} not enabled`;
        continue;
      }

      candidates.push(alt);
    }

    for (const [code, reason] of Object.entries(skippedReasons)) {
      console.log(`[SupplierFailover] Skipping all ${code} alternatives — ${reason}`);
    }

    if (candidates.length === 0) {
      return {
        success: false,
        error: 'All suppliers are currently unavailable (circuit breaker open)',
        errorCode: 'ALL_SUPPLIERS_CIRCUIT_OPEN',
        failoverUsed: false,
      };
    }

    for (const variant of candidates) {
      if (attempts >= maxAttempts) break;

      const supplierCode = variant.supplier?.code;
      if (!supplierCode) continue;
      if (triedVariantIds.has(variant.id)) continue;

      triedVariantIds.add(variant.id);
      triedSupplierCodes.add(supplierCode);
      attempts++;

      const isFailover = variant.id !== primaryVariant.id;

      console.log(`[SupplierFailover] Attempt ${attempts}/${maxAttempts}: ${supplierCode} variant ${variant.id}${isFailover ? ' (failover)' : ' (primary)'}`);

      // Register probe if half-open
      circuitBreaker.registerProbe(supplierCode);

      try {
        const result = await purchaseFn(variant, supplierCode);

        circuitBreaker.recordSuccess(supplierCode);

        if (isFailover) {
          // Log the successful failover
          await productAvailabilityLogger.logAvailabilityIssue({
            variantId: primaryVariant.id,
            supplierCode: primarySupplierCode,
            productName: primaryVariant.product?.name || 'Unknown',
            productType: primaryVariant.product?.type || 'airtime',
            errorCode: lastError?.code || lastError?.flashError?.code || null,
            errorMessage: lastError?.message || null,
            userId: context.userId || null,
            beneficiaryId: context.beneficiaryId || null,
            amountInCents: amountCents,
            alternativeUsed: true,
            alternativeSupplierCode: supplierCode,
            alternativeVariantId: variant.id,
            metadata: {
              network: context.network || null,
              attempt: attempts,
              failoverChain: [...triedSupplierCodes],
            },
          }).catch(logErr => console.error('[SupplierFailover] Logging error:', logErr.message));
        }

        return {
          success: true,
          result,
          variant,
          supplierCode,
          failoverUsed: isFailover,
        };

      } catch (err) {
        lastError = err;

        const isTransient = circuitBreaker.constructor.isTransientError(err);

        if (isTransient) {
          circuitBreaker.recordFailure(supplierCode);
        }

        console.warn(`[SupplierFailover] ${supplierCode} failed (transient=${isTransient}): ${err.message}`);

        // Log the failure
        await productAvailabilityLogger.logAvailabilityIssue({
          variantId: variant.id,
          supplierCode,
          productName: variant.product?.name || 'Unknown',
          productType: variant.product?.type || 'airtime',
          errorCode: err.response?.data?.fulcrumErrorCode || err.response?.data?.errorCode || err.flashError?.code || err.code || null,
          errorMessage: err.message,
          userId: context.userId || null,
          beneficiaryId: context.beneficiaryId || null,
          amountInCents: amountCents,
          alternativeUsed: false,
          metadata: {
            network: context.network || null,
            attempt: attempts,
            isTransient,
          },
        }).catch(logErr => console.error('[SupplierFailover] Logging error:', logErr.message));

        // For non-transient business errors (e.g. product unavailable 1002),
        // continue trying alternatives
        continue;
      }
    }

    // All candidates exhausted
    return {
      success: false,
      error: lastError?.message || 'All supplier attempts failed',
      errorCode: 'ALL_SUPPLIERS_FAILED',
      failoverUsed: attempts > 1,
      attempts,
      triedSuppliers: [...triedSupplierCodes],
    };
  }
}

module.exports = new SupplierFailoverService();
