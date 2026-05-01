'use strict';

const { Op } = require('sequelize');
const {
  ProductCatalogMapping,
  ProductCatalogAuditEvent,
  ProductVariant,
  Product,
  Supplier,
} = require('../models');

const REVIEW_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  RETIRED: 'retired',
});

const PUBLISH_STATUS = Object.freeze({
  UNPUBLISHED: 'unpublished',
  PUBLISHED: 'published',
});

const APPROVABLE_STATUSES = new Set([REVIEW_STATUS.DRAFT, REVIEW_STATUS.REJECTED]);
const EDITABLE_STATUSES = new Set([REVIEW_STATUS.DRAFT, REVIEW_STATUS.REJECTED, REVIEW_STATUS.APPROVED]);

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function actorFromUser(user = {}) {
  const id = user.portalUserId || user.id || user.userId || 'system';
  return {
    id: String(id),
    email: user.email || null,
    role: user.role || (user.isAdmin ? 'admin' : null),
  };
}

function publicMapping(mapping) {
  if (!mapping) return null;
  const plain = mapping.get ? mapping.get({ plain: true }) : mapping;
  return {
    ...plain,
    auditEvents: Array.isArray(plain.auditEvents) ? plain.auditEvents : undefined,
  };
}

function buildRawSnapshot(variant) {
  const product = variant.product || {};
  const supplier = variant.supplier || {};
  return {
    variantId: variant.id,
    productId: product.id || variant.productId,
    supplierId: supplier.id || variant.supplierId,
    supplierCode: supplier.code || null,
    supplierName: supplier.name || null,
    supplierProductId: variant.supplierProductId,
    productName: product.name || null,
    provider: variant.provider || null,
    productType: product.type || variant.vasType || null,
    vasType: variant.vasType || null,
    transactionType: variant.transactionType || null,
    priceType: variant.priceType || null,
    minAmount: variant.minAmount || null,
    maxAmount: variant.maxAmount || null,
    denominations: variant.denominations || variant.predefinedAmounts || [],
    commission: variant.commission || null,
    status: variant.status || null,
    productStatus: product.status || null,
    metadata: variant.metadata || {},
    productMetadata: product.metadata || {},
  };
}

function deriveRawName(variant) {
  return normalizeString(
    variant.product?.name || variant.provider || variant.supplierProductId,
    'Supplier product'
  );
}

function validateApprovalPayload(mapping) {
  const required = [
    ['canonicalName', mapping.canonicalName],
    ['canonicalBrand', mapping.canonicalBrand],
    ['category', mapping.category],
    ['description', mapping.description],
  ];
  const missing = required
    .filter(([, value]) => !normalizeString(value))
    .map(([key]) => key);
  if (missing.length > 0) {
    const err = new Error(`Catalog mapping missing approval fields: ${missing.join(', ')}`);
    err.statusCode = 422;
    err.code = 'CATALOG_MAPPING_INCOMPLETE';
    err.details = missing;
    throw err;
  }
}

class ProductCatalogGovernanceService {
  constructor(models = {}) {
    this.ProductCatalogMapping = models.ProductCatalogMapping || ProductCatalogMapping;
    this.ProductCatalogAuditEvent = models.ProductCatalogAuditEvent || ProductCatalogAuditEvent;
    this.ProductVariant = models.ProductVariant || ProductVariant;
    this.Product = models.Product || Product;
    this.Supplier = models.Supplier || Supplier;
  }

  async recordAudit(mapping, action, actor, metadata = {}, options = {}) {
    return this.ProductCatalogAuditEvent.create({
      mappingId: mapping.id,
      action,
      actorUserId: actor?.id || 'system',
      actorEmail: actor?.email || null,
      actorRole: actor?.role || null,
      fromStatus: metadata.fromStatus || null,
      toStatus: metadata.toStatus || mapping.reviewStatus,
      fromPublishStatus: metadata.fromPublishStatus || null,
      toPublishStatus: metadata.toPublishStatus || mapping.publishStatus,
      reason: metadata.reason || null,
      metadata: metadata.context || {},
    }, options);
  }

  async ensureMappingForVariant(variant, actorInput = { id: 'system', role: 'system' }, options = {}) {
    const actor = actorFromUser(actorInput);
    const rawSnapshot = buildRawSnapshot(variant);
    const supplierCode = normalizeString(rawSnapshot.supplierCode, 'UNKNOWN').toUpperCase();
    const productType = normalizeString(rawSnapshot.productType || rawSnapshot.vasType, 'unknown');
    const supplierProductId = normalizeString(rawSnapshot.supplierProductId, `variant-${variant.id}`);
    const rawName = deriveRawName(variant);

    const where = {
      supplierCode,
      supplierProductId,
      productType,
    };

    const [mapping, created] = await this.ProductCatalogMapping.findOrCreate({
      where,
      defaults: {
        sourceVariantId: variant.id,
        sourceProductId: rawSnapshot.productId || null,
        supplierId: rawSnapshot.supplierId || null,
        supplierCode,
        supplierProductId,
        productType,
        rawName,
        rawSnapshot,
        reviewStatus: REVIEW_STATUS.DRAFT,
        publishStatus: PUBLISH_STATUS.UNPUBLISHED,
        riskTier: productType === 'voucher' ? 'medium' : 'low',
        metadata: { detectedBy: 'catalog_sync' },
      },
      ...options,
    });

    if (created) {
      await this.recordAudit(mapping, 'detected', actor, {
        toStatus: mapping.reviewStatus,
        toPublishStatus: mapping.publishStatus,
        context: { supplierCode, supplierProductId, productType },
      }, options);
      return mapping;
    }

    await mapping.update({
      sourceVariantId: variant.id,
      sourceProductId: rawSnapshot.productId || mapping.sourceProductId,
      supplierId: rawSnapshot.supplierId || mapping.supplierId,
      rawName,
      rawSnapshot,
      metadata: {
        ...(mapping.metadata || {}),
        lastDetectedAt: new Date().toISOString(),
      },
    }, options);

    return mapping;
  }

  async ensureMappingsForActiveVariants({ productType, limit = 1000 } = {}) {
    const productWhere = { status: 'active' };
    if (productType) productWhere.type = productType;
    const variants = await this.ProductVariant.findAll({
      where: { status: 'active' },
      include: [
        { model: this.Product, as: 'product', where: productWhere },
        { model: this.Supplier, as: 'supplier', where: { isActive: true } },
      ],
      order: [['updatedAt', 'DESC']],
      limit,
    });

    let createdOrUpdated = 0;
    for (const variant of variants) {
      await this.ensureMappingForVariant(variant);
      createdOrUpdated += 1;
    }
    return { processed: createdOrUpdated };
  }

  async listMappings(filters = {}) {
    const page = Math.max(parseInt(filters.page || 1, 10), 1);
    const limit = Math.min(Math.max(parseInt(filters.limit || 25, 10), 1), 100);
    const where = {};
    if (filters.reviewStatus) where.reviewStatus = filters.reviewStatus;
    if (filters.publishStatus) where.publishStatus = filters.publishStatus;
    if (filters.productType) where.productType = filters.productType;
    if (filters.category) where.category = filters.category;
    if (filters.riskTier) where.riskTier = filters.riskTier;
    if (filters.supplierCode) where.supplierCode = String(filters.supplierCode).toUpperCase();
    if (filters.q) {
      where[Op.or] = [
        { rawName: { [Op.iLike]: `%${filters.q}%` } },
        { canonicalName: { [Op.iLike]: `%${filters.q}%` } },
        { canonicalBrand: { [Op.iLike]: `%${filters.q}%` } },
        { supplierProductId: { [Op.iLike]: `%${filters.q}%` } },
      ];
    }

    const { rows, count } = await this.ProductCatalogMapping.findAndCountAll({
      where,
      order: [['updatedAt', 'DESC']],
      offset: (page - 1) * limit,
      limit,
    });

    return {
      mappings: rows.map(publicMapping),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getMapping(id) {
    const mapping = await this.ProductCatalogMapping.findByPk(id, {
      include: [{ model: this.ProductCatalogAuditEvent, as: 'auditEvents', order: [['createdAt', 'DESC']] }],
    });
    if (!mapping) {
      const err = new Error('Catalog mapping not found');
      err.statusCode = 404;
      err.code = 'CATALOG_MAPPING_NOT_FOUND';
      throw err;
    }
    return publicMapping(mapping);
  }

  async updateMapping(id, payload, actorInput) {
    const actor = actorFromUser(actorInput);
    const mapping = await this.ProductCatalogMapping.findByPk(id);
    if (!mapping) {
      const err = new Error('Catalog mapping not found');
      err.statusCode = 404;
      throw err;
    }
    if (!EDITABLE_STATUSES.has(mapping.reviewStatus)) {
      const err = new Error('Only draft, rejected, or approved mappings can be edited');
      err.statusCode = 409;
      err.code = 'CATALOG_MAPPING_NOT_EDITABLE';
      throw err;
    }

    const update = {};
    ['canonicalName', 'canonicalBrand', 'category', 'description', 'iconKey', 'logoKey', 'riskTier'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(payload, key)) update[key] = payload[key];
    });
    if (payload.metadata && typeof payload.metadata === 'object') {
      update.metadata = { ...(mapping.metadata || {}), ...payload.metadata };
    }
    if (mapping.reviewStatus === REVIEW_STATUS.APPROVED) {
      update.reviewStatus = REVIEW_STATUS.DRAFT;
      update.publishStatus = PUBLISH_STATUS.UNPUBLISHED;
      update.approvedAt = null;
      update.checkerUserId = null;
      update.checkerUserEmail = null;
      update.reason = 'Approved mapping edited and returned to draft';
    }

    await mapping.update(update);
    await this.recordAudit(mapping, 'updated', actor, {
      fromStatus: mapping.previous('reviewStatus'),
      toStatus: mapping.reviewStatus,
      fromPublishStatus: mapping.previous('publishStatus'),
      toPublishStatus: mapping.publishStatus,
      context: { fields: Object.keys(update) },
    });
    return this.getMapping(id);
  }

  async submitForApproval(id, actorInput) {
    const actor = actorFromUser(actorInput);
    const mapping = await this.ProductCatalogMapping.findByPk(id);
    if (!mapping) {
      const err = new Error('Catalog mapping not found');
      err.statusCode = 404;
      throw err;
    }
    if (!APPROVABLE_STATUSES.has(mapping.reviewStatus)) {
      const err = new Error('Only draft or rejected mappings can be submitted');
      err.statusCode = 409;
      err.code = 'CATALOG_MAPPING_NOT_SUBMITTABLE';
      throw err;
    }
    validateApprovalPayload(mapping);

    const previousReview = mapping.reviewStatus;
    await mapping.update({
      reviewStatus: REVIEW_STATUS.PENDING_APPROVAL,
      publishStatus: PUBLISH_STATUS.UNPUBLISHED,
      makerUserId: actor.id,
      makerUserEmail: actor.email,
      submittedAt: new Date(),
      reason: null,
    });
    await this.recordAudit(mapping, 'submitted_for_approval', actor, {
      fromStatus: previousReview,
      toStatus: mapping.reviewStatus,
      fromPublishStatus: PUBLISH_STATUS.UNPUBLISHED,
      toPublishStatus: mapping.publishStatus,
    });
    return this.getMapping(id);
  }

  async approve(id, actorInput) {
    const actor = actorFromUser(actorInput);
    const mapping = await this.ProductCatalogMapping.findByPk(id);
    if (!mapping) {
      const err = new Error('Catalog mapping not found');
      err.statusCode = 404;
      throw err;
    }
    if (mapping.reviewStatus !== REVIEW_STATUS.PENDING_APPROVAL) {
      const err = new Error('Only pending mappings can be approved');
      err.statusCode = 409;
      throw err;
    }
    if (mapping.makerUserId && mapping.makerUserId === actor.id) {
      const err = new Error('Maker cannot approve their own catalog mapping');
      err.statusCode = 403;
      err.code = 'MAKER_CHECKER_VIOLATION';
      throw err;
    }
    validateApprovalPayload(mapping);

    const previousReview = mapping.reviewStatus;
    const previousPublish = mapping.publishStatus;
    await mapping.update({
      reviewStatus: REVIEW_STATUS.APPROVED,
      publishStatus: PUBLISH_STATUS.PUBLISHED,
      checkerUserId: actor.id,
      checkerUserEmail: actor.email,
      approvedAt: new Date(),
      reason: null,
    });
    await this.recordAudit(mapping, 'approved', actor, {
      fromStatus: previousReview,
      toStatus: mapping.reviewStatus,
      fromPublishStatus: previousPublish,
      toPublishStatus: mapping.publishStatus,
    });
    return this.getMapping(id);
  }

  async reject(id, reason, actorInput) {
    const actor = actorFromUser(actorInput);
    const mapping = await this.ProductCatalogMapping.findByPk(id);
    if (!mapping) {
      const err = new Error('Catalog mapping not found');
      err.statusCode = 404;
      throw err;
    }
    const previousReview = mapping.reviewStatus;
    const previousPublish = mapping.publishStatus;
    await mapping.update({
      reviewStatus: REVIEW_STATUS.REJECTED,
      publishStatus: PUBLISH_STATUS.UNPUBLISHED,
      checkerUserId: actor.id,
      checkerUserEmail: actor.email,
      rejectedAt: new Date(),
      reason: reason || 'Rejected',
    });
    await this.recordAudit(mapping, 'rejected', actor, {
      fromStatus: previousReview,
      toStatus: mapping.reviewStatus,
      fromPublishStatus: previousPublish,
      toPublishStatus: mapping.publishStatus,
      reason: reason || 'Rejected',
    });
    return this.getMapping(id);
  }

  async setLifecycleStatus(id, action, reason, actorInput) {
    const actor = actorFromUser(actorInput);
    const mapping = await this.ProductCatalogMapping.findByPk(id);
    if (!mapping) {
      const err = new Error('Catalog mapping not found');
      err.statusCode = 404;
      throw err;
    }
    const now = new Date();
    const previousReview = mapping.reviewStatus;
    const previousPublish = mapping.publishStatus;
    const status = action === 'retire' ? REVIEW_STATUS.RETIRED : REVIEW_STATUS.SUSPENDED;
    const timestampField = action === 'retire' ? 'retiredAt' : 'suspendedAt';
    const defaultReason = action === 'retire' ? 'retired' : 'suspended';
    await mapping.update({
      reviewStatus: status,
      publishStatus: PUBLISH_STATUS.UNPUBLISHED,
      [timestampField]: now,
      reason: reason || defaultReason,
    });
    await this.recordAudit(mapping, action === 'retire' ? 'retired' : 'suspended', actor, {
      fromStatus: previousReview,
      toStatus: mapping.reviewStatus,
      fromPublishStatus: previousPublish,
      toPublishStatus: mapping.publishStatus,
      reason: reason || defaultReason,
    });
    return this.getMapping(id);
  }

  async getPublishedMappings({ productType = 'voucher' } = {}) {
    const mappings = await this.ProductCatalogMapping.findAll({
      where: {
        productType,
        reviewStatus: REVIEW_STATUS.APPROVED,
        publishStatus: PUBLISH_STATUS.PUBLISHED,
      },
      order: [['canonicalName', 'ASC']],
    });
    return mappings.map(publicMapping);
  }
}

ProductCatalogGovernanceService.REVIEW_STATUS = REVIEW_STATUS;
ProductCatalogGovernanceService.PUBLISH_STATUS = PUBLISH_STATUS;

module.exports = ProductCatalogGovernanceService;
