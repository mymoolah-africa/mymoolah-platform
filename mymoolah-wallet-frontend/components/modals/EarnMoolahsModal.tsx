/**
 * Earn Moolahs Modal for Watch to Earn
 * 
 * Modal for viewing and watching video ads to earn wallet credits.
 * Supports Reach ads (video only) and Engagement ads (video + action button).
 * 
 * States:
 * 1. Ad List - Shows available ads
 * 2. Video Player - Plays selected ad
 * 3. Engagement CTA - Shows "I'm Interested" button for Engagement ads
 * 4. Success - Shows reward amount
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { getToken as getSessionToken } from '../../utils/authToken';
import { APP_CONFIG } from '../../config/app-config';

interface AdCampaign {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  adType: 'reach' | 'engagement';
  rewardPerView: number;
  merchant: {
    merchantName: string;
  };
}

interface EarnMoolahsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EarnMoolahsModal({ isOpen, onClose }: EarnMoolahsModalProps) {
  const [state, setState] = useState<'list' | 'playing' | 'engagement' | 'success'>('list');
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [selectedAd, setSelectedAd] = useState<AdCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [earnedAmount, setEarnedAmount] = useState<number>(0);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number>(3);
  
  const videoRef = useRef<HTMLVideoElement>(null);


  // Auto-close after success
  useEffect(() => {
    if (state === 'success') {
      const timer = setInterval(() => {
        setAutoCloseCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setAutoCloseCountdown(3);
    }
  }, [state]);

  // Fetch available ads
  useEffect(() => {
    if (isOpen && state === 'list') {
      fetchAvailableAds();
    }
  }, [isOpen, state]);

  const fetchAvailableAds = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = getSessionToken();
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/ads/available`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available ads');
      }

      const data = await response.json();
      setAds(data.data || []);
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError('Failed to load ads. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAd = async (ad: AdCampaign) => {
    setSelectedAd(ad);
    setError('');

    try {
      const token = getSessionToken();
      
      // Call API to record view start
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/ads/${ad.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `AD_START_${ad.id}_${Date.now()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start ad view');
      }

      const data = await response.json();
      setViewId(data.data.viewId);
      setWatchStartTime(Date.now());
      setState('playing');
    } catch (err: any) {
      console.error('Error starting ad view:', err);
      setError(err.message || 'Failed to start ad. Please try again.');
    }
  };

  const handleVideoEnd = async () => {
    if (!selectedAd || !viewId || !watchStartTime) return;

    try {
      const token = getSessionToken();
      const watchDuration = Math.round((Date.now() - watchStartTime) / 1000);

      // Call API to complete view and claim reward
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/ads/${selectedAd.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `AD_COMPLETE_${selectedAd.id}_${viewId}`
        },
        body: JSON.stringify({
          viewId,
          watchDuration
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle error object or string
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.message || 'Failed to complete ad view';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setEarnedAmount(data.data.rewardAmount);

      // Check if this is an Engagement ad
      if (selectedAd.adType === 'engagement') {
        setState('engagement');
      } else {
        setState('success');
      }
    } catch (err: any) {
      console.error('Error completing ad view:', err);
      // On error, silently reset to list (the reward might have still been credited)
      // Don't show error to user - just refresh the list
      setState('list');
      setSelectedAd(null);
      setViewId(null);
      setWatchStartTime(null);
      setError('');
      fetchAvailableAds(); // Refresh the list
    }
  };

  const handleEngagement = async () => {
    if (!selectedAd || !viewId) return;

    setIsLoading(true);
    setError('');

    try {
      const token = getSessionToken();

      // Call API to record engagement
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/ads/${selectedAd.id}/engage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `AD_ENGAGE_${selectedAd.id}_${viewId}`
        },
        body: JSON.stringify({
          viewId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record engagement');
      }

      const data = await response.json();
      setEarnedAmount(prevAmount => prevAmount + data.data.bonusAmount);
      setState('success');
    } catch (err: any) {
      console.error('Error recording engagement:', err);
      setError(err.message || 'Failed to record engagement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipEngagement = () => {
    setState('success');
  };

  const handleClose = () => {
    setState('list');
    setSelectedAd(null);
    setViewId(null);
    setWatchStartTime(null);
    setEarnedAmount(0);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="earn-moolahs-modal"
        closeButtonStyle={{
          width: '32px',
          height: '32px',
          minWidth: '32px',
          minHeight: '32px',
          borderRadius: '50%',
          backgroundColor: '#f3f4f6',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
          transition: 'all 0.2s ease'
        }}
        style={{
          fontFamily: 'Montserrat, sans-serif',
          maxWidth: '400px',
          width: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '24px',
          paddingBottom: '32px'
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1a1a1a'
            }}
          >
            {state === 'list' && 'Earn Moolahs'}
            {state === 'playing' && selectedAd?.title}
            {state === 'engagement' && "We'd Like to Hear From You"}
            {state === 'success' && 'Success!'}
          </DialogTitle>
          <DialogDescription style={{ display: 'none' }}>
            {state === 'list' && 'Select an ad to watch and earn wallet credits'}
            {state === 'playing' && 'Watch the video to completion to earn your reward'}
            {state === 'engagement' && 'Click to share your details with the merchant and earn a bonus'}
            {state === 'success' && 'Your wallet has been credited successfully'}
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert - only show during active states, not on list view */}
        {error && state !== 'list' && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle style={{ width: '16px', height: '16px', color: '#c00' }} />
            <span style={{ fontSize: '13px', color: '#c00' }}>{error}</span>
          </div>
        )}

        {/* State 1: Ad List */}
        {state === 'list' && (
          <div>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#6b7280' }}>Loading available ads...</p>
              </div>
            ) : ads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>No ads available right now</p>
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>Check back later for new opportunities to earn!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {ads.map(ad => (
                  <Card
                    key={ad.id}
                    onClick={() => handleSelectAd(ad)}
                    style={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      border: '1px solid #e5e7eb'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <CardContent style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #86BE41 0%, #6ba332 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Play style={{ width: '24px', height: '24px', color: 'white', fill: 'white' }} />
                        </div>
                        
                        {/* Ad Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <h4
                              style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#1a1a1a',
                                lineHeight: '1.3',
                                flex: 1,
                                minWidth: 0
                              }}
                            >
                              {ad.title}
                            </h4>
                            <Badge
                              style={{
                                backgroundColor: ad.adType === 'reach' ? '#3b82f6' : '#86BE41',
                                color: 'white',
                                fontSize: '9px',
                                padding: '2px 6px',
                                flexShrink: 0
                              }}
                            >
                              {ad.adType === 'reach' ? 'Reach' : 'Engagement'}
                            </Badge>
                          </div>
                          
                          <p
                            style={{
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: '11px',
                              color: '#6b7280',
                              marginBottom: '8px',
                              lineHeight: '1.4'
                            }}
                          >
                            {ad.description}
                          </p>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
                              <Clock style={{ width: '12px', height: '12px' }} />
                              <span>{ad.durationSeconds}s</span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#86BE41', fontWeight: 600 }}>
                              <DollarSign style={{ width: '12px', height: '12px' }} />
                              <span>Earn R{parseFloat(ad.rewardPerView).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* State 2: Video Player */}
        {state === 'playing' && selectedAd && (
          <div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                backgroundColor: '#000',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <video
                ref={videoRef}
                src={selectedAd.videoUrl}
                controls
                autoPlay
                playsInline
                onCanPlay={() => console.log('Video ready to play:', selectedAd.videoUrl)}
                onEnded={handleVideoEnd}
                onError={(e) => {
                  console.error('Video player error:', e, 'URL:', selectedAd.videoUrl);
                  setError('Video failed to load. Please try again.');
                }}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  display: 'block'
                }}
              />
            </div>
            
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f7e8', borderRadius: '8px' }}>
              <p
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  color: '#4a5568',
                  textAlign: 'center'
                }}
              >
                Watch the entire video to earn <strong style={{ color: '#86BE41' }}>R{parseFloat(selectedAd.rewardPerView).toFixed(2)}</strong>
              </p>
            </div>
          </div>
        )}

        {/* State 3: Engagement CTA */}
        {state === 'engagement' && selectedAd && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #86BE41 0%, #6ba332 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}
            >
              <Users style={{ width: '40px', height: '40px', color: 'white' }} />
            </div>
            
            <h3
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1a1a1a',
                marginBottom: '12px'
              }}
            >
              Interested in {selectedAd.title}?
            </h3>
            
            <p
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '24px',
                lineHeight: '1.6'
              }}
            >
              Click "I'm Interested" below and the merchant will contact you with more information.
              <br />
              <strong style={{ color: '#86BE41' }}>Earn an additional R1.00 bonus!</strong>
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button
                onClick={handleSkipEngagement}
                variant="outline"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px'
                }}
              >
                No Thanks
              </Button>
              
              <Button
                onClick={handleEngagement}
                disabled={isLoading}
                className="wallet-btn-primary"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  backgroundColor: '#86BE41',
                  color: 'white'
                }}
              >
                {isLoading ? 'Processing...' : "I'm Interested"}
              </Button>
            </div>
            
            <p
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '16px'
              }}
            >
              The merchant will receive your name, phone number, and email address.
            </p>
          </div>
        )}

        {/* State 4: Success */}
        {state === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #86BE41 0%, #6ba332 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}
            >
              <CheckCircle style={{ width: '40px', height: '40px', color: 'white' }} />
            </div>
            
            <h3
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#86BE41',
                marginBottom: '12px'
              }}
            >
              You Earned R{earnedAmount.toFixed(2)}!
            </h3>
            
            <p
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '24px'
              }}
            >
              {selectedAd?.adType === 'engagement'
                ? 'Your wallet has been credited and the merchant will contact you soon.'
                : 'Your wallet has been credited instantly.'}
            </p>
            
            <Button
              onClick={handleClose}
              className="wallet-btn-primary"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                backgroundColor: '#86BE41',
                color: 'white',
                width: '100%'
              }}
            >
              Done ({autoCloseCountdown})
            </Button>
            
            <p
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '12px'
              }}
            >
              Closing automatically in {autoCloseCountdown}s...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
