import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Send, Bot, Globe, Mic, MicOff, Copy, Check, Keyboard, X } from 'lucide-react';
import VoiceInput from '../components/VoiceInput';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  language: string;
}

interface QuickAction {
  id: string;
  text: string;
  action: string;
}

export const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [walletBalance, setWalletBalance] = useState<string>('R0.00');
  const [usageStats, setUsageStats] = useState<{[key: string]: number}>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [voiceToast, setVoiceToast] = useState<{ message: string; icon: 'mic' | 'keyboard' } | null>(null);
  const voiceToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const voiceErrorMessages: Record<string, Record<string, { message: string; icon: 'mic' | 'keyboard' }>> = {
    'language-not-supported': {
      en: { message: 'Voice is not available for this language. Please type your message.', icon: 'keyboard' },
      af: { message: 'Stem is nie beskikbaar vir hierdie taal nie. Tik asseblief jou boodskap.', icon: 'keyboard' },
      zu: { message: 'Izwi alitholakali ngalolu limi. Sicela ubhale umlayezo wakho.', icon: 'keyboard' },
      xh: { message: 'Ilizwi alufumaneki ngolu lwimi. Nceda uchwetheze umyalezo wakho.', icon: 'keyboard' },
      st: { message: 'Lentswe ha le fumanehe ka puo ena. Ka kopo ngola molaetsa wa hao.', icon: 'keyboard' },
    },
    'mic-denied': {
      en: { message: 'Microphone blocked. Allow mic access in browser settings.', icon: 'mic' },
      af: { message: 'Mikrofoon geblokkeer. Laat mikrofoon toe in blaaier-instellings.', icon: 'mic' },
      zu: { message: 'Imakrofoni ivinjiwe. Vumela ukufinyelela kwemakrofoni ezilungiselelweni.', icon: 'mic' },
      xh: { message: 'Imakrofoni ivaliwe. Vumela ukufikelela kwimakrofoni kwizicwangciso.', icon: 'mic' },
      st: { message: 'Maekerofone e thibetsoe. Lumella maekerofone litsetseng tsa browser.', icon: 'mic' },
    },
    'mic-not-found': {
      en: { message: 'No microphone found. Please type your message.', icon: 'keyboard' },
      af: { message: 'Geen mikrofoon gevind nie. Tik asseblief jou boodskap.', icon: 'keyboard' },
      zu: { message: 'Ayikho imakrofoni etholakele. Sicela ubhale umlayezo wakho.', icon: 'keyboard' },
      xh: { message: 'Ayifumanekanga imakrofoni. Nceda uchwetheze umyalezo wakho.', icon: 'keyboard' },
      st: { message: 'Ha ho maekerofone e fumanoeng. Ka kopo ngola molaetsa wa hao.', icon: 'keyboard' },
    },
    'no-speech': {
      en: { message: 'No voice heard. Tap the mic and speak.', icon: 'mic' },
      af: { message: 'Geen stem gehoor nie. Tik die mikrofoon en praat.', icon: 'mic' },
      zu: { message: 'Akukho zwi elizwakele. Thepha imakrofoni bese ukhuluma.', icon: 'mic' },
      xh: { message: 'Akukho lizwi livakeleyo. Cofa imakrofoni uze uthethe.', icon: 'mic' },
      st: { message: 'Ha ho lentswe le utloahetsoeng. Tobetsa maekerofone o bue.', icon: 'mic' },
    },
    'network': {
      en: { message: 'No internet for voice. Please type your message.', icon: 'keyboard' },
      af: { message: 'Geen internet vir stem nie. Tik asseblief jou boodskap.', icon: 'keyboard' },
      zu: { message: 'Ayikho i-inthanethi yezwi. Sicela ubhale umlayezo wakho.', icon: 'keyboard' },
      xh: { message: 'Akukho intanethi yelizwi. Nceda uchwetheze umyalezo wakho.', icon: 'keyboard' },
      st: { message: 'Ha ho inthanete ea lentswe. Ka kopo ngola molaetsa wa hao.', icon: 'keyboard' },
    },
    'unsupported': {
      en: { message: 'Voice not supported on this browser. Please type your message.', icon: 'keyboard' },
      af: { message: 'Stem word nie ondersteun op hierdie blaaier nie. Tik asseblief jou boodskap.', icon: 'keyboard' },
      zu: { message: 'Izwi alisetshenziswa kule bhrawuza. Sicela ubhale umlayezo wakho.', icon: 'keyboard' },
      xh: { message: 'Ilizwi alixhaswanga kule bhrawuza. Nceda uchwetheze umyalezo wakho.', icon: 'keyboard' },
      st: { message: 'Lentswe ha le tshehetsoe ho browser ena. Ka kopo ngola molaetsa wa hao.', icon: 'keyboard' },
    },
    'mic-error': {
      en: { message: 'Microphone error. Please type your message.', icon: 'keyboard' },
      af: { message: 'Mikrofoon fout. Tik asseblief jou boodskap.', icon: 'keyboard' },
      zu: { message: 'Iphutha lemakrofoni. Sicela ubhale umlayezo wakho.', icon: 'keyboard' },
      xh: { message: 'Impazamo yemakrofoni. Nceda uchwetheze umyalezo wakho.', icon: 'keyboard' },
      st: { message: 'Phoso ea maekerofone. Ka kopo ngola molaetsa wa hao.', icon: 'keyboard' },
    },
    'generic': {
      en: { message: 'Voice error. Please type your message.', icon: 'keyboard' },
      af: { message: 'Stem fout. Tik asseblief jou boodskap.', icon: 'keyboard' },
      zu: { message: 'Iphutha lezwi. Sicela ubhale umlayezo wakho.', icon: 'keyboard' },
      xh: { message: 'Impazamo yelizwi. Nceda uchwetheze umyalezo wakho.', icon: 'keyboard' },
      st: { message: 'Phoso ea lentswe. Ka kopo ngola molaetsa wa hao.', icon: 'keyboard' },
    },
  };

  const showVoiceToast = useCallback((errorCode: string) => {
    const msgs = voiceErrorMessages[errorCode] || voiceErrorMessages['generic'];
    const langMsg = msgs[selectedLanguage] || msgs['en'];
    if (voiceToastTimer.current) clearTimeout(voiceToastTimer.current);
    setVoiceToast(langMsg);
    voiceToastTimer.current = setTimeout(() => setVoiceToast(null), 5000);
  }, [selectedLanguage]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇿🇦' },
    { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
    { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
    { code: 'xh', name: 'isiXhosa', flag: '🇿🇦' },
    { code: 'st', name: 'Sesotho', flag: '🇿🇦' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    const savedStats = localStorage.getItem('supportUsageStats');
    if (savedStats) {
      try {
        setUsageStats(JSON.parse(savedStats));
      } catch (_) { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    generateQuickActions();
  }, [usageStats]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'bot',
        content: getWelcomeMessage(selectedLanguage),
        timestamp: new Date(),
        language: selectedLanguage,
      }]);
    }
  }, []);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        });
        if (response.ok) {
          const data = await response.json();
          setWalletBalance(`R${data.balance?.toFixed(2) || '0.00'}`);
        }
      } catch (_) { /* ignore */ }
    };
    fetchWalletBalance();
  }, []);

  const generateQuickActions = () => {
    const allActions: QuickAction[] = [
      { id: 'balance', text: 'Check Balance', action: 'check_balance' },
      { id: 'transactions', text: 'Recent Transactions', action: 'recent_transactions' },
      { id: 'add-money', text: 'Add Money', action: 'add_money' },
      { id: 'kyc-help', text: 'KYC Help', action: 'kyc_help' },
      { id: 'payment-issues', text: 'Payment Issues', action: 'payment_issues' },
      { id: 'general-help', text: 'General Help', action: 'general_help' },
      { id: 'security', text: 'Security Help', action: 'security_help' },
      { id: 'fees', text: 'Fees & Charges', action: 'fees_charges' },
      { id: 'limits', text: 'Transaction Limits', action: 'transaction_limits' },
      { id: 'verification', text: 'Account Verification', action: 'account_verification' },
      { id: 'technical', text: 'Technical Issues', action: 'technical_issues' },
      { id: 'refunds', text: 'Refunds & Disputes', action: 'refunds_disputes' }
    ];

    const sortedActions = allActions.sort((a, b) => {
      return (usageStats[b.id] || 0) - (usageStats[a.id] || 0);
    });

    setQuickActions(sortedActions.slice(0, 6));
  };

  const getWelcomeMessage = (lang: string): string => {
    const msgs: Record<string, string> = {
      en: "Hi! I'm your MyMoolah support assistant. I'm here to help you with any questions about your wallet, transactions, or account. How can I assist you today?",
      af: "Hallo! Ek is jou MyMoolah ondersteuningsassistent. Ek is hier om jou te help met enige vrae oor jou beursie, transaksies of rekening. Hoe kan ek jou vandag help?",
      zu: "Sawubona! Ngingumsizi wakho wokuxhasa i-MyMoolah. Ngilapha ukukusiza nganoma yimiphi imibuzo mayelana nesikhwama sakho, ukuthengiselana, noma i-akhawunti. Ngingakusiza kanjani namhlanje?",
      xh: "Molo! Ndingumncedi wakho we-MyMoolah. Ndilapha ukukunceda nganoma yimiphi imibuzo malunga nesikhwama sakho, iintengiselwano, okanye i-akhawunti. Ndingakunceda njani namhlanje?",
      st: "Lumela! Ke mothusi wa hao wa MyMoolah. Ke teng ho u thusa ka dipotso tsepe tsa wallet ya hao, ditransaction, kapa account. Ke ka u thusa jwang kajeno?"
    };
    return msgs[lang] || msgs.en;
  };

  const getUserIdFromToken = async (): Promise<number | null> => {
    try {
      const token = await getToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || null;
    } catch (_) {
      return null;
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      language: selectedLanguage,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const token = await getToken();
      const userId = await getUserIdFromToken();

      const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/support/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          message: content,
          language: selectedLanguage,
          context: { currentPage: 'support', userId },
        }),
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data?.message || "I'm here to help! Please check our FAQ or contact support.",
        timestamp: new Date(),
        language: selectedLanguage,
      }]);
    } catch (_) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again or contact our support team.',
        timestamp: new Date(),
        language: selectedLanguage,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setUsageStats(prev => {
      const newStats = { ...prev, [action.id]: (prev[action.id] || 0) + 1 };
      localStorage.setItem('supportUsageStats', JSON.stringify(newStats));
      return newStats;
    });
    sendMessage(action.text);
  };

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInputValue(prev => (prev ? prev + ' ' + transcript : transcript));
  }, []);

  const handleVoiceError = useCallback((errorCode: string) => {
    showVoiceToast(errorCode);
  }, [showVoiceToast]);

  const normaliseMarkdown = (text: string): string => {
    return text
      .replace(/(?<!\n)(\s)(\d+)\.\s/g, '\n$2. ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);

      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: #16a34a; color: white;
        padding: 12px 16px; border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px; font-weight: 600;
        z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toast.textContent = 'Response copied!';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (_) {
      alert('Failed to copy response. Please try again.');
    }
  };

  const voiceLanguage = selectedLanguage === 'af' ? 'af-ZA'
    : selectedLanguage === 'zu' ? 'zu-ZA'
    : selectedLanguage === 'xh' ? 'xh-ZA'
    : selectedLanguage === 'st' ? 'st-ZA'
    : 'en-ZA';

  return (
    <div style={{
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      <div style={{
        padding: '16px 16px 0px 16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Card 1: Page Header */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '8px 16px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0
        }}>
          <button
            onClick={() => navigate('/transact')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease',
              position: 'absolute',
              left: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft style={{ width: '20px', height: '20px', color: '#6b7280' }} />
          </button>

          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0',
            textAlign: 'center'
          }}>
            Support
          </h1>
        </div>

        {/* Language Selector */}
        <div className="mb-3 p-2 bg-white border border-gray-200 rounded-lg" style={{ flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  Language
                </p>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-normal)',
                  color: '#6b7280'
                }}>
                  Choose your preferred language
                </p>
              </div>
            </div>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                fontFamily: 'Montserrat, sans-serif',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Card 3: AI Assistant Chat */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          marginBottom: '12px',
          height: '300px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500/10 to-blue-600/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: '#1f2937',
                  marginBottom: '0.25rem'
                }}>
                  AI Assistant
                </p>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: 'var(--mobile-font-small)',
                  fontWeight: 'var(--font-weight-normal)',
                  color: '#6b7280'
                }}>
                  How can I help you today?
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#f9fafb' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: message.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: message.type === 'user' ? '#3b82f6' : '#ffffff',
                    color: message.type === 'user' ? '#ffffff' : '#374151',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    fontFamily: 'Montserrat, sans-serif',
                    position: 'relative'
                  }}
                >
                  {message.type === 'bot' ? (
                    <div className="chat-markdown" style={{ marginBottom: '4px' }}>
                      <ReactMarkdown>{normaliseMarkdown(message.content)}</ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ margin: '0 0 4px 0' }}>{message.content}</p>
                  )}
                  <p style={{
                    fontSize: '12px',
                    opacity: 0.7,
                    margin: 0,
                    fontFamily: 'Montserrat, sans-serif'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>

                  {message.type === 'bot' && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copiedMessageId === message.id ? '#16a34a' : '#6b7280',
                        fontFamily: 'Montserrat, sans-serif',
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        padding: '4px',
                        borderRadius: '4px'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      title="Copy to clipboard"
                    >
                      {copiedMessageId === message.id ?
                        <Check style={{ width: '16px', height: '16px' }} /> :
                        <Copy style={{ width: '16px', height: '16px' }} />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Card 4: Input Field */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          marginBottom: '12px',
          padding: '12px 16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            maxWidth: '100%'
          }}>
            {/* Voice Input - single tap mic button */}
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              onError={handleVoiceError}
              language={voiceLanguage}
              disabled={isTyping}
            />

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '16px',
                fontSize: '14px',
                fontFamily: 'Montserrat, sans-serif',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  e.preventDefault();
                  sendMessage(inputValue);
                }
              }}
              disabled={isTyping}
            />

            <button
              type="button"
              onClick={() => { if (inputValue.trim()) sendMessage(inputValue); }}
              disabled={!inputValue.trim() || isTyping}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: inputValue.trim() && !isTyping ? '#3b82f6' : '#d1d5db',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
            >
              <Send style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        </div>

        {/* Card 5: Quick Actions */}
        {quickActions.length > 0 && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            marginBottom: '0px',
            padding: '8px 16px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '4px'
            }}>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '11px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {action.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voice Error Toast */}
      {voiceToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '360px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            zIndex: 9999,
            fontFamily: 'Montserrat, sans-serif',
            animation: 'voiceToastIn 0.3s ease-out',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: voiceToast.icon === 'mic' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {voiceToast.icon === 'mic' ? (
              <MicOff style={{ width: '18px', height: '18px', color: '#ef4444' }} />
            ) : (
              <Keyboard style={{ width: '18px', height: '18px', color: '#60a5fa' }} />
            )}
          </div>
          <p style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: 1.4,
            flex: 1,
          }}>
            {voiceToast.message}
          </p>
          <button
            type="button"
            onClick={() => { setVoiceToast(null); if (voiceToastTimer.current) clearTimeout(voiceToastTimer.current); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '4px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes voiceToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};
