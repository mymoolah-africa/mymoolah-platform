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

      // Navigate to status page
      navigate('/kyc/status');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const getDocumentTypeText = (type: DocumentType) => {
    return type === 'identity' ? 'Identity Document' : 'Proof of Address';
  };

  const getDocumentDescription = (type: DocumentType) => {
    return type === 'identity' 
      ? 'Upload your SA ID or Passport' 
      : 'Upload a recent utility bill or bank statement';
  };

  const getAcceptedFormats = (type: DocumentType) => {
    return type === 'identity' 
      ? 'SA ID, Passport, Driver\'s License' 
      : 'Utility bill, Bank statement, Lease agreement';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      {/* Mobile Container */}
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] min-h-screen flex flex-col">
        {/* Header Section */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1rem' }}>
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-white/90 hover:text-white mb-4 touch-target"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
              Back
            </span>
          </button>

          {/* Logo Section */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <ImageWithFallback
                src="/src/assets/logo2.svg"
                alt="MyMoolah Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              Upload Documents
            </h1>
            <p className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
              Complete your KYC verification
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {isLoading && (
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl mb-4" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#86BE41]" />
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)' }}>
                    Uploading Documents...
                  </p>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    {uploadProgress}% Complete
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Identity Document Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl mb-4" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardHeader className="pb-4">
              <CardTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937' }}>
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#86BE41]" />
                  <span>Identity Document</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                Upload your SA ID, Passport, or Driver's License
              </p>
              
              {documents.identity.status === 'uploaded' ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Check className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)' }}>
                        Document Uploaded
                      </p>
                      <p className="text-xs text-green-700" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        {documents.identity.file?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveDocument('identity')}
                      className="text-red-500 hover:text-red-700 touch-target"
                      style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {documents.identity.preview && (
                    <div className="relative">
                      <img 
                        src={documents.identity.preview} 
                        alt="Document preview" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
                      Upload Identity Document
                    </p>
                    <p className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      Accepted: JPG, PNG, PDF (max 10MB)
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleFileUpload('identity')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Choose File
                      </Button>
                      <Button
                        onClick={() => handleCameraCapture('identity')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Camera
                      </Button>
                    </div>
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    ref={identityFileRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('identity', file);
                    }}
                    className="hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Document Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl mb-4" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardHeader className="pb-4">
              <CardTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937' }}>
                <div className="flex items-center space-x-2">
                  <Home className="w-5 h-5 text-[#86BE41]" />
                  <span>Proof of Address</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                Upload a recent utility bill or bank statement
              </p>
              
              {documents.address.status === 'uploaded' ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Check className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)' }}>
                        Document Uploaded
                      </p>
                      <p className="text-xs text-green-700" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        {documents.address.file?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveDocument('address')}
                      className="text-red-500 hover:text-red-700 touch-target"
                      style={{ minHeight: 'var(--mobile-touch-target)', minWidth: 'var(--mobile-touch-target)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {documents.address.preview && (
                    <div className="relative">
                      <img 
                        src={documents.address.preview} 
                        alt="Document preview" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
                      Upload Proof of Address
                    </p>
                    <p className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                      Accepted: JPG, PNG, PDF (max 10MB)
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleFileUpload('address')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Choose File
                      </Button>
                      <Button
                        onClick={() => handleCameraCapture('address')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'var(--mobile-font-small)',
                          fontWeight: 'var(--font-weight-medium)',
                          borderRadius: 'var(--mobile-border-radius)'
                        }}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Camera
                      </Button>
                    </div>
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    ref={addressFileRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('address', file);
                    }}
                    className="hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !documents.identity.file || !documents.address.file}
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
                <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Uploading...</span>
              </>
            ) : (
              <span style={{ fontFamily: 'Montserrat, sans-serif' }}>Submit Documents</span>
            )}
          </Button>

          {/* Security Information */}
          <div className="mt-6 p-4 bg-white/20 backdrop-blur-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-3">
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>Bank-Grade Security</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>FSCA Compliant</span>
                </div>
              </div>
              <p className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                Your documents are encrypted and stored securely
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 