import React, { useState, useRef } from 'react';
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
  const { user, updateKYCStatus } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // File input refs for manual file selection
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

  // Camera capture state
  const [showCamera, setShowCamera] = useState(false);
  const [activeDocumentType, setActiveDocumentType] = useState<DocumentType>('identity');

  // Redirect if already verified
  if (user?.kycStatus === 'verified') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleFileSelect = (type: DocumentType, file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Create preview for images
    let preview = null;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }

    setDocuments(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        file,
        preview,
        status: 'uploaded',
        error: undefined
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
    const fileRef = type === 'identity' ? identityFileRef : addressFileRef;
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
      // Validate both documents are uploaded
      if (!documents.identity.file) {
        throw new Error('Please upload your identity document (SAID or Passport)');
      }
      
      if (!documents.address.file) {
        throw new Error('Please upload your proof of address document');
      }

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Create FormData for file upload (backend integration)
      const formData = new FormData();
      formData.append('identityDocument', documents.identity.file);
      formData.append('addressDocument', documents.address.file);
      formData.append('userId', user?.id || '');

      // TODO: Replace with actual API call to your backend
      // const response = await fetch('/api/kyc/upload-documents', {
      //   method: 'POST',
      //   body: formData,
      //   headers: {
      //     'Authorization': `Bearer ${getAuthToken()}`
      //   }
      // });

      // Simulate API success
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update user KYC status in context
      if (updateKYCStatus) {
        updateKYCStatus('documents_uploaded');
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
    return type === 'identity' ? 'Identity Document' : 'Proof of Address';
  };

  const getDocumentDescription = (type: DocumentType) => {
    if (type === 'identity') {
      return 'Upload your South African ID document or Passport';
    }
    return 'Upload a utility bill, bank statement, or municipal rates notice';
  };

  const isSubmitDisabled = !documents.identity.file || !documents.address.file || isLoading;

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
                {Object.values(documents).filter(doc => doc.file).length}/2
              </span>
            </div>
            <Progress 
              value={(Object.values(documents).filter(doc => doc.file).length / 2) * 100}
              className="h-2 bg-white/20"
            />
          </div>
        </div>

        {/* Documents Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          {error && (
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
                      Accepted: JPG, PNG, PDF (Max 10MB)
                    </p>
                  </div>
                )}
                
                {/* Hidden File Input */}
                <input
                  ref={identityFileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('identity', file);
                  }}
                />
              </CardContent>
            </Card>

            {/* Proof of Address Upload */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
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
                  Upload utility bill, bank statement, or municipal rates notice (last 3 months)
                </p>
              </CardHeader>
              <CardContent>
                {documents.address.file ? (
                  <div className="space-y-3">
                    {/* Document Preview */}
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
                      
                      {/* Image Preview */}
                      {documents.address.preview && (
                        <div className="mt-3">
                          <img 
                            src={documents.address.preview} 
                            alt="Address document preview"
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
                    {/* Upload Options */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleCameraCapture('address')}
                        variant="outline"
                        className="h-20 flex-col border-[#2D8CCA] text-[#2D8CCA] hover:bg-[#2D8CCA] hover:text-white"
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
                        onClick={() => handleFileUpload('address')}
                        variant="outline"
                        className="h-20 flex-col border-[#2D8CCA] text-[#2D8CCA] hover:bg-[#2D8CCA] hover:text-white"
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
                      Accepted: JPG, PNG, PDF (Max 10MB)
                    </p>
                  </div>
                )}
                
                {/* Hidden File Input */}
                <input
                  ref={addressFileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('address', file);
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
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Camera Capture
              </DialogTitle>
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