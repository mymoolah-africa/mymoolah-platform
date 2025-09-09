import { useState, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { 
  Camera, 
  Upload, 
  FileText, 
  Check, 
  X, 
  AlertTriangle, 
  Shield, 
  ArrowLeft,
  HelpCircle,
  Eye,
  CreditCard,
  Home,
  Loader2
} from 'lucide-react';
import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

type DocumentType = 'identity';
type DocumentStatus = 'pending' | 'uploaded' | 'processing' | 'verified' | 'rejected';

interface DocumentUpload {
  type: DocumentType;
  file: File | null;
  preview: string | null;
  status: DocumentStatus;
  error?: string;
}

export function KYCDocumentsPage() {
  const { user, updateKYCStatus } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [kycRetryCount, setKycRetryCount] = useState(0);
  const [kycFeedback, setKycFeedback] = useState<{
    title: string;
    issues: string[];
    tips: string[];
    canRetry: boolean;
  } | null>(null);
  
  // File input refs for manual file selection
  const identityFileRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<{
    identity: DocumentUpload;
  }>({
    identity: {
      type: 'identity',
      file: null,
      preview: null,
      status: 'pending'
    }
  });

  // Camera capture state
  const [showCamera, setShowCamera] = useState(false);
  const [activeDocumentType, setActiveDocumentType] = useState<DocumentType>('identity');

  // Redirect if already verified
  if (user?.kycStatus === 'verified') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleFileSelect = (type: DocumentType, file: File) => {
    // Validate file type - only accept images for OCR processing
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload an image file (JPEG or PNG). PDF files are not supported for OCR processing.');
      return;
    }

    setDocuments(prev => ({
      ...prev,
      [type]: {
        type,
        file,
        preview: URL.createObjectURL(file),
        status: 'uploaded'
      }
    }));
    setError('');
  };

  const handleCameraCapture = async (type: DocumentType) => {
    setActiveDocumentType(type);
    
    try {
      // Check if camera is available
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',  // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      // For now, we'll simulate camera capture
      // In production, you'd implement full camera interface
      setShowCamera(true);
      
      // Stop the stream immediately (just checking availability)
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      setError('Camera not available. Please use file upload instead.');
      console.error('Camera access failed:', error);
    }
  };

  const handleFileUpload = (type: DocumentType) => {
    const fileRef = identityFileRef;
    fileRef.current?.click();
  };

  const handleRemoveDocument = (type: DocumentType) => {
    setDocuments(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        file: null,
        preview: null,
        status: 'pending',
        error: undefined
      }
    }));

    // Clean up object URL
    if (documents[type].preview) {
      URL.revokeObjectURL(documents[type].preview);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Validate identity document is uploaded
              if (!documents.identity.file) {
          throw new Error('Please upload your identity document (SAID, Passport, Driving License, or Temporary ID Certificate)');
        }

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Create FormData for file upload (backend integration)
      const formData = new FormData();
      formData.append('identityDocument', documents.identity.file);
      formData.append('retryCount', String(kycRetryCount));

      // Real API call to upload documents
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }


      
      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/kyc/upload-documents?_t=${Date.now()}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to upload documents';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      

      // Respect backend flags: on retry/failed, show message and stop
      if (!data.success && (data.status === 'retry' || data.status === 'failed')) {
        const issues: string[] = data?.validation?.issues || [];
        const tips: string[] = [
          'Upload a clear photo of your SA ID card/book or a passport',
          'Ensure the whole document is visible with good lighting (no glare)',
          `The name must match your profile: ${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim(),
          'Only images are supported (JPG/PNG), max 10MB'
        ];
        setKycFeedback({
          title: data.message || "We couldn't verify your identity yet",
          issues,
          tips,
          canRetry: data?.canRetry === true
        });
        setError('');
        if (data.status === 'retry') {
          setKycRetryCount(prev => prev + 1);
        }
        setIsLoading(false);
        return;
      }

      // Update user KYC status in context based on backend response
      if (updateKYCStatus) {
        if (data.success && data.status === 'approved') {
          // KYC was successful, update to verified
  
          updateKYCStatus('verified');
        } else {
          // Documents uploaded but not yet verified
  
          updateKYCStatus('documents_uploaded');
        }
      }

      // Redirect to status page
      navigate('/kyc/status');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentTypeText = (type: DocumentType) => {
    return 'Identity Document';
  };

  const getDocumentDescription = (type: DocumentType) => {
    return 'Upload your South African ID document, Passport, Driving License, or Temporary ID Certificate';
  };

  const isSubmitDisabled = !documents.identity.file || isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      {/* Mobile Container */}
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] min-h-screen flex flex-col">
        {/* Header Section */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1.5rem' }}>
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-white/90 hover:text-white transition-colors touch-target"
              style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)',
                minHeight: 'var(--mobile-touch-target)'
              }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Title Section */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Verify Your Identity
            </h1>
            <p className="text-white/90" style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-base)', 
              fontWeight: 'var(--font-weight-normal)' 
            }}>
              Upload your documents to unlock full wallet features
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)' 
              }}>
                Documents Required
              </span>
              <span className="text-white/80" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)' 
              }}>
                {documents.identity.file ? 1 : 0}/1
              </span>
            </div>
            <Progress 
              value={documents.identity.file ? 100 : 0}
              className="h-2 bg-white/20"
            />
          </div>
        </div>

        {/* Documents Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          {kycFeedback && (
            <Card className="border-0 shadow-xl mb-4" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-1" />
                  <div className="flex-1">
                    <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'var(--font-weight-bold)', color: '#991b1b' }}>{kycFeedback.title}</h3>
                    {kycFeedback.issues?.length > 0 && (
                      <ul className="list-disc pl-5 mt-2 text-red-700" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        {kycFeedback.issues.map((i, idx) => (
                          <li key={idx}>{i}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 text-gray-700">
                      <p className="font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>How to fix:</p>
                      <ul className="list-disc pl-5 mt-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        {kycFeedback.tips.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => {
                          // allow user to replace the document quickly
                          setKycFeedback(null);
                          setKycRetryCount(kycRetryCount); // keep retry count as-is
                          identityFileRef.current?.click();
                        }}
                        className="bg-[#86BE41] hover:bg-[#7AB139]"
                      >
                        Try Again
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setKycFeedback(null);
                          handleRemoveDocument('identity');
                        }}
                        className="border-[#2D8CCA] text-[#2D8CCA] hover:bg-[#2D8CCA] hover:text-white"
                      >
                        Remove & Start Over
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && !kycFeedback && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-base)' 
              }}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Identity Document Upload */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3" style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: '#1f2937' 
                }}>
                  <div className="bg-gradient-to-r from-[#86BE41]/20 to-[#2D8CCA]/20 rounded-xl w-10 h-10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#86BE41]" />
                  </div>
                  Identity Document
                  {documents.identity.file && (
                    <Check className="w-5 h-5 text-green-500 ml-auto" />
                  )}
                </CardTitle>
                <p className="text-gray-600" style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'var(--mobile-font-small)', 
                  fontWeight: 'var(--font-weight-normal)' 
                }}>
                  Upload your South African ID document or Passport
                </p>
              </CardHeader>
              <CardContent>
                {documents.identity.file ? (
                  <div className="space-y-3">
                    {/* Document Preview */}
                    <div className="relative bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-[#86BE41] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-small)', 
                            fontWeight: 'var(--font-weight-medium)' 
                          }}>
                            {documents.identity.file.name}
                          </p>
                          <p className="text-gray-500" style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-small)' 
                          }}>
                            {(documents.identity.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveDocument('identity')}
                          className="p-1 hover:bg-gray-200 rounded touch-target"
                          style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      
                      {/* Image Preview */}
                      {documents.identity.preview && (
                        <div className="mt-3">
                          <img 
                            src={documents.identity.preview} 
                            alt="Identity document preview"
                            className="w-full h-32 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleFileUpload('identity')}
                      variant="outline"
                      className="w-full border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
                      style={{ 
                        height: '2.5rem',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-medium)',
                        borderRadius: 'var(--mobile-border-radius)'
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Replace Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Upload Options */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleCameraCapture('identity')}
                        variant="outline"
                        className="h-20 flex-col border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                      >
                        <Camera className="w-6 h-6 mb-1" />
                        Take Photo
                      </Button>
                      
                      <Button
                        onClick={() => handleFileUpload('identity')}
                        variant="outline"
                        className="h-20 flex-col border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                      >
                        <Upload className="w-6 h-6 mb-1" />
                        Browse Files
                      </Button>
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)' 
                    }}>
                      Accepted: JPG, PNG (Max 10MB)
                    </p>
                  </div>
                )}
                
                {/* Hidden File Input */}
                <input
                  ref={identityFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('identity', file);
                  }}
                />
              </CardContent>
            </Card>

            {/* Upload Progress */}
            {isLoading && uploadProgress > 0 && (
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                <CardContent style={{ paddingTop: '1.5rem' }}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)', 
                        fontWeight: 'var(--font-weight-medium)' 
                      }}>
                        Uploading Documents...
                      </span>
                      <span style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)' 
                      }}>
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
              style={{ 
                height: 'var(--mobile-touch-target)',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 'var(--mobile-font-base)',
                fontWeight: 'var(--font-weight-medium)',
                borderRadius: 'var(--mobile-border-radius)'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Uploading Documents...</span>
                </>
              ) : (
                <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Submit for Verification</span>
              )}
            </Button>

            {/* Help Section */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardContent style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#2D8CCA] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)', 
                      fontWeight: 'var(--font-weight-bold)', 
                      marginBottom: '0.5rem',
                      color: '#1f2937'
                    }}>
                      Need Help?
                    </h3>
                    <p className="text-gray-600 mb-3" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)', 
                      fontWeight: 'var(--font-weight-normal)' 
                    }}>
                      Make sure your documents are clear, well-lit, and all corners are visible. Processing typically takes 2-5 minutes.
                    </p>
                    
                    <div className="space-y-2 text-xs text-gray-600" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)' 
                    }}>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Clear, high-quality images</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>All text must be readable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Document must be less than 3 months old (POA)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal (Placeholder) */}
      {showCamera && (
        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogContent className="max-w-sm mx-auto" aria-describedby="kyc-camera-description">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Camera Capture
              </DialogTitle>
              <div id="kyc-camera-description" className="sr-only">
                Camera interface for capturing KYC documents
              </div>
            </DialogHeader>
            <div className="p-4 text-center space-y-4">
              <Camera className="w-12 h-12 mx-auto text-gray-400" />
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                Camera interface would be implemented here with full document capture functionality.
              </p>
              <Button 
                onClick={() => setShowCamera(false)}
                className="w-full"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Use File Upload Instead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}