// // import React from 'react';
import { navigateToKycDocuments } from '../utils/kyc';

export type KycStatus = 'not_started' | 'documents_uploaded' | 'in_review' | 'verified' | 'failed' | 'retry' | 'review';

/**
 * ensureKycForAction: headless check that redirects to KYC if not verified.
 * Returns true if the action may proceed, false if redirected.
 */
export function ensureKycForAction(opts: { kycStatus: KycStatus | string | undefined; intent: string; push: (url: string) => void; }): boolean {
  const status = String(opts.kycStatus || '').toLowerCase();
  if (status === 'verified') return true;
  const url = navigateToKycDocuments(opts.intent);
  opts.push(url);
  return false;
}

/**
 * KycGate: wraps interactive children; intercepts onClick to enforce KYC.
 * Keeps styles untouched. Usage example within a Figma page:
 * <KycGate kycStatus={user.kycStatus} intent="instant_payment" onProceed={doPay}>
 *   <button className="...">Instant Payment</button>
 * </KycGate>
 */
export function KycGate({ kycStatus, intent, onProceed, children, push }: {
  kycStatus: KycStatus | string | undefined;
  intent: string;
  onProceed?: () => void;
  push: (url: string) => void;
  children: React.ReactElement;
}) {
  function handleClick(e: React.MouseEvent) {
    const canProceed = ensureKycForAction({ kycStatus, intent, push });
    if (canProceed) {
      onProceed?.();
    }
    e.preventDefault();
    e.stopPropagation();
  }

  return children;
}
