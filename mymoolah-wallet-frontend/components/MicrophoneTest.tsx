import React, { useState, useEffect } from 'react';
import { Mic, MicOff, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { detectBrowserSupport, isVoiceInputSupported } from '../utils/browserSupport';

export const MicrophoneTest: React.FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [browserSupport] = useState(() => detectBrowserSupport());

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionStatus(permission.state);
          
          permission.onchange = () => {
            setPermissionStatus(permission.state);
          };
        } catch (permError) {
          console.warn('Permission query failed:', permError);
          setPermissionStatus('unknown');
        }
      } else {
        console.warn('Permission API not supported');
        setPermissionStatus('unknown');
      }
    } catch (error) {
      console.warn('Permission API not supported');
      setPermissionStatus('unknown');
    }
  };

  const requestMicrophoneAccess = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setErrorMessage('');

      // Check browser support
      if (!isVoiceInputSupported()) {
        const support = detectBrowserSupport();
        setTestResult('error');
        setErrorMessage(`Browser not supported: ${support.recommendations[0]}`);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Test if we can actually get audio data
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Check if we're getting audio data
      const hasAudio = dataArray.some(value => value > 0);
      
      if (hasAudio) {
        setTestResult('success');
        setPermissionStatus('granted');
      } else {
        setTestResult('error');
        setErrorMessage('Microphone detected but no audio input detected. Please check if your microphone is working.');
      }
      
      // Cleanup
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
    } catch (error: any) {
      console.error('Microphone test failed:', error);
      setTestResult('error');
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please allow microphone access in your browser.');
        setPermissionStatus('denied');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('Microphone is in use by another application. Please close other apps using the microphone.');
      } else {
        setErrorMessage(`Microphone error: ${error.message}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'prompt':
        return <Info className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Microphone access granted';
      case 'denied':
        return 'Microphone access denied';
      case 'prompt':
        return 'Microphone permission not yet requested';
      default:
        return 'Microphone permission status unknown';
    }
  };

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'text-green-600';
      case 'denied':
        return 'text-red-600';
      case 'prompt':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Microphone Test</h3>
      
      {/* Status Display */}
      <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
        {getStatusIcon()}
        <div>
          <div className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          <div className="text-sm text-gray-600">
            This helps diagnose voice input issues
          </div>
        </div>
      </div>

      {/* Test Button */}
      <div className="mb-4">
        <button
          onClick={requestMicrophoneAccess}
          disabled={isTesting}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            isTesting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isTesting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Testing Microphone...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>Test Microphone</span>
            </div>
          )}
        </button>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={`p-3 rounded-lg ${
          testResult === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {testResult === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={`font-medium ${
              testResult === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult === 'success' ? 'Test Successful!' : 'Test Failed'}
            </span>
          </div>
          
          {testResult === 'success' ? (
            <div className="mt-2 text-sm text-green-700">
              Your microphone is working correctly and ready for voice input!
            </div>
          ) : (
            <div className="mt-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Troubleshooting Tips */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Troubleshooting Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Make sure you're using Chrome, Edge, or Safari</li>
          <li>• Check that your microphone is not muted</li>
          <li>• Allow microphone access when prompted</li>
          <li>• Close other applications that might be using the microphone</li>
          <li>• Try refreshing the page if issues persist</li>
        </ul>
      </div>

      {/* Browser Info */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">Your Browser:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>Browser:</strong> {browserSupport.browser} {browserSupport.version}</div>
          <div><strong>Speech Recognition:</strong> {browserSupport.supportsSpeechRecognition ? '✅ Supported' : '❌ Not Supported'}</div>
          <div><strong>Microphone Access:</strong> {browserSupport.supportsMediaDevices ? '✅ Supported' : '❌ Not Supported'}</div>
          <div><strong>Permissions API:</strong> {browserSupport.supportsPermissions ? '✅ Supported' : '❌ Not Supported'}</div>
          <div><strong>HTTPS:</strong> {browserSupport.isHTTPS ? '✅ Secure' : browserSupport.isLocalhost ? '✅ Localhost' : '❌ Required'}</div>
          <div><strong>Overall Support:</strong> {browserSupport.isSupported ? '✅ Compatible' : '❌ Limited Support'}</div>
        </div>
      </div>
      
      {/* Browser Compatibility */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">Recommended Browsers:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>✅ Chrome 88+ - Full support</div>
          <div>✅ Edge 88+ - Full support</div>
          <div>✅ Safari 14.1+ - Full support</div>
          <div>⚠️ Firefox 75+ - Partial support</div>
          <div>❌ Internet Explorer - Not supported</div>
        </div>
      </div>
    </div>
  );
};

export default MicrophoneTest;
