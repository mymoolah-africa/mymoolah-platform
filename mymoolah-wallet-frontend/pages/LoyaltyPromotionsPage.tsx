/**
 * Loyalty & Promotions Page
 * 
 * Main landing page for loyalty programs, promotions, and Watch to Earn feature.
 * Contains 3 buttons: Loyalty (disabled), Promotions (disabled), Earn Moolahs (active).
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Gift,
  Star,
  Play,
  ArrowLeft,
  Lock
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import BottomNavigation from '../components/BottomNavigation';
import logo3 from "../assets/logo3.svg";
import EarnMoolahsModal from '../components/modals/EarnMoolahsModal';

export function LoyaltyPromotionsPage() {
  const navigate = useNavigate();
  const [showEarnModal, setShowEarnModal] = useState(false);

  return (
    <div
      style={{
        fontFamily: 'Montserrat, sans-serif',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Banner (Sticky) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #86BE41 0%, #6ba332 100%)',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '8px'
          }}
        >
          <ArrowLeft style={{ width: '24px', height: '24px' }} />
        </button>

        {/* Logo */}
        <img 
          src={logo3} 
          alt="MyMoolah Logo" 
          style={{
            height: '32px',
            width: 'auto'
          }}
        />

        {/* Spacer */}
        <div style={{ width: '40px' }} />
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: '20px',
          marginBottom: '80px'
        }}
      >
        {/* Page Title */}
        <h1
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            marginBottom: '8px'
          }}
        >
          Loyalty & Promotions
        </h1>
        
        <p
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '24px'
          }}
        >
          Earn rewards, enjoy promotions, and grow your Moolahs
        </p>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px'
          }}
        >
          {/* Loyalty Card (Coming Soon) */}
          <Card style={{ opacity: 0.6 }}>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ddd 0%, #ccc 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Star style={{ width: '28px', height: '28px', color: 'white' }} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#1a1a1a'
                      }}
                    >
                      Loyalty
                    </h3>
                    <Badge
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        fontSize: '10px',
                        padding: '2px 8px'
                      }}
                    >
                      Coming Soon
                    </Badge>
                  </div>
                  
                  <p
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '13px',
                      color: '#6b7280'
                    }}
                  >
                    Earn points on every transaction
                  </p>
                </div>
                
                <Lock style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              </div>
            </CardContent>
          </Card>

          {/* Promotions Card (Coming Soon) */}
          <Card style={{ opacity: 0.6 }}>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ddd 0%, #ccc 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Gift style={{ width: '28px', height: '28px', color: 'white' }} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#1a1a1a'
                      }}
                    >
                      Promotions
                    </h3>
                    <Badge
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        fontSize: '10px',
                        padding: '2px 8px'
                      }}
                    >
                      Coming Soon
                    </Badge>
                  </div>
                  
                  <p
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '13px',
                      color: '#6b7280'
                    }}
                  >
                    Exclusive deals and discounts
                  </p>
                </div>
                
                <Lock style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              </div>
            </CardContent>
          </Card>

          {/* Earn Moolahs Card (Active) */}
          <Card
            onClick={() => setShowEarnModal(true)}
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: '2px solid #86BE41'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(134, 190, 65, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #86BE41 0%, #6ba332 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Play style={{ width: '28px', height: '28px', color: 'white', fill: 'white' }} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#1a1a1a',
                      marginBottom: '4px'
                    }}
                  >
                    Earn Moolahs
                  </h3>
                  
                  <p
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '13px',
                      color: '#6b7280'
                    }}
                  >
                    Watch videos and earn R2.00 - R3.00
                  </p>
                </div>
                
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#86BE41',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Play style={{ width: '20px', height: '20px', color: 'white', fill: 'white' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            backgroundColor: '#f0f7e8',
            borderRadius: '12px',
            border: '1px solid #86BE41'
          }}
        >
          <h4
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: '#86BE41',
              marginBottom: '8px'
            }}
          >
            How It Works
          </h4>
          
          <ul
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '13px',
              color: '#4a5568',
              lineHeight: '1.8',
              paddingLeft: '20px'
            }}
          >
            <li>Watch 20-30 second video ads</li>
            <li>Earn R2.00 for each Reach ad</li>
            <li>Earn R3.00 for each Engagement ad (includes R1.00 bonus)</li>
            <li>Rewards credited instantly to your wallet</li>
            <li>Maximum 5 ads per hour</li>
          </ul>
        </div>
      </div>

      {/* Bottom Navigation (Sticky) */}
      <BottomNavigation />

      {/* Earn Moolahs Modal */}
      {showEarnModal && (
        <EarnMoolahsModal
          isOpen={showEarnModal}
          onClose={() => setShowEarnModal(false)}
        />
      )}
    </div>
  );
}
