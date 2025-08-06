import { Icons } from "./Icons";
import { useNavigate } from 'react-router-dom';

export function BalanceCards() {
  const navigate = useNavigate();

  const handleWalletClick = () => {
    navigate('/transaction-history');
  };

  const handleVouchersClick = () => {
    navigate('/vouchers');
  };

  return (
    <div className="space-y-4 px-4 pt-6">
      {/* Wallet Balance Card - Reduced top padding, maintained bottom padding */}
      <button 
        onClick={handleWalletClick}
        className="w-full pt-5 pb-7 px-7 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-200 active:scale-98 relative"
        style={{ backgroundColor: '#86BE41' }}
        aria-label="View wallet transaction history"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icons.Wallet />
            <div className="text-left">
              <p className="text-white/90 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Wallet Balance
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-xl font-bold leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              R 123,456.78
            </p>
          </div>
        </div>
        {/* Click for Full History hint - much smaller */}
        <div className="absolute bottom-2 left-2">
          <p className="text-white/60 text-xs" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px' }}>
            Click for Full History
          </p>
        </div>
      </button>

      {/* Open Vouchers Card - Centered voucher count box */}
      <button 
        onClick={handleVouchersClick}
        className="w-full pt-3 pb-5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-98 relative"
        style={{ backgroundColor: '#2D8CCA' }}
        aria-label="View voucher history"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icons.Ticket />
            <div className="text-left">
              <p className="text-white/90 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Open Vouchers
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Centered voucher count box */}
            <div className="text-center">
              <div className="bg-white/20 rounded-lg px-2 py-1 min-w-[32px]">
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  5
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white text-lg font-bold leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                R 12,250.00
              </p>
            </div>
          </div>
        </div>
        {/* Click for Full History hint - much smaller */}
        <div className="absolute bottom-2 left-2">
          <p className="text-white/60 text-xs" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px' }}>
            Click for Full History
          </p>
        </div>
      </button>
    </div>
  );
}