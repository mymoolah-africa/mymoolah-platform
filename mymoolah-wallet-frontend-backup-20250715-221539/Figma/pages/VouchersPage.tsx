import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Gift, 
  Star, 
  Calendar, 
  ArrowLeft, 
  Search,
  ShoppingBag,
  Coffee,
  Car,
  Smartphone,
  Ticket,
  Award,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Voucher {
  id: string;
  title: string;
  description: string;
  discount: string;
  brand: string;
  category: string;
  expiryDate: string;
  image: string;
  points: number;
  status: 'available' | 'redeemed' | 'expired';
}

export function VouchersPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const userPoints = 2450;
  const nextRewardPoints = 3000;

  const categories = [
    { id: 'all', name: 'All', icon: Gift },
    { id: 'food', name: 'Food', icon: Coffee },
    { id: 'shopping', name: 'Shopping', icon: ShoppingBag },
    { id: 'transport', name: 'Transport', icon: Car },
    { id: 'tech', name: 'Tech', icon: Smartphone }
  ];

  const availableVouchers: Voucher[] = [
    {
      id: '1',
      title: '20% Off Coffee',
      description: 'Get 20% off your next coffee purchase',
      discount: '20%',
      brand: 'Starbucks',
      category: 'food',
      expiryDate: '2024-12-31',
      image: '/api/placeholder/80/80',
      points: 500,
      status: 'available'
    },
    {
      id: '2',
      title: 'R50 Fuel Voucher',
      description: 'R50 discount on fuel purchases',
      discount: 'R50',
      brand: 'Shell',
      category: 'transport',
      expiryDate: '2024-11-30',
      image: '/api/placeholder/80/80',
      points: 800,
      status: 'available'
    },
    {
      id: '3',
      title: '15% Off Groceries',
      description: 'Save 15% on your grocery shopping',
      discount: '15%',
      brand: 'Woolworths',
      category: 'shopping',
      expiryDate: '2024-10-15',
      image: '/api/placeholder/80/80',
      points: 1000,
      status: 'available'
    },
    {
      id: '4',
      title: 'Free Data Bundle',
      description: '1GB free data for new subscribers',
      discount: '1GB',
      brand: 'MTN',
      category: 'tech',
      expiryDate: '2024-09-30',
      image: '/api/placeholder/80/80',
      points: 1200,
      status: 'available'
    }
  ];

  const myVouchers: Voucher[] = [
    {
      id: '5',
      title: '10% Off Pizza',
      description: 'Enjoy 10% off your pizza order',
      discount: '10%',
      brand: 'Debonairs',
      category: 'food',
      expiryDate: '2024-12-15',
      image: '/api/placeholder/80/80',
      points: 400,
      status: 'redeemed'
    },
    {
      id: '6',
      title: 'R25 Uber Credit',
      description: 'R25 off your next Uber ride',
      discount: 'R25',
      brand: 'Uber',
      category: 'transport',
      expiryDate: '2024-11-20',
      image: '/api/placeholder/80/80',
      points: 600,
      status: 'redeemed'
    }
  ];

  const filteredVouchers = availableVouchers.filter(voucher => {
    const matchesSearch = voucher.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucher.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || voucher.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleRedeemVoucher = (voucher: Voucher) => {
    if (userPoints >= voucher.points) {
      alert(`Voucher redeemed successfully! You've used ${voucher.points} points.`);
    } else {
      alert(`Insufficient points. You need ${voucher.points - userPoints} more points.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] px-6 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="p-2 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white">Vouchers & Rewards</h1>
        </div>

        {/* Points Balance */}
        <Card className="bg-white/95 backdrop-blur-sm border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">My Points</p>
                <p className="text-2xl font-bold text-gray-900">{userPoints.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Next reward level</span>
                <span className="text-gray-900 font-medium">{nextRewardPoints} points</span>
              </div>
              <Progress 
                value={(userPoints / nextRewardPoints) * 100} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                {nextRewardPoints - userPoints} points to next reward
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6">
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="my-vouchers">My Vouchers</TabsTrigger>
          </TabsList>

          {/* Available Vouchers Tab */}
          <TabsContent value="available" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search vouchers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Categories */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center space-x-2 whitespace-nowrap"
                >
                  <category.icon className="w-4 h-4" />
                  <span>{category.name}</span>
                </Button>
              ))}
            </div>

            {/* Vouchers Grid */}
            <div className="space-y-4">
              {filteredVouchers.map((voucher) => (
                <Card key={voucher.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-20 h-20 bg-gray-200 flex items-center justify-center">
                        <Gift className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{voucher.title}</h3>
                            <p className="text-sm text-gray-600">{voucher.brand}</p>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {voucher.discount}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{voucher.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                              <span>{voucher.points} points</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Exp. {voucher.expiryDate}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRedeemVoucher(voucher)}
                            disabled={userPoints < voucher.points}
                            className="bg-[#86BE41] hover:bg-[#7AB139] text-xs px-3 py-1"
                          >
                            {userPoints >= voucher.points ? 'Redeem' : 'Need Points'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Vouchers Tab */}
          <TabsContent value="my-vouchers" className="space-y-6">
            <div className="space-y-4">
              {myVouchers.map((voucher) => (
                <Card key={voucher.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-20 h-20 bg-gray-200 flex items-center justify-center">
                        <Ticket className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{voucher.title}</h3>
                            <p className="text-sm text-gray-600">{voucher.brand}</p>
                          </div>
                          <Badge 
                            variant={voucher.status === 'redeemed' ? 'default' : 'secondary'}
                            className={voucher.status === 'redeemed' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {voucher.status === 'redeemed' ? (
                              <><CheckCircle className="w-3 h-3 mr-1" />Redeemed</>
                            ) : voucher.status === 'expired' ? (
                              <><Clock className="w-3 h-3 mr-1" />Expired</>
                            ) : (
                              <>Active</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{voucher.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>Expires {voucher.expiryDate}</span>
                          </div>
                          {voucher.status === 'redeemed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs px-3 py-1"
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Earn More Points */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6 text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Earn More Points</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Make transactions and refer friends to earn more reward points
                </p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Learn How
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}