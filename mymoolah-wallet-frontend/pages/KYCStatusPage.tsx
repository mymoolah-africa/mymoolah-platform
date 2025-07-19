import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Shield, 
  ArrowRight,
  FileText,
  Camera,
  Upload,
  Loader2,
  X,
  Info
} from 'lucide-react';

type KYCStatus = 'pending' | 'documents_uploaded' | 'processing' | 'verified' | 'rejected';

interface KYCStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'current' | 'error';
  icon: React.ReactNode;
}

export function KYCStatusPage() {
  const { user, updateKYCStatus } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if already verified
  if (user.kycStatus === 'verified') {
    return <Navigate to="/dashboard" replace />;
  }

  const getKYCSteps = (): KYCStep[] => {
    const steps: KYCStep[] = [
      {
        id: 'account-created',
        title: 'Account Created',
        description: 'Your MyMoolah account has been successfully created',
        status: 'completed',
        icon: <CheckCircle className="w-5 h-5 text-green-500" />
      },
      {
        id: 'documents-upload',
        title: 'Upload Documents',
        description: 'Upload your ID and proof of address',
        status: user.kycStatus === 'pending' ? 'current' : 'completed',
        icon: user.kycStatus === 'pending' ? <Upload className="w-5 h-5 text-blue-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />
      },
      {
        id: 'verification',
        title: 'Verification',
        description: 'We\'re verifying your documents',
        status: user.kycStatus === 'documents_uploaded' || user.kycStatus === 'processing' ? 'current' : 'pending',
        icon: user.kycStatus === 'verified' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-blue-500" />
      },
      {
        id: 'approved',
        title: 'Approved',
        description: 'Your account is fully verified',
        status: user.kycStatus === 'verified' ? 'completed' : 'pending',
        icon: user.kycStatus === 'verified' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Shield className="w-5 h-5 text-gray-400" />
      }
    ];

    return steps;
  };

  const getProgressPercentage = (): number => {
    switch (user.kycStatus) {
      case 'pending':
        return 25;
      case 'documents_uploaded':
        return 50;
      case 'processing':
        return 75;
      case 'verified':
        return 100;
      case 'rejected':
        return 50;
      default:
        return 0;
    }
  };

  const getStatusMessage = (): { message: string; type: 'info' | 'warning' | 'success' | 'error' } => {
    switch (user.kycStatus) {
      case 'pending':
        return {
          message: 'Please upload your identity documents to continue',
          type: 'info'
        };
      case 'documents_uploaded':
        return {
          message: 'Documents uploaded successfully! Verification in progress...',
          type: 'success'
        };
      case 'processing':
        return {
          message: 'We\'re currently verifying your documents. This usually takes 24-48 hours.',
          type: 'info'
        };
      case 'rejected':
        return {
          message: 'Document verification failed. Please upload new documents.',
          type: 'error'
        };
      default:
        return {
          message: 'Please complete your KYC verification',
          type: 'warning'
        };
    }
  };

  const handleUploadDocuments = () => {
    navigate('/kyc/documents');
  };

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  const steps = getKYCSteps();
  const progress = getProgressPercentage();
  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      {/* Mobile Container */}
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] min-h-screen flex flex-col">
        {/* Header Section */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1rem' }}>
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
              KYC Verification
            </h1>
            <p className="text-white/90" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
              Complete your verification to unlock all features
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          {/* Progress Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl mb-4" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardHeader className="text-center pb-4">
              <CardTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937' }}>
                Verification Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                    {progress}% Complete
                  </span>
                  <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)', fontWeight: 'var(--font-weight-medium)' }}>
                    Step {Math.ceil(progress / 25)} of 4
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Status Alert */}
              <Alert className={`border-0 ${
                statusInfo.type === 'success' ? 'bg-green-50 text-green-800' :
                statusInfo.type === 'error' ? 'bg-red-50 text-red-800' :
                statusInfo.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                'bg-blue-50 text-blue-800'
              }`}>
                {statusInfo.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : statusInfo.type === 'error' ? (
                  <X className="h-4 w-4" />
                ) : statusInfo.type === 'warning' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <AlertDescription style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
                  {statusInfo.message}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Steps Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl mb-4" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
            <CardHeader className="pb-4">
              <CardTitle style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: 'var(--font-weight-bold)', color: '#1f2937' }}>
                Verification Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-3">
                    {/* Step Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === 'completed' ? 'bg-green-100' :
                      step.status === 'current' ? 'bg-blue-100' :
                      step.status === 'error' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {step.icon}
                    </div>
                    
                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium ${
                        step.status === 'completed' ? 'text-green-900' :
                        step.status === 'current' ? 'text-blue-900' :
                        step.status === 'error' ? 'text-red-900' :
                        'text-gray-500'
                      }`} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)', fontWeight: 'var(--font-weight-medium)' }}>
                        {step.title}
                      </h3>
                      <p className={`text-xs ${
                        step.status === 'completed' ? 'text-green-700' :
                        step.status === 'current' ? 'text-blue-700' :
                        step.status === 'error' ? 'text-red-700' :
                        'text-gray-400'
                      }`} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            {user.kycStatus === 'pending' && (
              <Button
                onClick={handleUploadDocuments}
                className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
                style={{ 
                  height: 'var(--mobile-touch-target)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  borderRadius: 'var(--mobile-border-radius)'
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            )}

            {user.kycStatus === 'documents_uploaded' && (
              <Button
                onClick={handleContinueToDashboard}
                className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
                style={{ 
                  height: 'var(--mobile-touch-target)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  borderRadius: 'var(--mobile-border-radius)'
                }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue to Dashboard
              </Button>
            )}

            {user.kycStatus === 'processing' && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 text-white/90 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-base)' }}>
                    Verification in progress...
                  </span>
                </div>
                <p className="text-white/70" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
                  This usually takes 24-48 hours. We'll notify you when complete.
                </p>
              </div>
            )}

            {user.kycStatus === 'rejected' && (
              <Button
                onClick={handleUploadDocuments}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                style={{ 
                  height: 'var(--mobile-touch-target)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  borderRadius: 'var(--mobile-border-radius)'
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Documents
              </Button>
            )}
          </div>

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