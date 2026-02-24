import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  debounceMs?: number;
  disabled?: boolean;
}

export function SearchBar({
  placeholder = "Search...",
  value = "",
  onChange,
  onClear,
  isLoading = false,
  debounceMs = 300,
  disabled = false
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs]);

  // Call onChange when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  // Update internal value when external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  };

  const handleClear = () => {
    setInternalValue("");
    setDebouncedValue("");
    onChange("");
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="relative">
      {/* Search Icon */}
      <Search style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '18px',
        height: '18px',
        color: '#6b7280',
        zIndex: 1
      }} />
      
      {/* Input Field */}
      <Input
        placeholder={placeholder}
        value={internalValue}
        onChange={handleInputChange}
        disabled={disabled}
        style={{
          paddingLeft: '44px',
          paddingRight: internalValue || isLoading ? '44px' : '12px',
          height: '44px',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '14px',
          backgroundColor: disabled ? '#f3f4f6' : '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          transition: 'all 0.2s ease'
        }}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
          e.currentTarget.style.borderColor = '#86BE41';
          e.currentTarget.style.backgroundColor = '#ffffff';
        }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.backgroundColor = disabled ? '#f3f4f6' : '#f1f5f9';
        }}
      />
      
      {/* Loading or Clear Button */}
      {(internalValue || isLoading) && (
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isLoading ? (
            <div style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Loader2 style={{
                width: '16px',
                height: '16px',
                color: '#6b7280',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          ) : internalValue ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              style={{
                width: '28px',
                height: '28px',
                padding: '0',
                minWidth: 'auto',
                borderRadius: '6px'
              }}
            >
              <X style={{
                width: '14px',
                height: '14px',
                color: '#6b7280'
              }} />
            </Button>
          ) : null}
        </div>
      )}

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