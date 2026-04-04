import { User, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMoolah } from '../contexts/MoolahContext';
import logoSvg from '../assets/logo.svg';

export function TopBanner() {
  const navigate = useNavigate();
  const { unreadCount, notifications, markRead, blockingNotification, respondToPaymentRequest, refreshNotifications } = useMoolah();
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Allow runtime toggle without code changes:
  // localStorage.setItem('brand_wordmark', '1') -> use text wordmark
  // localStorage.removeItem('brand_wordmark')   -> use SVG logo
  const preferWordmark = typeof window !== 'undefined' && localStorage.getItem('brand_wordmark') === '1';

  return (
    <header 
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'block',
        minHeight: '64px',
        fontFamily: 'Montserrat, sans-serif'
      }}
    >
      <div 
        style={{
          maxWidth: '375px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          padding: '0 16px'
        }}
      >
        {/* Left: Profile Icon */}
        <button 
          onClick={() => navigate('/profile')}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            padding: '0',
            minHeight: '44px',
            minWidth: '44px',
            fontFamily: 'Montserrat, sans-serif'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label="Profile and Settings"
        >
          <User style={{ width: '20px', height: '20px', color: '#6b7280' }} />
        </button>

        {/* Center: MyMoolah brand (SVG with graceful fallback to gradient wordmark) */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 16px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
            fontFamily: 'Montserrat, sans-serif'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          aria-label="Home"
        >
          {(!preferWordmark && !logoFailed) ? (
            <img
              src={logoSvg}
              alt="MyMoolah"
              onError={() => setLogoFailed(true)}
              style={{
                height: 48, // Double the previous size (24px -> 48px)
                display: 'block'
              }}
            />
          ) : (
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1f2937',
                fontFamily: 'Montserrat, sans-serif',
                background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              MyMoolah
            </div>
          )}
        </button>

        {/* Right: Notifications Icon */}
        <button 
          onClick={async () => {
            // Option 1: Auto-refresh notifications when bell is clicked
            await refreshNotifications();
            setOpen(true);
          }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background-color 0.2s ease',
            padding: '0',
            minHeight: '44px',
            minWidth: '44px',
            fontFamily: 'Montserrat, sans-serif'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label="Notifications"
        >
          <Bell style={{ width: '20px', height: '20px', color: '#6b7280' }} />
          {unreadCount > 0 && (
            <span 
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '10px',
                height: '10px',
                backgroundColor: '#dc2626',
                borderRadius: '50%',
                animation: 'pulse 1.2s infinite'
              }}
            />
          )}
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 55,
            animation: 'notifOverlayIn 0.2s ease-out'
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 375,
              margin: '0 auto',
              paddingTop: 64,
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                pointerEvents: 'auto',
                background: '#ffffff',
                borderRadius: '0 0 16px 16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                maxHeight: 'calc(100vh - 140px)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'notifSlideDown 0.25s ease-out',
                fontFamily: 'Montserrat, sans-serif',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px 10px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Notifications</h3>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    color: '#6b7280',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                  aria-label="Close notifications"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ overflowY: 'auto', padding: '4px 0' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#9ca3af'
                  }}>
                    <Bell style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: 14 }}>You're all caught up.</p>
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {notifications.map(n => {
                      const isKYC = (n.title || '').toLowerCase().includes('kyc');
                      const isPayment = (n.title || '').toLowerCase().includes('payment') || (n.title || '').toLowerCase().includes('money');
                      const dotColor = isKYC ? '#16a34a' : isPayment ? '#2D8CCA' : '#86BE41';
                      return (
                        <li
                          key={n.id}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f8fafc',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            transition: 'background 0.15s',
                            cursor: 'pointer'
                          }}
                          onClick={() => { markRead(n.id); setOpen(false); }}
                        >
                          <div style={{
                            width: 10, height: 10,
                            borderRadius: '50%',
                            backgroundColor: dotColor,
                            marginTop: 5,
                            flexShrink: 0
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', marginBottom: 2 }}>{n.title}</div>
                            {n.message && (
                              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4, marginBottom: 4 }}>{n.message}</div>
                            )}
                            <div style={{ fontSize: 11, color: '#d1d5db' }}>{new Date(n.createdAt).toLocaleString('en-ZA')}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocking overlay for payment requests (freezeUntilViewed) */}
      {blockingNotification && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 360, margin: '0 16px', background: '#fff', borderRadius: 12, padding: 16, fontFamily: 'Montserrat, sans-serif' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>{blockingNotification.title || 'Payment Request'}</h3>
            {blockingNotification.message && <p style={{ color: '#374151', marginTop: 0 }}>{blockingNotification.message}</p>}
            {blockingNotification.payload && (
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Amount</span>
                  <strong>R{Number(blockingNotification.payload.amount || 0).toFixed(2)}</strong>
                </div>
                {blockingNotification.payload.description && (
                  <div style={{ marginTop: 6, color: '#6b7280' }}>{blockingNotification.payload.description}</div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => respondToPaymentRequest(Number(blockingNotification.payload?.requestId), 'decline', blockingNotification.id)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Decline</button>
              <button onClick={() => respondToPaymentRequest(Number(blockingNotification.payload?.requestId), 'approve', blockingNotification.id)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)', color: '#fff', cursor: 'pointer' }}>Approve</button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes pulse { 0%{ transform: scale(1); opacity: .8 } 50%{ transform: scale(1.3); opacity: 1 } 100%{ transform: scale(1); opacity: .8 } }
          @keyframes notifOverlayIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes notifSlideDown { from { opacity: 0; transform: translateY(-12px) } to { opacity: 1; transform: translateY(0) } }
        `}
      </style>
    </header>
  );
}