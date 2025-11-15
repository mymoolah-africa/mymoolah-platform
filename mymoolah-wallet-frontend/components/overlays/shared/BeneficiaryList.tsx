import React, { useState } from 'react';
import { Search, Plus, Edit2, Smartphone, Zap, FileText, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface Beneficiary {
  id: string;
  name: string;
  identifier: string; // MSISDN, meter number, or account reference
  accountType: 'mymoolah' | 'bank' | 'airtime' | 'data' | 'electricity' | 'biller';
  bankName?: string;
  metadata?: {
    network?: string; // For airtime/data
    meterType?: string; // For electricity
    billerName?: string; // For bills
    billerCategory?: string;
    isValid?: boolean; // Validation status
  };
  lastPaidAt?: string;
  timesPaid: number;
  createdAt: string;
  updatedAt: string;
}

interface BeneficiaryListProps {
  type?: 'all' | 'airtime' | 'data' | 'electricity' | 'biller';
  beneficiaries: Beneficiary[];
  selectedBeneficiary?: Beneficiary | null;
  onSelect: (beneficiary: Beneficiary) => void;
  onAddNew: () => void;
  onEdit: (beneficiary: Beneficiary) => void;
  onRemove?: (beneficiary: Beneficiary) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  title?: string;
  addNewButtonText?: string;
  showFilters?: boolean;
}

export function BeneficiaryList({
  type = 'all',
  beneficiaries,
  selectedBeneficiary,
  onSelect,
  onAddNew,
  onEdit,
  onRemove,
  isLoading = false,
  searchPlaceholder = "Search name or number",
  title = "Select Beneficiary",
  addNewButtonText = "Add New Beneficiary",
  showFilters = true
}: BeneficiaryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>(type);

  // Filter beneficiaries based on search and type
  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    const matchesSearch = 
      beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      beneficiary.identifier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || beneficiary.accountType === filterType;
    
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (beneficiaryType: string) => {
    switch (beneficiaryType) {
      case 'airtime':
      case 'data':
        return <Smartphone style={{ width: '16px', height: '16px' }} />;
      case 'electricity':
        return <Zap style={{ width: '16px', height: '16px' }} />;
      case 'biller':
        return <FileText style={{ width: '16px', height: '16px' }} />;
      default:
        return <FileText style={{ width: '16px', height: '16px' }} />;
    }
  };

  const getValidationStatus = (beneficiary: Beneficiary) => {
    const isValid = beneficiary.metadata?.isValid !== false;
    return isValid ? (
      <Check style={{ width: '14px', height: '14px', color: '#16a34a' }} />
    ) : (
      <X style={{ width: '14px', height: '14px', color: '#dc2626' }} />
    );
  };

  if (isLoading) {
    return (
      <Card style={{ 
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <CardContent style={{ padding: '1rem' }}>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ 
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <CardHeader style={{ paddingBottom: '0.5rem' }}>
        <CardTitle style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '18px',
          fontWeight: '700',
          color: '#1f2937'
        }}>
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent style={{ padding: '1rem', paddingTop: '0.5rem' }}>
        {/* Search Input */}
        <div className="relative mb-4">
          <Search style={{ 
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            color: '#6b7280'
          }} />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '40px',
              height: '44px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '12px'
            }}
          />
        </div>

        {/* Filter Chips */}
        {showFilters && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {['all', 'airtime', 'data', 'electricity', 'biller'].map((filterOption) => (
              <Button
                key={filterOption}
                variant={filterType === filterOption ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(filterOption)}
                style={{
                  minWidth: 'max-content',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: filterType === filterOption ? '#86BE41' : 'transparent',
                  color: filterType === filterOption ? '#ffffff' : '#6b7280',
                  border: `1px solid ${filterType === filterOption ? '#86BE41' : '#e2e8f0'}`,
                  borderRadius: '12px'
                }}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Button>
            ))}
          </div>
        )}

        {/* Beneficiary List */}
        <div className="space-y-3 mb-4">
          {filteredBeneficiaries.length === 0 ? (
            <div className="text-center py-6">
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Search style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              </div>
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '12px'
              }}>
                {searchQuery ? 'No beneficiaries found' : 'No beneficiaries yet'}
              </p>
              <Button
                onClick={onAddNew}
                style={{
                  backgroundColor: '#86BE41',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  minHeight: '44px'
                }}
              >
                <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                {addNewButtonText.replace('New', 'First')}
              </Button>
            </div>
          ) : (
            filteredBeneficiaries.map((beneficiary) => (
              <button
                key={beneficiary.id}
                type="button"
                onClick={() => onSelect(beneficiary)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(beneficiary);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${selectedBeneficiary?.id === beneficiary.id ? '#86BE41' : '#e2e8f0'}`,
                  backgroundColor: selectedBeneficiary?.id === beneficiary.id ? '#86BE41/5' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation',
                  width: '100%',
                  textAlign: 'left',
                  outline: 'none'
                }}
                onMouseOver={(e) => {
                  if (selectedBeneficiary?.id !== beneficiary.id) {
                    e.currentTarget.style.borderColor = '#86BE41/50';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedBeneficiary?.id !== beneficiary.id) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #86BE41';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <div 
                  className="flex items-center gap-3 flex-1"
                  style={{
                    minWidth: 0
                  }}
                >
                  {/* Avatar with Type Icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getTypeIcon(beneficiary.accountType)}
                  </div>
                  
                  {/* Beneficiary Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {beneficiary.name}
                      </p>
                      {getValidationStatus(beneficiary)}
                    </div>
                    
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {beneficiary.identifier}
                    </p>
                    
                    {/* Metadata Chips */}
                    <div className="flex gap-1 mt-1">
                      {beneficiary.metadata?.network && (
                        <Badge 
                          variant="secondary"
                          style={{
                            fontSize: '10px',
                            backgroundColor: '#e2e8f0',
                            color: '#6b7280'
                          }}
                        >
                          {beneficiary.metadata.network}
                        </Badge>
                      )}
                      {beneficiary.metadata?.meterType && (
                        <Badge 
                          variant="secondary"
                          style={{
                            fontSize: '10px',
                            backgroundColor: '#e2e8f0',
                            color: '#6b7280'
                          }}
                        >
                          {beneficiary.metadata.meterType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div 
                  className="flex gap-1"
                  style={{
                    flexShrink: 0,
                    zIndex: 10
                  }}
                >
                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(beneficiary);
                    }}
                    style={{
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0',
                      position: 'relative',
                      zIndex: 20
                    }}
                  >
                    <Edit2 style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                  </Button>
                  
                  {/* Remove Button */}
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(beneficiary);
                      }}
                      style={{
                        minWidth: '44px',
                        minHeight: '44px',
                        padding: '0',
                        position: 'relative',
                        zIndex: 20
                      }}
                    >
                      <X style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                    </Button>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Add New Button */}
        {filteredBeneficiaries.length > 0 && (
          <Button
            onClick={onAddNew}
            variant="outline"
            style={{
              width: '100%',
              minHeight: '44px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid #86BE41',
              color: '#86BE41',
              borderRadius: '12px'
            }}
          >
            <Plus style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            {addNewButtonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}