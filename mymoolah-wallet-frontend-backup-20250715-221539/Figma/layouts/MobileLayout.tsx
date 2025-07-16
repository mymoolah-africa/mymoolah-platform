import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBanner } from '../components/TopBanner';
import { BottomNavigation } from '../components/BottomNavigation';

export function MobileLayout() {
  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen relative">
      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50">
        <TopBanner />
      </div>
      
      {/* Main Content */}
      <main className="pb-24">
        <Outlet />
      </main>
      
      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm z-50">
        <BottomNavigation />
      </div>
    </div>
  );
}