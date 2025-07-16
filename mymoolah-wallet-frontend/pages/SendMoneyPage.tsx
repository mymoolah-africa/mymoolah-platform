import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, 
  Send, 
  User, 
  Phone, 
  Mail, 
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMoolah } from '../contexts/MoolahContext';

interface SendMoneyForm {
  recipientType: 'phone' | 'email' | 'account';
  recipient: string;
  amount: string;
  reference: string;
  memo: string;
}

export function SendMoneyPage() {
  const navigate = useNavigate();
  const { balance, sendMoney } = useMoolah();
  const [form, setForm] = useState<SendMoneyForm>({
    recipientType: 'phone',
    recipient: '',
    amount: '',
    reference: '',
    memo: ''
  });
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<any>(null);

  const handleRecipientLookup = async (recipient: string) => {
    if (!recipient) return;
    
    setLoading(true);
    try {
      // Simulate Mojaloop party lookup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock recipient lookup - replace with real Mojaloop API
      const mockRecipient = {
        name: 'John Doe',
        verified: true,
        bank: 'Standard Bank',
        displayName: recipient.includes('@') ? recipient : `+27 ${recipient.slice(1)}`
      };
      
      setRecipientInfo(mockRecipient);
    } catch (err) {
      setError('Could not find recipient. Please check the details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(form.amount);
    if (amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      setError('Insufficient balance');
      return;
    }

    if (!recipientInfo) {
      await handleRecipientLookup(form.recipient);
      return;
    }

    setStep('confirm');
  };

  const handleConfirmSend = async () => {
    setLoading(true);
    try {
      // Simulate Mojaloop transfer
      await sendMoney(form.recipient, parseFloat(form.amount));
      setStep('success');
    } catch (err) {
      setError('Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-8">
          <div className="bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer Successful!</h1>
          <p className="text-gray-600">Your money has been sent securely</p>
        </div>

        <Card className="w-full max-w-sm mb-8">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-gray-900 mb-2">
              R {parseFloat(form.amount).toLocaleString()}
            </p>
            <p className="text-gray-600 mb-4">Sent to {recipientInfo?.name}</p>
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Secured by Mojaloop</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 w-full max-w-sm">
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="w-full bg-[#86BE41] hover:bg-[#7AB139]"
          >
            Back to Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setStep('form');
              setForm({ recipientType: 'phone', recipient: '', amount: '', reference: '', memo: '' });
              setRecipientInfo(null);
            }}
            className="w-full"
          >
            Send Another Transfer
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setStep('form')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Confirm Transfer</h1>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Transfer Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  R {parseFloat(form.amount).toLocaleString()}
                </p>
                <p className="text-gray-600">Transfer Amount</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <div className="text-right">
                    <p className="font-medium">{recipientInfo?.name}</p>
                    <p className="text-sm text-gray-500">{recipientInfo?.displayName}</p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-medium">{form.reference || 'N/A'}</span>
                </div>

                {form.memo && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memo:</span>
                    <span className="font-medium">{form.memo}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-medium">
                  <span>Total Amount:</span>
                  <span>R {parseFloat(form.amount).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              This transfer is secured by Mojaloop and will be processed instantly.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleConfirmSend}
              disabled={loading}
              className="w-full h-12 bg-[#86BE41] hover:bg-[#7AB139]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Confirm & Send
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setStep('form')}
              className="w-full"
              disabled={loading}
            >
              Edit Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-lg font-bold text-gray-900">Send Money</h1>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] px-6 py-4">
        <div className="text-center">
          <p className="text-white/90 text-sm">Available Balance</p>
          <p className="text-white text-2xl font-bold">R {balance.toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Recipient Type Selection */}
        <div className="space-y-2">
          <Label>Send To</Label>
          <Select 
            value={form.recipientType} 
            onValueChange={(value: 'phone' | 'email' | 'account') => {
              setForm({ ...form, recipientType: value, recipient: '' });
              setRecipientInfo(null);
            }}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Phone Number</span>
                </div>
              </SelectItem>
              <SelectItem value="email">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email Address</span>
                </div>
              </SelectItem>
              <SelectItem value="account">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Account Number</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recipient Input */}
        <div className="space-y-2">
          <Label htmlFor="recipient">
            {form.recipientType === 'phone' ? 'Phone Number' : 
             form.recipientType === 'email' ? 'Email Address' : 'Account Number'}
          </Label>
          <div className="relative">
            <Input
              id="recipient"
              type={form.recipientType === 'email' ? 'email' : 'text'}
              placeholder={
                form.recipientType === 'phone' ? '+27 XX XXX XXXX' :
                form.recipientType === 'email' ? 'recipient@email.com' : 
                'Account number'
              }
              value={form.recipient}
              onChange={(e) => {
                setForm({ ...form, recipient: e.target.value });
                setRecipientInfo(null);
              }}
              onBlur={() => handleRecipientLookup(form.recipient)}
              className="h-12 pl-10"
              required
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {form.recipientType === 'phone' ? (
                <Phone className="w-4 h-4 text-gray-400" />
              ) : form.recipientType === 'email' ? (
                <Mail className="w-4 h-4 text-gray-400" />
              ) : (
                <CreditCard className="w-4 h-4 text-gray-400" />
              )}
            </div>
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Recipient Info */}
          {recipientInfo && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-green-800 font-medium text-sm">{recipientInfo.name}</p>
                <p className="text-green-700 text-xs">Verified • {recipientInfo.bank}</p>
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="h-12 pl-8 text-lg"
              required
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              R
            </div>
          </div>
          {form.amount && parseFloat(form.amount) > balance && (
            <p className="text-red-600 text-sm">Insufficient balance</p>
          )}
        </div>

        {/* Reference */}
        <div className="space-y-2">
          <Label htmlFor="reference">Reference (Optional)</Label>
          <Input
            id="reference"
            placeholder="Payment reference"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Memo */}
        <div className="space-y-2">
          <Label htmlFor="memo">Memo (Optional)</Label>
          <Input
            id="memo"
            placeholder="Add a note"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="h-12"
          />
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 bg-[#86BE41] hover:bg-[#7AB139]"
          disabled={loading || !form.recipient || !form.amount}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Looking up recipient...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Continue
            </>
          )}
        </Button>
      </form>
    </div>
  );
}