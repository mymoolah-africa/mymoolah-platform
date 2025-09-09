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
        border: `1px solid ${styles.borderColor}`,
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '400px',
        width: '100%',
        animation: 'slideIn 0.2s ease-out'
      }}>
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
      
      {/* Close button (X) in top-right corner */}
      <Button
        variant="ghost"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <X style={{ width: '20px', height: '20px', color: '#6b7280' }} />
      </Button>
    </div>
  );
}
