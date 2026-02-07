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
  const { user } = useAuth();

  // Check KYC tier on mount  
  useEffect(() => {
    // KYC tier check will be added when user model includes kycTier field
    // For now, all authenticated users can access
  }, [user, navigate]);

  return <BuyUsdcOverlay />;
}
