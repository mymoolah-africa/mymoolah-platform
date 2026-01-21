import React, { useState, useCallback } from 'react';
import { Search, Plus, Edit2, Smartphone, Zap, FileText, Check, X, ChevronDown, Wallet, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

// Legacy format (backward compatible)
interface LegacyBeneficiary {
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

// New unified format (with multiple accounts)
interface BeneficiaryAccount {
  id: number;
  type: 'mymoolah' | 'bank' | 'mobile_money' | 'airtime' | 'data' | 'electricity' | 'biller' | 'voucher';
  identifier: string;
  label?: string;
  isDefault: boolean;
  metadata?: Record<string, any>;
}

interface UnifiedBeneficiary {
  id: number;
  name: string;
  msisdn?: string;
  accounts: BeneficiaryAccount[];
  isFavorite: boolean;
  notes?: string;
  preferredPaymentMethod?: string;
  lastPaidAt?: string;
  timesPaid: number;
  createdAt: string;
  updatedAt: string;
}

// Union type for backward compatibility
type Beneficiary = LegacyBeneficiary | UnifiedBeneficiary;

interface BeneficiaryListProps {
  type?: 'all' | 'airtime' | 'data' | 'electricity' | 'biller';
  beneficiaries: Beneficiary[];
  selectedBeneficiary?: Beneficiary | null;
  selectedAccountId?: number | null; // For unified beneficiaries with multiple accounts
  onSelect: (beneficiary: Beneficiary, accountId?: number) => void; // accountId for unified format
  onAddNew: () => void;
  onEdit: (beneficiary: Beneficiary) => void;
  onRemove?: (beneficiary: Beneficiary) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  title?: string;
  addNewButtonText?: string;
  showFilters?: boolean;
}

// Helper to check if beneficiary is unified format
function isUnifiedBeneficiary(b: Beneficiary): b is UnifiedBeneficiary {
  return 'accounts' in b && Array.isArray((b as UnifiedBeneficiary).accounts);
}

// Helper to get accounts for a beneficiary (unified or legacy)
function getBeneficiaryAccounts(b: Beneficiary): BeneficiaryAccount[] {
  if (isUnifiedBeneficiary(b)) {
    return b.accounts;
  }
  // Legacy format - create single account
  return [{
    id: parseInt(b.id) * 1000,
    type: b.accountType as any,
    identifier: b.identifier,
    label: b.bankName ? `${b.bankName} Account` : b.accountType,
    isDefault: true,
    metadata: b.metadata || {}
  }];
}

// Helper to get default account
function getDefaultAccount(b: Beneficiary): BeneficiaryAccount | null {
  const accounts = getBeneficiaryAccounts(b);
  return accounts.find(a => a.isDefault) || accounts[0] || null;
}

export function BeneficiaryList({
  type = 'all',
  beneficiaries,
  selectedBeneficiary,
  selectedAccountId,
  onSelect,
  onAddNew,
  onEdit,
  onRemove,
  isLoading = false,
  searchPlaceholder = "Search name or number",
  title = "Select Recipient",
  addNewButtonText = "Add New Recipient",
  showFilters = true
}: BeneficiaryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>(type);

  // Filter beneficiaries based on search and type
  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    const matchesSearch = 
      beneficiary.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isUnifiedBeneficiary(beneficiary) 
        ? beneficiary.accounts.some(a => a.identifier?.toLowerCase().includes(searchQuery.toLowerCase()))
        : beneficiary.identifier?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // For unified format, check if any account matches the filter type
    const matchesType = filterType === 'all' || 
      (isUnifiedBeneficiary(beneficiary)
        ? beneficiary.accounts.some(a => a.type === filterType || 
          (filterType === 'airtime-data' && (a.type === 'airtime' || a.type === 'data')))
        : beneficiary.accountType === filterType);
    
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

  const getValidationStatus = (beneficiary: LegacyBeneficiary) => {
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
            filteredBeneficiaries.map((beneficiary) => {
              const accounts = getBeneficiaryAccounts(beneficiary);
              const defaultAccount = getDefaultAccount(beneficiary);
              const hasMultipleAccounts = accounts.length > 1;
              const beneficiaryIdStr = String(beneficiary.id);
              const isSelected = selectedBeneficiary?.id === beneficiary.id;
              
              // Determine which account to show/use
              const displayAccount = selectedAccountId && isSelected
                ? accounts.find(a => a.id === selectedAccountId) || defaultAccount
                : defaultAccount;
              
              return (
                <div
                  key={beneficiary.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      // If multiple accounts, don't pass accountId - let parent show account selector
                      // If single account, pass the account ID
                      onSelect(beneficiary, hasMultipleAccounts ? undefined : displayAccount?.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(beneficiary, hasMultipleAccounts ? undefined : displayAccount?.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '12px',
                      border: `2px solid ${isSelected ? '#86BE41' : '#e2e8f0'}`,
                      backgroundColor: isSelected ? 'rgba(134, 190, 65, 0.05)' : '#ffffff',
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
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(134, 190, 65, 0.5)';
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
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
                        {displayAccount ? getTypeIcon(displayAccount.type) : getTypeIcon(isUnifiedBeneficiary(beneficiary) ? 'mymoolah' : (beneficiary as LegacyBeneficiary).accountType)}
                      </div>
                      
                      {/* Beneficiary Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#1f2937'
                          }}>
                            {beneficiary.name}
                          </p>
                          {/* Badge for multiple numbers - award-winning banking/telecom UI pattern */}
                          {hasMultipleAccounts && (
                            <Badge 
                              variant="secondary"
                              style={{
                                fontSize: '10px',
                                backgroundColor: '#e2e8f0',
                                color: '#4b5563',
                                padding: '2px 6px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                lineHeight: '1.2',
                                minWidth: '20px',
                                textAlign: 'center'
                              }}
                            >
                              {accounts.length}
                            </Badge>
                          )}
                          {isUnifiedBeneficiary(beneficiary) ? null : getValidationStatus(beneficiary as LegacyBeneficiary)}
                        </div>
                        {/* Network name removed - only beneficiary name displayed for cleaner UI */}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div 
                      className="flex gap-1 items-center"
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
                  </div>
                </div>
              );
            })
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