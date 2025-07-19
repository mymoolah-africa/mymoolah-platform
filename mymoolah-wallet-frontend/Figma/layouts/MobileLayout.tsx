import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBanner } from '../components/TopBanner';
import { BottomNavigation } from '../components/BottomNavigation';

export function MobileLayout() {
  return (
    <div className="mobile-container bg-mymoolah-primary">
      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50">
        <TopBanner />
      </div>
      
      {/* Main Content with Clean White Background */}
      <main className="pb-24 mobile-scroll mobile-safe-area bg-mymoolah-primary min-h-screen">
        <Outlet />
      </main>
      
      {/* Sticky Bottom Navigation - Optimized for Mobile */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm z-50 mobile-safe-area">
        <BottomNavigation />
      </div>
    </div>
  );
}