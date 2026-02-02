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
  
  const isCashOut = transaction.metadata?.vasType === 'cash_out' ||
                    transaction.description?.toLowerCase().includes('eezi cash') ||
                    transaction.description?.toLowerCase().includes('cash out');

  const handleCopyToken = () => {
    const tokenToCopy = transaction.metadata?.electricityToken || transaction.metadata?.pin;
    if (tokenToCopy) {
      navigator.clipboard.writeText(tokenToCopy);
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
        maxWidth: '90vw',
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
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Zap style={{
                    width: '32px',
                    height: '32px',
                    color: '#f59e0b',
                    margin: '0 auto 8px'
                  }} />
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    Your Electricity Token
                  </p>
                  <p style={{
                    fontFamily: 'Monaco, Courier, monospace',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1f2937',
                    letterSpacing: '2px',
                    wordBreak: 'break-all',
                    marginBottom: '1rem'
                  }}>
                    {formatToken(transaction.metadata.electricityToken)}
                  </p>
                  <Button
                    onClick={handleCopyToken}
                    data-copy-token
                    variant="outline"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      minHeight: '44px',
                      borderRadius: '12px',
                      margin: '0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Copy style={{ width: '16px', height: '16px' }} />
                    Copy Token
                  </Button>
                </div>
              </div>

              <div style={{
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '1rem',
                marginTop: '1rem'
              }}>              </div>
            </>
          )}

          {/* Flash Cash-Out PIN (if available) */}
          {isCashOut && transaction.metadata?.pin && (
            <>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    Your EeziCash PIN
                  </p>
                  <p style={{
                    fontFamily: 'Monaco, Courier, monospace',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1f2937',
                    letterSpacing: '3px',
                    marginBottom: '1rem'
                  }}>
                    {transaction.metadata.pin}
                  </p>
                  <Button
                    onClick={handleCopyToken}
                    data-copy-token
                    variant="outline"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      minHeight: '44px',
                      borderRadius: '12px',
                      width: '100%',
                      backgroundColor: '#ffffff',
                      border: '2px solid #2D8CCA',
                      color: '#2D8CCA'
                    }}
                  >
                    <Copy style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                    Copy PIN
                  </Button>
                </div>
              </div>

              {/* PIN Value and Fee Breakdown */}
              {transaction.metadata?.faceValue && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafe',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginTop: '1rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        PIN Value
                      </span>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        R {Number(transaction.metadata.faceValue).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        Transaction Fee
                      </span>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        R {(transaction.metadata.transactionFee || transaction.metadata.customerFee / 100 || 8).toFixed(2)}
                      </span>
                    </div>
                    <div style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        Total Paid
                      </span>
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#dc2626'
                      }}>
                        R {Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280'
                }}>
                  Amount
                </span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '18px',
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
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: '600',
              padding: '12px',
              borderRadius: '12px',
              minHeight: '48px'
            }}
          >
            Done
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
