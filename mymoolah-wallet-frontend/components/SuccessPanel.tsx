import React from 'react';
import { CheckCircle, Copy, Share, Download, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';

interface SuccessAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface SuccessDetail {
  label: string;
  value: string;
  copyable?: boolean;
}

interface InstructionStep {
  step: number;
  description: string;
  highlight?: boolean;
}

interface SuccessPanelProps {
  title: string;
  subtitle?: string;
  timestamp?: string;
  
  // Main content
  code?: string;
  codeLabel?: string;
  maskedCode?: string;
  expiry?: string;
  
  // Transaction details
  details: SuccessDetail[];
  
  // Instructions
  instructions?: {
    title: string;
    steps: InstructionStep[];
  };
  
  // Actions
  primaryAction: SuccessAction;
  secondaryActions?: SuccessAction[];
  
  // Additional info
  notice?: {
    type: 'info' | 'warning' | 'success';
    title: string;
    content: string;
  };
  
  className?: string;
}

export function SuccessPanel({
  title,
  subtitle,
  timestamp,
  code,
  codeLabel = "Code",
  maskedCode,
  expiry,
  details,
  instructions,
  primaryAction,
  secondaryActions = [],
  notice,
  className = ""
}: SuccessPanelProps) {

  const handleCopyCode = async () => {
    if (!code) return;
    
    try {
      await navigator.clipboard.writeText(code);
      // Could trigger toast notification here
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const getNoticeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          iconColor: '#f59e0b',
          textColor: '#92400e'
        };
      case 'success':
        return {
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a',
          iconColor: '#16a34a',
          textColor: '#166534'
        };
      default: // info
        return {
          backgroundColor: '#e0f2fe',
          borderColor: '#2D8CCA',
          iconColor: '#2D8CCA',
          textColor: '#0c4a6e'
        };
    }
  };

  return (
    <div className={className}>
      {/* Success Card */}
      <Card style={{
        backgroundColor: '#ffffff',
        border: '1px solid #16a34a',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)'
      }}>
        {/* Header */}
        <CardHeader style={{
          backgroundColor: '#16a34a',
          color: '#ffffff',
          borderRadius: '12px 12px 0 0'
        }}>
          <div className="flex items-center gap-3">
            <CheckCircle style={{ width: '24px', height: '24px' }} />
            <div>
              <CardTitle style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '700',
                color: '#ffffff'
              }}>
                {title}
              </CardTitle>
              {subtitle && (
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#ffffff',
                  opacity: 0.9
                }}>
                  {subtitle}
                </p>
              )}
              {timestamp && (
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  color: '#ffffff',
                  opacity: 0.9
                }}>
                  {timestamp}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent style={{ padding: '1rem' }}>
          <div className="space-y-4">
            {/* Code Display */}
            {code && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#f8fafe',
                borderRadius: '12px',
                border: '1px dashed #86BE41'
              }}>
                <div className="text-center">
                  <div style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    {codeLabel}
                  </div>
                  
                  <div style={{
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '8px 0',
                    letterSpacing: '2px',
                    wordBreak: 'break-all'
                  }}>
                    {maskedCode || code}
                  </div>
                  
                  {expiry && (
                    <div style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '12px'
                    }}>
                      Expires: {expiry}
                    </div>
                  )}
                  
                  <Button
                    onClick={handleCopyCode}
                    size="sm"
                    style={{
                      backgroundColor: '#86BE41',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      padding: '8px 16px'
                    }}
                  >
                    <Copy style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                    Copy {codeLabel}
                  </Button>
                </div>
              </div>
            )}

            {/* Transaction Details */}
            {details.length > 0 && (
              <div className="space-y-3">
                {details.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {detail.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {detail.value}
                      </span>
                      {detail.copyable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(detail.value)}
                          style={{
                            padding: '4px',
                            minWidth: '24px',
                            minHeight: '24px'
                          }}
                          aria-label={`Copy ${detail.label}`}
                        >
                          <Copy style={{ width: '12px', height: '12px' }} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Instructions */}
            {instructions && (
              <Alert style={{
                ...getNoticeStyles('info'),
                borderRadius: '12px'
              }}>
                <AlertDescription>
                  <div>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '8px',
                      color: getNoticeStyles('info').textColor
                    }}>
                      {instructions.title}
                    </p>
                    <ol style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '11px',
                      color: getNoticeStyles('info').textColor,
                      paddingLeft: '16px',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {instructions.steps.map((step, index) => (
                        <li 
                          key={index}
                          style={{
                            marginBottom: '4px',
                            fontWeight: step.highlight ? '500' : '400'
                          }}
                        >
                          {step.description}
                        </li>
                      ))}
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Additional Notice */}
            {notice && (
              <Alert style={{
                ...getNoticeStyles(notice.type),
                borderRadius: '12px'
              }}>
                <AlertDescription>
                  <div>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: getNoticeStyles(notice.type).textColor
                    }}>
                      {notice.title}
                    </p>
                    <p style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '11px',
                      color: getNoticeStyles(notice.type).textColor,
                      margin: 0
                    }}>
                      {notice.content}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {secondaryActions.length > 0 && (
              <div className="flex gap-3">
                {secondaryActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    onClick={action.onClick}
                    style={{
                      flex: '1',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      minHeight: '44px',
                      borderRadius: '12px'
                    }}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Primary Action */}
            <Button
              onClick={primaryAction.onClick}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                minHeight: '44px'
              }}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}