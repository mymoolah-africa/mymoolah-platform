import React from 'react';
import { useMoolah } from '../contexts/MoolahContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  Send, 
  Receipt, 
  Gift, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  Bell,
  Settings,
  TrendingUp,
  Shield
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { 
    balance, 
    hideBalance, 
    toggleBalanceVisibility, 
    recentTransactions,
    todayActivity,
    isLoading
  } = useMoolah();

  // Safely format numbers with fallback values
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0.00';
    }
    return amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="pb-20 animate-pulse">
        <div className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] px-6 py-6">
          <div className="h-20 bg-white/20 rounded-lg mb-4"></div>
          <div className="h-32 bg-white/20 rounded-lg"></div>
        </div>
        <div className="px-6 py-6">
          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/90 text-sm">Good morning,</p>
            <h1 className="text-white text-xl font-bold">{user?.name || 'User'}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 p-2">
              <Bell className="w-5 h-5" />
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 p-2">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Balance</p>
                <div className="flex items-center space-x-3">
                  {hideBalance ? (
                    <div className="text-3xl font-bold text-gray-900">••••••</div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      R {formatCurrency(balance)}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleBalanceVisibility}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    {hideBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +2.5%
                </Badge>
                <p className="text-xs text-gray-500 mt-1">vs last month</p>
              </div>
            </div>

            {/* Security Status */}
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-green-800 text-sm font-medium">Account Secured</span>
              <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                Mojaloop Protected
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="flex-col h-20 border-2 border-[#86BE41]/20 hover:border-[#86BE41] hover:bg-[#86BE41]/5"
          >
            <Send className="w-6 h-6 text-[#86BE41] mb-1" />
            <span className="text-xs text-gray-700">Send</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col h-20 border-2 border-[#2D8CCA]/20 hover:border-[#2D8CCA] hover:bg-[#2D8CCA]/5"
          >
            <Receipt className="w-6 h-6 text-[#2D8CCA] mb-1" />
            <span className="text-xs text-gray-700">Pay</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col h-20 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
          >
            <Gift className="w-6 h-6 text-purple-600 mb-1" />
            <span className="text-xs text-gray-700">Vouchers</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col h-20 border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
          >
            <Plus className="w-6 h-6 text-gray-600 mb-1" />
            <span className="text-xs text-gray-700">Top Up</span>
          </Button>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Today's Activity</h2>
          <Button variant="ghost" size="sm" className="text-[#2D8CCA] hover:text-[#2680B8]">
            View All
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-full p-2">
                  <ArrowDownLeft className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-green-800 font-medium text-sm">Received</p>
                  <p className="text-green-900 font-bold">R {formatCurrency(todayActivity?.received)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-blue-800 font-medium text-sm">Sent</p>
                  <p className="text-blue-900 font-bold">R {formatCurrency(todayActivity?.sent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTransactions && recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`rounded-full p-2 ${
                      transaction.type === 'received' 
                        ? 'bg-green-100' 
                        : transaction.type === 'sent' 
                          ? 'bg-blue-100' 
                          : 'bg-purple-100'
                    }`}>
                      {transaction.type === 'received' ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      ) : transaction.type === 'sent' ? (
                        <ArrowUpRight className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Receipt className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{transaction.description}</p>
                      <p className="text-xs text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${
                      transaction.type === 'received' 
                        ? 'text-green-600' 
                        : 'text-gray-900'
                    }`}>
                      {transaction.type === 'received' ? '+' : '-'}R {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No recent transactions</p>
                <p className="text-xs mt-1">Your transactions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}