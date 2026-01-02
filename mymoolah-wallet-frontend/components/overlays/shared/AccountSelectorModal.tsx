import React from 'react';
import { X, Smartphone, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

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
}

export function AccountSelectorModal({ 
  isOpen, 
  onClose, 
  recipientName, 
  accounts,
  onSelectAccount 
}: AccountSelectorModalProps) {
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
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  onSelectAccount(account.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
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
                <div className="flex items-center gap-3 flex-1">
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
                </div>
                
                {account.isDefault && (
                  <Badge 
                    variant="secondary"
                    style={{
                      fontSize: '10px',
                      backgroundColor: '#86BE41',
                      color: '#ffffff',
                      padding: '4px 8px',
                      fontWeight: '500'
                    }}
                  >
                    Default
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

