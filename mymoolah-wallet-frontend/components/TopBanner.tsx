import { Icons } from "./Icons";

export function TopBanner() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 max-w-sm mx-auto">
        {/* Left: Profile Icon */}
        <button 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Profile and Settings"
        >
          <Icons.User />
        </button>

        {/* Center: MyMoolah Logo - Text-based */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl font-bold text-blue-600">
            MyMoolah
          </h1>
        </div>

        {/* Right: Notifications Icon */}
        <button 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 relative"
          aria-label="Notifications"
        >
          <Icons.Bell />
          {/* Notification badge */}
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}