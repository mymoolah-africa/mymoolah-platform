import { Icons } from "./Icons";
import myMoolahLogo from '../assets/logo2.svg';

export function TopBanner() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="mobile-container">
        <div 
          className="flex items-center justify-between px-3"
          style={{ 
            height: '2rem', // 50% smaller (was 4rem/h-16)
            fontFamily: 'Montserrat, sans-serif'
          }}
        >
          {/* Left: Profile Icon - Smaller */}
          <button 
            className="rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            style={{ 
              padding: '0.25rem', // Smaller padding
              minHeight: 'var(--mobile-touch-target)', 
              minWidth: 'var(--mobile-touch-target)'
            }}
            aria-label="Profile and Settings"
          >
            <Icons.User style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>

          {/* Center: MyMoolah Logo - 50% Smaller */}
          <div className="flex-1 flex justify-center">
            <img 
              src={myMoolahLogo} 
              alt="MyMoolah" 
              style={{ 
                height: '1.25rem', // 50% smaller (was 2.5rem/h-10)
                width: 'auto'
              }}
            />
          </div>

          {/* Right: Notifications Icon - Smaller */}
          <button 
            className="rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 relative"
            style={{ 
              padding: '0.25rem', // Smaller padding
              minHeight: 'var(--mobile-touch-target)', 
              minWidth: 'var(--mobile-touch-target)'
            }}
            aria-label="Notifications"
          >
            <Icons.Bell style={{ width: '1.25rem', height: '1.25rem' }} />
            {/* Notification badge - Smaller */}
            <span 
              className="absolute bg-red-500 rounded-full"
              style={{ 
                top: '-0.125rem', 
                right: '-0.125rem', 
                height: '0.625rem', 
                width: '0.625rem' 
              }}
            ></span>
          </button>
        </div>
      </div>
    </header>
  );
}