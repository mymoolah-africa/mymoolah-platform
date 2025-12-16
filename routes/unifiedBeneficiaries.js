const express = require('express');
const router = express.Router();
const UnifiedBeneficiaryService = require('../services/UnifiedBeneficiaryService');
const authenticateToken = require('../middleware/auth');

const unifiedBeneficiaryService = new UnifiedBeneficiaryService();

// Get beneficiaries filtered by service type
router.get('/by-service/:serviceType', authenticateToken, async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { search = '' } = req.query;
    const userId = req.user.id;

    // Validate service type
    const validServiceTypes = ['payment', 'airtime-data', 'electricity', 'biller', 'voucher'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type. Must be one of: payment, airtime-data, electricity, biller, voucher'
      });
    }

    const beneficiaries = await unifiedBeneficiaryService.getBeneficiariesByService(
      userId, 
      serviceType, 
      search
    );

    res.json({
      success: true,
      data: {
        beneficiaries,
        serviceType,
        total: beneficiaries.length
      }
    });
  } catch (error) {
    console.error('Error getting beneficiaries by service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiaries',
      error: error.message
    });
  }
});

// Create or update unified beneficiary
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      serviceType,
      serviceData,
      isFavorite = false,
      notes = null
    } = req.body;

    // Validate required fields
    if (!name || !serviceType || !serviceData) {
      return res.status(400).json({
        success: false,
        message: 'Name, serviceType, and serviceData are required'
      });
    }

    // Validate service type
    const validServiceTypes = ['mymoolah', 'bank', 'airtime', 'data', 'electricity', 'water', 'biller', 'voucher'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type'
      });
    }

    const beneficiary = await unifiedBeneficiaryService.createOrUpdateBeneficiary(
      userId,
      { name, serviceType, serviceData, isFavorite, notes }
    );

    res.json({
      success: true,
      data: beneficiary,
      message: 'Beneficiary created/updated successfully'
    });
  } catch (error) {
    console.error('Error creating/updating beneficiary:', error);
    const isValidationError = /invalid|required/i.test(error.message || '');
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to create/update beneficiary',
      error: error.message
    });
  }
});

// Add service to existing beneficiary
router.post('/:beneficiaryId/services', authenticateToken, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const userId = req.user.id;
    const { serviceType, serviceData } = req.body;

    // Validate required fields
    if (!serviceType || !serviceData) {
      return res.status(400).json({
        success: false,
        message: 'ServiceType and serviceData are required'
      });
    }

    // Get beneficiary and verify ownership
    const beneficiary = await unifiedBeneficiaryService.getBeneficiaryServices(beneficiaryId);
    if (!beneficiary || beneficiary.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    await unifiedBeneficiaryService.addServiceToBeneficiary(
      beneficiaryId,
      serviceType,
      serviceData
    );

    res.json({
      success: true,
      message: 'Service added successfully'
    });
  } catch (error) {
    console.error('Error adding service to beneficiary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add service',
      error: error.message
    });
  }
});

// Remove service from beneficiary
router.delete('/:beneficiaryId/services/:serviceType/:serviceId', authenticateToken, async (req, res) => {
  try {
    const { beneficiaryId, serviceType, serviceId } = req.params;
    const userId = req.user.id;

    // Get beneficiary and verify ownership
    const beneficiary = await unifiedBeneficiaryService.getBeneficiaryServices(beneficiaryId);
    if (!beneficiary || beneficiary.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    await unifiedBeneficiaryService.removeServiceFromBeneficiary(
      beneficiaryId,
      serviceType,
      serviceId
    );

    res.json({
      success: true,
      message: 'Service removed successfully'
    });
  } catch (error) {
    console.error('Error removing service from beneficiary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove service',
      error: error.message
    });
  }
});

// Remove all services of specific types from beneficiary (e.g., all airtime+data)
// Banking-grade: Only removes service accounts, never affects beneficiary record or user account
router.delete('/:beneficiaryId/services/:serviceType', authenticateToken, async (req, res) => {
  try {
    const { beneficiaryId, serviceType } = req.params;
    const userId = req.user.id;

    // Map service type to actual service types (e.g., 'airtime-data' -> ['airtime', 'data'])
    let serviceTypesToRemove = [];
    if (serviceType === 'airtime-data') {
      serviceTypesToRemove = ['airtime', 'data'];
    } else if (serviceType === 'electricity') {
      serviceTypesToRemove = ['electricity'];
    } else if (serviceType === 'biller') {
      serviceTypesToRemove = ['biller'];
    } else {
      // Support single service type removal
      serviceTypesToRemove = [serviceType];
    }

    const result = await unifiedBeneficiaryService.removeAllServicesOfTypes(
      beneficiaryId,
      userId,
      serviceTypesToRemove
    );

    res.json({
      success: true,
      message: result.message || 'Services removed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error removing services from beneficiary:', error);
    const statusCode = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to remove services',
      error: error.message
    });
  }
});

// Get all services for a specific beneficiary
router.get('/:beneficiaryId/services', authenticateToken, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const userId = req.user.id;

    const beneficiary = await unifiedBeneficiaryService.getBeneficiaryServices(beneficiaryId);
    if (!beneficiary || beneficiary.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    res.json({
      success: true,
      data: beneficiary
    });
  } catch (error) {
    console.error('Error getting beneficiary services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiary services',
      error: error.message
    });
  }
});

// Update beneficiary metadata (favorite, notes, preferred method) or service accounts
router.patch('/:beneficiaryId', authenticateToken, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const userId = req.user.id;
    const { isFavorite, notes, preferredPaymentMethod, name, serviceType, serviceData } = req.body;

    // Get beneficiary and verify ownership
    const beneficiary = await unifiedBeneficiaryService.getBeneficiaryServices(beneficiaryId);
    if (!beneficiary || beneficiary.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Beneficiary not found'
      });
    }

    // Update beneficiary metadata fields
    const updateData = {};
    if (typeof isFavorite === 'boolean') updateData.isFavorite = isFavorite;
    if (notes !== undefined) updateData.notes = notes;
    if (preferredPaymentMethod) updateData.preferredPaymentMethod = preferredPaymentMethod;
    if (name) updateData.name = name;

    // Update beneficiary name if provided
    if (Object.keys(updateData).length > 0) {
      const { Beneficiary } = require('../models');
      await Beneficiary.update(updateData, {
        where: { id: beneficiaryId, userId }
      });
    }

    // Update service account if serviceType and serviceData provided
    if (serviceType && serviceData) {
      await unifiedBeneficiaryService.addOrUpdateServiceAccount(userId, {
        beneficiaryId: parseInt(beneficiaryId, 10),
        serviceType,
        serviceData
      });
    }

    // Return updated beneficiary with all service accounts
    // Use getBeneficiariesByService to get properly formatted response with accounts array
    const updatedBeneficiaries = await unifiedBeneficiaryService.getBeneficiariesByService(
      userId,
      'airtime-data', // Try airtime-data first
      ''
    );
    let updatedBeneficiary = updatedBeneficiaries.find(b => b.id === parseInt(beneficiaryId, 10));
    
    // If not found in airtime-data, try other service types or use getBeneficiaryServices
    if (!updatedBeneficiary) {
      updatedBeneficiary = await unifiedBeneficiaryService.getBeneficiaryServices(beneficiaryId);
    }

    res.json({
      success: true,
      message: 'Beneficiary updated successfully',
      data: updatedBeneficiary
    });
  } catch (error) {
    console.error('Error updating beneficiary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update beneficiary',
      error: error.message
    });
  }
});

// Search beneficiaries across all services
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, serviceType } = req.query;
    const userId = req.user.id;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    let beneficiaries = [];
    
    if (serviceType) {
      // Search in specific service type
      beneficiaries = await unifiedBeneficiaryService.getBeneficiariesByService(
        userId,
        serviceType,
        query.trim()
      );
    } else {
      // Search across all service types
      const allServiceTypes = ['payment', 'airtime-data', 'electricity', 'biller', 'voucher'];
      
      for (const serviceType of allServiceTypes) {
        const serviceBeneficiaries = await unifiedBeneficiaryService.getBeneficiariesByService(
          userId,
          serviceType,
          query.trim()
        );
        beneficiaries.push(...serviceBeneficiaries);
      }
      
      // Remove duplicates and sort by relevance
      beneficiaries = beneficiaries.filter((beneficiary, index, self) => 
        index === self.findIndex(b => b.id === beneficiary.id)
      );
      
      // Sort by relevance (favorites first, then by name match)
      beneficiaries.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    res.json({
      success: true,
      data: {
        beneficiaries,
        query: query.trim(),
        serviceType: serviceType || 'all',
        total: beneficiaries.length
      }
    });
  } catch (error) {
    console.error('Error searching beneficiaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search beneficiaries',
      error: error.message
    });
  }
});

module.exports = router;
