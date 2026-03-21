import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Simplified voice-to-text button.
 *
 * Creates a SpeechRecognition session on demand (when the user taps the mic
 * button) and tears it down once a final result arrives or the user stops it.
 * This avoids all useEffect-lifecycle bugs that plagued the previous
 * implementation.
 */
export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onError,
  language = 'en-ZA',
  disabled = false,
  className = ''
}) => {
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'unsupported'>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    setError(null);

    if (!isSupported()) {
      setStatus('unsupported');
      setError('Voice input is not supported on this browser. Please type your message instead.');
      onError?.('Voice input not supported');
      return;
    }

    setStatus('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      setStatus('idle');
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow mic access in your browser settings.'
        : err.name === 'NotFoundError'
          ? 'No microphone found. Please connect one and try again.'
          : `Mic error: ${err.message || 'Unknown'}`;
      setError(msg);
      onError?.(msg);
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
        let msg = 'Voice input error.';
        switch (event.error) {
          case 'no-speech':
            msg = 'No speech detected. Tap the mic and try again.';
            break;
          case 'audio-capture':
          case 'not-allowed':
            msg = 'Microphone access blocked. Check your browser settings.';
            break;
          case 'network':
            msg = 'Network error. Check your connection.';
            break;
          case 'service-not-allowed':
          case 'language-not-supported':
            msg = language !== 'en-ZA'
              ? `Voice not available for this language on your device. Try English.`
              : 'Voice service unavailable. Please type your message instead.';
            break;
          case 'aborted':
            stop();
            return;
          default:
            msg = `Voice error: ${event.error}`;
        }
        setError(msg);
        onError?.(msg);
        stop();
      };

      recognition.onend = () => {
        setStatus(prev => (prev === 'listening' || prev === 'starting' ? 'idle' : prev));
        cleanup();
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Could not start voice input. Please try again.');
      onError?.('Failed to start recognition');
      stop();
    }
  }, [language, isSupported, onTranscript, onError, stop, cleanup]);

  const toggle = useCallback(() => {
    if (status === 'listening' || status === 'starting') {
      stop();
    } else {
      start();
    }
  }, [status, start, stop]);

  const isActive = status === 'listening' || status === 'starting';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || status === 'unsupported'}
        title={isActive ? 'Stop listening' : 'Voice input'}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          cursor: disabled || status === 'unsupported' ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          backgroundColor: isActive ? '#ef4444' : '#f3f4f6',
          color: isActive ? '#ffffff' : '#6b7280',
          animation: status === 'listening' ? 'pulse 1.5s infinite' : 'none',
          opacity: disabled || status === 'unsupported' ? 0.4 : 1,
        }}
      >
        {status === 'starting' ? (
          <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
        ) : isActive ? (
          <MicOff style={{ width: '16px', height: '16px' }} />
        ) : (
          <Mic style={{ width: '16px', height: '16px' }} />
        )}
      </button>

      {status === 'listening' && (
        <span style={{
          fontSize: '11px',
          color: '#ef4444',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          Listening...
        </span>
      )}

      {error && !isActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: '#dc2626',
          fontFamily: 'Montserrat, sans-serif',
          maxWidth: '200px',
        }}>
          <AlertCircle style={{ width: '12px', height: '12px', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0, fontSize: '14px' }}
          >
            ×
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
};

export default VoiceInput;
