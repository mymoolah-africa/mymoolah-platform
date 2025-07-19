import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Shield, CheckCircle, Lock, Globe, Users, Award } from 'lucide-react';

interface SecurityBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  compact?: boolean;
}

export function SecurityBadge({ size = 'md', clickable = true, compact = false }: SecurityBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-xs px-2.5 py-1.5',
    lg: 'text-sm px-3 py-2'
  };

  const compactClasses = compact ? 'px-1.5 py-1' : sizeClasses[size];

  const badgeContent = (
    <div className={`inline-block bg-gradient-to-br from-[#86BE41] to-[#4CAF50] text-white rounded-lg font-montserrat shadow-md border border-white/20 relative text-center ${compactClasses} ${clickable ? 'cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105' : ''}`}>
      <div className="flex items-center justify-center mb-0.5">
        <Shield className="w-2 h-2 mr-1 text-white" />
        <span className="font-bold text-white text-xs leading-none">Security Certified</span>
      </div>
      <div className="text-xs font-medium text-white/95 leading-none mb-0.5">MM-SEC-2025</div>
      <div className="text-xs text-white/80 leading-none">ISO 20022</div>
      <div className="absolute top-0.5 right-0.5 text-xs text-white/70">
        <CheckCircle className="w-1.5 h-1.5" />
      </div>
    </div>
  );

  if (!clickable) {
    return badgeContent;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {badgeContent}
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto bg-white rounded-2xl border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-gray-900 mb-4">
            <div className="flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-[#86BE41] mr-2" />
              Mojaloop Security Certification
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div className="bg-gradient-to-r from-[#86BE41]/10 to-[#2D8CCA]/10 p-4 rounded-lg">
            <p className="font-medium text-gray-900 mb-2">🛡️ Bank-Grade Security</p>
            <p>MyMoolah is certified compliant with Mojaloop's rigorous security standards, ensuring your financial data is protected with enterprise-level encryption.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-[#86BE41] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">End-to-End Encryption</p>
                <p className="text-xs text-gray-600">All transactions are secured with military-grade encryption protocols.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Globe className="w-5 h-5 text-[#2D8CCA] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">ISO 20022 Standard</p>
                <p className="text-xs text-gray-600">Compliant with international financial messaging standards for secure data exchange.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-[#86BE41] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Trusted by Thousands</p>
                <p className="text-xs text-gray-600">Used by financial institutions across multiple countries safely.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Award className="w-5 h-5 text-[#2D8CCA] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Certified & Audited</p>
                <p className="text-xs text-gray-600">Regular security audits and continuous monitoring ensure ongoing protection.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Certificate ID: MM-SEC-2025-001 | Valid through 2025
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}