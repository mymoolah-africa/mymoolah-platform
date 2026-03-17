/**
 * Top-up via EFT / Bank Transfer Overlay
 *
 * Shows MyMoolah Treasury bank details for an EFT from the user's bank.
 * The user's mobile number is pre-filled as the mandatory payment reference
 * and can be copied to clipboard.
 *
 * Also shows PayShap as an instant alternative (mymoolah@standardbank).
 *
 * Styling: Montserrat / CSS variables / white background — matches global design system.
 *
 * @author MyMoolah Treasury Platform
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
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

// ---- Bank details (Vite env vars with safe fallbacks) ---------------------
const MM_BANK_NAME      = (import.meta as any).env?.VITE_MM_BANK_NAME         ?? 'Standard Bank';
const MM_BANK_ACCOUNT   = (import.meta as any).env?.VITE_MM_BANK_ACCOUNT       ?? '272406481';
const MM_BANK_BRANCH    = (import.meta as any).env?.VITE_MM_BANK_BRANCH_CODE  ?? '051001';
const MM_ACCOUNT_TYPE   = (import.meta as any).env?.VITE_MM_BANK_ACCOUNT_TYPE ?? 'Current Account';
const MM_ACCOUNT_HOLDER = (import.meta as any).env?.VITE_MM_ACCOUNT_HOLDER    ?? 'MyMoolah Treasury';
const MM_PAYSHAP_ID     = (import.meta as any).env?.VITE_MM_PAYSHAP_ID        ?? 'mymoolah@standardbank';

// ---- Types -----------------------------------------------------------------
interface CopyState {
  accountNumber: boolean;
  branchCode:    boolean;
  reference:     boolean;
  payshap:       boolean;
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
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [copied, setCopied] = useState<CopyState>({
    accountNumber: false,
    branchCode:    false,
    reference:     false,
    payshap:       false,
  });

  const userMobile = user?.phoneNumber ? normaliseMsisdn(user.phoneNumber) : '';

  const copyToClipboard = useCallback(async (text: string, key: keyof CopyState) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity  = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2500);
  }, []);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif',
      padding: 'var(--mobile-padding)',
    }}>

      {/* ── Header — matches global overlay pattern ──────────────────────── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1f2937',
          }}>
            Top-up via EFT
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-small)',
            fontWeight: 'var(--font-weight-normal)',
            color: '#6b7280',
            marginTop: 4,
          }}>
            Bank transfer to your wallet
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-lg mx-auto w-full">

        {/* ── Warning ────────────────────────────────────────────────────── */}
        <Alert className="border-amber-400 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <AlertDescription style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-small)',
            color: '#92400e',
            lineHeight: '1.5',
          }}>
            <strong>Use your mobile number as the payment reference.</strong>
            {' '}Any other reference means your deposit cannot be auto-allocated
            and will require manual processing (1–3 business days).
          </AlertDescription>
        </Alert>

        {/* ── Bank details card ──────────────────────────────────────────── */}
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="pt-5 pb-4 space-y-4">
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--mobile-font-base)',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}>
              <Building2 size={18} color="#86BE41" />
              MyMoolah Treasury Bank Account
            </h2>

            <BankDetailRow
              icon={<Building2 size={16} color="#9ca3af" />}
              label="Bank"
              value={MM_BANK_NAME}
            />
            <BankDetailRow
              icon={<User size={16} color="#9ca3af" />}
              label="Account Holder"
              value={MM_ACCOUNT_HOLDER}
            />
            <BankDetailRow
              icon={<Hash size={16} color="#9ca3af" />}
              label="Account Number"
              value={MM_BANK_ACCOUNT}
              onCopy={() => copyToClipboard(MM_BANK_ACCOUNT, 'accountNumber')}
              copied={copied.accountNumber}
            />
            <BankDetailRow
              icon={<Hash size={16} color="#9ca3af" />}
              label="Branch Code"
              value={MM_BANK_BRANCH}
              onCopy={() => copyToClipboard(MM_BANK_BRANCH, 'branchCode')}
              copied={copied.branchCode}
            />
            <BankDetailRow
              icon={<Info size={16} color="#9ca3af" />}
              label="Account Type"
              value={MM_ACCOUNT_TYPE}
            />
          </CardContent>
        </Card>

        {/* ── Payment reference card ─────────────────────────────────────── */}
        <Card className="shadow-sm border-2 border-blue-300 bg-blue-50">
          <CardContent className="pt-5 pb-5">
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--mobile-font-base)',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}>
              <Phone size={18} color="#2563eb" />
              Your Payment Reference
            </h2>

            {userMobile ? (
              <>
                <div className="flex items-center justify-between bg-white rounded-xl border border-blue-200 px-4 py-3 mb-3">
                  <span style={{
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    color: '#1f2937',
                    userSelect: 'all',
                  }}>
                    {userMobile}
                  </span>
                  <button
                    onClick={() => copyToClipboard(userMobile, 'reference')}
                    aria-label="Copy reference number"
                    style={{
                      marginLeft: 12,
                      minWidth: 44,
                      minHeight: 44,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      transition: 'background 0.2s',
                      background: copied.reference ? '#86BE41' : '#dbeafe',
                      color:      copied.reference ? '#fff'    : '#1e40af',
                    }}
                  >
                    {copied.reference
                      ? <><CheckCircle2 size={15} /> Copied!</>
                      : <><Copy size={15} /> Copy</>}
                  </button>
                </div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  color: '#1d4ed8',
                  lineHeight: 1.5,
                }}>
                  Enter this <strong>exactly</strong> in the <em>Payment Reference</em> or{' '}
                  <em>Beneficiary Reference</em> field — <strong>no spaces, no dashes</strong>.
                </p>
              </>
            ) : (
              <p style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-small)',
                color: '#1d4ed8',
              }}>
                Use your registered mobile number (e.g.&nbsp;<strong>0821234567</strong>) as
                the payment reference.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="pt-5 pb-5">
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--mobile-font-base)',
              color: '#1f2937',
              marginBottom: 12,
            }}>
              How it works
            </h2>
            <ol className="space-y-3 list-none">
              {[
                'Log in to your internet banking or banking app.',
                `Add MyMoolah Treasury as a beneficiary using the account details above.`,
                `Copy and paste your mobile number (${userMobile || 'e.g. 0821234567'}) into the Payment Reference field — exactly as shown, no spaces.`,
                'Make the EFT for any amount.',
                'Your wallet is credited automatically, usually within minutes.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    style={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#86BE41',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-normal)',
                    color: '#374151',
                    lineHeight: 1.5,
                  }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* ── PayShap instant alternative ────────────────────────────────── */}
        <Card className="shadow-sm border border-green-200 bg-green-50">
          <CardContent className="pt-5 pb-5">
            <h2 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--mobile-font-base)',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}>
              <Zap size={18} color="#16a34a" />
              Prefer instant? Use PayShap
            </h2>
            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              color: '#166534',
              lineHeight: 1.5,
              marginBottom: 12,
            }}>
              In your banking app, select <strong>PayShap</strong> and send to:
            </p>

            {/* PayShap ID row */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-green-200 px-4 py-3 mb-3">
              <span style={{
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#1f2937',
                userSelect: 'all',
              }}>
                {MM_PAYSHAP_ID}
              </span>
              <button
                onClick={() => copyToClipboard(MM_PAYSHAP_ID, 'payshap')}
                aria-label="Copy PayShap ID"
                style={{
                  marginLeft: 12,
                  minWidth: 44,
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'background 0.2s',
                  background: copied.payshap ? '#86BE41' : '#dcfce7',
                  color:      copied.payshap ? '#fff'    : '#166534',
                }}
              >
                {copied.payshap
                  ? <><CheckCircle2 size={15} /> Copied!</>
                  : <><Copy size={15} /> Copy</>}
              </button>
            </div>

            <p style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-small)',
              color: '#166534',
              lineHeight: 1.5,
            }}>
              Use your mobile number (<strong>{userMobile || 'e.g. 0821234567'}</strong>) as
              the reference. PayShap payments are processed in seconds, 24/7/365.
            </p>
          </CardContent>
        </Card>

        {/* ── Disclaimer ─────────────────────────────────────────────────── */}
        <p style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 'var(--mobile-font-small)',
          color: '#9ca3af',
          textAlign: 'center',
          paddingBottom: 8,
          lineHeight: 1.5,
        }}>
          Standard EFT: 1–2 business days. RTC / PayShap: within minutes during banking hours.
          Weekend &amp; public holiday payments may take longer.
        </p>

        {/* ── Done button — inline, matches other overlays ──────────────── */}
        <div style={{ paddingTop: 4, paddingBottom: 8 }}>
          <Button
            onClick={() => navigate(-1)}
            style={{
              width: '100%',
              minHeight: 48,
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 'var(--mobile-font-base)',
              fontWeight: 'var(--font-weight-bold)',
              background: '#86BE41',
              color: '#fff',
              border: 'none',
            }}
          >
            Done
          </Button>
        </div>

      </div>
    </div>
  );
}

// ── Sub-component: a single bank detail row ---------------------------------
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
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 11,
            fontWeight: 'var(--font-weight-normal)',
            color: '#9ca3af',
            marginBottom: 2,
            lineHeight: 1,
          }}>
            {label}
          </p>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 'var(--mobile-font-small)',
            fontWeight: 'var(--font-weight-medium)',
            color: '#1f2937',
            wordBreak: 'break-all',
          }}>
            {value}
          </p>
        </div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          style={{
            flexShrink: 0,
            minHeight: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 11,
            fontWeight: 'var(--font-weight-medium)',
            transition: 'background 0.2s',
            background: copied ? '#dcfce7' : '#f3f4f6',
            color:      copied ? '#16a34a' : '#6b7280',
          }}
        >
          {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );
}
