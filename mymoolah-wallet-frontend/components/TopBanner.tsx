import { User, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TopBanner() {
  const navigate = useNavigate();

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

        {/* Center: MyMoolah Text Logo */}
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 16px'
          }}
        >
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
        </div>

        {/* Right: Notifications Icon */}
        <button 
          onClick={() => alert('Notifications coming soon!')}
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
          {/* Notification badge */}
          <span 
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '10px',
              height: '10px',
              backgroundColor: '#dc2626',
              borderRadius: '50%'
            }}
          />
        </button>
      </div>
    </header>
  );
}