import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

if (import.meta.env.PROD) {
  console.log('MyMoolah Admin Portal - Production Mode');
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Admin Portal Error:', error, errorInfo);
    if (import.meta.env.PROD) {
      console.error('Error reported to monitoring service');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 font-sans p-4">
          <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-lg w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            <p className="text-[var(--muted-foreground)] mb-8 leading-relaxed">
              The admin portal encountered an unexpected error. Please refresh
              the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[var(--primary)] text-white px-6 py-3 rounded-lg font-medium
                         hover:-translate-y-px hover:shadow-md
                         focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2
                         transition-all duration-200"
            >
              Refresh Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-8 text-left bg-slate-100 p-4 rounded-lg text-sm">
                <summary className="cursor-pointer font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-red-600 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
