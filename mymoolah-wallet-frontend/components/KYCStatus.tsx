import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldX, Clock } from 'lucide-react';

interface KYCStatusProps {
  userId: string;
}

interface KYCStatusData {
  kycVerified: boolean;
  kycVerifiedAt?: string;
  kycVerifiedBy?: string;
  walletId?: string;
}

const KYCStatus: React.FC<KYCStatusProps> = ({ userId }) => {
  const [kycStatus, setKycStatus] = useState<KYCStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKYCStatus();
  }, [userId]);

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/kyc/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setKycStatus(data);
      } else {
        setError('Failed to fetch KYC status');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Clock className="h-5 w-5 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-600">Loading KYC status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <ShieldX className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-sm text-red-800">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!kycStatus) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {kycStatus.kycVerified ? (
            <ShieldCheck className="h-6 w-6 text-green-600 mr-3" />
          ) : (
            <Shield className="h-6 w-6 text-yellow-600 mr-3" />
          )}
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              KYC Verification Status
            </h4>
            <p className="text-sm text-gray-600">
              {kycStatus.kycVerified ? 'Verified' : 'Not Verified'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          {kycStatus.kycVerified ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Pending
            </span>
          )}
        </div>
      </div>

      {kycStatus.kycVerified && kycStatus.kycVerifiedAt && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Verified on: {new Date(kycStatus.kycVerifiedAt).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </p>
          {kycStatus.kycVerifiedBy && (
            <p className="text-xs text-gray-500">
              Verified by: {kycStatus.kycVerifiedBy}
            </p>
          )}
        </div>
      )}

      {!kycStatus.kycVerified && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">
            KYC verification is required to enable debit transactions.
          </p>
          <div className="text-xs text-gray-500">
            <p>• Upload your ID document</p>
            <p>• Upload proof of address</p>
            <p>• Wait for AI verification</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCStatus; 