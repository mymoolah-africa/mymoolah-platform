import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Languages, Settings, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { detectBrowserSupport, isVoiceInputSupported } from '../utils/browserSupport';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
}

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  confidence: number;
}

const SOUTH_AFRICAN_LANGUAGES: LanguageConfig[] = [
  { code: 'en-ZA', name: 'English (South Africa)', nativeName: 'English', confidence: 0.9 },
  { code: 'af-ZA', name: 'Afrikaans', nativeName: 'Afrikaans', confidence: 0.85 },
  { code: 'zu-ZA', name: 'isiZulu', nativeName: 'isiZulu', confidence: 0.8 },
  { code: 'xh-ZA', name: 'isiXhosa', nativeName: 'isiXhosa', confidence: 0.8 },
  { code: 'st-ZA', name: 'Sesotho', nativeName: 'Sesotho', confidence: 0.8 },
  { code: 'tn-ZA', name: 'Setswana', nativeName: 'Setswana', confidence: 0.8 },
  { code: 've-ZA', name: 'Tshivenda', nativeName: 'Tshivenda', confidence: 0.8 },
  { code: 'ts-ZA', name: 'Xitsonga', nativeName: 'Xitsonga', confidence: 0.8 },
  { code: 'nr-ZA', name: 'isiNdebele', nativeName: 'isiNdebele', confidence: 0.8 },
  { code: 'ss-ZA', name: 'siSwati', nativeName: 'siSwati', confidence: 0.8 },
  { code: 'en-US', name: 'English (US)', nativeName: 'English', confidence: 0.95 },
];

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onError,
  language = 'en-ZA',
  disabled = false,
  className = ''
}) => {
  // Error boundary for voice input
  if (typeof window === 'undefined') {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          Voice input is not available in this environment.
        </div>
      </div>
    );
  }
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [confidence, setConfidence] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Check microphone permissions
  const checkMicrophonePermissions = useCallback(async () => {
    try {
      // Check if permissions API is supported
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          if (permission.state === 'denied') {
            setError('Microphone access is blocked. Please enable it in your browser settings.');
            return false;
          }
          
          if (permission.state === 'prompt') {
            // Permission not yet requested
            return true;
          }
          
          if (permission.state === 'granted') {
            return true;
          }
          
          return false;
        } catch (permError) {
          console.warn('Permission query failed, will request on use:', permError);
          return true;
        }
      } else {
        console.warn('Permission API not supported, will request on use');
        return true;
      }
    } catch (error) {
      console.warn('Permission API not supported, will request on use');
      return true;
    }
  }, []);

  // Initialize Web Speech API
  useEffect(() => {
    try {
      // Check browser compatibility using utility
      if (!isVoiceInputSupported()) {
        const support = detectBrowserSupport();
        const message = support.recommendations.join('. ');
        setError(`Voice input not supported: ${message}`);
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Check microphone permissions first
      checkMicrophonePermissions();
    } catch (error) {
      console.error('Failed to initialize voice input:', error);
      setError('Failed to initialize voice input. Please refresh the page and try again.');
    }

    const recognition = recognitionRef.current;
    
    if (!recognition) {
      setError('Failed to initialize speech recognition. Please refresh the page.');
      return;
    }
    
    // Configure recognition settings for South African accents
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = currentLanguage;

    // Enhanced settings for better accuracy
    if ('webkitSpeechRecognition' in window) {
      (recognition as any).continuous = true;
      (recognition as any).interimResults = true;
      (recognition as any).maxAlternatives = 3;
    }

    // Event handlers
    recognition.onstart = () => {
      setIsListening(true);
      setIsPaused(false);
      setError(null);
      startAudioVisualization();
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsPaused(false);
      stopAudioVisualization();
      
      // Auto-restart if user was speaking
      if (finalTranscript.length > 0 && !isPaused) {
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 100);
      }
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setConfidence(confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      setInterimTranscript(interimTranscript);
      setFinalTranscript(prev => prev + finalTranscript);

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setFinalTranscript('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = 'Voice input error occurred.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access blocked. Please enable microphone permissions.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Voice service not available. Please try again later.';
          break;
        case 'bad-grammar':
          errorMessage = 'Speech recognition grammar error. Please try again.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported. Please select a different language.';
          break;
        default:
          errorMessage = `Voice input error: ${event.error}`;
      }
      
      setError(errorMessage);
      onError(errorMessage);
      setIsListening(false);
      stopAudioVisualization();
    };

    recognition.onnomatch = () => {
      setError('No speech match found. Please try speaking more clearly.');
      onError('No speech match found. Please try speaking more clearly.');
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAudioVisualization();
    };
  }, [currentLanguage, onTranscript, onError]);

  // Audio visualization setup
  const startAudioVisualization = useCallback(async () => {
    try {
      // Clean up any existing audio context first
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.warn('Error closing existing AudioContext:', error);
        }
        audioContextRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      microphoneRef.current.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && isListening && audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            setAudioLevel(average / 255);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          } catch (error) {
            console.warn('Error updating audio level:', error);
            // Don't call stopAudioVisualization here to avoid recursion
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = undefined;
            }
            setAudioLevel(0);
          }
        }
      };
      
      updateAudioLevel();
    } catch (err) {
      console.warn('Audio visualization not available:', err);
      // Disable audio visualization if it fails
      setAudioLevel(0);
    }
  }, [isListening]);

  const stopAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    // Clean up microphone stream
    if (microphoneRef.current && microphoneRef.current.mediaStream) {
      try {
        microphoneRef.current.mediaStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Error stopping microphone tracks:', error);
      }
      microphoneRef.current = null;
    }
    
    // Clean up analyser
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (error) {
        console.warn('Error disconnecting analyser:', error);
      }
      analyserRef.current = null;
    }
    
    // Clean up audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.warn('AudioContext already closed:', error);
      }
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  }, []);

  // Control functions
  const startListening = useCallback(async () => {
    if (recognitionRef.current && !disabled) {
      try {
        // Check permissions first
        const hasPermission = await checkMicrophonePermissions();
        
        if (!hasPermission) {
          setError('Microphone permission required. Please allow microphone access.');
          return;
        }
        
        // Request microphone access explicitly
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('Microphone access not supported in this browser. Please use a modern browser.');
            return;
          }
          
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (mediaError: any) {
          console.error('Microphone access denied:', mediaError);
          
          if (mediaError.name === 'NotAllowedError') {
            setError('Microphone access denied. Please allow microphone access in your browser.');
          } else if (mediaError.name === 'NotFoundError') {
            setError('No microphone found. Please connect a microphone and try again.');
          } else if (mediaError.name === 'NotReadableError') {
            setError('Microphone is in use by another application. Please close other apps using the microphone.');
          } else {
            setError(`Microphone error: ${mediaError.message || 'Unknown error'}`);
          }
          return;
        }
        
        recognitionRef.current.start();
        setIsProcessing(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setError('Failed to start voice input. Please try again.');
      }
    }
  }, [disabled, checkMicrophonePermissions]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsProcessing(false);
    }
  }, []);

  const pauseListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsPaused(true);
      setIsProcessing(false);
    }
  }, [isListening]);

  const resumeListening = useCallback(() => {
    if (recognitionRef.current && isPaused) {
      recognitionRef.current.start();
      setIsPaused(false);
      setIsProcessing(false);
    }
  }, [isPaused]);

  const clearTranscript = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);



  const changeLanguage = useCallback((langCode: string) => {
    setCurrentLanguage(langCode);
    setShowLanguageSelector(false);
    
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.lang = langCode;
          recognitionRef.current.start();
        }
      }, 100);
    }
  }, [isListening]);

  // Get current language display name
  const getCurrentLanguageName = () => {
    const lang = SOUTH_AFRICAN_LANGUAGES.find(l => l.code === currentLanguage);
    return lang ? lang.nativeName : 'Unknown';
  };

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get audio level color
  const getAudioLevelColor = () => {
    if (audioLevel > 0.7) return 'bg-green-500';
    if (audioLevel > 0.4) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (error && !isListening) {
    const isPermissionError = error.includes('Microphone access') || error.includes('permission');
    
    return (
      <div className={`flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-red-700 text-sm">{error}</span>
        
        {isPermissionError && (
          <button
            onClick={async () => {
              try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                setError(null);
              } catch (err) {
                setError('Still cannot access microphone. Please check browser settings.');
              }
            }}
            className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            Grant Access
          </button>
        )}
        
        <button
          onClick={clearTranscript}
          className="ml-auto text-red-500 hover:text-red-700"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Language Selector */}
      {showLanguageSelector && (
        <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 min-w-48">
          <div className="text-xs font-medium text-gray-700 mb-2 px-2">Select Language</div>
          {SOUTH_AFRICAN_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 ${
                currentLanguage === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{lang.nativeName}</span>
                <span className="text-xs text-gray-500">({lang.name})</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Voice Input Interface */}
      <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        {/* Language Button */}
        <button
          onClick={() => setShowLanguageSelector(!showLanguageSelector)}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Change language"
        >
          <Languages className="w-3 h-3" />
          <span>{getCurrentLanguageName()}</span>
        </button>

        {/* Voice Control Button */}
        <button
          onClick={isListening ? (isPaused ? resumeListening : pauseListening) : startListening}
          disabled={disabled || isProcessing}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
            isListening
              ? isPaused
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isListening ? (isPaused ? 'Resume listening' : 'Pause listening') : 'Start voice input'}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            isPaused ? <VolumeX className="w-5 h-5" /> : <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          
          {/* Audio Level Indicator */}
          {isListening && audioLevel > 0 && (
            <div className="absolute inset-0 rounded-full border-2 border-white opacity-75 animate-pulse" />
          )}
        </button>

        {/* Audio Level Bar */}
        {isListening && (
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${getAudioLevelColor()}`}
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        )}

        {/* Confidence Indicator */}
        {confidence > 0 && (
          <div className={`flex items-center space-x-1 text-xs ${getConfidenceColor()}`}>
            <CheckCircle className="w-3 h-3" />
            <span>{Math.round(confidence * 100)}%</span>
          </div>
        )}

        {/* Status Text */}
        <div className="text-xs text-gray-500 min-w-20">
          {isListening
            ? isPaused
              ? 'Paused'
              : 'Listening...'
            : 'Ready'}
        </div>
      </div>

      {/* Transcript Display */}
      {(interimTranscript || finalTranscript) && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          {finalTranscript && (
            <div className="text-blue-800 mb-1">
              <strong>Final:</strong> {finalTranscript}
            </div>
          )}
          {interimTranscript && (
            <div className="text-blue-600">
              <strong>Interim:</strong> {interimTranscript}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!isListening && !error && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <div>Click the microphone to start voice input</div>
          <div className="mt-1 text-gray-400">
            First time? You'll be asked to allow microphone access
          </div>
          
          {/* Troubleshooting Tips */}
          <details className="mt-2 text-left">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
              Having issues? Click for help
            </summary>
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
              <div className="font-medium mb-1">Troubleshooting:</div>
              <div>• Make sure you're using Chrome 88+, Edge 88+, or Safari 14.1+</div>
              <div>• Check that microphone is not muted</div>
              <div>• Allow microphone access when prompted</div>
              <div>• Try refreshing the page if issues persist</div>
              <div>• Voice input requires HTTPS (except localhost)</div>
              <div>• Use "Test Mic" button below to diagnose issues</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
