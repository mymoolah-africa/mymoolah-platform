import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Shield, Building2 } from 'lucide-react';
import { useClientAuth } from '../contexts/ClientAuthContext';
import logoStacked from '../assets/logo-stacked.png';
import logoIcon from '../assets/logo-icon.png';

const ClientLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useClientAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/client/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email.trim().toLowerCase(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/client/dashboard', { replace: true });
    } else {
      setError(result.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col font-sans lg:flex-row">
      <aside
        className="relative hidden w-full flex-col items-center justify-center bg-[var(--sidebar)] px-10 py-12 text-[var(--sidebar-foreground)] lg:flex lg:w-[40%]"
        aria-label="MyMoolah brand"
      >
        <div className="flex flex-col items-center text-center">
          <img
            src={logoStacked}
            alt="MyMoolah"
            className="mb-8 w-48 drop-shadow-lg"
          />
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Disbursement Portal
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Client Access</p>
        </div>
        <p className="absolute bottom-8 left-0 right-0 text-center text-xs font-medium tracking-wide text-[var(--muted-foreground)]">
          Banking-Grade Security | TLS 1.3 Encrypted
        </p>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col bg-[var(--background)] lg:w-[60%]">
        <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-4 lg:hidden">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <img src={logoIcon} alt="MyMoolah" className="h-9 w-9 flex-shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">MyMoolah</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">Disbursement Portal</p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--portal-shadow)]">
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--primary)]" aria-hidden />
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                Client Sign In
              </h2>
            </div>
            <p className="mb-6 text-sm text-[var(--muted-foreground)]">
              Access your disbursement dashboard
            </p>

            {error ? (
              <div
                className="mb-6 rounded-[var(--radius)] border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="you@company.co.za"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-[44px] w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] py-2.5 pl-4 pr-12 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isSubmitting}
                    className="absolute right-0 top-0 flex h-[44px] w-11 items-center justify-center rounded-r-[var(--radius)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] w-full rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/50 px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Banking-Grade
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/50 px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                TLS 1.3
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClientLoginPage;
