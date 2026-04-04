import { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
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
  CreditCard,
  Home,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

type DocumentType = 'identity' | 'address';
type DocumentStatus = 'pending' | 'uploaded' | 'processing' | 'verified' | 'rejected';

interface DocumentUpload {
  type: DocumentType;
  file: File | null;
  preview: string | null;
  status: DocumentStatus;
  error?: string;
}

export function KYCDocumentsPage() {
  const { user, updateKYCStatus, refreshUserStatus } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'uploading' | 'verifying'>('idle');
  const [kycRetryCount, setKycRetryCount] = useState(0);
  const [kycFeedback, setKycFeedback] = useState<{
    title: string;
    issues: string[];
    tips: string[];
    canRetry: boolean;
  } | null>(null);
  
  const identityFileRef = useRef<HTMLInputElement>(null);
  const addressFileRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<{
    identity: DocumentUpload;
    address: DocumentUpload;
  }>({
    identity: {
      type: 'identity',
      file: null,
      preview: null,
      status: 'pending'
    },
    address: {
      type: 'address',
      file: null,
      preview: null,
      status: 'pending'
    }
  });

  const [showCamera, setShowCamera] = useState(false);

  const kycTier = (user as any)?.kycTier ?? null;
  const identityAlreadyVerified = kycTier != null && kycTier >= 1;
  const needsIdentity = !identityAlreadyVerified;

  if (kycTier != null && kycTier >= 2) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentStep = needsIdentity ? 1 : 2;
  const currentFile = needsIdentity ? documents.identity.file : documents.address.file;

  const handleFileSelect = (type: DocumentType, file: File) => {
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

  const handleFileUpload = (type: DocumentType) => {
    const fileRef = type === 'identity' ? identityFileRef : addressFileRef;
    fileRef.current?.click();
  };

  const handleRemoveDocument = (type: DocumentType) => {
    if (documents[type].preview) {
      URL.revokeObjectURL(documents[type].preview!);
    }
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
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    setUploadProgress(0);
    setProcessingPhase('uploading');

    try {
      if (needsIdentity && !documents.identity.file) {
        throw new Error('Please upload your identity document (SA ID, Passport, Driving Licence, or Temporary ID)');
      }

      if (identityAlreadyVerified && !documents.address.file) {
        throw new Error('Please upload your proof of address (utility bill, bank statement, or municipal account)');
      }

      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      setProcessingPhase('verifying');

      const formData = new FormData();
      if (documents.identity.file) {
        formData.append('identityDocument', documents.identity.file);
      }
      if (documents.address.file) {
        formData.append('addressDocument', documents.address.file);
      }
      formData.append('retryCount', String(kycRetryCount));

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
        
        if (response.status === 401 || response.status === 403) {
          setError('Your session has expired. Please log in again.');
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success && (data.status === 'retry' || data.status === 'failed')) {
        const issues: string[] = data?.validation?.issues || [];
        const tips: string[] = identityAlreadyVerified ? [
          'Upload a clear photo of a utility bill, bank statement, or municipal account',
          'The document must be less than 3 months old',
          'Your name and address must be clearly visible',
          'Only images are supported (JPG/PNG), max 10MB'
        ] : [
          'Upload a clear photo of your SA ID book, passport, driver\'s licence or temporary ID',
          'Ensure the whole document is visible with good lighting (no glare)',
          `The name must match your profile: ${(user as any)?.name || ''}`.trim(),
          'Only images are supported (JPG/PNG), max 10MB'
        ];
        setKycFeedback({
          title: data.message || "We couldn't verify your document yet",
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

      if (updateKYCStatus && data.success && data.status === 'approved') {
        try {
          await updateKYCStatus('verified');
        } catch (statusError) {
          console.error('Failed to update KYC status in context:', statusError);
        }
      }

      if (refreshUserStatus) {
        try {
          await refreshUserStatus();
        } catch (_) { /* non-critical */ }
      }

      navigate('/kyc/status');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsLoading(false);
      setProcessingPhase('idle');
    }
  };

  const isSubmitDisabled = !currentFile || isLoading;

  const tierBadgeColors: Record<number, { bg: string; text: string; label: string }> = {
    0: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Tier 0 — Basic' },
    1: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Tier 1 — ID Verified' },
    2: { bg: 'bg-green-100', text: 'text-green-800', label: 'Tier 2 — Fully Verified' }
  };

  const currentBadge = kycTier != null ? tierBadgeColors[kycTier] : null;

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)' }} className="bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* Header Section */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1.5rem' }}>
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
              {identityAlreadyVerified ? 'Step 2: Proof of Address' : 'Step 1: Verify Your ID'}
            </h1>
            <p className="text-white/90" style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-base)', 
              fontWeight: 'var(--font-weight-normal)' 
            }}>
              {identityAlreadyVerified
                ? 'Upload proof of address to unlock higher limits and international transfers'
                : 'Upload your SA ID, passport, or driver\'s licence to activate your wallet'}
            </p>
          </div>

          {/* Current Tier Badge */}
          {currentBadge && (
            <div className="flex justify-center mb-4">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${currentBadge.bg} ${currentBadge.text}`}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)' }}>
                <Shield className="w-3.5 h-3.5" />
                {currentBadge.label}
              </span>
            </div>
          )}

          {/* Step Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)' 
              }}>
                Step {currentStep} of 2
              </span>
              <span className="text-white/80" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)' 
              }}>
                {currentFile ? 'Ready to submit' : 'Upload required'}
              </span>
            </div>
            <Progress 
              value={identityAlreadyVerified ? (currentFile ? 100 : 50) : (currentFile ? 50 : 0)}
              className="h-2 bg-white/20"
            />
          </div>
        </div>

        {/* Documents Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          {kycFeedback && (
            <Card className="bg-white border border-gray-200 mb-4" style={{ 
              borderRadius: 'var(--mobile-border-radius)',
              boxShadow: 'var(--mobile-shadow)'
            }}>
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
                          setKycFeedback(null);
                          if (identityAlreadyVerified) {
                            addressFileRef.current?.click();
                          } else {
                            identityFileRef.current?.click();
                          }
                        }}
                        className="bg-[#86BE41] hover:bg-[#7AB139]"
                      >
                        Try Again
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setKycFeedback(null);
                          handleRemoveDocument(identityAlreadyVerified ? 'address' : 'identity');
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
            {/* Identity Document Upload Card */}
            {needsIdentity ? (
              <Card className="bg-white border border-gray-200" style={{ 
                borderRadius: 'var(--mobile-border-radius)',
                boxShadow: 'var(--mobile-shadow)'
              }}>
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
                    Upload your SA ID book, passport, driver's licence or temporary ID
                  </p>
                </CardHeader>
                <CardContent>
                  {documents.identity.file ? (
                    <div className="space-y-3">
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
                      <Button
                        onClick={() => handleFileUpload('identity')}
                        variant="outline"
                        className="w-full border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
                        style={{ 
                          height: 'var(--mobile-touch-target)',
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)',
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Add Identity Document
                      </Button>
                      
                      <p className="text-xs text-gray-500 text-center" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)' 
                      }}>
                        Accepted: JPG, PNG (Max 10MB)
                      </p>
                    </div>
                  )}
                  
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
            ) : (
              /* Identity Already Verified - Show completed state */
              <Card className="bg-white border border-green-200" style={{ 
                borderRadius: 'var(--mobile-border-radius)',
                boxShadow: 'var(--mobile-shadow)'
              }}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 rounded-xl w-10 h-10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                        fontWeight: 'var(--font-weight-bold)', 
                        color: '#1f2937' 
                      }}>
                        Identity Document
                      </p>
                      <p className="text-green-600" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)', 
                        fontWeight: 'var(--font-weight-medium)' 
                      }}>
                        Verified
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proof of Address Upload Card — only visible after ID is verified (Tier 1+) */}
            {identityAlreadyVerified && (
              <Card className="bg-white border border-gray-200" style={{ 
                borderRadius: 'var(--mobile-border-radius)',
                boxShadow: 'var(--mobile-shadow)'
              }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: '#1f2937' 
                  }}>
                    <div className="bg-gradient-to-r from-[#86BE41]/20 to-[#2D8CCA]/20 rounded-xl w-10 h-10 flex items-center justify-center">
                      <Home className="w-5 h-5 text-[#2D8CCA]" />
                    </div>
                    Proof of Address
                    {documents.address.file && (
                      <Check className="w-5 h-5 text-green-500 ml-auto" />
                    )}
                  </CardTitle>
                  <p className="text-gray-600" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-small)', 
                    fontWeight: 'var(--font-weight-normal)' 
                  }}>
                    Utility bill, bank statement, or municipal account (less than 3 months old)
                  </p>
                </CardHeader>
                <CardContent>
                  {documents.address.file ? (
                    <div className="space-y-3">
                      <div className="relative bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-[#2D8CCA] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              fontSize: 'var(--mobile-font-small)', 
                              fontWeight: 'var(--font-weight-medium)' 
                            }}>
                              {documents.address.file.name}
                            </p>
                            <p className="text-gray-500" style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              fontSize: 'var(--mobile-font-small)' 
                            }}>
                              {(documents.address.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveDocument('address')}
                            className="p-1 hover:bg-gray-200 rounded touch-target"
                            style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>

                        {documents.address.preview && (
                          <div className="mt-3">
                            <img 
                              src={documents.address.preview} 
                              alt="Proof of address preview"
                              className="w-full h-32 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => handleFileUpload('address')}
                        variant="outline"
                        className="w-full border-[#2D8CCA] text-[#2D8CCA] hover:bg-[#2D8CCA] hover:text-white"
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
                      <Button
                        onClick={() => handleFileUpload('address')}
                        variant="outline"
                        className="w-full border-[#2D8CCA] text-[#2D8CCA] hover:bg-[#2D8CCA] hover:text-white"
                        style={{ 
                          height: 'var(--mobile-touch-target)',
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-base)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)',
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Add Proof of Address
                      </Button>
                      
                      <p className="text-xs text-gray-500 text-center" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)' 
                      }}>
                        Accepted: JPG, PNG (Max 10MB)
                      </p>
                    </div>
                  )}
                  
                  <input
                    ref={addressFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('address', file);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* How It Works */}
            <Card className="bg-white/95 border border-white/50" style={{ 
              borderRadius: 'var(--mobile-border-radius)',
              boxShadow: 'var(--mobile-shadow)'
            }}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937', marginBottom: '0.5rem' }}>
                  How verification works
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {identityAlreadyVerified ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#86BE41]" />
                    )}
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: identityAlreadyVerified ? '#16a34a' : '#1f2937' }}>
                      Step 1: Upload your ID — activates your wallet
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-[#2D8CCA]" />
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)', color: identityAlreadyVerified ? '#1f2937' : '#9ca3af' }}>
                      Step 2: Upload proof of address — unlocks higher limits
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processing Overlay */}
            {isLoading && processingPhase !== 'idle' && (
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: '32px 28px',
                  maxWidth: 320,
                  width: '90%',
                  textAlign: 'center',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                  fontFamily: 'Montserrat, sans-serif'
                }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    margin: '0 auto 16px',
                    border: '4px solid #e5e7eb',
                    borderTopColor: '#2D8CCA',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#1f2937',
                    margin: '0 0 8px'
                  }}>
                    {processingPhase === 'uploading' ? 'Uploading Document...' : 'Verifying Your Identity'}
                  </h3>
                  <p style={{
                    fontSize: 13,
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}>
                    {processingPhase === 'uploading'
                      ? 'Please wait while we upload your document.'
                      : 'Please wait, we\'re processing your document. This may take a few moments.'}
                  </p>
                  {processingPhase === 'uploading' && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{
                        height: 6,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${uploadProgress}%`,
                          background: 'linear-gradient(90deg, #86BE41, #2D8CCA)',
                          borderRadius: 3,
                          transition: 'width 0.15s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                  <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Verifying...</span>
                </>
              ) : (
                <span style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {identityAlreadyVerified ? 'Verify Proof of Address' : 'Verify My ID'}
                </span>
              )}
            </Button>

            {/* Help Section */}
            <Card className="bg-white border border-gray-200" style={{ 
              borderRadius: 'var(--mobile-border-radius)',
              boxShadow: 'var(--mobile-shadow)'
            }}>
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
                      {identityAlreadyVerified
                        ? 'Upload a clear photo of a recent utility bill, bank statement, or municipal account.'
                        : 'Take a clear photo of your SA ID, passport, or driver\'s licence. Make sure all text is readable.'}
                    </p>
                    
                    <div className="space-y-2 text-xs text-gray-600" style={{ 
                      fontFamily: 'Montserrat, sans-serif', 
                      fontSize: 'var(--mobile-font-small)' 
                    }}>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Clear, high-quality image with good lighting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>All text must be readable (no blur or glare)</span>
                      </div>
                      {identityAlreadyVerified ? (
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-500" />
                          <span>Document must be less than 3 months old</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-500" />
                          <span>Name must match your registration: {(user as any)?.name || ''}</span>
                        </div>
                      )}
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
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}
