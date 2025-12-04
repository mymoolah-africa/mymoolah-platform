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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { isOperaMini, isCameraSupported } from '../utils/browserSupport';

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
  const scanIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // API Data state
  const [featuredMerchants, setFeaturedMerchants] = useState<QRMerchant[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);
  const [qrValidationResult, setQrValidationResult] = useState<QRValidationResult | null>(null);
  const [currentPayment, setCurrentPayment] = useState<QRPaymentResult | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('R0.00');
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false); // Track if payment was successful for auto-navigation
  const [confirmAmount, setConfirmAmount] = useState<string>('');
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    qrCode: string;
    amount: number;
    merchant: QRMerchant;
    reference: string | null;
    tipEnabled?: boolean;
    defaultTipPercent?: number | null;
    referenceEditable?: boolean;
    customReferenceLabel?: string | null;
  } | null>(null);
  const [tipAmount, setTipAmount] = useState<string>('');
  const [selectedTipPercent, setSelectedTipPercent] = useState<number | null>(null); // 5, 10, 15, 20 or null
  const [customReference, setCustomReference] = useState<string>('');

  // Helper functions to determine field visibility based on QR type
  const shouldShowAmountField = (): boolean => {
    if (!pendingPaymentData) return false;
    const hasPrePopulatedAmount = pendingPaymentData.amount > 0;
    const isTipEnabled = pendingPaymentData.tipEnabled || false;
    
    // Show amount field when:
    // 1. Amount is 0 (no pre-population, user must enter)
    // 2. Tip is enabled (makes amount editable even if pre-populated)
    // Hide when: amount is pre-populated AND tip is not enabled (non-editable)
    return !hasPrePopulatedAmount || isTipEnabled;
  };

  const shouldShowTipField = (): boolean => {
    return pendingPaymentData?.tipEnabled || false;
  };

  const shouldShowReferenceField = (): boolean => {
    // Show reference field only when it's editable (custom reference)
    return pendingPaymentData?.referenceEditable || false;
  };

  const shouldShowReferenceInSummary = (): boolean => {
    // Show reference in summary when it exists (static or custom)
    return !!pendingPaymentData?.reference;
  };

  const getReferenceLabel = (): string => {
    if (!pendingPaymentData) return 'REFERENCE';
    if (pendingPaymentData.referenceEditable && pendingPaymentData.customReferenceLabel) {
      return pendingPaymentData.customReferenceLabel.toUpperCase();
    }
    return 'REFERENCE';
  };

  const getDisplayAmount = (): string => {
    if (!pendingPaymentData) return '0.00';
    // Use confirmAmount if set, otherwise use pre-populated amount
    if (confirmAmount) {
      return parseFloat(confirmAmount).toFixed(2);
    }
    return pendingPaymentData.amount ? pendingPaymentData.amount.toFixed(2) : '0.00';
  };

  const getBaseAmount = (): number => {
    return parseFloat(confirmAmount || '0') || pendingPaymentData?.amount || 0;
  };

  const getTipAmount = (): number => {
    // If Own Amount is entered, use that
    if (tipAmount && tipAmount.trim() !== '') {
      return parseFloat(tipAmount) || 0;
    }
    // If percentage button is selected, calculate from base amount
    if (selectedTipPercent !== null) {
      const base = getBaseAmount();
      return (base * selectedTipPercent) / 100;
    }
    return 0;
  };

  const getTotalPaymentAmount = (): number => {
    const amount = getBaseAmount();
    const tip = getTipAmount();
    return amount + tip;
  };

  const isValidPayment = (): boolean => {
    if (!pendingPaymentData) return false;
    
    // Get the effective amount (from input or pre-populated)
    const effectiveAmount = parseFloat(confirmAmount || '0') || pendingPaymentData.amount || 0;
    
    // Payment is valid if amount > 0
    return effectiveAmount > 0;
  };

  // Auto-navigate to dashboard after payment success
  useEffect(() => {
    if (showSuccessModal && isPaymentSuccess) {
      // Auto-navigate after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        setIsPaymentSuccess(false);
        setCurrentPayment(null);
        setPendingPaymentData(null);
        navigate('/dashboard');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, isPaymentSuccess, navigate]);

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

  // Initialize camera with iOS, Android, Chrome, and Opera Mini compatibility
  const initializeCamera = async () => {
    try {
      // Opera Mini: Check early - Opera Mini doesn't support getUserMedia due to proxy architecture
      if (isOperaMini()) {
        throw new Error('OPERA_MINI_NO_CAMERA'); // Special error code for Opera Mini
      }

      // Check if navigator.mediaDevices exists (required for getUserMedia)
      if (!navigator.mediaDevices) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          throw new Error('CAMERA_API_NOT_AVAILABLE_HTTP');
        } else {
          throw new Error('Camera API (navigator.mediaDevices) is not available in this browser. Please use a modern browser or try the "Upload QR Code" option.');
        }
      }

      // Check if getUserMedia method exists
      if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('Camera API (getUserMedia) is not supported in this browser. Please use the "Upload QR Code" option instead.');
      }

      // Check if camera API is supported (includes Opera Mini check)
      if (!isCameraSupported()) {
        throw new Error('Camera API not supported in this browser. Please use the "Upload QR Code" option instead.');
      }

      // Note: We don't block camera access based on protocol here
      // Let the browser handle HTTPS requirements - some browsers allow camera on local IPs
      // If HTTPS is truly required, the browser will throw an error when getUserMedia is called
      const isSecureContext = window.location.protocol === 'https:' || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname.match(/^192\.168\./); // Allow local network IPs
      
      if (!isSecureContext) {
        console.warn('⚠️ Not accessing via HTTPS or localhost. Camera may not work on some browsers.');
        // Don't throw error - let browser try and handle the error
      }

      // Chrome: Check camera permissions before requesting (optional, but better UX)
      let permissionStatus = 'prompt';
      try {
        if ('permissions' in navigator && navigator.permissions.query) {
          const permissionResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
          permissionStatus = permissionResult.state;
          
          if (permissionStatus === 'denied') {
            throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
          }
        }
      } catch (permError) {
        // Permission API not supported or failed - continue anyway
        console.log('Permission API check failed, continuing:', permError);
      }

      // Request camera permissions with optimized constraints for mobile devices
      // Lower resolution for better performance on low-end Android devices
      // Chrome: Use more flexible constraints to avoid OverconstrainedError
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Prefer back camera
          // Use lower resolution for better compatibility with low-end Android devices
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          // Additional constraints for Android/Chrome compatibility
          aspectRatio: { ideal: 16 / 9 }
        }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintError: any) {
        // Chrome: If constraints fail, try with minimal constraints
        if (constraintError.name === 'OverconstrainedError' || constraintError.name === 'ConstraintNotSatisfiedError') {
          console.warn('Primary constraints failed, trying minimal constraints:', constraintError);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'environment'
              }
            });
          } catch (fallbackError) {
            console.error('Fallback constraints also failed:', fallbackError);
            throw constraintError; // Throw original error
          }
        } else {
          throw constraintError;
        }
      }
      
      streamRef.current = stream;
      
      // iOS Safari CRITICAL FIX: Video element MUST be visible in DOM before attaching stream
      // Set showCamera first to render the video element, then attach stream
      setShowCamera(true);
      
      // Wait for React to render the video element before attaching stream
      // iOS Safari requires the video element to be in the DOM and visible
      await new Promise<void>((resolve) => {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          // Small delay to ensure video element is fully rendered
          setTimeout(() => {
            resolve();
          }, 100);
        });
      });
      
      // Now attach stream to video element
      if (videoRef.current) {
        // iOS Safari: Clear any existing srcObject first
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach(track => track.stop());
        }
        
        videoRef.current.srcObject = stream;
        
        // iOS Safari and Chrome require explicit play() call after setting srcObject
        const playVideo = async () => {
          if (!videoRef.current) return;
          
          try {
            // iOS Safari: Force play with multiple attempts
            await videoRef.current.play();
            console.log('✅ Video play() successful');
          } catch (playError: any) {
            console.warn('Video play() failed:', playError);
            
            // Chrome: Sometimes video needs to be triggered by user interaction
            if (playError.name === 'NotAllowedError') {
              throw new Error('Video autoplay blocked. Please tap the screen to start the camera.');
            }
            
            // iOS Safari: Retry with exponential backoff
            let retryCount = 0;
            const maxRetries = 3;
            
            const retryPlay = async (): Promise<void> => {
              if (retryCount >= maxRetries) {
                throw new Error('Unable to start camera preview after multiple attempts. Please try again.');
              }
              
              retryCount++;
              const delay = 100 * retryCount; // 100ms, 200ms, 300ms
              
              await new Promise(resolve => setTimeout(resolve, delay));
              
              if (videoRef.current && streamRef.current) {
                try {
                  await videoRef.current.play();
                  console.log(`✅ Video play() successful on retry ${retryCount}`);
                } catch (retryError) {
                  console.warn(`Video play() retry ${retryCount} failed:`, retryError);
                  return retryPlay();
                }
              }
            };
            
            await retryPlay();
          }
        };

        // iOS Safari: Wait for video element to be ready before playing
        if (videoRef.current.readyState >= 2) {
          // Video already has enough data
          await playVideo();
        } else {
          // Wait for video to load - iOS Safari needs this
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current;
            if (!video) {
              reject(new Error('Video element not found'));
              return;
            }

            let resolved = false;

            const onLoadedData = async () => {
              if (resolved) return;
              resolved = true;
              video.removeEventListener('loadeddata', onLoadedData);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('canplay', onCanPlay);
              video.removeEventListener('error', onError);
              try {
                await playVideo();
                resolve();
              } catch (error) {
                reject(error);
              }
            };

            const onLoadedMetadata = async () => {
              if (resolved) return;
              console.log('Video metadata loaded');
              // Try to play immediately when metadata is loaded (iOS Safari)
              try {
                await playVideo();
                if (!resolved) {
                  resolved = true;
                  video.removeEventListener('loadeddata', onLoadedData);
                  video.removeEventListener('loadedmetadata', onLoadedMetadata);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('error', onError);
                  resolve();
                }
              } catch (error) {
                // Continue waiting for loadeddata
              }
            };

            const onCanPlay = async () => {
              if (resolved) return;
              console.log('Video can play');
              try {
                await playVideo();
                if (!resolved) {
                  resolved = true;
                  video.removeEventListener('loadeddata', onLoadedData);
                  video.removeEventListener('loadedmetadata', onLoadedMetadata);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('error', onError);
                  resolve();
                }
              } catch (error) {
                // Continue waiting
              }
            };

            const onError = () => {
              if (resolved) return;
              resolved = true;
              video.removeEventListener('loadeddata', onLoadedData);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('canplay', onCanPlay);
              video.removeEventListener('error', onError);
              reject(new Error('Video element failed to load'));
            };

            video.addEventListener('loadeddata', onLoadedData);
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('canplay', onCanPlay);
            video.addEventListener('error', onError);
            
            // Timeout after 5 seconds
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('error', onError);
                reject(new Error('Video loading timeout'));
              }
            }, 5000);
          });
        }
        
        // Handle video loading events for better compatibility
        videoRef.current.onloadedmetadata = () => {
          console.log('Camera video metadata loaded');
        };
        
        videoRef.current.onloadeddata = () => {
          console.log('Camera video data loaded');
        };
        
        // iOS Safari: Force play when video becomes ready
        videoRef.current.oncanplay = () => {
          console.log('Video can play');
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(err => {
              console.warn('Auto-play on canplay failed:', err);
            });
          }
        };
        
        // Chrome/Android: Ensure video continues playing if paused
        videoRef.current.onpause = () => {
          if (videoRef.current && streamRef.current) {
            videoRef.current.play().catch(err => {
              console.warn('Auto-resume play failed:', err);
            });
          }
        };

        // Chrome: Handle video errors
        videoRef.current.onerror = (error) => {
          console.error('Video element error:', error);
          setError('Camera video error. Please try again.');
        };
        
        // Start scanning for QR codes once video is ready
        // Wait a bit for video to stabilize
        setTimeout(() => {
          if (videoRef.current && streamRef.current && showCamera) {
            startScanning();
          }
        }, 500);
      } else {
        throw new Error('Video element not found in DOM');
      }
    } catch (error: any) {
      console.error('Camera access failed:', error);
      
      // Provide specific error messages for better user experience
      let errorMessage = '';
      
      // Opera Mini: Special handling with helpful message
      if (error.message === 'OPERA_MINI_NO_CAMERA' || isOperaMini()) {
        errorMessage = 'Camera scanning is not available in Opera Mini browser. Opera Mini uses a proxy server that prevents direct camera access. Please use the "Upload QR Code" button below to upload a photo of your QR code instead, or switch to Chrome, Safari, or Opera browser for camera scanning.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device. Please use the "Upload QR Code" option instead.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is being used by another application. Please close other apps using the camera and try again, or use the "Upload QR Code" option.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Camera does not support the required settings. Please try uploading a QR code image instead.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera API not supported in this browser. Please use the "Upload QR Code" option instead, or switch to Chrome, Safari, or Firefox.';
      } else if (error.message && error.message.includes('Camera API not supported')) {
        errorMessage = error.message;
      } else if (error.message === 'CAMERA_API_NOT_AVAILABLE_HTTP') {
        // navigator.mediaDevices is undefined (likely iOS Safari on HTTP)
        errorMessage = 'Camera access requires HTTPS or localhost. iOS Safari requires a secure connection (HTTPS) for camera access. Please:\n\n1. Access via HTTPS (if available)\n2. Use the "Upload QR Code" option instead\n3. Access via localhost (127.0.0.1) if testing locally';
      } else if (error.message && (error.message.includes('HTTPS') || error.message.includes('secure context'))) {
        // HTTPS requirement error from browser
        errorMessage = 'Camera access requires a secure connection (HTTPS). For local development, you can:\n\n1. Access via HTTPS (if available)\n2. Use the "Upload QR Code" option instead\n3. Access via localhost if testing locally';
      } else if (error.message && error.message.includes('navigator.mediaDevices')) {
        // Specific error about mediaDevices being undefined
        errorMessage = 'Camera API is not available. This usually happens when accessing via HTTP on iOS Safari. Please:\n\n1. Access via HTTPS\n2. Use the "Upload QR Code" option instead\n3. Access via localhost if testing locally';
      } else if (error.message) {
        errorMessage = `Unable to access camera: ${error.message}. Please try the "Upload QR Code" option instead.`;
      } else {
        errorMessage = 'Unable to access camera. Please check permissions or try uploading a QR code image instead.';
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  // Scan QR code from video feed
  const scanQRFromVideo = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA || !streamRef.current) {
      return;
    }
    
    try {
      // Get canvas context
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for QR code detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Try to decode QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code && code.data) {
        // QR code found!
        console.log('✅ QR code detected:', code.data);
        
        // Stop scanning
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        
        // Process the QR code
        processQRCode(code.data).catch(err => {
          console.error('Error processing QR code:', err);
          // Restart scanning if processing fails
          startScanning();
        });
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
    }
  };

  // Start continuous scanning
  const startScanning = () => {
    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    // Create canvas for scanning if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.style.display = 'none';
      document.body.appendChild(canvasRef.current);
    }
    
    // Scan every 100ms (10 times per second)
    scanIntervalRef.current = window.setInterval(() => {
      scanQRFromVideo();
    }, 100);
  };

  // Stop camera
  const stopCamera = () => {
    // Stop scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Remove canvas if it exists
    if (canvasRef.current && canvasRef.current.parentNode) {
      canvasRef.current.parentNode.removeChild(canvasRef.current);
      canvasRef.current = null;
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setShowCamera(false);
    setIsScanning(false);
  };

  // Handle QR code scan
  const handleQRScan = async () => {
    console.log('🔍 QR Scan button clicked');
    setIsScanning(true);
    setError(null);
    setShowCamera(false); // Reset camera state before initializing
    
    try {
      console.log('📷 Initializing camera...');
      await initializeCamera();
      console.log('✅ Camera initialized successfully');
    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      // Error is already handled in initializeCamera
      setIsScanning(false);
    }
  };

  // Process QR code with API
  const processQRCode = async (code: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Basic validation of QR code data
      if (!code || code.trim().length === 0) {
        throw new Error('QR code data is empty. Please try scanning again.');
      }
      
      console.log('📋 Processing QR code:', code);
      
      // Validate QR code with backend
      const validationResult = await apiService.validateQRCode(code);
      setQrValidationResult(validationResult);
      
      // If validation successful, show confirm modal
      if (validationResult.merchant) {
        // Check if amount is 0 or missing - will prompt in confirm modal
        let paymentAmount = validationResult.paymentDetails.amount || 0;
        
        // Store payment data for confirmation
        // Reference: only set if provided by QR code (null/undefined if not provided)
        const tipEnabled = validationResult.paymentDetails.tipEnabled || false;
        const defaultTipPercent = validationResult.paymentDetails.defaultTipPercent || null;
        const referenceEditable = validationResult.paymentDetails.referenceEditable || false;
        const customReferenceLabel = validationResult.paymentDetails.customReferenceLabel || null;
        
        setPendingPaymentData({
          qrCode: code,
          amount: paymentAmount,
          merchant: validationResult.merchant,
          reference: validationResult.paymentDetails.reference || null,
          tipEnabled: tipEnabled,
          defaultTipPercent: defaultTipPercent,
          referenceEditable: referenceEditable,
          customReferenceLabel: customReferenceLabel
        });
        setConfirmAmount(paymentAmount > 0 ? paymentAmount.toString() : '');
        // Initialize tip state if tip is enabled (default to 10% selected)
        if (tipEnabled) {
          setTipAmount('');
          setSelectedTipPercent(10); // Default to 10% when tip is enabled
        } else {
          setTipAmount('');
          setSelectedTipPercent(null);
        }
        // Initialize custom reference if editable (pre-populate with reference value)
        setCustomReference(referenceEditable && validationResult.paymentDetails.reference ? validationResult.paymentDetails.reference : '');
        setShowConfirmModal(true);
      } else {
        throw new Error('QR code validation failed. The QR code may not be a valid payment code.');
      }
      
      stopCamera();
      
    } catch (err: any) {
      // Close modals on error
      setShowConfirmModal(false);
      setShowSuccessModal(false);
      console.error('QR processing error:', err);
      
      // Provide specific error messages
      let errorMsg = 'Failed to process QR code. ';
      
      if (err.response) {
        // API error response
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 400) {
          errorMsg += 'Invalid QR code format. Please scan a valid payment QR code.';
        } else if (status === 404) {
          errorMsg += 'QR code not recognized. Please ensure you\'re scanning a valid merchant QR code.';
        } else if (status === 500) {
          errorMsg += 'Server error. Please try again later.';
        } else if (data && data.message) {
          errorMsg += data.message;
        } else {
          errorMsg += 'Please try again.';
        }
      } else if (err.message) {
        errorMsg += err.message;
      } else {
        errorMsg += 'Please try again.';
      }
      
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle confirm payment
  const handleConfirmPayment = async () => {
    if (!pendingPaymentData) return;
    
    try {
      setIsProcessing(true);
      
      // Get amount from confirm modal (user may have edited it) or use pre-populated amount
      const paymentAmount = getBaseAmount();
      const tip = getTipAmount();
      
      if (paymentAmount <= 0) {
        setError('Payment amount must be greater than 0.');
        return;
      }
      
      // Close confirm modal
      setShowConfirmModal(false);
      
      // Use custom reference if editable, otherwise use original reference
      const finalReference = pendingPaymentData.referenceEditable && customReference 
        ? customReference 
        : pendingPaymentData.reference;
      
      // Initiate payment (tip is sent separately, backend will add it to total)
      const paymentResult = await apiService.initiateQRPayment(
        pendingPaymentData.qrCode,
        paymentAmount,
        user?.walletId || 'default',
        finalReference,
        tip > 0 ? tip : undefined
      );
      
      setCurrentPayment(paymentResult);
      
      // Refresh wallet balance after payment
      await fetchWalletBalance();
      
      // Mark as payment success for auto-navigation
      setIsPaymentSuccess(true);
      // Show success modal
      setShowSuccessModal(true);
      
      // Clear pending data
      setPendingPaymentData(null);
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setShowConfirmModal(false);
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
    // Removed 'capture' attribute to allow file selection from gallery/cloud
    // Users can still take a photo if their file picker offers that option
    
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

  // Process uploaded QR code image with enhanced detection for logos and overlays
  const processUploadedQR = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Create a canvas to process the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      const img = new Image();
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (err) => {
          console.error('Image load error:', err);
          reject(new Error('Failed to load image. Please try a different image.'));
        };
        img.src = URL.createObjectURL(file);
      });
      
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0);
      
      // Get original image data
      const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Try multiple detection strategies
      let code = null;
      const strategies = [
        // Strategy 1: Original image
        () => {
          console.log('🔍 Strategy 1: Original image');
          return jsQR(originalImageData.data, originalImageData.width, originalImageData.height);
        },
        
        // Strategy 2: Inverted colors
        () => {
          console.log('🔍 Strategy 2: Inverted colors');
          const invertedData = new Uint8ClampedArray(originalImageData.data.length);
          for (let i = 0; i < originalImageData.data.length; i += 4) {
            invertedData[i] = 255 - originalImageData.data[i];     // R
            invertedData[i + 1] = 255 - originalImageData.data[i + 1]; // G
            invertedData[i + 2] = 255 - originalImageData.data[i + 2]; // B
            invertedData[i + 3] = originalImageData.data[i + 3];   // A
          }
          return jsQR(invertedData, originalImageData.width, originalImageData.height);
        },
        
        // Strategy 3: Grayscale with enhanced contrast
        () => {
          console.log('🔍 Strategy 3: Grayscale with enhanced contrast');
          const grayscaleData = new Uint8ClampedArray(originalImageData.data.length);
          for (let i = 0; i < originalImageData.data.length; i += 4) {
            // Convert to grayscale
            const gray = Math.round(
              originalImageData.data[i] * 0.299 +
              originalImageData.data[i + 1] * 0.587 +
              originalImageData.data[i + 2] * 0.114
            );
            // Enhance contrast
            const enhanced = gray < 128 ? Math.max(0, gray - 50) : Math.min(255, gray + 50);
            grayscaleData[i] = enhanced;     // R
            grayscaleData[i + 1] = enhanced; // G
            grayscaleData[i + 2] = enhanced; // B
            grayscaleData[i + 3] = originalImageData.data[i + 3]; // A
          }
          return jsQR(grayscaleData, originalImageData.width, originalImageData.height);
        },
        
        // Strategy 4: High contrast (black and white)
        () => {
          console.log('🔍 Strategy 4: High contrast (black and white)');
          const bwData = new Uint8ClampedArray(originalImageData.data.length);
          for (let i = 0; i < originalImageData.data.length; i += 4) {
            const gray = Math.round(
              originalImageData.data[i] * 0.299 +
              originalImageData.data[i + 1] * 0.587 +
              originalImageData.data[i + 2] * 0.114
            );
            const bw = gray > 128 ? 255 : 0;
            bwData[i] = bw;     // R
            bwData[i + 1] = bw; // G
            bwData[i + 2] = bw; // B
            bwData[i + 3] = originalImageData.data[i + 3]; // A
          }
          return jsQR(bwData, originalImageData.width, originalImageData.height);
        },
        
        // Strategy 5: Scaled down (if image is large)
        () => {
          if (canvas.width <= 1000 && canvas.height <= 1000) {
            return null; // Skip if already small
          }
          console.log('🔍 Strategy 5: Scaled down');
          const scale = Math.min(1000 / canvas.width, 1000 / canvas.height);
          const scaledWidth = Math.floor(canvas.width * scale);
          const scaledHeight = Math.floor(canvas.height * scale);
          
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = scaledWidth;
          scaledCanvas.height = scaledHeight;
          const scaledCtx = scaledCanvas.getContext('2d');
          if (scaledCtx) {
            scaledCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
            const scaledImageData = scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
            return jsQR(scaledImageData.data, scaledImageData.width, scaledImageData.height);
          }
          return null;
        },
        
        // Strategy 6: Scaled up (if image is small)
        () => {
          if (canvas.width >= 500 && canvas.height >= 500) {
            return null; // Skip if already large enough
          }
          console.log('🔍 Strategy 6: Scaled up');
          const scale = Math.min(1000 / canvas.width, 1000 / canvas.height);
          const scaledWidth = Math.floor(canvas.width * scale);
          const scaledHeight = Math.floor(canvas.height * scale);
          
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = scaledWidth;
          scaledCanvas.height = scaledHeight;
          const scaledCtx = scaledCanvas.getContext('2d');
          if (scaledCtx) {
            scaledCtx.imageSmoothingEnabled = false; // Disable smoothing for sharper edges
            scaledCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
            const scaledImageData = scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
            return jsQR(scaledImageData.data, scaledImageData.width, scaledImageData.height);
          }
          return null;
        },
      ];
      
      // Try each strategy until we find a QR code
      for (const strategy of strategies) {
        try {
          code = strategy();
          if (code && code.data) {
            console.log('✅ QR code detected with strategy:', strategies.indexOf(strategy) + 1);
            break;
          }
        } catch (strategyError) {
          console.warn('Strategy failed:', strategyError);
          continue;
        }
      }
      
      if (code && code.data) {
        // QR code found, process it
        console.log('✅ QR code detected:', code.data);
        await processQRCode(code.data);
      } else {
        // No QR code found in image
        setError('No QR code detected in the uploaded image. Possible reasons:\n\n1. QR code may be too blurry or unclear\n2. Logo overlay in center may be blocking critical data\n3. Image quality may be too low\n4. QR code may be damaged or incomplete\n\nPlease try:\n- Taking a clearer photo\n- Ensuring good lighting\n- Removing any obstructions\n- Using a different QR code image');
      }
      
      // Clean up
      URL.revokeObjectURL(img.src);
      
    } catch (error: any) {
      console.error('QR upload processing error:', error);
      setError(error.message || 'Failed to process uploaded QR code. Please try again.');
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

  // Handle video element readiness for iOS Safari (backup)
  // This effect ensures video plays if it becomes ready after initial setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showCamera || !streamRef.current) return;

    // iOS Safari: Sometimes video needs an extra play attempt after render
    const ensureVideoPlaying = async () => {
      if (video.srcObject && video.paused) {
        try {
          await video.play();
          console.log('✅ Video play() successful in useEffect (backup)');
        } catch (error) {
          console.warn('Video play() in effect failed:', error);
        }
      }
    };

    // Small delay to ensure video element is fully rendered (iOS Safari)
    const timer = setTimeout(() => {
      ensureVideoPlaying();
      
      // Start scanning once video is playing
      if (video.readyState >= video.HAVE_ENOUGH_DATA && !scanIntervalRef.current) {
        startScanning();
      }
    }, 200);

    // Also try on video ready events as backup
    const onCanPlay = () => {
      ensureVideoPlaying();
      // Start scanning when video can play
      if (!scanIntervalRef.current) {
        startScanning();
      }
    };

    video.addEventListener('canplay', onCanPlay);

    return () => {
      clearTimeout(timer);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [showCamera]);

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
                muted
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
              {/* Opera Mini Notice */}
              {isOperaMini() && (
                <Alert 
                  style={{
                    borderRadius: 'var(--mobile-border-radius)',
                    border: '1px solid #2D8CCA',
                    backgroundColor: '#eff6ff',
                    marginBottom: '1rem'
                  }}
                >
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: '#1e40af',
                        margin: 0
                      }}
                    >
                      <strong>Opera Mini detected:</strong> Camera scanning is not available. Please use the <strong>"Upload QR Code"</strong> option below instead.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* HTTPS Info (not blocking) */}
              {!isOperaMini() && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                <Alert 
                  style={{
                    borderRadius: 'var(--mobile-border-radius)',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#eff6ff',
                    marginBottom: '1rem'
                  }}
                >
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <p 
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-base)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: '#1e40af',
                        margin: 0
                      }}
                    >
                      <strong>Info:</strong> Camera access may require HTTPS on some browsers. If camera doesn't work, use the <strong>"Upload QR Code"</strong> option instead.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <button
                type="button"
                disabled={isOperaMini() || !isCameraSupported() || isScanning}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔍 Scan button clicked, isOperaMini:', isOperaMini(), 'isCameraSupported:', isCameraSupported(), 'isScanning:', isScanning);
                  if (!isOperaMini() && isCameraSupported() && !isScanning) {
                    handleQRScan();
                  }
                }}
                onTouchStart={(e) => {
                  // Better touch handling for mobile
                  if (!isOperaMini() && isCameraSupported() && !isScanning) {
                    e.preventDefault();
                    handleQRScan();
                  }
                }}
                style={{ 
                  width: '100%',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  background: 'transparent',
                  cursor: isOperaMini() || !isCameraSupported() || isScanning ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
                title={isOperaMini() ? 'Camera not available in Opera Mini - use upload instead' : (!isCameraSupported() ? 'Camera not supported in this browser' : 'Scan QR code with camera')}
              >
              <Card 
                className={isOperaMini() || !isCameraSupported() || isScanning ? '' : 'cursor-pointer hover:shadow-lg transition-all duration-200'}
                style={{ 
                  borderRadius: 'var(--mobile-border-radius)',
                  border: isOperaMini() || !isCameraSupported() || isScanning ? '2px solid #9ca3af' : '2px solid #86BE41',
                  background: isOperaMini() || !isCameraSupported() || isScanning ? '#f3f4f6' : 'linear-gradient(135deg, #86BE41/5 0%, #2D8CCA/5 100%)',
                  opacity: isOperaMini() || !isCameraSupported() || isScanning ? 0.6 : 1,
                  pointerEvents: 'none' // Let button handle clicks
                }}
              >
                <CardContent style={{ padding: '1.5rem' }}>
                  <div className="flex items-center gap-4">
                    <div 
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: isOperaMini() || !isCameraSupported() ? '#9ca3af' : 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
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
                          color: isOperaMini() || !isCameraSupported() ? '#6b7280' : '#1f2937',
                          marginBottom: '0.25rem'
                        }}
                      >
                        Scan with Camera
                        {isOperaMini() && (
                          <Badge 
                            style={{ 
                              marginLeft: '0.5rem',
                              backgroundColor: '#f59e0b',
                              color: '#fff',
                              fontSize: '0.75rem'
                            }}
                          >
                            Not Available
                          </Badge>
                        )}
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
                        {isOperaMini() ? 
                          'Opera Mini doesn\'t support camera access - use upload instead'
                          : !isCameraSupported() ?
                          'Camera not supported - use upload instead'
                          : 'Point your camera at a QR code'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </button>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200"
                style={{ 
                  borderRadius: 'var(--mobile-border-radius)',
                  border: isOperaMini() ? '2px solid #2D8CCA' : '1px solid #e5e7eb',
                  backgroundColor: isOperaMini() ? '#eff6ff' : '#ffffff'
                }}
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
                        {isProcessing ? 'Decoding QR code...' : (isOperaMini() ? 'Take a photo or select from gallery' : 'Select from gallery')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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

      {/* Confirm Payment Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent 
          style={{
            maxWidth: '400px',
            width: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: 'none',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 9999
          }}
          aria-describedby="confirm-payment-description"
        >
          <DialogHeader>
            <DialogTitle 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '16px'
              }}
            >
              Confirm Payment
            </DialogTitle>
            <DialogDescription id="confirm-payment-description" className="sr-only">
              Confirm payment details before proceeding
            </DialogDescription>
          </DialogHeader>
          
          {/* Payment Summary */}
          {pendingPaymentData && (
            <div 
              style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}
            >
              <p
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 8px 0',
                  textAlign: 'center'
                }}
              >
                {pendingPaymentData.tipEnabled && (selectedTipPercent !== null || (tipAmount && tipAmount.trim() !== '')) ? (
                  <>
                    Pay R{getTotalPaymentAmount().toFixed(2)} to {pendingPaymentData.merchant.name}
                  </>
                ) : (
                  <>
                    Pay R{getDisplayAmount()} to {pendingPaymentData.merchant.name}
                  </>
                )}
              </p>
              {shouldShowReferenceInSummary() && (
                <p
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#475569',
                    margin: '8px 0 0 0',
                    textAlign: 'center'
                  }}
                >
                  {pendingPaymentData.referenceEditable 
                    ? `${getReferenceLabel()}: ${customReference || pendingPaymentData.reference || ''}`
                    : `REFERENCE: ${pendingPaymentData.reference}`}
                </p>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Merchant */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label 
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}
              >
                Merchant
              </Label>
              <Input
                value={pendingPaymentData?.merchant.name || ''}
                readOnly
                style={{
                  width: '200px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '14px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
              />
            </div>
            
            {/* Bill Amount Field - Conditionally shown based on QR type */}
            {shouldShowAmountField() && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}
                >
                  Bill Amount
                </Label>
                <Input
                  type="number"
                  value={confirmAmount}
                  onChange={(e) => setConfirmAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{
                    width: '200px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                />
              </div>
            )}
            
            {/* Tip Field - Only shown when tip is enabled */}
            {shouldShowTipField() && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Label 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}
                >
                  Tip
                </Label>
                
                {/* Tip Percentage Buttons - Horizontal Layout */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                  {[0, 10, 15, 20].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => {
                        setSelectedTipPercent(percent);
                        setTipAmount(''); // Clear Own Amount when percentage is selected
                      }}
                      style={{
                        flex: '1',
                        minWidth: '60px',
                        height: '44px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: selectedTipPercent === percent ? '#ffffff' : '#1f2937',
                        backgroundColor: selectedTipPercent === percent ? '#3b82f6' : '#f3f4f6',
                        border: selectedTipPercent === percent ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedTipPercent !== percent) {
                          e.currentTarget.style.backgroundColor = '#e5e7eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedTipPercent !== percent) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
                
                {/* Own Amount Field - Below buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Label 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6b7280'
                    }}
                  >
                    Own Amount
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={tipAmount}
                    onChange={(e) => {
                      // Banking-grade: Preserve exact user input - NO auto-formatting or rounding
                      let inputValue = e.target.value;
                      
                      // Allow empty string, numbers, and single decimal point only
                      // Remove any currency symbols or spaces that user might type
                      inputValue = inputValue.replace(/[^\d.]/g, '');
                      
                      // Ensure only one decimal point
                      const parts = inputValue.split('.');
                      if (parts.length > 2) {
                        inputValue = parts[0] + '.' + parts.slice(1).join('');
                      }
                      
                      // Limit to 2 decimal places (preserve user intent)
                      if (parts.length === 2 && parts[1].length > 2) {
                        inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                      }
                      
                      // Set exact value - no automatic modification
                      setTipAmount(inputValue);
                      setSelectedTipPercent(null); // Clear percentage selection when Own Amount is used
                    }}
                    onBlur={(e) => {
                      // Only validate on blur, show error if exceeds max instead of auto-correcting
                      const value = e.target.value.trim();
                      if (value) {
                        const tipValue = parseFloat(value);
                        if (!isNaN(tipValue) && tipValue >= 0) {
                          const baseAmount = getBaseAmount();
                          const maxTip = baseAmount;
                          
                          // Optional: Format to 2 decimals on blur for display consistency
                          // But don't auto-correct if exceeds max - show error instead
                          if (value.includes('.')) {
                            setTipAmount(tipValue.toFixed(2));
                          }
                        }
                      }
                    }}
                    onFocus={() => {
                      setSelectedTipPercent(null); // Clear percentage selection when Own Amount is focused
                    }}
                    onKeyDown={(e) => {
                      // Prevent browser auto-formatting quirks
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onWheel={(e) => {
                      // Prevent scroll-to-change number input values
                      e.currentTarget.blur();
                    }}
                    placeholder="0.00"
                    style={{
                      width: '200px',
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Custom/Editable Reference Field - Only shown when reference is editable */}
            {shouldShowReferenceField() && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}
                >
                  {getReferenceLabel()}
                </Label>
                <Input
                  type="text"
                  value={customReference}
                  onChange={(e) => setCustomReference(e.target.value)}
                  placeholder={pendingPaymentData.reference || ''}
                  style={{
                    width: '200px',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                />
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <Button
              onClick={() => {
                setShowConfirmModal(false);
                setPendingPaymentData(null);
              }}
              disabled={isProcessing}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing || !isValidPayment()}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (isProcessing || !confirmAmount || parseFloat(confirmAmount) <= 0) ? 'not-allowed' : 'pointer',
                opacity: (isProcessing || !confirmAmount || parseFloat(confirmAmount) <= 0) ? 0.6 : 1
              }}
            >
              {isProcessing ? 'Processing...' : 'Approve & Pay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Successful Modal */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => {
        setShowSuccessModal(open);
        if (!open && isPaymentSuccess) {
          // Navigate to dashboard when modal closes after payment success
          setIsPaymentSuccess(false);
          setCurrentPayment(null);
          setPendingPaymentData(null);
          navigate('/dashboard');
        }
      }}>
        <DialogContent 
          style={{
            maxWidth: '400px',
            width: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '0',
            border: 'none',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 9999,
            overflow: 'hidden'
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ display: 'none' }}>
              Payment Successful
            </DialogTitle>
            <DialogDescription style={{ display: 'none' }}>
              Your Zapper payment has been processed successfully
            </DialogDescription>
          </DialogHeader>
          
          {/* Gradient Header */}
          <div 
            style={{
              background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
              padding: '32px 24px',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <CheckCircle style={{ width: '32px', height: '32px', color: '#86BE41' }} />
            </div>
            <h2 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                margin: '0 0 8px 0'
              }}
            >
              Payment Successful!
            </h2>
            <p 
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#ffffff',
                margin: 0,
                opacity: 0.9
              }}
            >
              Your Zapper payment has been processed
            </p>
          </div>
          
          {/* Transaction Details */}
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Merchant */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}
                >
                  Merchant
                </span>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}
                >
                  {pendingPaymentData?.merchant.name || currentPayment?.merchant?.name || 'Unknown'}
                </span>
              </div>
              
              {/* Amount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}
                >
                  Amount
                </span>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}
                >
                  R{currentPayment?.amount?.toFixed(2) || parseFloat(confirmAmount || '0').toFixed(2)}
                </span>
              </div>
              
              {/* Service Fee */}
              {currentPayment?.fee && (
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: '#fff7ed',
                    padding: '12px',
                    borderRadius: '8px'
                  }}
                >
                  <span 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#92400e'
                    }}
                  >
                    Transaction Fee
                  </span>
                  <span 
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#c2410c'
                    }}
                  >
                    R{currentPayment.fee.toFixed(2)}
                  </span>
                </div>
              )}
              
              {/* New Balance */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  backgroundColor: '#f0fdf4',
                  padding: '12px',
                  borderRadius: '8px'
                }}
              >
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#166534'
                  }}
                >
                  New Balance
                </span>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#16a34a'
                  }}
                >
                  {walletBalance}
                </span>
              </div>
              
              {/* Transaction ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#9ca3af'
                  }}
                >
                  Transaction ID
                </span>
                <span 
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280'
                  }}
                >
                  {currentPayment?.transactionId || currentPayment?.paymentId || 'N/A'}
                </span>
              </div>
            </div>
            
            {/* Done Button */}
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                if (isPaymentSuccess) {
                  // Navigate to dashboard after payment success
                  setIsPaymentSuccess(false);
                  setCurrentPayment(null);
                  setPendingPaymentData(null);
                  navigate('/dashboard');
                }
              }}
              style={{
                width: '100%',
                marginTop: '24px',
                background: 'linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}