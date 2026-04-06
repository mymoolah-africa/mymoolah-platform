import React from 'react';
import { Server } from 'lucide-react';

const FEATURES = [
  'Product catalog config',
  'Supplier routing rules',
  'Circuit breaker status',
  'Commission management',
] as const;

export const ServiceManagementOverlay: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Service Management</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Configure VAS products, manage supplier routing, and monitor circuit breakers.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-6">
          <Server className="w-8 h-8 text-[var(--muted-foreground)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Coming Soon</h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-8">
          Operational controls for VAS catalogues, routing, resilience, and commissions will be
          consolidated in this screen. Stay tuned for the full admin experience.
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
