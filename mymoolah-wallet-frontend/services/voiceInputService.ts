// Voice Input Service for MyMoolah Platform
// Optimized for South African languages and accents

export interface VoiceInputConfig {
  language: string;
  accent: string;
  confidenceThreshold: number;
  maxAlternatives: number;
  continuous: boolean;
  interimResults: boolean;
}

export interface VoiceInputResult {
  transcript: string;
  confidence: number;
  language: string;
  accent: string;
  alternatives: string[];
  timestamp: Date;
}

export interface AccentProfile {
  code: string;
  name: string;
  confidence: number;
  languageMapping: { [key: string]: string };
}

// South African accent profiles for better recognition
const SOUTH_AFRICAN_ACCENTS: AccentProfile[] = [
  {
    code: 'en-ZA-CT',
    name: 'Cape Town English',
    confidence: 0.92,
    languageMapping: {
      'en': 'en-ZA',
      'af': 'af-ZA',
      'zu': 'zu-ZA',
      'xh': 'xh-ZA'
    }
  },
  {
    code: 'en-ZA-JHB',
    name: 'Johannesburg English',
    confidence: 0.90,
    languageMapping: {
      'en': 'en-ZA',
      'af': 'af-ZA',
      'zu': 'zu-ZA',
      'xh': 'xh-ZA'
    }
  },
  {
    code: 'en-ZA-DBN',
    name: 'Durban English',
    confidence: 0.88,
    languageMapping: {
      'en': 'en-ZA',
      'af': 'af-ZA',
      'zu': 'zu-ZA',
      'xh': 'xh-ZA'
    }
  },
  {
    code: 'af-ZA',
    name: 'Afrikaans',
    confidence: 0.85,
    languageMapping: {
      'af': 'af-ZA',
      'en': 'en-ZA'
    }
  },
  {
    code: 'zu-ZA',
    name: 'isiZulu',
    confidence: 0.80,
    languageMapping: {
      'zu': 'zu-ZA',
      'en': 'en-ZA'
    }
  },
  {
    code: 'xh-ZA',
    name: 'isiXhosa',
    confidence: 0.80,
    languageMapping: {
      'xh': 'xh-ZA',
      'en': 'en-ZA'
    }
  }
];

export class VoiceInputService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private currentConfig: VoiceInputConfig;
  private accentProfile: AccentProfile | null = null;

  constructor(config: Partial<VoiceInputConfig> = {}) {
    this.currentConfig = {
      language: 'en-ZA',
      accent: 'en-ZA-CT',
      confidenceThreshold: 0.7,
      maxAlternatives: 3,
      continuous: true,
      interimResults: true,
      ...config
    };

    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (!this.isSupported()) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.configureRecognition();
    this.setupEventHandlers();
  }

  private isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  private configureRecognition(): void {
    if (!this.recognition) return;

    const recognition = this.recognition;
    
    // Basic configuration
    recognition.continuous = this.currentConfig.continuous;
    recognition.interimResults = this.currentConfig.interimResults;
    recognition.maxAlternatives = this.currentConfig.maxAlternatives;
    recognition.lang = this.currentConfig.language;

    // Enhanced settings for better accuracy
    if ('webkitSpeechRecognition' in window) {
      (recognition as any).continuous = this.currentConfig.continuous;
      (recognition as any).interimResults = this.currentConfig.interimResults;
      (recognition as any).maxAlternatives = this.currentConfig.maxAlternatives;
    }
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    const recognition = this.recognition;

    recognition.onstart = () => {
      this.isListening = true;
      // Voice input started
    };

    recognition.onend = () => {
      this.isListening = false;
      // Voice input ended
    };

    recognition.onerror = (event) => {
      console.error('🎤 Voice input error:', event.error);
      this.isListening = false;
    };
  }

  // Set language and accent profile
  public setLanguage(language: string, accent?: string): void {
    this.currentConfig.language = language;
    
    if (accent) {
      this.currentConfig.accent = accent;
      this.accentProfile = SOUTH_AFRICAN_ACCENTS.find(a => a.code === accent) || null;
    } else {
      // Auto-detect accent based on language
      this.accentProfile = SOUTH_AFRICAN_ACCENTS.find(a => 
        a.languageMapping[language] === language
      ) || SOUTH_AFRICAN_ACCENTS[0];
      this.currentConfig.accent = this.accentProfile.code;
    }

    if (this.recognition) {
      this.recognition.lang = this.currentConfig.language;
    }

    // Language and accent profile updated
  }

  // Get available languages and accents
  public getAvailableLanguages(): { code: string; name: string; nativeName: string }[] {
    return [
      { code: 'en-ZA', name: 'English (South Africa)', nativeName: 'English' },
      { code: 'af-ZA', name: 'Afrikaans', nativeName: 'Afrikaans' },
      { code: 'zu-ZA', name: 'isiZulu', nativeName: 'isiZulu' },
      { code: 'xh-ZA', name: 'isiXhosa', nativeName: 'isiXhosa' },
      { code: 'st-ZA', name: 'Sesotho', nativeName: 'Sesotho' },
      { code: 'tn-ZA', name: 'Setswana', nativeName: 'Setswana' },
      { code: 've-ZA', name: 'Tshivenda', nativeName: 'Tshivenda' },
      { code: 'ts-ZA', name: 'Xitsonga', nativeName: 'Xitsonga' },
      { code: 'nr-ZA', name: 'isiNdebele', nativeName: 'isiNdebele' },
      { code: 'ss-ZA', name: 'siSwati', nativeName: 'siSwati' }
    ];
  }

  public getAvailableAccents(): AccentProfile[] {
    return SOUTH_AFRICAN_ACCENTS;
  }

  // Start listening with callback
  public startListening(
    onResult: (result: VoiceInputResult) => void,
    onError: (error: string) => void,
    onInterim?: (transcript: string) => void
  ): void {
    if (!this.recognition || this.isListening) return;

    try {
      // Set up result handler
      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0;
        const alternatives: string[] = [];

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            confidence = result[0].confidence;
            
            // Collect alternatives
            for (let j = 0; j < result.length; j++) {
              alternatives.push(result[j].transcript);
            }
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Handle interim results
        if (onInterim && interimTranscript) {
          onInterim(interimTranscript);
        }

        // Handle final results
        if (finalTranscript && confidence >= this.currentConfig.confidenceThreshold) {
          const voiceResult: VoiceInputResult = {
            transcript: finalTranscript,
            confidence,
            language: this.currentConfig.language,
            accent: this.currentConfig.accent,
            alternatives: alternatives.slice(1), // Exclude primary transcript
            timestamp: new Date()
          };

          onResult(voiceResult);
        } else if (finalTranscript && confidence < this.currentConfig.confidenceThreshold) {
          onError(`Low confidence (${Math.round(confidence * 100)}%). Please try speaking more clearly.`);
        }
      };

      // Set up error handler
      this.recognition.onerror = (event) => {
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
        
        onError(errorMessage);
      };

      // Start recognition
      this.recognition.start();
      
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      onError('Failed to start voice input. Please try again.');
    }
  }

  // Stop listening
  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Check if currently listening
  public isActive(): boolean {
    return this.isListening;
  }

  // Get current configuration
  public getConfig(): VoiceInputConfig {
    return { ...this.currentConfig };
  }

  // Update configuration
  public updateConfig(config: Partial<VoiceInputConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    this.configureRecognition();
  }

  // Cleanup
  public destroy(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.isListening = false;
  }
}

// Export singleton instance
export const voiceInputService = new VoiceInputService();

export default VoiceInputService;
