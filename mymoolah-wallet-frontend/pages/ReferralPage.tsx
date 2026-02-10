import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Copy, 
  Share2, 
  TrendingUp, 
  Gift, 
  ChevronRight,
  Check,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  UserCheck,
  X
} from 'lucide-react';
import { apiService, ReferralDashboard } from '../services/apiService';

// Modal for displaying referral errors
interface ErrorModal {
  show: boolean;
  title: string;
  message: string;
  type: 'self_referral' | 'user_exists' | 'error';
}

// Format currency
function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Commission rates by level (3 levels, no caps)
const COMMISSION_RATES = [
  { level: 1, rate: '5%' },
  { level: 2, rate: '3%' },
  { level: 3, rate: '2%' }
];

export function ReferralPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<ErrorModal>({ show: false, title: '', message: '', type: 'error' });

  // Fetch referral dashboard
  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getReferralDashboard();
      setDashboard(data);
    } catch (err: any) {
      console.error('Error fetching referral dashboard:', err);
      setError(err.message || 'Failed to load referral data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Copy referral code
  const handleCopyCode = async () => {
    if (!dashboard?.referralCode) return;
    try {
      await navigator.clipboard.writeText(dashboard.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share via native share or WhatsApp
  const handleShare = async () => {
    if (!dashboard) return;
    const shareText = `Join MyMoolah with my referral code: ${dashboard.referralCode}\n\nSign up and start earning! ${dashboard.shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join MyMoolah',
          text: shareText,
          url: dashboard.shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // Send SMS invite
  const handleSendInvite = async () => {
    if (!invitePhone.trim()) return;
    setInviteLoading(true);
    setInviteSuccess(null);
    setInviteError(null);
    try {
      const result = await apiService.sendReferralInvite(invitePhone);
      setInviteSuccess(result.message || 'Invite sent successfully!');
      setInvitePhone('');
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (err: any) {
      // Check for specific error codes and show modal
      const errorData = err.data || err;
      
      if (errorData.errorCode === 'SELF_REFERRAL') {
        setErrorModal({
          show: true,
          title: errorData.title || 'Self-Referral Not Allowed',
          message: errorData.message || 'You cannot send a referral invite to yourself.',
          type: 'self_referral'
        });
        setInvitePhone('');
      } else if (errorData.errorCode === 'USER_EXISTS') {
        setErrorModal({
          show: true,
          title: errorData.title || 'User Already Registered',
          message: errorData.message || 'This phone number is already registered with MyMoolah.',
          type: 'user_exists'
        });
        setInvitePhone('');
      } else {
        setInviteError(err.message || 'Failed to send invite');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const closeErrorModal = () => {
    setErrorModal({ show: false, title: '', message: '', type: 'error' });
  };

  if (isLoading) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        fontFamily: 'Montserrat, sans-serif'
      }}>
        <RefreshCw 
          style={{ 
            width: '32px', 
            height: '32px', 
            color: '#2D8CCA',
            animation: 'spin 1s linear infinite'
          }} 
        />
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading referral data...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        fontFamily: 'Montserrat, sans-serif'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: '#fef2f2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Users style={{ width: '32px', height: '32px', color: '#dc2626' }} />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
          Unable to Load Referrals
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={fetchDashboard}
          style={{
            backgroundColor: '#2D8CCA',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', padding: '16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          Your Earnings Network
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Invite friends and earn when they transact
        </p>
      </div>

      {/* Referral Code Card */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '2px solid #2D8CCA',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Your Referral Code
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <span style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#2D8CCA',
            letterSpacing: '2px',
            fontFamily: 'monospace'
          }}>
            {dashboard?.referralCode || '------'}
          </span>
          <button
            onClick={handleCopyCode}
            style={{
              backgroundColor: copied ? '#16a34a' : '#2D8CCA',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        {/* Share buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleShare}
            style={{
              backgroundColor: '#25D366',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <Users style={{ width: '24px', height: '24px', color: '#2D8CCA', marginBottom: '8px' }} />
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
            {dashboard?.stats?.totalReferrals || 0}
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Referrals</p>
        </div>
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <TrendingUp style={{ width: '24px', height: '24px', color: '#16a34a', marginBottom: '8px' }} />
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
            {formatCurrency(dashboard?.stats?.totalEarnings || 0)}
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Earned</p>
        </div>
      </div>

      {/* Monthly earnings */}
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', marginBottom: '4px' }}>
            This Month
          </p>
          <p style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
            {formatCurrency(dashboard?.stats?.monthlyEarnings || 0)}
          </p>
        </div>
        <Gift style={{ width: '32px', height: '32px', color: '#16a34a' }} />
      </div>

      {/* Referrals by Level */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Your Network
        </h3>
        {COMMISSION_RATES.map(({ level, rate }) => (
          <div 
            key={level}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: level < 4 ? '1px solid #f3f4f6' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: level === 1 ? '#dbeafe' : level === 2 ? '#e0e7ff' : level === 3 ? '#fae8ff' : '#fef3c7',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: level === 1 ? '#2563eb' : level === 2 ? '#4f46e5' : level === 3 ? '#a855f7' : '#d97706'
              }}>
                L{level}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  Level {level}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  {rate} commission on their transactions
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                {dashboard?.stats?.referralsByLevel?.[`level${level}` as keyof typeof dashboard.stats.referralsByLevel] || 0}
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280' }}>referrals</p>
            </div>
          </div>
        ))}
      </div>

      {/* Send Invite */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={20} />
          Invite via SMS
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="tel"
            placeholder="Enter phone number"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'Montserrat, sans-serif'
            }}
          />
          <button
            onClick={handleSendInvite}
            disabled={inviteLoading || !invitePhone.trim()}
            style={{
              backgroundColor: inviteLoading ? '#9ca3af' : '#2D8CCA',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: inviteLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {inviteLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        {inviteSuccess && (
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a' }}>{inviteSuccess}</p>
        )}
        {inviteError && (
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>{inviteError}</p>
        )}
      </div>

      {/* How it works */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
          How It Works
        </h3>
        <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>1.</strong> Share your code with friends
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>2.</strong> They sign up using your code
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>3.</strong> When they make their first transaction, your earnings start
          </p>
          <p>
            <strong>4.</strong> Earn on every transaction they make (up to 3 levels deep!)
          </p>
        </div>
      </div>

      {/* Error Modal */}
      {errorModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            {/* Icon based on error type */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: errorModal.type === 'user_exists' ? '#fef3c7' : '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              {errorModal.type === 'user_exists' ? (
                <UserCheck style={{ width: '32px', height: '32px', color: '#d97706' }} />
              ) : (
                <AlertCircle style={{ width: '32px', height: '32px', color: '#dc2626' }} />
              )}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              {errorModal.title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5',
              marginBottom: '24px'
            }}>
              {errorModal.message}
            </p>

            {/* Close button */}
            <button
              onClick={closeErrorModal}
              style={{
                backgroundColor: '#2D8CCA',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

