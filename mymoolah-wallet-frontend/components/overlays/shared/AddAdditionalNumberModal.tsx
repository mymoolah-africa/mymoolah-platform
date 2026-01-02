import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { validateMobileNumber } from '../../../services/overlayService';
import { unifiedBeneficiaryService } from '../../../services/unifiedBeneficiaryService';

interface AddAdditionalNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaryId: string;
  beneficiaryName: string;
  onSuccess: () => void;
}

interface FormData {
  identifier: string;
  network: string;
}

const NETWORKS = ['Vodacom', 'MTN', 'CellC', 'Telkom'];

export function AddAdditionalNumberModal({ 
  isOpen, 
  onClose, 
  beneficiaryId, 
  beneficiaryName,
  onSuccess 
}: AddAdditionalNumberModalProps) {
  const [formData, setFormData] = useState<FormData>({
    identifier: '',
    network: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        identifier: '',
        network: ''
      });
      setError('');
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    setError('');

    if (!formData.identifier.trim()) {
      setError('Mobile number is required');
      return false;
    }

    if (!validateMobileNumber(formData.identifier)) {
      setError('Please enter a valid South African mobile number');
      return false;
    }

    if (!formData.network) {
      setError('Network is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Add service to existing beneficiary
      await unifiedBeneficiaryService.addServiceToBeneficiary(
        beneficiaryId,
        'airtime', // Service type
        {
          msisdn: formData.identifier.trim(),
          mobileNumber: formData.identifier.trim(),
          network: formData.network,
          isDefault: false // New numbers are not default by default
        }
      );

      // Also add as data service if it's a mobile number
      try {
        await unifiedBeneficiaryService.addServiceToBeneficiary(
          beneficiaryId,
          'data',
          {
            msisdn: formData.identifier.trim(),
            mobileNumber: formData.identifier.trim(),
            network: formData.network,
            isDefault: false
          }
        );
      } catch (dataError) {
        // If data service fails, that's okay - continue
        console.warn('Failed to add data service (non-critical):', dataError);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add additional number:', err);
      setError(err.response?.data?.message || 'Failed to add number. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <Card style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <CardHeader style={{
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#86BE41',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Smartphone style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <CardTitle style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  Add Additional Number
                </CardTitle>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                padding: '0'
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </Button>
          </div>
        </CardHeader>

        <CardContent style={{ padding: '1rem' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                {error}
              </div>
            )}

            {/* Mobile Number Field */}
            <div>
              <Label htmlFor="identifier" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '8px',
                display: 'block'
              }}>
                Mobile Number
              </Label>
              <Input
                id="identifier"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                placeholder="Mobile number (e.g., 0821234567)"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '12px'
                }}
                required
              />
            </div>

            {/* Network Field */}
            <div>
              <Label htmlFor="network" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '8px',
                display: 'block'
              }}>
                Network
              </Label>
              <Select
                value={formData.network}
                onValueChange={(value) => setFormData({ ...formData, network: value })}
              >
                <SelectTrigger
                  id="network"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '12px',
                    height: 'auto'
                  }}
                >
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px'
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px',
                  border: 'none'
                }}
              >
                {isLoading ? 'Adding...' : 'Add Number'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

