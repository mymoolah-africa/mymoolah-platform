import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Zap, FileText, Check, AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { beneficiaryService, validateMobileNumber, validateMeterNumber, type Beneficiary } from '../../../services/overlayService';

interface BeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'airtime' | 'data' | 'electricity' | 'biller';
  onSuccess: (beneficiary: Beneficiary) => void;
  editBeneficiary?: Beneficiary | null; // Add support for editing existing beneficiary
  onAddNumber?: () => void; // Callback to open "Add Additional Number" modal
}

interface BeneficiaryFormData {
  name: string;
  identifier: string;
  network?: string;
  meterType?: string;
  billerName?: string;
}

export function BeneficiaryModal({ isOpen, onClose, type, onSuccess, editBeneficiary, onAddNumber }: BeneficiaryModalProps) {
  const [formData, setFormData] = useState<BeneficiaryFormData>({
    name: '',
    identifier: '',
    network: '',
    meterType: '',
    billerName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showMeterTypeDropdown, setShowMeterTypeDropdown] = useState(false);
  const [meterTypeSearchTerm, setMeterTypeSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const meterTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (editBeneficiary) {
      setFormData({
        name: editBeneficiary.name,
        identifier: editBeneficiary.identifier,
        network: editBeneficiary.metadata?.network || '',
        meterType: editBeneficiary.metadata?.meterType || '',
        billerName: editBeneficiary.metadata?.billerName || ''
      });
    } else {
      // Reset form when adding new beneficiary
      setFormData({
        name: '',
        identifier: '',
        network: '',
        meterType: '',
        billerName: ''
      });
    }
  }, [editBeneficiary, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNetworkDropdown(false);
      }
      if (meterTypeDropdownRef.current && !meterTypeDropdownRef.current.contains(event.target as Node)) {
        setShowMeterTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getTypeIcon = () => {
    switch (type) {
      case 'airtime':
      case 'data':
        return <Smartphone style={{ width: '20px', height: '20px' }} />;
      case 'electricity':
        return <Zap style={{ width: '20px', height: '20px' }} />;
      case 'biller':
        return <FileText style={{ width: '20px', height: '20px' }} />;
      default:
        return <FileText style={{ width: '20px', height: '20px' }} />;
    }
  };

  const getTypeTitle = () => {
    switch (type) {
      case 'airtime':
        return 'Airtime Recipient';
      case 'data':
        return 'Data Recipient';
      case 'electricity':
        return 'Electricity Meter';
      case 'biller':
        return 'Bill Account';
      default:
        return 'Recipient';
    }
  };

  const getIdentifierPlaceholder = () => {
    switch (type) {
      case 'airtime':
      case 'data':
        return 'Mobile number (e.g., 0821234567)';
      case 'electricity':
        return 'Meter number (e.g., 12345678901)';
      case 'biller':
        return 'Account number or reference';
      default:
        return 'Identifier';
    }
  };

  const validateForm = (): boolean => {
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (!formData.identifier.trim()) {
      setError('Identifier is required');
      return false;
    }

    // Type-specific validation
    if (type === 'airtime' || type === 'data') {
      if (!validateMobileNumber(formData.identifier)) {
        setError('Please enter a valid South African mobile number');
        return false;
      }
    }

    if (type === 'electricity') {
      if (!validateMeterNumber(formData.identifier)) {
        setError('Please enter a valid meter number (minimum 10 digits)');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError('');

      // Build unified payload for airtime/data services
      const serviceType = type === 'data' ? 'data' : 'airtime';
      const serviceData: any = {
        msisdn: formData.identifier,
        mobileNumber: formData.identifier,
        network: formData.network,
        isDefault: true
      };

      let beneficiary;
      
      if (editBeneficiary) {
        // Update existing beneficiary
        beneficiary = await beneficiaryService.updateBeneficiary(editBeneficiary.id, {
          name: formData.name,
          serviceType,
          serviceData
        });
      } else {
        // Create new beneficiary
        beneficiary = await beneficiaryService.saveBeneficiary({
          name: formData.name,
          identifier: formData.identifier,
          accountType: type,
          network: formData.network
        });
      }

      onSuccess(beneficiary);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        identifier: '',
        network: '',
        meterType: '',
        billerName: ''
      });
    } catch (err: any) {
      console.error('Failed to create recipient:', err);
      setError(err.response?.data?.message || 'Failed to create recipient');
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
                {getTypeIcon()}
              </div>
              <div>
                <CardTitle style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  {editBeneficiary ? `Edit ${getTypeTitle()}` : 'Add New Recipient'}
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
            {/* Name Field */}
            <div>
              <Label htmlFor="name" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '8px',
                display: 'block'
              }}>
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter a name for this recipient"
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

            {/* Identifier Field */}
            <div>
              <Label htmlFor="identifier" style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '8px',
                display: 'block'
              }}>
                {type === 'airtime' || type === 'data' ? 'Mobile Number' :
                 type === 'electricity' ? 'Meter Number' : 'Account Number'}
              </Label>
              <Input
                id="identifier"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                placeholder={getIdentifierPlaceholder()}
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

            {/* Type-specific fields */}
            {(type === 'airtime' || type === 'data') && (
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
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <div
                    onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '12px',
                      backgroundColor: '#ffffff',
                      minHeight: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.borderColor = '#86BE41'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.borderColor = '#e2e8f0'}
                  >
                    <span style={{ color: formData.network ? '#1f2937' : '#9ca3af' }}>
                      {formData.network || 'Select network'}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  
                  {showNetworkDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      padding: '8px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {/* Local Networks Section */}
                      <div style={{
                        padding: '8px 0',
                        borderBottom: '1px solid #f1f5f9',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '8px',
                          padding: '0 12px'
                        }}>
                          Local Networks
                        </div>
                        
                                                   {[
                             { value: 'Vodacom', label: 'Vodacom', color: '#e60000', letter: 'V', textColor: '#ffffff' },
                             { value: 'MTN', label: 'MTN', color: '#ffcc00', letter: 'M', textColor: '#000000' },
                             { value: 'CellC', label: 'CellC', color: '#ff6600', letter: 'C', textColor: '#ffffff' },
                             { value: 'Telkom', label: 'Telkom', color: '#003366', letter: 'T', textColor: '#ffffff' },
                             { value: 'eeziAirtime', label: 'eeziAirtime (Flash)', color: '#86BE41', letter: 'E', textColor: '#ffffff' }
                           ].map((network) => (
                             <div
                               key={network.value}
                               onClick={() => {
                                 setFormData({ ...formData, network: network.value });
                                 setShowNetworkDropdown(false);
                               }}
                               style={{
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '12px',
                                 padding: '12px',
                                 borderRadius: '8px',
                                 cursor: 'pointer',
                                 transition: 'all 0.2s ease',
                                 backgroundColor: formData.network === network.value ? '#f1f5f9' : 'transparent'
                               }}
                               onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8fafc'}
                               onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = formData.network === network.value ? '#f1f5f9' : 'transparent'}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: network.color,
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              color: network.textColor
                            }}>
                              {network.letter}
                            </div>
                            <span style={{ 
                              fontWeight: '500',
                              color: '#1f2937',
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '14px'
                            }}>
                              {network.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* International Networks Section */}
                      <div style={{
                        padding: '8px 0'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '8px',
                          padding: '0 12px'
                        }}>
                          International Networks
                        </div>
                        
                                                 {[
                           { value: 'global-airtime', label: 'Global Airtime', color: '#3b82f6', icon: '🌍' },
                           { value: 'global-data', label: 'Global Data', color: '#8b5cf6', icon: '🌍' }
                         ].map((network) => (
                           <div
                             key={network.value}
                             onClick={() => {
                               setFormData({ ...formData, network: network.value });
                               setShowNetworkDropdown(false);
                             }}
                             style={{
                               display: 'flex',
                               alignItems: 'center',
                               gap: '12px',
                               padding: '12px',
                               borderRadius: '8px',
                               cursor: 'pointer',
                               transition: 'all 0.2s ease',
                               backgroundColor: formData.network === network.value ? '#f1f5f9' : 'transparent'
                             }}
                             onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8fafc'}
                             onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = formData.network === network.value ? '#f1f5f9' : 'transparent'}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: network.color,
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px'
                            }}>
                              {network.icon}
                            </div>
                            <span style={{ 
                              fontWeight: '500',
                              color: '#1f2937',
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '14px'
                            }}>
                              {network.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {type === 'electricity' && (
              <div>
                <Label htmlFor="meterType" style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Meter Type
                </Label>
                <div style={{ position: 'relative' }} ref={meterTypeDropdownRef}>
                  <div
                    onClick={() => setShowMeterTypeDropdown(!showMeterTypeDropdown)}
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '12px',
                      backgroundColor: '#ffffff',
                      minHeight: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.borderColor = '#86BE41'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.borderColor = '#e2e8f0'}
                  >
                    <span style={{ color: formData.meterType ? '#1f2937' : '#9ca3af' }}>
                      {formData.meterType || 'Select meter type'}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  
                  {showMeterTypeDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      padding: '8px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {/* Search Box */}
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Search municipalities..."
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'Montserrat, sans-serif'
                          }}
                          onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase();
                            setMeterTypeSearchTerm(searchTerm);
                          }}
                        />
                      </div>
                      
                      {/* Popular Providers Section */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                          marginBottom: '4px',
                          padding: '0 4px'
                        }}>
                          POPULAR PROVIDERS
                        </div>
                        {[
                          { value: 'Global Electricity (Flash)', label: 'Global Electricity (Flash)', color: '#10B981', icon: '🌍', isSpecial: true },
                          { value: 'Free Basic Electricity', label: 'Free Basic Electricity', color: '#10B981', icon: '🎁', isSpecial: true },
                          { value: 'Eskom', label: 'Eskom', color: '#86BE41', icon: '⚡' },
                          { value: 'City Power', label: 'City Power', color: '#2D8CCA', icon: '🏢' },
                          { value: 'Ethekwini', label: 'Ethekwini', color: '#FF6B35', icon: '🌊' },
                          { value: 'City of Cape Town', label: 'City of Cape Town', color: '#4ECDC4', icon: '🏔️' },
                          { value: 'Ekurhuleni', label: 'Ekurhuleni', color: '#45B7D1', icon: '🏭' },
                          { value: 'Centlec (Mangaung)', label: 'Centlec (Mangaung)', color: '#96CEB4', icon: '🌿' }
                                                 ].filter(meterType => 
                           !meterTypeSearchTerm || 
                           meterType.label.toLowerCase().includes(meterTypeSearchTerm)
                         ).map((meterType) => (
                          <div
                            key={meterType.value}
                            onClick={() => {
                              setFormData({ ...formData, meterType: meterType.value });
                              setShowMeterTypeDropdown(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              backgroundColor: formData.meterType === meterType.value ? '#f1f5f9' : 'transparent',
                              ...(meterType.isSpecial && {
                                border: '2px solid #10B981',
                                backgroundColor: formData.meterType === meterType.value ? '#ecfdf5' : '#f0fdf4'
                              })
                            }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = meterType.isSpecial ? '#ecfdf5' : '#f8fafc'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = formData.meterType === meterType.value ? (meterType.isSpecial ? '#ecfdf5' : '#f1f5f9') : 'transparent'}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: meterType.color,
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px'
                            }}>
                              {meterType.icon}
                            </div>
                            <span style={{ 
                              fontWeight: meterType.isSpecial ? '600' : '500',
                              color: meterType.isSpecial ? '#10B981' : '#1f2937',
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '14px'
                            }}>
                              {meterType.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* All Municipalities Section */}
                      {meterTypeSearchTerm && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '4px',
                            padding: '0 4px'
                          }}>
                            ALL MUNICIPALITIES
                          </div>
                          {[
                            // Local Municipalities
                            { value: 'Albert Luthuli', label: 'Albert Luthuli', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'BelaBela', label: 'BelaBela', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Dikgatlong', label: 'Dikgatlong', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Ditsobotla', label: 'Ditsobotla', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Emakhazeni', label: 'Emakhazeni', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Emalahleni (Witbank)', label: 'Emalahleni (Witbank)', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Ephraim Mogale (Marblehall)', label: 'Ephraim Mogale (Marblehall)', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'GaSegonyana', label: 'GaSegonyana', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Govan Mbeki', label: 'Govan Mbeki', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Greater Letaba', label: 'Greater Letaba', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Kgatelopele', label: 'Kgatelopele', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Kgethlengrivier', label: 'Kgethlengrivier', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Kokstad', label: 'Kokstad', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Langeberg', label: 'Langeberg', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Lesedi', label: 'Lesedi', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Lukhanji (Enoch Mugijima)', label: 'Lukhanji (Enoch Mugijima)', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Madibeng', label: 'Madibeng', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Mafube (water)', label: 'Mafube (water)', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Magareng', label: 'Magareng', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Mandeni', label: 'Mandeni', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Mantsopa', label: 'Mantsopa', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Matzikama', label: 'Matzikama', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Maquassi Hills', label: 'Maquassi Hills', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Mbizana (Winnie Madikizela-Mandela)', label: 'Mbizana (Winnie Madikizela-Mandela)', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Mpofana', label: 'Mpofana', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Musina', label: 'Musina', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Naledi', label: 'Naledi', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Phalaborwa', label: 'Phalaborwa', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Siyathemba', label: 'Siyathemba', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Swellendam', label: 'Swellendam', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Thaba Chweu', label: 'Thaba Chweu', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Thembelihle', label: 'Thembelihle', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Tsantsabane', label: 'Tsantsabane', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Tswaing', label: 'Tswaing', color: '#8B5CF6', icon: '🏘️' },
                            { value: 'Umsobomvu', label: 'Umsobomvu', color: '#8B5CF6', icon: '🏘️' },
                            // District Municipalities
                            { value: 'Uthukela District (Water)', label: 'Uthukela District (Water)', color: '#F59E0B', icon: '💧' },
                            { value: 'Uthukela District (Electricity)', label: 'Uthukela District (Electricity)', color: '#F59E0B', icon: '⚡' },
                            // Private Utilities
                            { value: 'Afhco', label: 'Afhco', color: '#EF4444', icon: '🏢' },
                            { value: 'Applied Metering Innovation', label: 'Applied Metering Innovation', color: '#EF4444', icon: '🏢' },
                            { value: 'Blueberry', label: 'Blueberry', color: '#EF4444', icon: '🏢' },
                            { value: 'Broham', label: 'Broham', color: '#EF4444', icon: '🏢' },
                            { value: 'BVTechSA', label: 'BVTechSA', color: '#EF4444', icon: '🏢' },
                            { value: 'Citiq', label: 'Citiq', color: '#EF4444', icon: '🏢' },
                            { value: 'Conlog SLICE – Mapule', label: 'Conlog SLICE – Mapule', color: '#EF4444', icon: '🏢' },
                            { value: 'DA Metering', label: 'DA Metering', color: '#EF4444', icon: '🏢' },
                            { value: 'EGS', label: 'EGS', color: '#EF4444', icon: '🏢' },
                            { value: 'Energy Intelligence Consortium', label: 'Energy Intelligence Consortium', color: '#EF4444', icon: '🏢' },
                            { value: 'GRC Systems', label: 'GRC Systems', color: '#EF4444', icon: '🏢' },
                            { value: 'Hbros', label: 'Hbros', color: '#EF4444', icon: '🏢' },
                            { value: 'Ideal Prepaid', label: 'Ideal Prepaid', color: '#EF4444', icon: '🏢' },
                            { value: 'IS Metering', label: 'IS Metering', color: '#EF4444', icon: '🏢' },
                            { value: 'Itron PU', label: 'Itron PU', color: '#EF4444', icon: '🏢' },
                            { value: 'JMflowsort', label: 'JMflowsort', color: '#EF4444', icon: '🏢' },
                            { value: 'Jager', label: 'Jager', color: '#EF4444', icon: '🏢' },
                            { value: 'KK Prepaid', label: 'KK Prepaid', color: '#EF4444', icon: '🏢' },
                            { value: 'Landis', label: 'Landis', color: '#EF4444', icon: '🏢' },
                            { value: 'LIC', label: 'LIC', color: '#EF4444', icon: '🏢' },
                            { value: 'LiveWire', label: 'LiveWire', color: '#EF4444', icon: '🏢' },
                            { value: 'LL Energy', label: 'LL Energy', color: '#EF4444', icon: '🏢' },
                            { value: 'Meter Man', label: 'Meter Man', color: '#EF4444', icon: '🏢' },
                            { value: 'Meter Shack', label: 'Meter Shack', color: '#EF4444', icon: '🏢' },
                            { value: 'Metro Prepaid', label: 'Metro Prepaid', color: '#EF4444', icon: '🏢' },
                            { value: 'Mid-City', label: 'Mid-City', color: '#EF4444', icon: '🏢' },
                            { value: 'MSI', label: 'MSI', color: '#EF4444', icon: '🏢' },
                            { value: 'My Voltage', label: 'My Voltage', color: '#EF4444', icon: '🏢' },
                            { value: 'NetVendor', label: 'NetVendor', color: '#EF4444', icon: '🏢' },
                            { value: 'PEC Cape Town', label: 'PEC Cape Town', color: '#EF4444', icon: '🏢' },
                            { value: 'PEC Bloemfontein', label: 'PEC Bloemfontein', color: '#EF4444', icon: '🏢' },
                            { value: 'PEC Gauteng', label: 'PEC Gauteng', color: '#EF4444', icon: '🏢' },
                            { value: 'PMD (Power Measurement)', label: 'PMD (Power Measurement)', color: '#EF4444', icon: '🏢' },
                            { value: 'Prepay Metering', label: 'Prepay Metering', color: '#EF4444', icon: '🏢' },
                            { value: 'Protea Meter', label: 'Protea Meter', color: '#EF4444', icon: '🏢' },
                            { value: 'Ratcom (Mabcom Metering)', label: 'Ratcom (Mabcom Metering)', color: '#EF4444', icon: '🏢' },
                            { value: 'Recharger', label: 'Recharger', color: '#EF4444', icon: '🏢' },
                            { value: 'Ruvick Energy', label: 'Ruvick Energy', color: '#EF4444', icon: '🏢' },
                            { value: 'Smart E Power', label: 'Smart E Power', color: '#EF4444', icon: '🏢' },
                            { value: 'Smartpowersa (Konta Metering)', label: 'Smartpowersa (Konta Metering)', color: '#EF4444', icon: '🏢' },
                            { value: 'Unique Solutions', label: 'Unique Solutions', color: '#EF4444', icon: '🏢' },
                            { value: 'UU Solutions', label: 'UU Solutions', color: '#EF4444', icon: '🏢' },
                            { value: 'Youtility_Actom', label: 'Youtility_Actom', color: '#EF4444', icon: '🏢' },
                            { value: 'Youtility_Inceku', label: 'Youtility_Inceku', color: '#EF4444', icon: '🏢' },
                            { value: 'Youtility_Pioneer', label: 'Youtility_Pioneer', color: '#EF4444', icon: '🏢' },
                            { value: 'Youtility_Proadmin', label: 'Youtility_Proadmin', color: '#EF4444', icon: '🏢' },
                            { value: 'Youtility_Umfa', label: 'Youtility_Umfa', color: '#EF4444', icon: '🏢' },
                            { value: 'Uvend', label: 'Uvend', color: '#EF4444', icon: '🏢' },
                            { value: 'Vula', label: 'Vula', color: '#EF4444', icon: '🏢' }
                          ].filter(meterType => 
                            meterType.label.toLowerCase().includes(meterTypeSearchTerm.toLowerCase())
                          ).map((meterType) => (
                            <div
                              key={meterType.value}
                              onClick={() => {
                                setFormData({ ...formData, meterType: meterType.value });
                                setShowMeterTypeDropdown(false);
                                setMeterTypeSearchTerm('');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: formData.meterType === meterType.value ? '#f1f5f9' : 'transparent'
                              }}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = formData.meterType === meterType.value ? '#f1f5f9' : 'transparent'}
                            >
                              <div style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: meterType.color,
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px'
                              }}>
                                {meterType.icon}
                              </div>
                              <span style={{ 
                                fontWeight: '400',
                                color: '#374151',
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '13px'
                              }}>
                                {meterType.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {type === 'biller' && (
              <div>
                <Label htmlFor="billerName" style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Biller Name
                </Label>
                <Input
                  id="billerName"
                  value={formData.billerName}
                  onChange={(e) => setFormData({ ...formData, billerName: e.target.value })}
                  placeholder="Enter biller name"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '12px'
                  }}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  color: '#dc2626'
                }}>
                  {error}
                </p>
              </div>
            )}

            {/* Add Number Button (only when editing airtime/data recipients) */}
            {editBeneficiary && (type === 'airtime' || type === 'data') && onAddNumber && (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Don't call onClose() - it clears editingBeneficiary which is needed for AddAdditionalNumberModal
                    // The onAddNumber handler will close the modal without clearing editingBeneficiary
                    onAddNumber();
                  }}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '12px',
                    border: '1px solid #86BE41',
                    color: '#86BE41',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Add Number
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                style={{
                  flex: '1',
                  minHeight: '44px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '12px'
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                style={{
                  flex: '1',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                disabled={isLoading}
              >
                {isLoading ? (editBeneficiary ? 'Updating...' : 'Creating...') : (editBeneficiary ? 'Update Recipient' : 'Create Recipient')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
