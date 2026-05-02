import type { CSSProperties, ReactNode } from 'react';
import logo3 from '../../assets/logo3.svg';

interface BrandSpinnerProps {
  label?: string;
  subtitle?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function BrandSpinner({
  label = 'Loading...',
  subtitle,
  size = 40,
  className = '',
  style,
  children,
}: BrandSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${className}`}
      style={{ fontFamily: 'Montserrat, sans-serif', ...style }}
    >
      <div
        style={{
          width: size,
          height: size,
          animation: 'mymoolah-brand-spin 1s linear infinite',
          transformOrigin: 'center',
        }}
      >
        <img
          src={logo3}
          alt=""
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      </div>

      {label && (
        <p
          style={{
            marginTop: 16,
            marginBottom: 0,
            fontSize: 14,
            fontWeight: 600,
            color: '#374151',
          }}
        >
          {label}
        </p>
      )}

      {subtitle && (
        <p
          style={{
            marginTop: 6,
            marginBottom: 0,
            maxWidth: 280,
            fontSize: 13,
            lineHeight: 1.5,
            color: '#6b7280',
          }}
        >
          {subtitle}
        </p>
      )}

      {children}

      <style>{`
        @keyframes mymoolah-brand-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <BrandSpinner
        label="Loading MyMoolah..."
        subtitle="Please wait while we get your wallet ready."
        size={52}
      />
    </div>
  );
}
