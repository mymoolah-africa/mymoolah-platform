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
      <div className="animate-pulse" style={{ paddingBottom: '5rem' }}>
        <div style={{ padding: 'var(--mobile-padding)' }}>
          <div 
            className="bg-gray-200"
            style={{ 
              height: '2.5rem', 
              borderRadius: 'var(--mobile-border-radius)', 
              marginBottom: 'var(--space-md)'
            }}
          ></div>
          <div 
            className="bg-gray-200"
            style={{ 
              height: '6rem', // 50% smaller
              borderRadius: 'var(--mobile-border-radius)', 
              marginBottom: 'var(--space-lg)'
            }}
          ></div>
          <div 
            className="bg-gray-200"
            style={{ 
              height: '4rem', 
              borderRadius: 'var(--mobile-border-radius)', 
              marginBottom: 'var(--space-md)'
            }}
          ></div>
          <div 
            className="bg-gray-200"
            style={{ 
              height: '8rem', 
              borderRadius: 'var(--mobile-border-radius)'
            }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '5rem' }}>
      {/* Header - Mobile Optimized */}
      <div 
        className="bg-white"
        style={{ 
          padding: 'var(--mobile-padding)',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >
        <div 
          className="flex items-center justify-between"
          style={{ marginBottom: 'var(--space-md)' }}
        >
          <div>
            <p style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-small)',
              fontWeight: 'var(--font-weight-normal)',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              Good morning,
            </p>
            <h1 style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1f2937'
            }}>
              {user?.name || 'User'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-gray-600 hover:bg-gray-100"
              style={{ 
                height: 'var(--mobile-touch-target)',
                width: 'var(--mobile-touch-target)',
                padding: '0.5rem',
                fontFamily: 'Montserrat, sans-serif'
              }}
            >
              <Bell className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-gray-600 hover:bg-gray-100"
              style={{ 
                height: 'var(--mobile-touch-target)',
                width: 'var(--mobile-touch-target)',
                padding: '0.5rem',
                fontFamily: 'Montserrat, sans-serif'
              }}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Balance Card - 50% Smaller Height */}
        <Card className="mymoolah-card">
          <CardContent style={{ padding: 'var(--space-md)' }}>
            <div 
              className="flex items-center justify-between"
              style={{ marginBottom: 'var(--space-sm)' }}
            >
              <div>
                <p style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: '#6b7280',
                  marginBottom: '0.25rem'
                }}>
                  Total Balance
                </p>
                <div className="flex items-center gap-2">
                  {hideBalance ? (
                    <div style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', // 50% smaller
                      fontWeight: 'var(--font-weight-bold)',
                      color: '#1f2937'
                    }}>
                      ••••••
                    </div>
                  ) : (
                    <div style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', // 50% smaller
                      fontWeight: 'var(--font-weight-bold)',
                      color: '#1f2937'
                    }}>
                      R {formatCurrency(balance)}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleBalanceVisibility}
                    className="text-gray-500 hover:text-gray-700"
                    style={{ 
                      height: 'var(--mobile-touch-target)',
                      width: 'var(--mobile-touch-target)',
                      padding: '0.5rem',
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                  >
                    {hideBalance ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  <span style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-small)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    +2.5%
                  </span>
                </Badge>
                <p style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'var(--mobile-font-small)',
                  color: '#6b7280',
                  marginTop: '0.25rem'
                }}>
                  vs last month
                </p>
              </div>
            </div>

            {/* Security Status - Smaller */}
            <div 
              className="flex items-center gap-2 bg-green-50"
              style={{ 
                padding: 'var(--space-sm)', 
                borderRadius: 'var(--mobile-border-radius)'
              }}
            >
              <Shield className="w-3 h-3 text-green-600" />
              <span style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)',
                fontWeight: 'var(--font-weight-medium)',
                color: '#166534'
              }}>
                Account Secured
              </span>
              <Badge 
                variant="outline" 
                className="border-green-200 text-green-700"
                style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: '10px'
                }}
              >
                Mojaloop Protected
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div style={{ padding: 'var(--mobile-padding)' }}>
        <h2 style={{ 
          fontFamily: 'Montserrat, sans-serif', 
          fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
          fontWeight: 'var(--font-weight-bold)',
          color: '#1f2937',
          marginBottom: 'var(--space-md)'
        }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="flex-col border-2 border-[#86BE41]/20 hover:border-[#86BE41] hover:bg-[#86BE41]/5"
            style={{ 
              height: '4rem', // 50% smaller (was 5rem/h-20)
              fontFamily: 'Montserrat, sans-serif',
              borderRadius: 'var(--mobile-border-radius)'
            }}
          >
            <Send className="w-5 h-5 text-[#86BE41] mb-1" />
            <span style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-small)',
              color: '#374151'
            }}>
              Send
            </span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col border-2 border-[#2D8CCA]/20 hover:border-[#2D8CCA] hover:bg-[#2D8CCA]/5"
            style={{ 
              height: '4rem', // 50% smaller
              fontFamily: 'Montserrat, sans-serif',
              borderRadius: 'var(--mobile-border-radius)'
            }}
          >
            <Receipt className="w-5 h-5 text-[#2D8CCA] mb-1" />
            <span style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-small)',
              color: '#374151'
            }}>
              Pay
            </span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
            style={{ 
              height: '4rem', // 50% smaller
              fontFamily: 'Montserrat, sans-serif',
              borderRadius: 'var(--mobile-border-radius)'
            }}
          >
            <Gift className="w-5 h-5 text-purple-600 mb-1" />
            <span style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-small)',
              color: '#374151'
            }}>
              Vouchers
            </span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
            style={{ 
              height: '4rem', // 50% smaller
              fontFamily: 'Montserrat, sans-serif',
              borderRadius: 'var(--mobile-border-radius)'
            }}
          >
            <Plus className="w-5 h-5 text-gray-600 mb-1" />
            <span style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-small)',
              color: '#374151'
            }}>
              Top Up
            </span>
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