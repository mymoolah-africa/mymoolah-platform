import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
}

const VOICE_SUPPORTED_LANGS = new Set(['en-ZA', 'af-ZA', 'zu-ZA']);

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onError,
  language = 'en-ZA',
  disabled = false,
  className = ''
}) => {
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'unsupported'>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const langSupported = VOICE_SUPPORTED_LANGS.has(language);

  const isSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    const isSecure = window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    return isSecure;
  }, []);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) { /* noop */ }
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!isSupported()) {
      setStatus('unsupported');
      onError?.('unsupported');
      return;
    }

    if (!langSupported) {
      onError?.('language-not-supported');
      return;
    }

    setStatus('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      setStatus('idle');
      if (err.name === 'NotAllowedError') {
        onError?.('mic-denied');
      } else if (err.name === 'NotFoundError') {
        onError?.('mic-not-found');
      } else {
        onError?.('mic-error');
      }
      return;
    }

    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognitionRef.current = recognition;

      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatus('listening');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          onTranscript(transcript.trim());
        }
        stop();
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        switch (event.error) {
          case 'no-speech':
            onError?.('no-speech');
            break;
          case 'audio-capture':
          case 'not-allowed':
            onError?.('mic-denied');
            break;
          case 'network':
            onError?.('network');
            break;
          case 'service-not-allowed':
          case 'language-not-supported':
            onError?.('language-not-supported');
            break;
          case 'aborted':
            stop();
            return;
          default:
            onError?.('generic');
        }
        stop();
      };

      recognition.onend = () => {
        setStatus(prev => (prev === 'listening' || prev === 'starting' ? 'idle' : prev));
        cleanup();
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      onError?.('generic');
      stop();
    }
  }, [language, langSupported, isSupported, onTranscript, onError, stop, cleanup]);

  const toggle = useCallback(() => {
    if (status === 'listening' || status === 'starting') {
      stop();
    } else {
      start();
    }
  }, [status, start, stop]);

  const isActive = status === 'listening' || status === 'starting';
  const isDisabled = disabled || status === 'unsupported';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={isDisabled}
        title={isActive ? 'Stop listening' : langSupported ? 'Voice input' : 'Voice not available'}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          backgroundColor: isActive ? '#ef4444'
            : !langSupported ? '#f3f4f6'
            : '#f3f4f6',
          color: isActive ? '#ffffff'
            : !langSupported ? '#d1d5db'
            : '#6b7280',
          animation: status === 'listening' ? 'voicePulse 1.5s infinite' : 'none',
          opacity: isDisabled ? 0.4 : !langSupported ? 0.5 : 1,
          position: 'relative',
        }}
      >
        {status === 'starting' ? (
          <Loader2 style={{ width: '18px', height: '18px' }} className="animate-spin" />
        ) : isActive ? (
          <MicOff style={{ width: '18px', height: '18px' }} />
        ) : (
          <Mic style={{ width: '18px', height: '18px' }} />
        )}
      </button>

      {status === 'listening' && (
        <span style={{
          fontSize: '12px',
          color: '#ef4444',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          Listening...
        </span>
      )}

      <style>{`
        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
};

export default VoiceInput;
