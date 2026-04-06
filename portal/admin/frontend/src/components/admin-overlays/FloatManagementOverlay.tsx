import React from 'react';
import { Wallet } from 'lucide-react';

const FEATURES = [
  'Real-time float balances',
  'Low balance alerts',
  'Top-up requests',
  'Float history & trends',
] as const;

export const FloatManagementOverlay: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Float Management</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Monitor and manage supplier float balances across all payment providers.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-[var(--muted-foreground)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Coming Soon</h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-8">
          This workspace will centralise float visibility, alerts, and historical trends across
          suppliers and payment rails. Full tooling is under active development.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
          {FEATURES.map((f) => (
            <div
              key={f}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3 text-left"
            >
              <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />
              <span className="text-sm text-[var(--foreground)]">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
