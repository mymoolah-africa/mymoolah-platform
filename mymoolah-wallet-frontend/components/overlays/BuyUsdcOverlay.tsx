/**
 * Buy USDC Overlay
 * 
 * Overlay component for USDC purchase and transfer to Solana wallets
 * 
 * Flow:
 * 1. Enter amount → Get quote
 * 2. Select/add beneficiary (Solana wallet)
 * 3. Review and confirm
 * 4. Processing (VALR + blockchain)
 * 5. Success (show tx hash + explorer link)
 * 
 * Banking-Grade Features:
 * - Real-time quote with expiry timer
 * - Comprehensive error handling
 * - Irreversibility warnings
 * - Travel Rule compliance data collection
 * - Solana address validation
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Coins, CheckCircle, ExternalLink, AlertTriangle, Copy, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ErrorModal } from '../ui/ErrorModal';
import { usdcService, type UsdcQuote } from '../../services/usdcService';
import { unifiedBeneficiaryService, type Beneficiary } from '../../services/unifiedBeneficiaryService';
import { formatCurrency } from '../../services/overlayService';

type Step = 'amount' | 'beneficiary' | 'review' | 'processing' | 'success';

const COUNTRY_LIST = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'GH', name: 'Ghana' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'ZA', name: 'South Africa' }
  // Add more countries as needed
];

const RELATIONSHIP_LIST = [
  { value: 'self', label: 'Myself (own wallet)' },
  { value: 'family', label: 'Family Member' },
  { value: 'friend', label: 'Friend' },
  { value: 'business', label: 'Business Partner' },
  { value: 'other', label: 'Other' }
];

const PURPOSE_LIST = [
  { value: 'support', label: 'Financial Support' },
  { value: 'gift', label: 'Gift' },
  { value: 'payment', label: 'Payment for Goods/Services' },
  { value: 'investment', label: 'Investment' },
  { value: 'savings', label: 'Savings Transfer' },
  { value: 'other', label: 'Other' }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  wallet: any;
}

export function BuyUsdcOverlay({ isOpen, onClose, user, wallet }: Props) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('amount');
  
  // Amount step
  const [zarAmount, setZarAmount] = useState<string>('');
  const [quote, setQuote] = useState<UsdcQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteExpiry, setQuoteExpiry] = useState<number>(60);
  
  // Beneficiary step
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState({
    name: '',
    walletAddress: '',
    country: 'US',
    relationship: 'self',
    purpose: 'support'
  });
  const [addressValidation, setAddressValidation] = useState<any>(null);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false);
  
  // Review step
  const [purpose, setPurpose] = useState<string>('support');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // Processing/Success
  const [processing, setProcessing] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  
  // Error handling
  const [error, setError] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Quote expiry timer
  useEffect(() => {
    if (!quote) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiresAt = new Date(quote.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setQuoteExpiry(remaining);
      
      if (remaining === 0) {
        setQuote(null);
        setError('Quote expired. Please get a new quote.');
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quote]);

  // Load beneficiaries when needed
  const loadBeneficiaries = async () => {
    try {
      setBeneficiariesLoading(true);
      const list = await unifiedBeneficiaryService.getBeneficiaries('usdc');
      setBeneficiaries(list);
    } catch (err: any) {
      console.error('Failed to load USDC beneficiaries:', err);
      setError('Failed to load beneficiaries');
    } finally {
      setBeneficiariesLoading(false);
    }
  };

  // Get quote
  const handleGetQuote = async () => {
    try {
      const amount = parseFloat(zarAmount);
      if (isNaN(amount) || amount < 10) {
        setError('Minimum amount is R10');
        return;
      }
      
      if (amount > 5000) {
        setError('Maximum amount is R5,000');
        return;
      }
      
      setQuoteLoading(true);
      setError('');
      
      const quoteData = await usdcService.getQuote(amount);
      setQuote(quoteData);
      setQuoteExpiry(60);
    } catch (err: any) {
      console.error('Failed to get quote:', err);
      setError(err.message || 'Failed to get quote. Please try again.');
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  // Validate Solana address
  const handleValidateAddress = async (address: string) => {
    if (!address || address.trim().length < 32) {
      setAddressValidation(null);
      return;
    }
    
    try {
      const validation = await usdcService.validateAddress(address.trim());
      setAddressValidation(validation);
    } catch (err) {
      setAddressValidation({
        valid: false,
        reason: 'Validation failed'
      });
    }
  };

  // Create beneficiary
  const handleCreateBeneficiary = async () => {
    try {
      if (!newBeneficiary.name || !newBeneficiary.walletAddress) {
        setError('Name and wallet address are required');
        return;
      }
      
      if (!addressValidation || !addressValidation.valid) {
        setError('Please enter a valid Solana address');
        return;
      }
      
      setBeneficiariesLoading(true);
      
      // Create beneficiary with cryptoServices
      const created = await unifiedBeneficiaryService.createBeneficiary({
        name: newBeneficiary.name,
        serviceType: 'usdc',
        serviceData: {
          walletAddress: newBeneficiary.walletAddress.trim(),
          network: 'solana',
          country: newBeneficiary.country,
          relationship: newBeneficiary.relationship,
          purpose: newBeneficiary.purpose
        },
        isFavorite: false
      });
      
      // Reload beneficiaries
      await loadBeneficiaries();
      
      // Select the new beneficiary
      setSelectedBeneficiary(created);
      setShowAddBeneficiary(false);
      setCurrentStep('review');
    } catch (err: any) {
      console.error('Failed to create beneficiary:', err);
      setError(err.message || 'Failed to create beneficiary');
    } finally {
      setBeneficiariesLoading(false);
    }
  };

  // Execute send
  const handleSend = async () => {
    try {
      if (!quote || !selectedBeneficiary) {
        setError('Missing quote or beneficiary');
        return;
      }
      
      if (!agreeToTerms) {
        setError('Please accept the terms and warnings');
        return;
      }
      
      setProcessing(true);
      setCurrentStep('processing');
      setError('');
      
      const result = await usdcService.send({
        zarAmount: quote.zarAmount,
        beneficiaryId: selectedBeneficiary.id,
        purpose,
        idempotencyKey: `USDC-${Date.now()}-${Math.random().toString(36).slice(2)}`
      });
      
      if (result.success) {
        setTransactionResult(result.data);
        setCurrentStep('success');
      } else {
        setError(result.error?.message || 'Transaction failed');
        setShowErrorModal(true);
        setCurrentStep('review');
      }
    } catch (err: any) {
      console.error('Failed to send USDC:', err);
      setError(err.message || 'Transaction failed');
      setShowErrorModal(true);
      setCurrentStep('review');
    } finally {
      setProcessing(false);
    }
  };

  // Reset and start over
  const handleStartOver = () => {
    setCurrentStep('amount');
    setZarAmount('');
    setQuote(null);
    setSelectedBeneficiary(null);
    setPurpose('support');
    setAgreeToTerms(false);
    setTransactionResult(null);
    setError('');
  };

  // Close overlay
  const handleClose = () => {
    handleStartOver();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStep !== 'amount' && currentStep !== 'success' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (currentStep === 'beneficiary') setCurrentStep('amount');
                      if (currentStep === 'review') setCurrentStep('beneficiary');
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <Coins className="w-6 h-6 text-purple-600" />
                <CardTitle>Buy USDC</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step 1: Amount Entry */}
            {currentStep === 'amount' && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="zarAmount">Amount (ZAR)</Label>
                  <Input
                    id="zarAmount"
                    type="number"
                    min="10"
                    max="5000"
                    step="0.01"
                    value={zarAmount}
                    onChange={(e) => setZarAmount(e.target.value)}
                    placeholder="Enter amount (R10 - R5,000)"
                    className="text-lg"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Available: {formatCurrency(wallet?.balance / 100 || 0)}
                  </p>
                </div>

                {quote && quoteExpiry > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-900">Quote</span>
                      <div className="flex items-center gap-1 text-sm text-purple-600">
                        <Clock className="w-4 h-4" />
                        <span>Expires in {quoteExpiry}s</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>You pay:</span>
                        <span className="font-semibold">{formatCurrency(quote.zarAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform fee (7.5%):</span>
                        <span>{formatCurrency(quote.platformFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network fee (est.):</span>
                        <span>{formatCurrency(quote.networkFee)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base font-semibold">
                        <span>You receive:</span>
                        <span className="text-purple-600">${quote.usdcAmount.toFixed(2)} USDC</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Exchange rate:</span>
                        <span>1 USDC = R{quote.exchangeRate.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleGetQuote}
                    disabled={quoteLoading || !zarAmount}
                    className="flex-1"
                  >
                    {quoteLoading ? 'Getting quote...' : quote ? 'Refresh Quote' : 'Get Quote'}
                  </Button>
                  
                  {quote && quoteExpiry > 0 && (
                    <Button
                      onClick={async () => {
                        await loadBeneficiaries();
                        setCurrentStep('beneficiary');
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      Continue
                    </Button>
                  )}
                </div>

                {/* Warnings */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800 space-y-1">
                      <p className="font-semibold">Important Information:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Crypto transfers are <strong>irreversible</strong></li>
                        <li>Only send to <strong>Solana</strong> compatible wallets</li>
                        <li>Recipient converts USDC to local currency (MyMoolah does not provide cash-out)</li>
                        <li>Tier 2 KYC required</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Beneficiary Selection */}
            {currentStep === 'beneficiary' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Select Recipient</h3>
                
                {beneficiariesLoading ? (
                  <div className="text-center py-8">Loading beneficiaries...</div>
                ) : beneficiaries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No saved USDC recipients yet.</p>
                    <Button onClick={() => setShowAddBeneficiary(true)} className="mt-4">
                      Add New Recipient
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {beneficiaries.map((benef) => (
                        <button
                          key={benef.id}
                          onClick={() => {
                            setSelectedBeneficiary(benef);
                            setCurrentStep('review');
                          }}
                          className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{benef.name}</p>
                              <p className="text-sm text-gray-600 font-mono">
                                {benef.walletAddress?.substring(0, 8)}...{benef.walletAddress?.substring(benef.walletAddress.length - 6)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {benef.country} · {benef.relationship}
                              </p>
                            </div>
                            <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
                              USDC
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    <Button
                      onClick={() => setShowAddBeneficiary(true)}
                      variant="outline"
                      className="w-full"
                    >
                      + Add New Recipient
                    </Button>
                  </>
                )}

                {/* Add Beneficiary Form */}
                {showAddBeneficiary && (
                  <Dialog open={showAddBeneficiary} onOpenChange={setShowAddBeneficiary}>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Add USDC Recipient</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="benefName">Recipient Name *</Label>
                          <Input
                            id="benefName"
                            value={newBeneficiary.name}
                            onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                            placeholder="e.g., John Smith"
                          />
                        </div>

                        <div>
                          <Label htmlFor="walletAddr">Solana Wallet Address *</Label>
                          <Input
                            id="walletAddr"
                            value={newBeneficiary.walletAddress}
                            onChange={(e) => {
                              const addr = e.target.value;
                              setNewBeneficiary({ ...newBeneficiary, walletAddress: addr });
                              handleValidateAddress(addr);
                            }}
                            placeholder="32-44 characters"
                            className="font-mono text-sm"
                          />
                          {addressValidation && (
                            <p className={`text-sm mt-1 ${addressValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                              {addressValidation.valid ? '✓ Valid Solana address' : `✗ ${addressValidation.reason}`}
                            </p>
                          )}
                          {addressValidation?.warning && (
                            <p className="text-sm mt-1 text-yellow-600">
                              ⚠ {addressValidation.warning}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="country">Recipient Country *</Label>
                          <Select value={newBeneficiary.country} onValueChange={(v) => setNewBeneficiary({ ...newBeneficiary, country: v })}>
                            <SelectTrigger id="country">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_LIST.map(c => (
                                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="relationship">Relationship *</Label>
                          <Select value={newBeneficiary.relationship} onValueChange={(v) => setNewBeneficiary({ ...newBeneficiary, relationship: v })}>
                            <SelectTrigger id="relationship">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RELATIONSHIP_LIST.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="purpose">Purpose</Label>
                          <Select value={newBeneficiary.purpose} onValueChange={(v) => setNewBeneficiary({ ...newBeneficiary, purpose: v })}>
                            <SelectTrigger id="purpose">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PURPOSE_LIST.map(p => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={handleCreateBeneficiary}
                          disabled={!addressValidation?.valid || beneficiariesLoading}
                          className="w-full"
                        >
                          {beneficiariesLoading ? 'Creating...' : 'Save Recipient'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {currentStep === 'review' && quote && selectedBeneficiary && (
              <div className="space-y-6">
                <h3 className="font-semibold text-lg">Review Transaction</h3>
                
                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">You send:</span>
                    <span className="font-semibold text-lg">{formatCurrency(quote.zarAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recipient receives:</span>
                    <span className="font-semibold text-lg text-purple-600">${quote.usdcAmount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform fee:</span>
                    <span>{formatCurrency(quote.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Network fee (est.):</span>
                    <span>{formatCurrency(quote.networkFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-600">Rate:</span>
                    <span>1 USDC = R{quote.exchangeRate.toFixed(2)}</span>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="border rounded-lg p-4 space-y-2">
                  <p className="font-semibold">{selectedBeneficiary.name}</p>
                  <p className="text-sm text-gray-600 font-mono break-all">
                    {selectedBeneficiary.walletAddress}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedBeneficiary.country} · {selectedBeneficiary.relationship}
                  </p>
                </div>

                {/* Purpose */}
                <div>
                  <Label htmlFor="purposeSelect">Purpose of Transfer *</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger id="purposeSelect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_LIST.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Warnings & Terms */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800 space-y-2">
                      <p className="font-semibold">Critical Warnings:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Irreversible:</strong> Once sent, cannot be cancelled or refunded</li>
                        <li><strong>Address accuracy:</strong> Sending to wrong address = permanent loss</li>
                        <li><strong>Network compatibility:</strong> Only Solana USDC wallets</li>
                        <li><strong>Recipient responsibility:</strong> MyMoolah does not provide cash-out</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="agreeTerms" className="text-sm text-gray-700 cursor-pointer">
                    I understand this transaction is <strong>irreversible</strong>, I have verified the recipient address is correct, and I accept the risks.
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={!agreeToTerms || processing}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {processing ? 'Processing...' : 'Confirm & Send'}
                </Button>
              </div>
            )}

            {/* Step 4: Processing */}
            {currentStep === 'processing' && (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <p className="font-semibold text-lg">Processing Transaction</p>
                  <p className="text-sm text-gray-600">
                    Buying USDC and sending to recipient...
                  </p>
                  <p className="text-xs text-gray-500">
                    This typically takes 1-5 minutes
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Success */}
            {currentStep === 'success' && transactionResult && (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold text-xl text-green-600">USDC Sent Successfully!</p>
                  <p className="text-sm text-gray-600">
                    ${transactionResult.usdcAmount} USDC sent to {transactionResult.beneficiaryName}
                  </p>
                </div>

                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-xs">{transactionResult.transactionId}</span>
                  </div>
                  
                  {transactionResult.blockchainTxHash && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-600">Blockchain TX:</span>
                      <a
                        href={transactionResult.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline flex items-center gap-1 text-xs font-mono"
                      >
                        {transactionResult.blockchainTxHash.substring(0, 8)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Recipient:</span>
                    <span className="font-mono text-xs">
                      {transactionResult.beneficiaryWalletAddress.substring(0, 8)}...
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-yellow-600">
                      {transactionResult.blockchainStatus === 'confirmed' ? 'Confirmed' : 'Pending confirmation'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleStartOver}
                    variant="outline"
                    className="flex-1"
                  >
                    Send Another
                  </Button>
                  <Button
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Transaction Failed"
        message={error}
        type="error"
      />
    </>
  );
}
