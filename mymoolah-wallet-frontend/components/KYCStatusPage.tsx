import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { 
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Shield,
  FileText,
  Eye,
  Loader2
} from 'lucide-react';
import { getToken } from '../utils/authToken';

type KYCStatus = 'not_started' | 'documents_uploaded' | 'under_review' | 'verified' | 'rejected';

interface StatusStage {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  icon: React.ReactNode;
}

export function KYCStatusPage() {
  const { user, refreshUserStatus } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('2-5 minutes');

  const getStatusStages = (currentStatus: KYCStatus): StatusStage[] => {
    const stages: StatusStage[] = [
      {
        id: 'upload',
        title: 'Documents Uploaded',
        description: 'Your identity and address documents have been received',
        status: currentStatus === 'not_started' ? 'pending' : 'completed',
        icon: <FileText className="w-5 h-5" />
      },
      {
        id: 'review',
        title: 'Under Review',
        description: 'Our team is verifying your documents using secure OCR technology',
        status: currentStatus === 'under_review' ? 'current' : 
                currentStatus === 'verified' || currentStatus === 'rejected' ? 'completed' : 'pending',
        icon: <Eye className="w-5 h-5" />
      },
      {
        id: 'complete',
        title: currentStatus === 'rejected' ? 'Action Required' : 'Verification Complete',
        description: currentStatus === 'rejected' ? 
          'Some documents need to be re-submitted' : 
          'Your identity has been verified successfully',
        status: currentStatus === 'verified' ? 'completed' : 
                currentStatus === 'rejected' ? 'current' : 'pending',
        icon: currentStatus === 'rejected' ? 
          <AlertTriangle className="w-5 h-5" /> : 
          <CheckCircle className="w-5 h-5" />
      }
    ];

    return stages;
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      // Real API call to check verification status
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/kyc/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch KYC status');
      }

      const data = await response.json();
      
      // Update user status if available
      if (refreshUserStatus) {
        await refreshUserStatus();
      }
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getProgressValue = (status: KYCStatus): number => {
    switch (status) {
      case 'not_started': return 0;
      case 'documents_uploaded': return 33;
      case 'under_review': return 66;
      case 'verified': return 100;
      case 'rejected': return 50;
      default: return 0;
    }
  };

  const getStatusColor = (status: KYCStatus): string => {
    switch (status) {
      case 'verified': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'under_review': return 'text-[#2D8CCA]';
      default: return 'text-gray-600';
    }
  };

  const getStatusMessage = (status: KYCStatus): string => {
    switch (status) {
      case 'documents_uploaded':
        return 'Your documents have been uploaded and are queued for review.';
      case 'under_review':
        return 'Our verification team is currently reviewing your documents.';
      case 'verified':
        return 'Congratulations! Your identity has been verified. You are now at Tier 1 with transaction limits up to R4,999.99 per transaction.';
      case 'rejected':
        return 'Some documents need to be re-submitted for verification.';
      default:
        return 'Please upload your documents to begin verification.';
    }
  };

  const currentStatus = user?.kycStatus || 'not_started';
  const stages = getStatusStages(currentStatus);
  const progressValue = getProgressValue(currentStatus);

  // Auto-refresh for pending statuses - poll faster (every 2 seconds) for better UX
  useEffect(() => {
    if (currentStatus === 'documents_uploaded' || currentStatus === 'under_review') {
      const interval = setInterval(() => {
        handleRefreshStatus();
      }, 2000); // Refresh every 2 seconds (faster than 30s for better UX)

      return () => clearInterval(interval);
    }
  }, [currentStatus]);

  // Auto-navigate to dashboard when KYC is verified
  useEffect(() => {
    if (currentStatus === 'verified' && refreshUserStatus) {
      // Refresh user status first, then navigate
      refreshUserStatus().then(() => {
        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      });
    }
  }, [currentStatus, navigate, refreshUserStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      {/* Mobile Container */}
      <div className="max-w-sm mx-auto bg-gradient-to-br from-[#86BE41] to-[#2D8CCA] min-h-screen flex flex-col">
        {/* Header Section */}
        <div style={{ padding: 'var(--mobile-padding)', paddingTop: '2rem', paddingBottom: '1.5rem' }}>
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate(currentStatus === 'verified' ? '/dashboard' : '/kyc/documents')}
              className="inline-flex items-center text-white/90 hover:text-white transition-colors touch-target"
              style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)',
                minHeight: 'var(--mobile-touch-target)'
              }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>{currentStatus === 'verified' ? 'Back to Dashboard' : 'Back to Documents'}</span>
            </button>
          </div>

          {/* Status Icon and Title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
              {currentStatus === 'verified' ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : currentStatus === 'rejected' ? (
                <AlertTriangle className="w-8 h-8 text-white" />
              ) : currentStatus === 'under_review' ? (
                <Eye className="w-8 h-8 text-white" />
              ) : (
                <Shield className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              {currentStatus === 'verified' ? 'Verification Complete!' : 
               currentStatus === 'rejected' ? 'Action Required' :
               currentStatus === 'under_review' ? 'Under Review' :
               'Verification Status'}
            </h1>
            <p className="text-white/90" style={{ 
              fontFamily: 'Montserrat, sans-serif', 
              fontSize: 'var(--mobile-font-base)', 
              fontWeight: 'var(--font-weight-normal)' 
            }}>
              {getStatusMessage(currentStatus)}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)' 
              }}>
                Verification Progress
              </span>
              <span className="text-white/80" style={{ 
                fontFamily: 'Montserrat, sans-serif', 
                fontSize: 'var(--mobile-font-small)' 
              }}>
                {progressValue}%
              </span>
            </div>
            <Progress 
              value={progressValue}
              className="h-2 bg-white/20"
            />
          </div>

          {/* Refresh Button for Pending Statuses */}
          {(currentStatus === 'documents_uploaded' || currentStatus === 'under_review') && (
            <div className="text-center">
              <Button
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                variant="outline"
                className="text-white border-white/30 hover:bg-white/10"
                style={{ 
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                {isRefreshing ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" />Check Status</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Status Stages Section */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)', paddingBottom: '2rem' }}>
          <div className="space-y-4">
            {/* Status Timeline */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardHeader>
                <CardTitle style={{ 
                  fontFamily: 'Montserrat, sans-serif', 
                  fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: '#1f2937' 
                }}>
                  Verification Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stages.map((stage, index) => (
                    <div key={stage.id} className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        stage.status === 'completed' ? 'bg-green-100 text-green-600' :
                        stage.status === 'current' ? 'bg-[#2D8CCA]/10 text-[#2D8CCA]' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {stage.status === 'completed' && stage.id !== 'complete' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          stage.icon
                        )}
                      </div>

                      {/* Status Content */}
                      <div className="flex-1 min-w-0">
                        <h4 style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)', 
                          fontWeight: 'var(--font-weight-medium)',
                          color: stage.status === 'current' ? '#2D8CCA' : '#1f2937'
                        }}>
                          {stage.title}
                        </h4>
                        <p className="text-gray-600 mt-1" style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-small)', 
                          fontWeight: 'var(--font-weight-normal)' 
                        }}>
                          {stage.description}
                        </p>
                        
                        {/* Current Stage Indicator */}
                        {stage.status === 'current' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#2D8CCA]" />
                            <span className="text-[#2D8CCA]" style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              fontSize: 'var(--mobile-font-small)' 
                            }}>
                              Estimated time: {estimatedTime}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Connector Line */}
                      {index < stages.length - 1 && (
                        <div className={`absolute left-5 w-0.5 h-6 mt-10 ${
                          stage.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* KYC Tier Information - Only show for verified users */}
            {currentStatus === 'verified' && (
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
                <CardHeader>
                  <CardTitle style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: '#1f2937' 
                  }}>
                    Your KYC Tier & Limits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Current Tier Display */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-base)', 
                            fontWeight: 'var(--font-weight-bold)', 
                            color: '#1f2937'
                          }}>
                            Tier 1 - Basic Verification
                          </h4>
                          <p style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-small)', 
                            fontWeight: 'var(--font-weight-normal)', 
                            color: '#6b7280'
                          }}>
                            ID document verified
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-600 font-semibold" style={{ 
                          fontFamily: 'Montserrat, sans-serif', 
                          fontSize: 'var(--mobile-font-base)'
                        }}>
                          ACTIVE
                        </div>
                      </div>
                    </div>

                    {/* Transaction Limits */}
                    <div className="space-y-3">
                      <h5 style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)', 
                        fontWeight: 'var(--font-weight-bold)', 
                        color: '#374151'
                      }}>
                        Transaction Limits
                      </h5>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-blue-600 font-semibold" style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-small)'
                          }}>
                            Per Transaction
                          </div>
                          <div className="text-blue-800 font-bold" style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-base)'
                          }}>
                            R4,999.99
                          </div>
                        </div>
                        
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-green-600 font-semibold" style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-small)'
                          }}>
                            Monthly Limit
                          </div>
                          <div className="text-green-800 font-bold" style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-base)'
                          }}>
                            R29,999.99
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade to Tier 2 Info */}
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-amber-600 text-sm">💡</span>
                        </div>
                        <div>
                          <h6 style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-small)', 
                            fontWeight: 'var(--font-weight-bold)', 
                            color: '#92400e'
                          }}>
                            Upgrade to Tier 2
                          </h6>
                          <p style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            fontSize: 'var(--mobile-font-small)', 
                            fontWeight: 'var(--font-weight-normal)', 
                            color: '#92400e'
                          }}>
                            Upload proof of address to unlock higher limits: R100,000 per transaction, R500,000 monthly.
                          </p>
                          <Button
                            onClick={() => navigate('/kyc/documents')}
                            variant="outline"
                            size="sm"
                            className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                            style={{ 
                              fontFamily: 'Montserrat, sans-serif',
                              fontSize: 'var(--mobile-font-small)',
                              fontWeight: 'var(--font-weight-medium)'
                            }}
                          >
                            Upload POA Document
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {currentStatus === 'verified' && (
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
                  style={{ 
                    height: 'var(--mobile-touch-target)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                >
                  Continue to Dashboard
                </Button>
              )}

              {currentStatus === 'rejected' && (
                <Button
                  onClick={() => navigate('/kyc/documents')}
                  className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA] hover:from-[#7AB139] hover:to-[#2680B8] text-white"
                  style={{ 
                    height: 'var(--mobile-touch-target)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                >
                  Re-submit Documents
                </Button>
              )}

              {(currentStatus === 'documents_uploaded' || currentStatus === 'under_review') && (
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="w-full border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
                  style={{ 
                    height: 'var(--mobile-touch-target)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'var(--mobile-font-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--mobile-border-radius)'
                  }}
                >
                  Return to Dashboard
                </Button>
              )}
            </div>

            {/* Help & Support */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
              <CardContent style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
                <div className="text-center space-y-3">
                  <Shield className="w-8 h-8 mx-auto text-[#86BE41]" />
                  <h3 style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-base)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: '#1f2937'
                  }}>
                    Your Data is Secure
                  </h3>
                  <p className="text-gray-600" style={{ 
                    fontFamily: 'Montserrat, sans-serif', 
                    fontSize: 'var(--mobile-font-small)', 
                    fontWeight: 'var(--font-weight-normal)' 
                  }}>
                    We use bank-grade encryption and secure OCR technology to verify your documents. Your personal information is protected and never shared without consent.
                  </p>
                  
                  {(currentStatus === 'documents_uploaded' || currentStatus === 'under_review') && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-[#2D8CCA]" style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        fontSize: 'var(--mobile-font-small)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}>
                        💡 While you wait, you can still browse your wallet and make deposits. Full transaction features will be unlocked once verification is complete.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}