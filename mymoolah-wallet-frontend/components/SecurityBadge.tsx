import { Dialog, DialogContent, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Shield, CheckCircle, Lock, Globe, Database, Zap, Building2, CreditCard, X } from 'lucide-react';

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
    <div className={`inline-block bg-gradient-to-br from-[#1a3a6b] to-[#2D8CCA] text-white rounded-lg font-montserrat shadow-md border border-white/20 relative text-center ${compactClasses} ${clickable ? 'cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105' : ''}`}>
      <div className="flex items-center justify-center mb-0.5">
        <Shield className="w-2.5 h-2.5 mr-1 text-white" />
        <span className="font-bold text-white text-xs leading-none">Registered T-PPP</span>
      </div>
      <div className="text-xs font-medium text-white/95 leading-none mb-0.5">NPS Act 1998</div>
      <div className="text-xs text-white/80 leading-none">ISO 20022 · AES-256</div>
      <div className="absolute top-0.5 right-0.5">
        <CheckCircle className="w-1.5 h-1.5 text-[#86BE41]" />
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
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[340px] sm:max-w-[340px] bg-white rounded-2xl border-0 shadow-2xl p-0 overflow-hidden"
        closeButtonClassName="hidden"
      >
        {/* Accessible description for Radix */}
        <DialogDescription className="sr-only">
          PASA T-PPP registration details and security compliance information for MyMoolah
        </DialogDescription>

        <DialogHeader className="p-0 m-0">
          <DialogTitle className="text-center m-0 p-0">
            {/* Header banner — close button lives here to avoid overflow-hidden clipping */}
            <div className="bg-gradient-to-r from-[#1a3a6b] to-[#2D8CCA] px-6 pt-5 pb-4 relative rounded-t-2xl">
              <DialogClose className="universal-close-btn-overlay" aria-label="Close">
                <X className="w-4 h-4" />
              </DialogClose>
              <div className="flex items-center justify-center mb-1 pr-8">
                <Shield className="w-6 h-6 text-white mr-2 flex-shrink-0" />
                <span className="text-white font-bold text-base leading-tight">Registered T-PPP</span>
              </div>
              <p className="text-white/80 text-xs text-center font-normal">
                National Payment System Act, 1998 · Valid to 28 Feb 2027
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-gray-700 p-4 pt-3">

          {/* Row 1: PASA + Standard Bank */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="flex items-center mb-1.5">
                <CheckCircle className="w-4 h-4 text-[#2D8CCA] mr-1.5 flex-shrink-0" />
                <p className="font-semibold text-gray-900 text-xs">PASA Registered T-PPP</p>
              </div>
              <p className="text-xs text-gray-600 leading-snug">
                Registered as a Third Party Payment Provider (T-PPP) by PASA under SARB Directive 1 of 2007. Reg: 2024/315592/07
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="flex items-center mb-1.5">
                <Building2 className="w-4 h-4 text-[#2D8CCA] mr-1.5 flex-shrink-0" />
                <p className="font-semibold text-gray-900 text-xs">Standard Bank</p>
              </div>
              <p className="text-xs text-gray-600 leading-snug">
                Payment operations sponsored and overseen by Standard Bank SA
              </p>
            </div>
          </div>

          {/* Row 2: Payment Rails */}
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <div className="flex items-center mb-1.5">
              <Zap className="w-4 h-4 text-[#86BE41] mr-1.5 flex-shrink-0" />
              <p className="font-semibold text-gray-900 text-xs">Three Payment Rails Authorised</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="bg-[#86BE41]/15 text-[#4a7a1e] text-xs font-medium px-2 py-0.5 rounded-full">EFT Credit</span>
              <span className="bg-[#86BE41]/15 text-[#4a7a1e] text-xs font-medium px-2 py-0.5 rounded-full">RTC Service</span>
              <span className="bg-[#86BE41]/15 text-[#4a7a1e] text-xs font-medium px-2 py-0.5 rounded-full">Rapid Payments / PayShap</span>
            </div>
          </div>

          {/* Row 3: ISO 20022 */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
            <div className="flex items-center mb-1.5">
              <Globe className="w-4 h-4 text-purple-500 mr-1.5 flex-shrink-0" />
              <p className="font-semibold text-gray-900 text-xs">ISO 20022 Payment Messaging</p>
            </div>
            <p className="text-xs text-gray-600 leading-snug">
              All interbank payments use ISO 20022 message formats — the international standard for financial messaging (Pain.013 Request to Pay · Pain.001 Credit Transfer)
            </p>
          </div>

          {/* Row 4: Encryption split */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
              <div className="flex items-center mb-1.5">
                <Lock className="w-4 h-4 text-orange-500 mr-1.5 flex-shrink-0" />
                <p className="font-semibold text-gray-900 text-xs">In Transit</p>
              </div>
              <p className="text-xs text-gray-600 leading-snug">
                TLS 1.3 with AES-256-GCM — highest transport security standard
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
              <div className="flex items-center mb-1.5">
                <Database className="w-4 h-4 text-orange-500 mr-1.5 flex-shrink-0" />
                <p className="font-semibold text-gray-900 text-xs">At Rest</p>
              </div>
              <p className="text-xs text-gray-600 leading-snug">
                Dual-layer AES-256: GCP infrastructure + app-level field encryption for PII
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                <span className="text-xs text-gray-500 font-medium">T-PPP Registration · PASA</span>
              </div>
              <span className="text-xs text-[#86BE41] font-semibold">✓ Valid</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 leading-snug">
              Signed 12 Mar 2026 · Expires 28 Feb 2027 · Reg 2024/315592/07 · Sponsor: Standard Bank SA
            </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
