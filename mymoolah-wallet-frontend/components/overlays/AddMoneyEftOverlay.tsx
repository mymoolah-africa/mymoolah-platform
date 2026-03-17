/**
 * Add Money via EFT / Bank Transfer Overlay
 *
 * Shows the MyMoolah SBSA treasury account details so the user can do an
 * EFT from their bank.  The user's mobile number is pre-filled as the
 * mandatory payment reference and can be copied to clipboard.
 *
 * IMPORTANT: The reference MUST be the user's registered mobile number
 * (e.g. 0825571055) so the system can auto-allocate the deposit.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

import React, { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Hash,
  User,
  Phone,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

// ---- Bank details (configured via Vite env vars, with safe fallbacks) -----
const MM_BANK_NAME       = (import.meta as any).env?.VITE_MM_BANK_NAME        ?? 'Standard Bank';
const MM_BANK_ACCOUNT    = (import.meta as any).env?.VITE_MM_BANK_ACCOUNT     ?? 'Contact Support';
const MM_BANK_BRANCH     = (import.meta as any).env?.VITE_MM_BANK_BRANCH_CODE ?? '051001';
const MM_ACCOUNT_TYPE    = (import.meta as any).env?.VITE_MM_BANK_ACCOUNT_TYPE ?? 'Current Account';
const MM_ACCOUNT_HOLDER  = (import.meta as any).env?.VITE_MM_ACCOUNT_HOLDER   ?? 'MyMoolah (Pty) Ltd';

// ---- Types -----------------------------------------------------------------
interface CopyState {
  accountNumber: boolean;
  branchCode:    boolean;
  reference:     boolean;
}

// ---- Helper ----------------------------------------------------------------
function normaliseMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('27') && digits.length === 11) return `0${digits.slice(2)}`;
  if (digits.length === 9 && /^[6-8]/.test(digits))    return `0${digits}`;
  return digits || raw;
}

// ---- Component -------------------------------------------------------------
export function AddMoneyEftOverlay() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [copied, setCopied] = useState<CopyState>({
    accountNumber: false,
    branchCode:    false,
    reference:     false,
  });

  const userMobile = user?.phoneNumber ? normaliseMsisdn(user.phoneNumber) : '';

  const copyToClipboard = useCallback(async (text: string, key: keyof CopyState) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2500);
    } catch {
      // Fallback for older mobile browsers
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity  = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2500);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-4 text-white"
        style={{ background: 'linear-gradient(135deg, #1a3c5e 0%, #2d6a9f 100%)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded-full hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="font-semibold text-lg leading-tight">Add Money via EFT</h1>
          <p className="text-sm text-blue-100 mt-0.5">Bank transfer to your wallet</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-lg mx-auto w-full">

        {/* ── Critical warning ────────────────────────────────────────── */}
        <Alert className="border-amber-400 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <AlertDescription className="text-amber-800 text-sm leading-snug">
            <strong>Important — use your mobile number as the reference.</strong>
            {' '}If you use any other reference your deposit cannot be automatically
            allocated and will require manual processing (1–3 business days).
          </AlertDescription>
        </Alert>

        {/* ── Bank details card ───────────────────────────────────────── */}
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="pt-5 pb-4 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-base mb-1">
              <Building2 size={18} className="text-blue-600" />
              MyMoolah Bank Account
            </h2>

            {/* Bank name */}
            <BankDetailRow
              icon={<Building2 size={16} className="text-gray-400" />}
              label="Bank"
              value={MM_BANK_NAME}
            />

            {/* Account holder */}
            <BankDetailRow
              icon={<User size={16} className="text-gray-400" />}
              label="Account Holder"
              value={MM_ACCOUNT_HOLDER}
            />

            {/* Account number */}
            <BankDetailRow
              icon={<Hash size={16} className="text-gray-400" />}
              label="Account Number"
              value={MM_BANK_ACCOUNT}
              onCopy={() => copyToClipboard(MM_BANK_ACCOUNT, 'accountNumber')}
              copied={copied.accountNumber}
            />

            {/* Branch code */}
            <BankDetailRow
              icon={<Hash size={16} className="text-gray-400" />}
              label="Branch Code"
              value={MM_BANK_BRANCH}
              onCopy={() => copyToClipboard(MM_BANK_BRANCH, 'branchCode')}
              copied={copied.branchCode}
            />

            {/* Account type */}
            <BankDetailRow
              icon={<Info size={16} className="text-gray-400" />}
              label="Account Type"
              value={MM_ACCOUNT_TYPE}
            />
          </CardContent>
        </Card>

        {/* ── Payment reference card ──────────────────────────────────── */}
        <Card className="shadow-sm border-2 border-blue-400 bg-blue-50">
          <CardContent className="pt-5 pb-5">
            <h2 className="font-semibold text-blue-800 flex items-center gap-2 text-base mb-3">
              <Phone size={18} className="text-blue-600" />
              Your Payment Reference
            </h2>

            {userMobile ? (
              <>
                <div className="flex items-center justify-between bg-white rounded-xl border border-blue-200 px-4 py-3 mb-3">
                  <span className="font-mono text-xl font-bold tracking-widest text-gray-900 select-all">
                    {userMobile}
                  </span>
                  <button
                    onClick={() => copyToClipboard(userMobile, 'reference')}
                    className="ml-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-[44px] min-h-[44px]"
                    style={copied.reference
                      ? { background: '#86BE41', color: '#fff' }
                      : { background: '#e8f4fd', color: '#1a3c5e' }}
                    aria-label="Copy reference number"
                  >
                    {copied.reference
                      ? <><CheckCircle2 size={16} /> Copied!</>
                      : <><Copy size={16} /> Copy</>}
                  </button>
                </div>
                <p className="text-xs text-blue-700">
                  This is your registered mobile number. Enter it <strong>exactly</strong> as
                  shown in the <em>Payment Reference</em> or <em>Beneficiary Reference</em> field
                  of your bank's app — <strong>no spaces, no dashes</strong>.
                </p>
              </>
            ) : (
              <p className="text-sm text-blue-700">
                Your mobile number could not be loaded. Please use your registered
                mobile number (e.g.&nbsp;<strong>0821234567</strong>) as the payment reference.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── How it works ────────────────────────────────────────────── */}
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="pt-5 pb-5">
            <h2 className="font-semibold text-gray-800 text-base mb-3">How it works</h2>
            <ol className="space-y-2.5 list-none">
              {[
                'Log in to your internet banking or banking app.',
                `Add MyMoolah (${MM_ACCOUNT_HOLDER}) as a beneficiary using the details above.`,
                `Enter your mobile number (${userMobile || 'e.g. 0821234567'}) as the payment reference.`,
                'Make the EFT payment for any amount.',
                'Your wallet will be credited automatically, usually within a few minutes.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: '#86BE41' }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* ── Disclaimer ──────────────────────────────────────────────── */}
        <p className="text-xs text-center text-gray-400 pb-4">
          Processing times depend on your bank. Standard EFT: 1–2 business days.
          RTC (Real-Time Clearing): within minutes during banking hours.
          Weekend/public holiday payments may take longer.
        </p>
      </div>

      {/* ── Bottom action ───────────────────────────────────────────── */}
      <div className="px-4 pb-6 pt-2 bg-white border-t border-gray-100">
        <Button
          className="w-full min-h-[48px] text-base font-semibold"
          style={{ background: '#86BE41', color: '#fff' }}
          onClick={() => navigate(-1)}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

// ── Sub-component: a single bank detail row --------------------------------
interface BankDetailRowProps {
  icon:    React.ReactNode;
  label:   string;
  value:   string;
  onCopy?: () => void;
  copied?: boolean;
}

function BankDetailRow({ icon, label, value, onCopy, copied }: BankDetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
          <p className="text-sm font-medium text-gray-900 break-all">{value}</p>
        </div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]"
          style={copied
            ? { background: '#e9f7ef', color: '#27ae60' }
            : { background: '#f0f0f0', color: '#555' }}
          aria-label={`Copy ${label}`}
        >
          {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );
}
