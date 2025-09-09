import { Filter } from "./Icons";
import { useMoolah } from "../contexts/MoolahContext";

// Transactions will be fetched from the database via MoolahContext

export function RecentTransactions() {
  const { recentTransactions } = useMoolah();
  
  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2);
    return amount >= 0 ? `+R ${formatted}` : `-R ${formatted}`;
  };

  const getAmountColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="px-4 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Recent Transactions
        </h2>
        <button 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Filter transactions"
        >
          <Filter />
        </button>
      </div>

      {/* Transactions List - Limited to 5 items */}
      <div className="space-y-3">
        {recentTransactions && recentTransactions.length > 0 ? (
          recentTransactions.slice(0, 5).map((transaction) => (
            <div 
              key={transaction.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {transaction.date}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p 
                    className={`font-bold text-lg ${getAmountColor(transaction.amount)}`}
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {formatAmount(transaction.amount)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No recent transactions
          </div>
        )}
      </div>
    </div>
  );
}