import React from 'react';
import { X, Copy, Share, Zap, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';

interface Transaction {
  id: string;
  transactionId: string;
  amount: number;
  type: string;
  description: string;
  timestamp: string;
  status: string;
  metadata?: {
    electricityToken?: string;
    beneficiaryName?: string;
    beneficiaryMeter?: string;
    meterType?: string;
    purchasedAt?: string;
    vasType?: string;
    [key: string]: any;
  };
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function TransactionDetailModal({ isOpen, onClose, transaction }: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null;

  const isElectricity = transaction.metadata?.vasType === 'electricity' || 
                        transaction.description?.toLowerCase().includes('electricity');

  const handleCopyToken = () => {
    if (transaction.metadata?.electricityToken) {
      navigator.clipboard.writeText(transaction.metadata.electricityToken);
      // Optional: Show copied confirmation
      const button = document.querySelector('[data-copy-token]') as HTMLElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText || 'Copy Token';
        }, 2000);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatToken = (token: string): string => {
    // Group token by 4 digits with spaces
    if (!token) return '';
    return token.match(/.{1,4}/g)?.join(' ') || token;
  };

  const formatReference = (ref: string): string => {
    // Shorten long references for display
    if (!ref) return '';
    if (ref.length > 30) {
      return `${ref.substring(0, 15)}...${ref.substring(ref.length - 10)}`;
    }
    return ref;
  };

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
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <CardHeader style={{
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem',
          backgroundColor: '#f9fafb'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isElectricity && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#86BE41',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Zap style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
              )}
              <div>
                <h2 style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  {isElectricity ? 'Electricity Purchase' : 'Transaction Details'}
                </h2>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: 0
                }}>
                  {formatDate(transaction.timestamp)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            >
              <X style={{ width: '16px', height: '16px', color: '#6b7280' }} />
            </button>
          </div>
        </CardHeader>

        <CardContent style={{ padding: '1.5rem' }}>
          {/* Electricity Token (if available) */}
          {isElectricity && transaction.metadata?.electricityToken && (
            <>
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '2px dashed #86BE41',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(134, 190, 65, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#86BE41',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Zap style={{ width: '28px', height: '28px', color: '#ffffff' }} />
                  </div>
                </div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#059669',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Your Electricity Token
                </p>
                <p style={{
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#1f2937',
                  letterSpacing: '0.1em',
                  marginBottom: '1.25rem',
                  lineHeight: '1.6',
                  wordSpacing: '0.3em'
                }}>
                  {formatToken(transaction.metadata.electricityToken)}
                </p>
                <Button
                  onClick={handleCopyToken}
                  data-copy-token
                  style={{
                    background: '#86BE41',
                    color: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: '0 auto',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(134, 190, 65, 0.2)'
                  }}
                  onMouseEnter={(e: any) => {
                    e.currentTarget.style.background = '#7ab038';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(134, 190, 65, 0.3)';
                  }}
                  onMouseLeave={(e: any) => {
                    e.currentTarget.style.background = '#86BE41';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(134, 190, 65, 0.2)';
                  }}
                >
                  <Copy style={{ width: '16px', height: '16px' }} />
                  Copy Token
                </Button>
              </div>

              <div style={{
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '1.5rem'
              }}></div>
            </>
          )}

          {/* Transaction Details */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              Transaction Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Reference */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Reference
                </span>
                <span style={{
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1f2937',
                  backgroundColor: '#f3f4f6',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  maxWidth: '250px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={transaction.transactionId}
                >
                  {formatReference(transaction.transactionId || transaction.reference || 'N/A')}
                </span>
              </div>

              {/* Beneficiary Name (if electricity) */}
              {isElectricity && transaction.metadata?.beneficiaryName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}>
                    Meter
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {transaction.metadata.beneficiaryName}
                  </span>
                </div>
              )}

              {/* Meter Number (if electricity) */}
              {isElectricity && transaction.metadata?.beneficiaryMeter && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}>
                    Meter Number
                  </span>
                  <span style={{
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {transaction.metadata.beneficiaryMeter}
                  </span>
                </div>
              )}

              {/* Meter Type (if electricity) */}
              {isElectricity && transaction.metadata?.meterType && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}>
                    Meter Type
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {transaction.metadata.meterType}
                  </span>
                </div>
              )}

              {/* Amount */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: transaction.amount >= 0 ? '#f0fdf4' : '#fef2f2',
                borderRadius: '10px',
                border: `2px solid ${transaction.amount >= 0 ? '#86BE41' : '#ef4444'}`
              }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Amount
                </span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: transaction.amount >= 0 ? '#16a34a' : '#dc2626'
                }}>
                  R {Math.abs(transaction.amount).toFixed(2)}
                </span>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Status
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#f0fdf4',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #86BE41'
                }}>
                  <CheckCircle style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#16a34a',
                    textTransform: 'capitalize'
                  }}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
              color: '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '700',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e: any) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e: any) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
          >
            Done
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
