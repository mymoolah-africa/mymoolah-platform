import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../utils/authToken';

interface KYCDocumentUploadProps {
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'retry';
  message: string;
  issues?: string[];
  acceptedDocuments?: string[];
}

const KYCDocumentUpload: React.FC<KYCDocumentUploadProps> = ({ 
  onUploadSuccess, 
  onUploadError 
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'id_document' | 'proof_of_address'>('id_document');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: ''
  });
  const [retryCount, setRetryCount] = useState<number>(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setUploadStatus({
          status: 'error',
          message: 'Invalid file type. Please upload a JPEG, PNG, or PDF file.'
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setUploadStatus({
          status: 'error',
          message: 'File too large. Please upload a file smaller than 5MB.'
        });
        return;
      }

      setSelectedFile(file);
      setUploadStatus({
        status: 'idle',
        message: `Selected: ${file.name}`
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({
        status: 'error',
        message: 'Please select a file to upload.'
      });
      return;
    }

    setUploadStatus({
      status: 'uploading',
      message: 'Uploading document...'
    });

    try {
      const formData = new FormData();
      formData.append('identityDocument', selectedFile);
              formData.append('userId', user?.id || '1'); // Get from auth context
      formData.append('retryCount', retryCount.toString());

      const response = await fetch('/api/v1/kyc/upload-documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadStatus({
          status: 'success',
          message: 'Document uploaded and verified successfully!'
        });
        setRetryCount(0); // Reset retry count on success
        onUploadSuccess?.();
      } else if (result.status === 'retry') {
        setRetryCount(result.retryCount || retryCount + 1);
        setUploadStatus({
          status: 'retry',
          message: result.message,
          issues: result.issues,
          acceptedDocuments: result.acceptedDocuments
        });
      } else if (result.escalateToSupport) {
        setUploadStatus({
          status: 'error',
          message: result.message,
          issues: result.issues,
          acceptedDocuments: result.acceptedDocuments
        });
        onUploadError?.(result.message);
      } else {
        setUploadStatus({
          status: 'error',
          message: result.message || 'Upload failed. Please try again.'
        });
        onUploadError?.(result.message);
      }
    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
      onUploadError?.('Network error');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setRetryCount(0);
    setUploadStatus({
      status: 'idle',
      message: ''
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          KYC Verification Required
        </h3>
        <p className="text-sm text-gray-600">
          Please upload your ID document (SA ID or Passport) to enable full wallet functionality.
        </p>
      </div>

      {/* Document Type - Fixed to ID Document Only */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Type
        </label>
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
          ID Document / Passport (Required)
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Proof of address requirement is temporarily disabled
        </p>
      </div>

      {/* File Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Document
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG, or PDF (max 5MB)
            </p>
          </label>
        </div>
        {selectedFile && (
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <FileText className="h-4 w-4 mr-2" />
            {selectedFile.name}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploadStatus.status === 'uploading'}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploadStatus.status === 'uploading' ? 'Uploading...' : 'Upload Document'}
      </button>

      {/* Status Messages */}
      {uploadStatus.status !== 'idle' && (
        <div className={`mt-4 p-3 rounded-md ${
          uploadStatus.status === 'success' ? 'bg-green-50 text-green-800' :
          uploadStatus.status === 'error' ? 'bg-red-50 text-red-800' :
          uploadStatus.status === 'retry' ? 'bg-yellow-50 text-yellow-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          <div className="flex items-center">
            {uploadStatus.status === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
            {uploadStatus.status === 'error' && <X className="h-4 w-4 mr-2" />}
            {uploadStatus.status === 'retry' && <AlertCircle className="h-4 w-4 mr-2" />}
            <span className="text-sm">{uploadStatus.message}</span>
          </div>
          
          {uploadStatus.issues && uploadStatus.issues.length > 0 && (
            <ul className="mt-2 text-sm list-disc list-inside">
              {uploadStatus.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          )}

          {uploadStatus.acceptedDocuments && uploadStatus.acceptedDocuments.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">Accepted documents:</p>
              <ul className="text-sm list-disc list-inside">
                {uploadStatus.acceptedDocuments.map((doc, index) => (
                  <li key={index}>{doc}</li>
                ))}
              </ul>
            </div>
          )}

          {uploadStatus.status === 'retry' && (
            <button
              onClick={resetUpload}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again with a different document
            </button>
          )}

          {uploadStatus.status === 'error' && uploadStatus.message.includes('contact support') && (
            <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800">Support Escalation</p>
              <p className="text-xs text-red-700 mt-1">
                Your case has been escalated to support for manual verification. 
                You will be contacted within 24-48 hours.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KYCDocumentUpload; 