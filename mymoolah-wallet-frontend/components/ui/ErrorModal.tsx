import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { AlertCircle, X } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  showCloseButton?: boolean;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = 'Error',
  message,
  type = 'error',
  showCloseButton = true
}) => {
  // Ensure error modal appears above other modals (ConfirmSheet has z-index 1000)
  useEffect(() => {
    if (isOpen) {
      // Find and update overlay z-index
      const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement;
      if (overlay) {
        overlay.style.zIndex = '10000';
      }
      // Find and update content z-index
      const content = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
      if (content) {
        content.style.zIndex = '10001';
      }
    }
  }, [isOpen]);
  const getIconColor = () => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-red-500';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-red-500 hover:bg-red-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-sm mx-auto"
      >
        <DialogDescription id="error-modal-description" className="sr-only">
          {message || 'Error dialog content'}
        </DialogDescription>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 ${getIconColor()}`} />
            {title}
          </DialogTitle>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 h-6 w-6 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button
            onClick={onClose}
            className={`${getButtonColor()} text-white`}
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
