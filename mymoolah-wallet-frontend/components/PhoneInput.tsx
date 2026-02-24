import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface PhoneInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  className?: string;
}

export function PhoneInput({
  id,
  label,
  value,
  onChange,
  placeholder = "27 XX XXX XXXX",
  required = false,
  disabled = false,
  helpText,
  error,
  className = ""
}: PhoneInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // SA mobile number validation
  const validateSAMobile = (phone: string): boolean => {
    if (!phone.trim()) return !required; // Valid if not required and empty
    const cleanPhone = phone.trim().replace(/\s/g, '');
    const saPhonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
    return saPhonePattern.test(cleanPhone);
  };

  // Format phone number as user types
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-numeric characters except +
    const cleaned = input.replace(/[^\d+]/g, '');
    
    // Handle different input patterns
    if (cleaned.startsWith('+27')) {
      const digits = cleaned.slice(3);
      if (digits.length <= 2) return `+27 ${digits}`;
      if (digits.length <= 5) return `+27 ${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `+27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
    } else if (cleaned.startsWith('27')) {
      const digits = cleaned.slice(2);
      if (digits.length <= 2) return `27 ${digits}`;
      if (digits.length <= 5) return `27 ${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `27 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
    } else if (cleaned.startsWith('0')) {
      const digits = cleaned.slice(1);
      if (digits.length <= 2) return `0 ${digits}`;
      if (digits.length <= 5) return `0 ${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `0 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
    } else {
      // Assume it's starting without country code
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  const isValid = validateSAMobile(value);
  const showValidation = value.trim().length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label 
        htmlFor={id}
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '14px',
          fontWeight: '500',
          color: '#1f2937'
        }}
      >
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={id}
          type="tel"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            fontWeight: '400',
            borderRadius: '12px',
            minHeight: '44px',
            paddingRight: showValidation ? '40px' : '12px',
            border: error 
              ? '1px solid #dc2626' 
              : showValidation && isValid 
                ? '1px solid #16a34a' 
                : '1px solid #e2e8f0'
          }}
          aria-describedby={`${id}-help ${error ? `${id}-error` : ''}`}
          aria-invalid={error ? 'true' : 'false'}
        />
        
        {/* Validation Icon */}
        {showValidation && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}>
            {isValid ? (
              <Check style={{ 
                width: '16px', 
                height: '16px', 
                color: '#16a34a' 
              }} />
            ) : (
              <X style={{ 
                width: '16px', 
                height: '16px', 
                color: '#dc2626' 
              }} />
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p 
          id={`${id}-help`}
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#6b7280'
          }}
        >
          {helpText}
        </p>
      )}

      {/* Validation Feedback */}
      {showValidation && !error && (
        <p 
          id={`${id}-validation`}
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: isValid ? '#16a34a' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isValid ? (
            <>
              <Check style={{ width: '12px', height: '12px' }} />
              Valid SA mobile number
            </>
          ) : (
            <>
              <X style={{ width: '12px', height: '12px' }} />
              Please enter a valid SA mobile number
            </>
          )}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p 
          id={`${id}-error`}
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '12px',
            color: '#dc2626'
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Format Examples (shown on focus) */}
      {isFocused && !showValidation && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px',
          marginTop: '4px'
        }}>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '11px',
            color: '#6b7280',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            Accepted formats:
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '10px',
              color: '#374151'
            }}>
              +27 82 123 4567
            </span>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '10px',
              color: '#374151'
            }}>
              27 82 123 4567
            </span>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '10px',
              color: '#374151'
            }}>
              0 82 123 4567
            </span>
          </div>
        </div>
      )}
    </div>
  );
}