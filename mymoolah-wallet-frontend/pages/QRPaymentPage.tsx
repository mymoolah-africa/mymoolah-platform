import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService, type QRMerchant, type QRValidationResult, type QRPaymentResult } from '../services/apiService';
import { getToken } from '../utils/authToken';
import { APP_CONFIG } from '../config/app-config';
import jsQR from 'jsqr';
import {
  ArrowLeft,
  QrCode,
  Camera,
  Upload,
  Zap,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  X,
  AlertTriangle,
  Scan,
  Target,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';

export function QRPaymentPage() {
  const navigate = useNavigate();
  const { user, requiresKYC } = useAuth();
  
  // QR Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // API Data state
  const [featuredMerchants, setFeaturedMerchants] = useState<QRMerchant[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
  const [qrValidationResult, setQrValidationResult] = useState<QRValidationResult | null>(null);
  const [currentPayment, setCurrentPayment] = useState<QRPaymentResult | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('R0.00');

  // Load featured merchants on component mount
  useEffect(() => {
    loadFeaturedMerchants();
    fetchWalletBalance();
  }, []);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.balance) {
          const balance = parseFloat(data.data.balance);
          const formattedBalance = balance.toLocaleString('en-ZA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          setWalletBalance(`R${formattedBalance}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  };

  // Load featured merchants from API
  const loadFeaturedMerchants = async () => {
    try {
      setIsLoadingMerchants(true);
      setError(null);
      
      const merchants = await apiService.getQRMerchants();
      setFeaturedMerchants(merchants.slice(0, 6)); // Show first 6 merchants
      
    } catch (err) {
      console.error('Error loading merchants:', err);
      setError('Failed to load merchant data. Please try again.');
    } finally {
      setIsLoadingMerchants(false);
    }
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera access failed:', error);
      setError('Unable to access camera. Please check permissions or try uploading a QR code image instead.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setIsScanning(false);
  };

  // Handle QR code scan
  const handleQRScan = async () => {
    setIsScanning(true);
    setError(null);
    await initializeCamera();
  };

  // Process QR code with API
  const processQRCode = async (code: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Validate QR code with backend
      const validationResult = await apiService.validateQRCode(code);
      setQrValidationResult(validationResult);
      
      // If validation successful, initiate payment
      if (validationResult.merchant) {
        const paymentResult = await apiService.initiateQRPayment(
          code,
          validationResult.paymentDetails.amount,
          user?.walletId || 'default',
          validationResult.paymentDetails.reference
        );
        setCurrentPayment(paymentResult);
        
        // Show success message
        alert(`✅ QR Code validated successfully!\n\nMerchant: ${validationResult.merchant.name}\nAmount: R${validationResult.paymentDetails.amount.toFixed(2)}\n\nPayment initiated! Check your transaction history.`);
      }
      
      stopCamera();
      
    } catch (err) {
      console.error('QR processing error:', err);
      setError('Failed to process QR code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle mock QR scan (for demo purposes)
  const handleMockScan = async () => {
    const mockQRCode = 'ZAPPER_woolworths_R125.50';
    await processQRCode(mockQRCode);
  };

  // Handle QR code upload
  const handleQRUpload = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Prefer camera on mobile
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Read the file and process it
          await processUploadedQR(file);
        } catch (error) {
          console.error('QR upload processing failed:', error);
          setError('Failed to process uploaded QR code image. Please try again.');
        }
      }
    };
    
    input.click();
  };

  // Process uploaded QR code image
  const processUploadedQR = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Create a canvas to process the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image on canvas
      ctx?.drawImage(img, 0, 0);
      
      // Get image data for QR code detection
              const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      
      // Try to decode QR code
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
      
        if (code) {
          // QR code found, process it
  
          await processQRCode(code.data);
        } else {
          // No QR code found in image
          setError('No QR code detected in the uploaded image. Please try a different image.');
        }
      }
      
      // Clean up
      URL.revokeObjectURL(img.src);
      
    } catch (error) {
      console.error('QR upload processing error:', error);
      setError('Failed to process uploaded QR code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div 
      style={{
        backgroundColor: '#ffffff',
        fontFamily: 'Montserrat, sans-serif',
        position: 'relative',
        width: '100%'
      }}
    >
      {/* Header */}
      <header 
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
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
          {/* Back Arrow */}
          <button 
            onClick={() => navigate(-1)}
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
              fontFamily: 'Montserrat, sans-serif'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Go back"
          >
            <ArrowLeft style={{ width: '20px', height: '20px', color: '#6b7280' }} />
          </button>

          {/* Title */}
          <div 
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <h1 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '18px',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1f2937',
                margin: 0
              }}
            >
              QR Payment
            </h1>
          </div>

          {/* Wallet Balance Badge */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              height: '44px'
            }}
          >
            <Badge 
              style={{
                backgroundColor: '#86BE41',
                color: '#ffffff',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9.18px',
                fontWeight: '600',
                padding: '3.06px 6.12px',
                borderRadius: '9.18px',
                border: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {walletBalance}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div 
        style={{
          maxWidth: '375px',
          margin: '0 auto',
          padding: '1rem',
          paddingBottom: '120px' // Increased space for bottom navigation
        }}
      >
        {/* Camera Scanner View */}
        {showCamera ? (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '375px',
              height: '100vh',
              backgroundColor: '#000000',
              zIndex: 45,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Camera Header */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: '#ffffff'
              }}
            >
              <h2 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#ffffff',
                  margin: 0
                }}
              >
                Scan QR Code
              </h2>
              <button
                onClick={stopCamera}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Camera View */}
            <div 
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              
              {/* Scanning Overlay */}
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '250px',
                  height: '250px',
                  border: '2px solid #86BE41',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(134, 190, 65, 0.1)'
                }}
              >
                <div 
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    width: '30px',
                    height: '30px',
                    borderTop: '4px solid #86BE41',
                    borderLeft: '4px solid #86BE41'
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '30px',
                    height: '30px',
                    borderTop: '4px solid #86BE41',
                    borderRight: '4px solid #86BE41'
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    width: '30px',
                    height: '30px',
                    borderBottom: '4px solid #86BE41',
                    borderLeft: '4px solid #86BE41'
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    width: '30px',
                    height: '30px',
                    borderBottom: '4px solid #86BE41',
                    borderRight: '4px solid #86BE41'
                  }}
                />
              </div>
            </div>

            {/* Camera Controls */}
            <div 
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <p 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  color: '#ffffff',
                  textAlign: 'center',
                  margin: 0
                }}
              >
                Position the QR code within the frame
              </p>
              
              {/* Demo Scan Button */}
              <Button
                onClick={handleMockScan}
                disabled={isProcessing}
                style={{
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--mobile-border-radius)',
                  padding: '12px 24px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  minHeight: 'var(--mobile-touch-target)'
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    Demo Scan
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Error Alert */}
            {error && (
              <Alert 
                style={{
                  borderRadius: 'var(--mobile-border-radius)',
                  border: '1px solid #ef4444',
                  backgroundColor: '#fef2f2',
                  marginBottom: '1rem'
                }}
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <p 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'var(--mobile-font-base)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: '#dc2626',
                      margin: 0
                    }}
                  >
                    {error}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Hero Section */}
            <div className="text-center mb-6">
              <div 
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 1rem',
                  background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <QrCode className="w-10 h-10 text-white" />
              </div>
              
              <h2 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#1f2937',
                  marginBottom: '0.5rem'
                }}
              >
                Scan QR Code to Pay!
              </h2>
              
              <p 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-normal)',
                  color: '#6b7280',
                  marginBottom: '1.5rem'
                }}
              >
                Pay at thousands of Zapper merchants across South Africa
              </p>
            </div>

            {/* Scan Options */}
            <div className="space-y-4 mb-6">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200"
                style={{ 
                  borderRadius: 'var(--mobile-border-radius)',
                  border: '2px solid #86BE41',
                  background: 'linear-gradient(135deg, #86BE41/5 0%, #2D8CCA/5 100%)'
                }}
                onClick={handleQRScan}
                title={!navigator.mediaDevices?.getUserMedia ? 'Camera not supported in this browser' : 'Scan QR code with camera'}
              >
                <CardContent style={{ padding: '1.5rem' }}>
                  <div className="flex items-center gap-4">
                    <div 
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#1f2937',
                          marginBottom: '0.25rem'
                        }}
                      >
                        Scan with Camera
                      </h3>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-normal)',
                          color: '#6b7280',
                          margin: 0
                        }}
                      >
                        {typeof navigator.mediaDevices?.getUserMedia === 'function' ? 
                          'Point your camera at a QR code'
                          : 'Camera not supported - use upload instead'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200"
                style={{ borderRadius: 'var(--mobile-border-radius)' }}
                onClick={isProcessing ? undefined : handleQRUpload}
              >
                <CardContent style={{ padding: '1rem' }}>
                  <div className="flex items-center gap-3">
                    <div 
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: isProcessing ? '#9ca3af' : '#2D8CCA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: isProcessing ? '#6b7280' : '#1f2937',
                          marginBottom: '0.25rem'
                        }}
                      >
                        {isProcessing ? 'Processing...' : 'Upload QR Code'}
                      </h4>
                      <p 
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-normal)',
                          color: '#6b7280',
                          margin: 0
                        }}
                      >
                        {isProcessing ? 'Decoding QR code...' : 'Select from gallery'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coming Soon Alert */}
            <Alert 
              style={{
                borderRadius: 'var(--mobile-border-radius)',
                border: '1px solid #f59e0b',
                backgroundColor: '#fef3c7',
                marginBottom: '1.5rem'
              }}
            >
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <p 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: '#92400e',
                    margin: 0
                  }}
                >
                  QR Code payments are coming soon! We're integrating with Zapper to bring you seamless QR payments at thousands of merchants.
                </p>
              </AlertDescription>
            </Alert>

            {/* Featured Merchants */}
            <div className="mb-6">
              <h3 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}
              >
                Featured Zapper Merchants
              </h3>
              
              {isLoadingMerchants ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-#86BE41" />
                  <span className="ml-2 text-gray-600">Loading merchants...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {featuredMerchants.map((merchant) => (
                    <Card 
                      key={merchant.id}
                      style={{ borderRadius: 'var(--mobile-border-radius)' }}
                    >
                      <CardContent style={{ padding: '1rem', textAlign: 'center' }}>
                        <div 
                          style={{
                            fontSize: '2rem',
                            marginBottom: '0.5rem'
                          }}
                        >
                          {merchant.logo}
                        </div>
                        <h4 
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: 'var(--mobile-font-base)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: '#1f2937',
                            marginBottom: '0.25rem'
                          }}
                        >
                          {merchant.name}
                        </h4>
                        <p 
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: 'var(--mobile-font-small)',
                            fontWeight: 'var(--font-weight-normal)',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}
                        >
                          {merchant.category}
                        </p>
                        <p 
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '10px',
                            fontWeight: 'var(--font-weight-medium)',
                            color: '#86BE41',
                            margin: 0
                          }}
                        >
                          {merchant.locations}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Benefits Section */}
            <Card style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardHeader>
                <CardTitle 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Zap className="w-5 h-5 text-#86BE41" />
                  Why QR Payments?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        color: '#1f2937',
                        margin: 0
                      }}
                    >
                      Instant payments - no cash or cards needed
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        color: '#1f2937',
                        margin: 0
                      }}
                    >
                      Secure transactions with MyMoolah protection
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        color: '#1f2937',
                        margin: 0
                      }}
                    >
                      Works at thousands of merchants nationwide
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        color: '#1f2937',
                        margin: 0
                      }}
                    >
                      Automatic transaction history and receipts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}