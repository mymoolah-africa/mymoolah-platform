import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  QrCode, 
  Scan, 
  Smartphone, 
  Receipt, 
  Clock, 
  CheckCircle,
  ArrowLeft,
  Wifi,
  ShoppingCart,
  Store,
  Coffee,
  Car,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TransactPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pay');
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'nfc' | 'manual'>('qr');
  const [scanning, setScanning] = useState(false);

  const quickPayOptions = [
    { icon: Coffee, name: 'Coffee Shop', category: 'Food & Drink', color: 'bg-amber-100 text-amber-700' },
    { icon: Car, name: 'Fuel Station', category: 'Transport', color: 'bg-blue-100 text-blue-700' },
    { icon: Store, name: 'Grocery Store', category: 'Shopping', color: 'bg-green-100 text-green-700' },
    { icon: Zap, name: 'Electricity', category: 'Utilities', color: 'bg-yellow-100 text-yellow-700' }
  ];

  const recentTransactions = [
    { id: 1, merchant: 'Woolworths', amount: -250.00, time: '2 minutes ago', status: 'completed' },
    { id: 2, merchant: 'Shell Garage', amount: -800.00, time: '1 hour ago', status: 'completed' },
    { id: 3, merchant: 'Starbucks', amount: -65.00, time: '3 hours ago', status: 'completed' },
    { id: 4, merchant: 'Uber', amount: -120.00, time: '1 day ago', status: 'completed' }
  ];

  const handleScan = () => {
    setScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setScanning(false);
      // Mock successful scan - would integrate with real QR scanner
      alert('QR Code scanned successfully! Amount: R 150.00 to Coffee Corner');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900">Transact</h1>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pay">Pay</TabsTrigger>
            <TabsTrigger value="receive">Receive</TabsTrigger>
          </TabsList>

          {/* Pay Tab */}
          <TabsContent value="pay" className="space-y-6">
            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                    className="flex-col h-20"
                    onClick={() => setPaymentMethod('qr')}
                  >
                    <QrCode className="w-6 h-6 mb-1" />
                    <span className="text-xs">QR Code</span>
                  </Button>
                  <Button
                    variant={paymentMethod === 'nfc' ? 'default' : 'outline'}
                    className="flex-col h-20"
                    onClick={() => setPaymentMethod('nfc')}
                  >
                    <Wifi className="w-6 h-6 mb-1" />
                    <span className="text-xs">Tap to Pay</span>
                  </Button>
                  <Button
                    variant={paymentMethod === 'manual' ? 'default' : 'outline'}
                    className="flex-col h-20"
                    onClick={() => setPaymentMethod('manual')}
                  >
                    <Smartphone className="w-6 h-6 mb-1" />
                    <span className="text-xs">Manual</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Scanner */}
            {paymentMethod === 'qr' && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    {scanning ? (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] rounded-xl p-8">
                          <Scan className="w-16 h-16 text-white mx-auto animate-pulse mb-4" />
                          <p className="text-white font-medium">Scanning QR Code...</p>
                          <p className="text-white/80 text-sm">Point your camera at the QR code</p>
                        </div>
                        <Button variant="outline" onClick={() => setScanning(false)}>
                          Cancel Scan
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-gray-100 rounded-xl p-12 border-2 border-dashed border-gray-300">
                          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 font-medium">Ready to Scan</p>
                          <p className="text-gray-500 text-sm">Scan merchant QR code to pay</p>
                        </div>
                        <Button 
                          onClick={handleScan}
                          className="w-full h-12 bg-[#86BE41] hover:bg-[#7AB139]"
                        >
                          <Scan className="w-4 h-4 mr-2" />
                          Start Scanning
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NFC Payment */}
            {paymentMethod === 'nfc' && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] rounded-xl p-8">
                      <Wifi className="w-16 h-16 text-white mx-auto mb-4" />
                      <p className="text-white font-medium">Tap to Pay Ready</p>
                      <p className="text-white/80 text-sm">Hold your phone near the payment terminal</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <strong>Tip:</strong> Make sure NFC is enabled in your phone settings
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manual Payment */}
            {paymentMethod === 'manual' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enter Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      placeholder="Merchant name or ID"
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Amount (R)"
                      className="h-12"
                    />
                  </div>
                  <Button className="w-full h-12 bg-[#86BE41] hover:bg-[#7AB139]">
                    <Receipt className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Pay Options */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Quick Pay</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickPayOptions.map((option, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`rounded-lg p-2 ${option.color}`}>
                          <option.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{option.name}</p>
                          <p className="text-xs text-gray-500">{option.category}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Receive Tab */}
          <TabsContent value="receive" className="space-y-6">
            {/* My QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-center">My Payment QR Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-8 mx-auto w-fit">
                    <div className="bg-gray-900 w-32 h-32 rounded-lg flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Show this code to receive payments</p>
                    <p className="text-sm text-gray-500">Your unique payment identifier</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Share QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Request */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="number"
                  placeholder="Amount to request (R)"
                  className="h-12"
                />
                <Input
                  placeholder="Payment description (optional)"
                  className="h-12"
                />
                <Button className="w-full h-12 bg-[#2D8CCA] hover:bg-[#2680B8]">
                  Generate Payment Request
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Transactions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 rounded-full p-2">
                    <Store className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.merchant}</p>
                    <p className="text-xs text-gray-500">{transaction.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">R {Math.abs(transaction.amount).toLocaleString()}</p>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}