import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader } from '../../ui/card';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  beneficiaryName?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes, remove',
  cancelText = 'Cancel',
  type = 'danger',
  beneficiaryName
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: '#dc2626',
          iconBg: '#fef2f2',
          borderColor: '#fecaca',
          confirmBg: '#dc2626',
          confirmHover: '#b91c1c'
        };
      case 'warning':
        return {
          iconColor: '#f59e0b',
          iconBg: '#fffbeb',
          borderColor: '#fed7aa',
          confirmBg: '#f59e0b',
          confirmHover: '#d97706'
        };
      default:
        return {
          iconColor: '#3b82f6',
          iconBg: '#eff6ff',
          borderColor: '#bfdbfe',
          confirmBg: '#3b82f6',
          confirmHover: '#2563eb'
        };
    }
  };

  const styles = getTypeStyles();

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
        border: `1px solid ${styles.borderColor}`,
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
        animation: 'slideIn 0.2s ease-out'
      }}>
        {/* Close button (X) in top-right corner */}
        <button
          onClick={onClose}
          className="universal-close-btn"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
        
        <CardHeader style={{
          padding: '1.5rem 1.5rem 0.5rem 1.5rem',
          textAlign: 'center'
        }}>
          {/* Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: styles.iconBg,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            border: `2px solid ${styles.borderColor}`
          }}>
            <AlertTriangle style={{
              width: '32px',
              height: '32px',
              color: styles.iconColor
            }} />
          </div>
          
          {/* Title */}
          <h2 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '20px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 0.5rem 0'
          }}>
            {title}
          </h2>
          
          {/* Message */}
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.5',
            margin: 0
          }}>
            {message}
            {beneficiaryName && (
              <span style={{
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {' '}{beneficiaryName}?
              </span>
            )}
          </p>
        </CardHeader>
        
        <CardContent style={{
          padding: '0 1.5rem 1.5rem 1.5rem'
        }}>
          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '1.5rem'
          }}>
            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={onClose}
              style={{
                flex: '1',
                minHeight: '48px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #e2e8f0',
                color: '#6b7280',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              {cancelText}
            </Button>
            
            {/* Confirm Button */}
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{
                flex: '1',
                minHeight: '48px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: styles.confirmBg,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = styles.confirmHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = styles.confirmBg;
              }}
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
