import React from 'react';
import { AlertTriangle, Clock, Shield, CreditCard } from 'lucide-react';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Separator } from '../../ui/separator';

interface SummaryRow {
  label: string;
  value: string;
  highlight?: boolean;
}

interface Notice {
  id: string;
  type: 'warning' | 'info' | 'error';
  title: string;
  description: string;
}

interface ConfirmSheetProps {
  title?: string;
  summaryRows: SummaryRow[];
  notices?: Notice[];
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  isPrimaryDisabled?: boolean;
  isLoading?: boolean;
  estimatedTime?: string;
}

export function ConfirmSheet({
  title = "Confirm Transaction",
  summaryRows,
  notices = [],
  primaryButtonText = "Pay Now",
  secondaryButtonText = "Cancel",
  onPrimaryAction,
  onSecondaryAction,
  isPrimaryDisabled = false,
  isLoading = false,
  estimatedTime
}: ConfirmSheetProps) {
  
  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle style={{ width: '16px', height: '16px' }} />;
      case 'info':
        return <Shield style={{ width: '16px', height: '16px' }} />;
      case 'error':
        return <AlertTriangle style={{ width: '16px', height: '16px' }} />;
      default:
        return <Shield style={{ width: '16px', height: '16px' }} />;
    }
  };

  const getNoticeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          color: '#92400e'
        };
      case 'info':
        return {
          backgroundColor: '#e0f2fe',
          borderColor: '#2D8CCA',
          color: '#0c4a6e'
        };
      case 'error':
        return {
          backgroundColor: '#fee2e2',
          borderColor: '#dc2626',
          color: '#991b1b'
        };
      default:
        return {
          backgroundColor: '#e0f2fe',
          borderColor: '#2D8CCA',
          color: '#0c4a6e'
        };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // Above bottom navigation
      left: '50%',
      transform: 'translateX(-50%)',
      width: '375px',
      maxHeight: '70vh',
      backgroundColor: '#ffffff',
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h3 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '18px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0'
        }}>
          {title}
        </h3>
        {estimatedTime && (
          <div className="flex items-center gap-2 mt-2">
            <Clock style={{ width: '14px', height: '14px', color: '#6b7280' }} />
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Estimated time: {estimatedTime}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div style={{
        maxHeight: 'calc(70vh - 140px)', // Account for header and buttons
        overflowY: 'auto',
        padding: '1rem'
      }}>
        {/* Summary Rows */}
        <div className="space-y-3 mb-4">
          {summaryRows.map((row, index) => (
            <div key={index}>
              <div className="flex items-center justify-between">
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: row.highlight ? '500' : '400',
                  color: row.highlight ? '#1f2937' : '#6b7280'
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: row.highlight ? '16px' : '14px',
                  fontWeight: row.highlight ? '700' : '500',
                  color: '#1f2937'
                }}>
                  {row.value}
                </span>
              </div>
              {row.highlight && index < summaryRows.length - 1 && (
                <Separator style={{ margin: '12px 0' }} />
              )}
            </div>
          ))}
        </div>

        {/* Notices */}
        {notices.length > 0 && (
          <div className="space-y-3">
            {notices.map((notice) => (
              <Alert
                key={notice.id}
                style={{
                  ...getNoticeStyles(notice.type),
                  border: `1px solid ${getNoticeStyles(notice.type).borderColor}`,
                  borderRadius: '12px'
                }}
              >
                {getNoticeIcon(notice.type)}
                <AlertDescription>
                  <div>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '4px'
                    }}>
                      {notice.title}
                    </p>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '11px',
                      opacity: 0.8
                    }}>
                      {notice.description}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: '12px'
      }}>
        <Button
          variant="outline"
          onClick={onSecondaryAction}
          disabled={isLoading}
          style={{
            flex: '1',
            minHeight: '44px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e2e8f0',
            color: '#6b7280',
            borderRadius: '12px'
          }}
        >
          {secondaryButtonText}
        </Button>
        
        <Button
          onClick={onPrimaryAction}
          disabled={isPrimaryDisabled || isLoading}
          style={{
            flex: '2',
            minHeight: '44px',
            background: isPrimaryDisabled 
              ? '#e2e8f0' 
              : 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
            color: isPrimaryDisabled ? '#6b7280' : '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isPrimaryDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CreditCard style={{ width: '16px', height: '16px' }} />
              {primaryButtonText}
            </div>
          )}
        </Button>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}