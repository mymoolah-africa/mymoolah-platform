import React, { useState, useEffect } from 'react';
import { X, Wallet, Building2, Loader2 } from 'lucide-react';
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

export interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaryId: string | number;
  beneficiaryName: string;
  onSuccess: () => void;
}

type AccountTypeTab = 'mymoolah' | 'bank';

export function AddAccountModal({
  isOpen,
  onClose,
  beneficiaryId,
  beneficiaryName,
  onSuccess,
}: AddAccountModalProps) {
  const [tab, setTab] = useState<AccountTypeTab>('mymoolah');
  const [mobileNumber, setMobileNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTab('mymoolah');
      setMobileNumber('');
      setBankName('');
      setAccountNumber('');
      setError('');
    }
  }, [isOpen]);

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
    } else {
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
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto" aria-describedby="add-account-desc">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Add Account
          </DialogTitle>
          <DialogDescription id="add-account-desc" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Add a wallet or bank account to <strong>{beneficiaryName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab selector */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={tab === 'mymoolah' ? 'default' : 'outline'}
              onClick={() => { setTab('mymoolah'); setError(''); }}
              className={`h-14 flex-col gap-1 ${tab === 'mymoolah' ? 'bg-[#86BE41] text-white border-[#86BE41]' : 'border-gray-200'}`}
            >
              <Wallet className="w-4 h-4" />
              <span style={{ fontSize: '12px', fontFamily: 'Montserrat, sans-serif' }}>MyMoolah Wallet</span>
            </Button>
            <Button
              variant={tab === 'bank' ? 'default' : 'outline'}
              onClick={() => { setTab('bank'); setError(''); }}
              className={`h-14 flex-col gap-1 ${tab === 'bank' ? 'bg-[#2D8CCA] text-white border-[#2D8CCA]' : 'border-gray-200'}`}
            >
              <Building2 className="w-4 h-4" />
              <span style={{ fontSize: '12px', fontFamily: 'Montserrat, sans-serif' }}>Bank Account</span>
            </Button>
          </div>

          {/* MyMoolah wallet fields */}
          {tab === 'mymoolah' && (
            <div>
              <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 078 123 4567"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                style={{ fontFamily: 'Montserrat, sans-serif', height: '44px', marginTop: '6px' }}
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                The beneficiary's MyMoolah mobile number
              </p>
            </div>
          )}

          {/* Bank account fields */}
          {tab === 'bank' && (
            <div className="space-y-3">
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Bank <span className="text-red-500">*</span>
                </Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger style={{ height: '44px', fontFamily: 'Montserrat, sans-serif', marginTop: '6px' }}>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {SA_BANKS.map((b) => (
                      <SelectItem key={b.name} value={b.name} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="8–12 digit account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  style={{ fontFamily: 'Montserrat, sans-serif', height: '44px', marginTop: '6px' }}
                  className="font-mono"
                  maxLength={12}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] text-white"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
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
