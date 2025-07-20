import { Outlet, useLocation } from 'react-router-dom';
import { TopBanner } from '../components/TopBanner';
import { BottomNavigation } from '../components/BottomNavigation';

export function MobileLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-white">
      <div className="mobile-container">
        {/* Sticky Top Banner */}
        <TopBanner />
        
        {/* Main Content with Clean White Background */}
        <main 
          className="mobile-scroll mobile-safe-area bg-white"
          style={{ 
            paddingBottom: '5rem', // Space for bottom navigation
            minHeight: 'calc(100vh - 2rem)' // Account for top banner height
          }}
        >
          <Outlet />
        </main>
        
        {/* Sticky Bottom Navigation - Properly Positioned */}
        <div 
          className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50"
          style={{ 
            width: '100%',
            maxWidth: 'var(--mobile-max-width)'
          }}
        >
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
}