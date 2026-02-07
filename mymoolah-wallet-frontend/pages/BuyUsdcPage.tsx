/**
 * Buy USDC Page
 * 
 * Wrapper page for Buy USDC overlay component
 * Accessed via route: /buy-usdc
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BuyUsdcOverlay } from '../components/overlays/BuyUsdcOverlay';

export default function BuyUsdcPage() {
  const navigate = useNavigate();
  const { user, wallet } = useAuth();

  // Check KYC tier on mount
  useEffect(() => {
    if (user && user.kycTier < 2) {
      // Redirect to KYC if insufficient tier
      navigate('/kyc', {
        state: { message: 'Tier 2 KYC required for USDC Send. Please complete address verification.' }
      });
    }
  }, [user, navigate]);

  const handleClose = () => {
    navigate('/transact');
  };

  return (
    <BuyUsdcOverlay
      isOpen={true}
      onClose={handleClose}
      user={user}
      wallet={wallet}
    />
  );
}
