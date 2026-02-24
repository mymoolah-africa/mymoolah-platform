import React, { useState, useEffect } from 'react';
import { X, Wallet, Building2, Globe, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { beneficiaryService } from '../../../services/beneficiaryService';

const SA_BANKS = [
  { name: 'ABSA Bank', branchCode: '632005' },
  { name: 'African Bank', branchCode: '430000' },
  { name: 'Bidvest Bank', branchCode: '462005' },
  { name: 'Capitec Bank', branchCode: '470010' },
  { name: 'Discovery Bank', branchCode: '679000' },
  { name: 'First National Bank', branchCode: '250655' },
  { name: 'Investec Bank', branchCode: '580105' },
  { name: 'Nedbank', branchCode: '198765' },
  { name: 'Postbank', branchCode: '460005' },
  { name: 'Standard Bank', branchCode: '051001' },
  { name: 'TymeBank', branchCode: '678910' },
];

// Supported MoolahMove corridors — populated from Yellow Card /channels at runtime.
// This static list is used as a fallback / for UI display before API call.
const MOOLAHMOVE_COUNTRIES = [
  { code: 'MW', name: 'Malawi', currency: 'MWK', flag: '🇲🇼' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL', flag: '🇿🇼' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', flag: '🇿🇲' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', flag: '🇺🇬' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', flag: '🇷🇼' },
];

// Payment channels per country — will be fetched from Yellow Card API in Phase 2.
// Static fallback for Phase 0/1.
const CHANNELS_BY_COUNTRY: Record<string, Array<{ id: string; name: string; type: 'mobile_money' | 'bank_transfer' }>> = {
  MW: [
    { id: 'mw-airtel-mobile', name: 'Airtel Money', type: 'mobile_money' },
    { id: 'mw-tnm-mobile', name: 'TNM Mpamba', type: 'mobile_money' },
    { id: 'mw-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  KE: [
    { id: 'ke-mpesa-mobile', name: 'M-Pesa', type: 'mobile_money' },
    { id: 'ke-airtel-mobile', name: 'Airtel Money', type: 'mobile_money' },
    { id: 'ke-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  ZW: [
    { id: 'zw-ecocash-mobile', name: 'EcoCash', type: 'mobile_money' },
    { id: 'zw-onemoney-mobile', name: 'OneMoney', type: 'mobile_money' },
    { id: 'zw-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  ZM: [
    { id: 'zm-airtel-mobile', name: 'Airtel Money', type: 'mobile_money' },
    { id: 'zm-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money' },
    { id: 'zm-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  TZ: [
    { id: 'tz-mpesa-mobile', name: 'M-Pesa', type: 'mobile_money' },
    { id: 'tz-airtel-mobile', name: 'Airtel Money', type: 'mobile_money' },
    { id: 'tz-tigo-mobile', name: 'Tigo Pesa', type: 'mobile_money' },
    { id: 'tz-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  UG: [
    { id: 'ug-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money' },
    { id: 'ug-airtel-mobile', name: 'Airtel Money', type: 'mobile_money' },
    { id: 'ug-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  NG: [
    { id: 'ng-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  GH: [
    { id: 'gh-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money' },
    { id: 'gh-vodafone-mobile', name: 'Vodafone Cash', type: 'mobile_money' },
    { id: 'gh-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
  RW: [
    { id: 'rw-mtn-mobile', name: 'MTN MoMo', type: 'mobile_money' },
    { id: 'rw-airtel-mobile', name: 'Airtel Money', type: 'mobile_money' },
    { id: 'rw-bank', name: 'Bank Transfer', type: 'bank_transfer' },
  ],
};

export interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaryId: string | number;
  beneficiaryName: string;
  onSuccess: () => void;
}

type AccountTypeTab = 'mymoolah' | 'bank' | 'international';

export function AddAccountModal({
  isOpen,
  onClose,
  beneficiaryId,
  beneficiaryName,
  onSuccess,
}: AddAccountModalProps) {
  const [tab, setTab] = useState<AccountTypeTab>('mymoolah');

  // MyMoolah wallet fields
  const [mobileNumber, setMobileNumber] = useState('');

  // Bank account fields
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // International (MoolahMove) fields
  const [intlCountry, setIntlCountry] = useState('');
  const [intlChannelId, setIntlChannelId] = useState('');
  const [intlAccountNumber, setIntlAccountNumber] = useState('');
  const [intlAccountName, setIntlAccountName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const availableChannels = intlCountry ? (CHANNELS_BY_COUNTRY[intlCountry] || []) : [];
  const selectedChannel = availableChannels.find(c => c.id === intlChannelId);
  const selectedCountry = MOOLAHMOVE_COUNTRIES.find(c => c.code === intlCountry);

  useEffect(() => {
    if (isOpen) {
      setTab('mymoolah');
      setMobileNumber('');
      setBankName('');
      setAccountNumber('');
      setIntlCountry('');
      setIntlChannelId('');
      setIntlAccountNumber('');
      setIntlAccountName('');
      setError('');
    }
  }, [isOpen]);

  // Reset channel when country changes
  useEffect(() => {
    setIntlChannelId('');
    setIntlAccountNumber('');
  }, [intlCountry]);

  const normalizeMobile = (v: string): string => {
    const digits = v.replace(/\D/g, '');
    if (digits.startsWith('27') && digits.length === 11) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`;
    if (digits.length === 9) return `+27${digits}`;
    return v;
  };

  const handleSubmit = async () => {
    setError('');

    if (tab === 'mymoolah') {
      if (!mobileNumber.trim()) {
        setError('Mobile number is required');
        return;
      }
      const normalized = normalizeMobile(mobileNumber.trim());
      if (!/^\+27[6-8]\d{8}$/.test(normalized)) {
        setError('Please enter a valid South African mobile number (e.g. 078 123 4567)');
        return;
      }
      setIsLoading(true);
      try {
        await beneficiaryService.addServiceToBeneficiary(Number(beneficiaryId), {
          serviceType: 'mymoolah',
          serviceData: { walletMsisdn: normalized, isDefault: false },
        });
        onSuccess();
        onClose();
      } catch (e: any) {
        setError(e?.message || 'Failed to add wallet account');
      } finally {
        setIsLoading(false);
      }

    } else if (tab === 'bank') {
      if (!bankName) {
        setError('Please select a bank');
        return;
      }
      if (!accountNumber.trim() || !/^\d{8,12}$/.test(accountNumber.trim())) {
        setError('Account number must be 8–12 digits');
        return;
      }
      const bank = SA_BANKS.find(b => b.name === bankName);
      setIsLoading(true);
      try {
        await beneficiaryService.addServiceToBeneficiary(Number(beneficiaryId), {
          serviceType: 'bank',
          serviceData: {
            bankName,
            accountNumber: accountNumber.trim(),
            accountType: 'cheque',
            branchCode: bank?.branchCode || '000000',
            isDefault: false,
          },
        });
        onSuccess();
        onClose();
      } catch (e: any) {
        setError(e?.message || 'Failed to add bank account');
      } finally {
        setIsLoading(false);
      }

    } else {
      // International (MoolahMove)
      if (!intlCountry) {
        setError('Please select a country');
        return;
      }
      if (!intlChannelId) {
        setError('Please select a payment method');
        return;
      }
      if (!intlAccountName.trim() || intlAccountName.trim().length < 2) {
        setError('Recipient name is required');
        return;
      }
      if (!intlAccountNumber.trim()) {
        setError(selectedChannel?.type === 'mobile_money'
          ? 'Mobile number is required'
          : 'Account number is required');
        return;
      }
      setIsLoading(true);
      try {
        await beneficiaryService.addServiceToBeneficiary(Number(beneficiaryId), {
          serviceType: 'international',
          serviceData: {
            channelId: intlChannelId,
            country: intlCountry,
            currency: selectedCountry?.currency || '',
            paymentMethod: selectedChannel?.type || 'mobile_money',
            provider: selectedChannel?.name || '',
            accountNumber: intlAccountNumber.trim(),
            accountName: intlAccountName.trim(),
            isDefault: false,
          },
        });
        onSuccess();
        onClose();
      } catch (e: any) {
        setError(e?.message || 'Failed to add international account');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fontStyle = { fontFamily: 'Montserrat, sans-serif' };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto" aria-describedby="add-account-desc">
        <DialogHeader>
          <DialogTitle style={fontStyle}>
            Add Account
          </DialogTitle>
          <DialogDescription id="add-account-desc" style={fontStyle}>
            Add an account to <strong>{beneficiaryName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab selector — 3 columns */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={tab === 'mymoolah' ? 'default' : 'outline'}
              onClick={() => { setTab('mymoolah'); setError(''); }}
              className={`h-14 flex-col gap-1 ${tab === 'mymoolah' ? 'bg-[#86BE41] text-white border-[#86BE41]' : 'border-gray-200'}`}
            >
              <Wallet className="w-4 h-4" />
              <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif' }}>MM Wallet</span>
            </Button>
            <Button
              variant={tab === 'bank' ? 'default' : 'outline'}
              onClick={() => { setTab('bank'); setError(''); }}
              className={`h-14 flex-col gap-1 ${tab === 'bank' ? 'bg-[#2D8CCA] text-white border-[#2D8CCA]' : 'border-gray-200'}`}
            >
              <Building2 className="w-4 h-4" />
              <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif' }}>Bank</span>
            </Button>
            <Button
              variant={tab === 'international' ? 'default' : 'outline'}
              onClick={() => { setTab('international'); setError(''); }}
              className={`h-14 flex-col gap-1 ${tab === 'international' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'border-gray-200'}`}
            >
              <Globe className="w-4 h-4" />
              <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif' }}>MoolahMove</span>
            </Button>
          </div>

          {/* MyMoolah wallet fields */}
          {tab === 'mymoolah' && (
            <div>
              <Label style={fontStyle}>
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 078 123 4567"
                value={mobileNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMobileNumber(e.target.value)}
                style={{ ...fontStyle, height: '44px', marginTop: '6px' }}
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1" style={fontStyle}>
                The beneficiary's MyMoolah mobile number
              </p>
            </div>
          )}

          {/* Bank account fields */}
          {tab === 'bank' && (
            <div className="space-y-3">
              <div>
                <Label style={fontStyle}>
                  Bank <span className="text-red-500">*</span>
                </Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger style={{ height: '44px', ...fontStyle, marginTop: '6px' }}>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {SA_BANKS.map((b) => (
                      <SelectItem key={b.name} value={b.name} style={fontStyle}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={fontStyle}>
                  Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="8–12 digit account number"
                  value={accountNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  style={{ ...fontStyle, height: '44px', marginTop: '6px' }}
                  className="font-mono"
                  maxLength={12}
                />
              </div>
            </div>
          )}

          {/* International (MoolahMove) fields */}
          {tab === 'international' && (
            <div className="space-y-3">
              {/* MoolahMove badge */}
              <div style={{
                background: 'linear-gradient(135deg, #F59E0B15, #F59E0B08)',
                border: '1px solid #F59E0B40',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Globe style={{ width: '14px', height: '14px', color: '#F59E0B', flexShrink: 0 }} />
                <p style={{ ...fontStyle, fontSize: '11px', color: '#92400E', margin: 0 }}>
                  Send money internationally via <strong>MoolahMove</strong>. Recipient receives local currency.
                </p>
              </div>

              {/* Country */}
              <div>
                <Label style={fontStyle}>
                  Country <span className="text-red-500">*</span>
                </Label>
                <Select value={intlCountry} onValueChange={setIntlCountry}>
                  <SelectTrigger style={{ height: '44px', ...fontStyle, marginTop: '6px' }}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOOLAHMOVE_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} style={fontStyle}>
                        {c.flag} {c.name} ({c.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment method — only show once country selected */}
              {intlCountry && (
                <div>
                  <Label style={fontStyle}>
                    Payment Method <span className="text-red-500">*</span>
                  </Label>
                  <Select value={intlChannelId} onValueChange={setIntlChannelId}>
                    <SelectTrigger style={{ height: '44px', ...fontStyle, marginTop: '6px' }}>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChannels.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id} style={fontStyle}>
                          {ch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Account details — only show once channel selected */}
              {intlChannelId && (
                <>
                  <div>
                    <Label style={fontStyle}>
                      Recipient Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Full name as on account"
                      value={intlAccountName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIntlAccountName(e.target.value)}
                      style={{ ...fontStyle, height: '44px', marginTop: '6px' }}
                    />
                  </div>
                  <div>
                    <Label style={fontStyle}>
                      {selectedChannel?.type === 'mobile_money' ? 'Mobile Number' : 'Account Number'}
                      {' '}<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder={selectedChannel?.type === 'mobile_money'
                        ? 'e.g. +265 99 123 4567'
                        : 'Bank account number'}
                      value={intlAccountNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIntlAccountNumber(e.target.value)}
                      style={{ ...fontStyle, height: '44px', marginTop: '6px' }}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1" style={fontStyle}>
                      {selectedChannel?.type === 'mobile_money'
                        ? `${selectedChannel.name} registered number in ${selectedCountry?.name}`
                        : `Bank account number in ${selectedCountry?.name}`}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600" style={fontStyle}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
              style={fontStyle}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 text-white"
              style={{
                ...fontStyle,
                background: tab === 'international'
                  ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                  : 'linear-gradient(135deg, #86BE41, #2D8CCA)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Account'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
