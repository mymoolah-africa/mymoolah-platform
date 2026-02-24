import React, { useState, useEffect } from 'react';
import { DollarSign, AlertTriangle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

interface AmountInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  currencySymbol?: string;
  min?: number;
  max?: number;
  suggestedAmounts?: number[];
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  showEstimatedUnits?: boolean;
  estimatedUnits?: string;
  required?: boolean;
}

export function AmountInput({
  label = "Amount",
  value,
  onChange,
  currency = "ZAR",
  currencySymbol = "R",
  min = 1,
  max = 10000,
  suggestedAmounts = [20, 50, 100, 200],
  placeholder = "0.00",
  helperText,
  errorText,
  disabled = false,
  showEstimatedUnits = false,
  estimatedUnits,
  required = false
}: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const formatCurrency = (amount: string): string => {
    const numericValue = parseFloat(amount);
    if (isNaN(numericValue)) return '';
    
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  };

  const validateAmount = (amount: string): { isValid: boolean; error?: string } => {
    if (!amount && required) {
      return { isValid: false, error: 'Amount is required' };
    }
    
    if (!amount) {
      return { isValid: true };
    }

    const numericValue = parseFloat(amount);
    
    if (isNaN(numericValue)) {
      return { isValid: false, error: 'Please enter a valid amount' };
    }
    
    if (numericValue < min) {
      return { isValid: false, error: `Minimum amount is ${currencySymbol}${min}` };
    }
    
    if (numericValue > max) {
      return { isValid: false, error: `Maximum amount is ${currencySymbol}${max}` };
    }
    
    return { isValid: true };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove currency symbol and spaces if user types them
    inputValue = inputValue.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const decimalCount = (inputValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      inputValue = inputValue.substring(0, inputValue.lastIndexOf('.'));
    }
    
    // Limit to 2 decimal places
    const parts = inputValue.split('.');
    if (parts[1] && parts[1].length > 2) {
      inputValue = `${parts[0]}.${parts[1].substring(0, 2)}`;
    }
    
    setInternalValue(inputValue);
    onChange(inputValue);
  };

  const handleSuggestedAmount = (amount: number) => {
    const amountStr = amount.toString();
    setInternalValue(amountStr);
    onChange(amountStr);
  };

  const validation = validateAmount(internalValue);
  const displayError = errorText || (!validation.isValid ? validation.error : undefined);

  return (
    <div className="space-y-3">
      {/* Label */}
      <Label 
        htmlFor="amount-input"
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151'
        }}
      >
        {label}
        {required && <span style={{ color: '#dc2626' }}>*</span>}
      </Label>

      {/* Suggested Amount Chips */}
      {suggestedAmounts.length > 0 && (
        <div>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            Quick amounts:
          </p>
          <div className="flex gap-2 flex-wrap">
            {suggestedAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestedAmount(amount)}
                disabled={disabled}
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: internalValue === amount.toString() ? '#86BE41' : 'transparent',
                  color: internalValue === amount.toString() ? '#ffffff' : '#6b7280',
                  border: `1px solid ${internalValue === amount.toString() ? '#86BE41' : '#e2e8f0'}`,
                  borderRadius: '20px',
                  minHeight: '32px',
                  padding: '6px 12px'
                }}
              >
                {currencySymbol}{amount}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="relative">
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '16px',
          fontWeight: '500',
          color: '#6b7280',
          zIndex: 1
        }}>
          {currencySymbol}
        </div>
        
        <Input
          id="amount-input"
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={internalValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            // Banking-grade: Prevent browser auto-formatting quirks
            if (['e', 'E', '+', '-'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onWheel={(e) => {
            // Banking-grade: Prevent scroll-to-change number input values
            e.currentTarget.blur();
          }}
          disabled={disabled}
          style={{
            paddingLeft: '32px',
            height: '48px',
            fontSize: '18px',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '600',
            backgroundColor: disabled ? '#f3f4f6' : '#f1f5f9',
            border: `2px solid ${displayError ? '#dc2626' : isFocused ? '#86BE41' : '#e2e8f0'}`,
            borderRadius: '12px',
            transition: 'all 0.2s ease'
          }}
        />
      </div>

      {/* Helper/Error Text */}
      <div className="space-y-2">
        {displayError && (
          <div className="flex items-center gap-2">
            <AlertTriangle style={{ width: '14px', height: '14px', color: '#dc2626' }} />
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#dc2626'
            }}>
              {displayError}
            </p>
          </div>
        )}
        
        {helperText && !displayError && (
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            {helperText}
          </p>
        )}
        
        {showEstimatedUnits && estimatedUnits && internalValue && !displayError && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#e0f2fe',
            borderRadius: '8px',
            border: '1px solid #2D8CCA'
          }}>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#0c4a6e'
            }}>
              Estimated units: <strong>{estimatedUnits}</strong>
            </p>
          </div>
        )}
        
        {internalValue && !displayError && (
          <div className="flex items-center justify-between">
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Amount: {formatCurrency(internalValue)}
            </p>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Range: {currencySymbol}{min} - {currencySymbol}{max}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}