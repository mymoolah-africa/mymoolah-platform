import React from 'react';
import { X, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';

interface Account {
  id: number;
  type: string;
  identifier: string;
  label?: string;
  isDefault: boolean;
  metadata?: {
    network?: string;
    msisdn?: string;
    [key: string]: any;
  };
}

interface AccountSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  accounts: Account[];
  onSelectAccount: (accountId: number) => void;
  onRemoveAccount?: (accountId: number) => void; // Optional callback to remove an account
}

export function AccountSelectorModal({ 
  isOpen, 
  onClose, 
  recipientName, 
  accounts,
  onSelectAccount,
  onRemoveAccount 
}: AccountSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 200,
    }}>
      <Card style={{
        position: 'fixed',
        top: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '375px',
        maxHeight: 'calc(100vh - 120px - 60px)',
        overflow: 'auto',
        backgroundColor: '#ffffff',
        border: 'none',
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
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
                  Select Number
                </CardTitle>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px'
                }}>
                  {recipientName}
                </p>
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
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#86BE41';
                  e.currentTarget.style.backgroundColor = 'rgba(134, 190, 65, 0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectAccount(account.id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flex: 1,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: 0
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Smartphone style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                  </div>
                  
                  <div className="flex-1">
                    <div style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {account.metadata?.network || 'Unknown Network'}
                    </div>
                    <div style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {account.identifier}
                    </div>
                  </div>
                </button>
                
                {/* Remove Button - only show if there are multiple accounts and onRemoveAccount is provided */}
                {onRemoveAccount && accounts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAccount(account.id);
                    }}
                    style={{
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '0',
                      position: 'relative',
                      zIndex: 20,
                      marginLeft: '8px'
                    }}
                  >
                    <X style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

