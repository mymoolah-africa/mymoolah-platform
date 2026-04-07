import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useClientAuth } from '../../contexts/ClientAuthContext';

interface BeneficiaryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ParsedBeneficiary {
  beneficiaryName: string;
  accountNumber: string;
  branchCode: string;
  bankName: string | null;
  amount: number;
  reference: string | null;
  employeeRef: string | null;
  validation: BeneficiaryValidation;
}

interface UploadSummary {
  total: number;
  valid: number;
  invalid: number;
  totalAmount: number;
}

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);

type Step = 'upload' | 'preview' | 'configure';

export const ClientUploadOverlay: React.FC = () => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<ParsedBeneficiary[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [rail, setRail] = useState('eft');
  const [payPeriod, setPayPeriod] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useClientAuth();
  const navigate = useNavigate();

  const handleFileSelect = (f: File) => {
    const validExts = ['.csv', '.xlsx', '.xls', '.xml'];
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      setError('Unsupported file type. Use CSV, Excel (.xlsx), or XML.');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/client-portal/upload-beneficiaries', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setBeneficiaries(data.data.beneficiaries || []);
        setSummary(data.data.summary || null);
        setStep('preview');
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateRun = async () => {
    const validBeneficiaries = beneficiaries.filter((b) => b.validation.valid);
    if (validBeneficiaries.length === 0) {
      setError('No valid beneficiaries to submit');
      return;
    }

    setCreating(true);
    setError('');
    const token = getToken();

    try {
      const res = await fetch('/api/v1/client-portal/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rail,
          payPeriod,
          beneficiaries: validBeneficiaries.map((b) => ({
            name: b.beneficiaryName,
            accountNumber: b.accountNumber,
            branchCode: b.branchCode,
            amount: b.amount,
            reference: b.reference || undefined,
            employeeRef: b.employeeRef || undefined,
          })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        navigate(`/client/runs/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create run');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setBeneficiaries([]);
    setSummary(null);
    setError('');
    setStep('upload');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(['upload', 'preview', 'configure'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <div className="h-px flex-1 bg-[var(--border)]" />}
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                step === s
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                  : beneficiaries.length > 0 && i < ['upload', 'preview', 'configure'].indexOf(step)
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-[var(--border)] text-[var(--muted-foreground)]'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[10px]">
                {i + 1}
              </span>
              {s === 'upload' ? 'Upload' : s === 'preview' ? 'Preview' : 'Create Run'}
            </div>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
            Upload Beneficiary File
          </h3>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
              isDragging
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : file
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />

            {file ? (
              <>
                <FileSpreadsheet className="mb-3 h-10 w-10 text-emerald-600" aria-hidden />
                <p className="text-sm font-medium text-[var(--foreground)]">{file.name}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-3 h-10 w-10 text-[var(--muted-foreground)]/50" aria-hidden />
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Drop your file here or click to browse
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Supports CSV, Excel (.xlsx), and Pain.001 XML
                </p>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            {file && (
              <button
                type="button"
                onClick={resetUpload}
                className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex min-h-[36px] items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? 'Parsing...' : 'Parse File'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <>
          {/* Summary bar */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="text-xs text-[var(--muted-foreground)]">Total</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{summary.total}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-600">Valid</p>
                <p className="text-lg font-bold text-emerald-700">{summary.valid}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xs text-red-600">Invalid</p>
                <p className="text-lg font-bold text-red-700">{summary.invalid}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="text-xs text-[var(--muted-foreground)]">Total Amount</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{formatZAR(summary.totalAmount)}</p>
              </div>
            </div>
          )}

          {/* Beneficiaries table */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Parsed Beneficiaries
              </h3>
            </div>
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--card)]">
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">#</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">Valid</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">Name</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">Account</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">Branch</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">Bank</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)] text-right">Amount</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((b, i) => (
                    <tr
                      key={i}
                      className={`border-b border-[var(--border)] last:border-0 ${
                        !b.validation.valid ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 text-xs text-[var(--muted-foreground)]">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        {b.validation.valid ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--foreground)]">{b.beneficiaryName || '-'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--muted-foreground)]">
                        {b.accountNumber || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--muted-foreground)]">{b.branchCode || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-[var(--muted-foreground)]">{b.bankName || '-'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[var(--foreground)]">
                        {b.amount ? formatZAR(b.amount) : '-'}
                      </td>
                      <td className="max-w-[200px] px-4 py-2.5">
                        {b.validation.errors.length > 0 && (
                          <div className="flex items-start gap-1">
                            <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                            <span className="text-[11px] text-red-600">
                              {b.validation.errors[0]}
                            </span>
                          </div>
                        )}
                        {b.validation.warnings.length > 0 && (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
                            <span className="text-[11px] text-amber-600">
                              {b.validation.warnings[0]}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetUpload}
              className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              Start Over
            </button>
            <button
              type="button"
              onClick={() => setStep('configure')}
              disabled={!summary || summary.valid === 0}
              className="flex min-h-[36px] items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </>
      )}

      {/* Step 3: Configure & Create */}
      {step === 'configure' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
            Create Disbursement Run
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="rail"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              >
                Payment Rail
              </label>
              <select
                id="rail"
                value={rail}
                onChange={(e) => setRail(e.target.value)}
                className="min-h-[44px] w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="eft">EFT (Next-Day)</option>
                <option value="payshap">PayShap (Instant)</option>
                <option value="wallet">Wallet (Internal)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="payPeriod"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              >
                Pay Period
              </label>
              <input
                id="payPeriod"
                type="month"
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="min-h-[44px] w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          {summary && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-4">
              <p className="text-sm text-[var(--foreground)]">
                <span className="font-medium">{summary.valid}</span> valid beneficiaries totalling{' '}
                <span className="font-medium">{formatZAR(summary.totalAmount)}</span>
              </p>
              {summary.invalid > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  {summary.invalid} invalid beneficiaries will be excluded
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setStep('preview')}
              className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateRun}
              disabled={creating}
              className="flex min-h-[36px] items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create Run'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
