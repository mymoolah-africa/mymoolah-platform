import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
}

export function ModalContainer({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true
}: ModalContainerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Store previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus trap - focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      
      // Restore focus when modal closes
      if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { width: '320px', maxHeight: '60vh' };
      case 'lg':
        return { width: '480px', maxHeight: '80vh' };
      default:
        return { width: '375px', maxHeight: '70vh' };
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-title`}
        aria-describedby={`${title.toLowerCase().replace(/\s+/g, '-')}-description`}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          overflow: 'hidden',
          outline: 'none',
          ...getSizeStyles()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 
              id={`${title.toLowerCase().replace(/\s+/g, '-')}-title`}
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '18px',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0
              }}
            >
              {title}
            </h2>
            <div 
              id={`${title.toLowerCase().replace(/\s+/g, '-')}-description`}
              className="sr-only"
            >
              {description}
            </div>
          </div>

          {showCloseButton && (
            <Button
              variant="ghost"
              onClick={onClose}
              style={{
                padding: '8px',
                minWidth: '32px',
                minHeight: '32px'
              }}
              aria-label="Close modal"
            >
              <X style={{ width: '16px', height: '16px' }} />
            </Button>
          )}
        </div>

        {/* Content */}
        <div style={{
          maxHeight: 'calc(70vh - 80px)', // Account for header
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {children}
        </div>
      </div>
    </>
  );
}