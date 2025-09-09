import React, { ReactNode } from 'react';

// App Layout Wrapper Props
interface AppLayoutWrapperProps {
  children: ReactNode;
}

// App Layout Wrapper Component - Portal-specific layout
export const AppLayoutWrapper: React.FC<AppLayoutWrapperProps> = ({ children }) => {
  return (
    <div className="portal-container">
      {/* Portal Header - Fixed at top */}
      <header 
        className="portal-header"
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          height: '64px',
          zIndex: 9999,
          backgroundColor: 'var(--background-primary)',
          borderBottom: '1px solid var(--gray-medium)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="admin-container">
          <div className="flex items-center justify-between h-full">
            {/* Portal Logo and Title */}
            <div className="flex items-center mymoolah-spacing-md">
              <div className="admin-gradient-icon w-10 h-10">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="admin-text-heading text-lg">
                  MyMoolah Admin
                </h1>
                <p className="admin-text-small">
                  Treasury Platform Management
                </p>
              </div>
            </div>

            {/* Portal Actions */}
            <div className="flex items-center mymoolah-spacing-md">
              <button className="mymoolah-btn-secondary">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Centered with proper spacing */}
      <main 
        className="admin-container"
        style={{
          paddingTop: '80px', // Space for fixed header
          paddingBottom: '40px', // Bottom padding
          minHeight: '100vh',
          backgroundColor: 'var(--background-primary)'
        }}
      >
        {children}
      </main>

      {/* Portal Footer - Fixed at bottom */}
      <footer 
        className="portal-footer"
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          height: '60px',
          zIndex: 9999,
          backgroundColor: 'var(--background-primary)',
          borderTop: '1px solid var(--gray-medium)',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="admin-container">
          <div className="flex items-center justify-between h-full">
            {/* Portal Status */}
            <div className="flex items-center mymoolah-spacing-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="admin-text-small text-gray-600">
                System Online
              </span>
            </div>

            {/* Portal Navigation */}
            <div className="flex items-center mymoolah-spacing-sm">
              <button className="admin-text-small text-gray-600 hover:text-mymoolah-blue transition-colors">
                Dashboard
              </button>
              <span className="text-gray-300 mx-2">|</span>
              <button className="admin-text-small text-gray-600 hover:text-mymoolah-blue transition-colors">
                Settings
              </button>
              <span className="text-gray-300 mx-2">|</span>
              <button className="admin-text-small text-gray-600 hover:text-mymoolah-blue transition-colors">
                Help
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
