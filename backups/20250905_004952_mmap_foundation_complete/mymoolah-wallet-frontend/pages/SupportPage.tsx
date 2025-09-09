import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Bot, Globe, Paperclip, Mic, MessageCircle, Wallet, Copy, Check } from 'lucide-react';
import VoiceInput from '../components/VoiceInput';
import MicrophoneTest from '../components/MicrophoneTest';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/app-config';
import { getToken } from '../utils/authToken';
import { Badge } from '../components/ui/badge';

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

// Updated: ${new Date().toISOString()}
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
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [showMicrophoneTest, setShowMicrophoneTest] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Language options
  const languages = [
    { code: 'en', name: 'English', flag: '🇿🇦' },
    { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
    { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
    { code: 'xh', name: 'isiXhosa', flag: '🇿🇦' },
    { code: 'st', name: 'Sesotho', flag: '🇿🇦' },
  ];

  // Auto-scroll to bottom (only when new messages are added, not on initial load)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll to bottom if there are more than 1 message (not just the welcome message)
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  // Load usage statistics from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('supportUsageStats');
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats);
        setUsageStats(parsedStats);
      } catch (error) {
        console.error('Error loading usage stats:', error);
      }
    }
  }, []);

  // Regenerate quick actions when usage stats change
  useEffect(() => {
    generateQuickActions();
  }, [usageStats]);

  // Initialize chat with welcome message and scroll to top
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'bot',
        content: getWelcomeMessage(selectedLanguage),
        timestamp: new Date(),
        language: selectedLanguage,
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${APP_CONFIG.API.baseUrl}/api/v1/wallets/balance`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setWalletBalance(`R${data.balance?.toFixed(2) || '0.00'}`);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };
    fetchWalletBalance();
  }, []);

  // Generate quick actions based on usage statistics
  const generateQuickActions = () => {
    // All available support categories
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

    // Sort by usage statistics (most used first)
    const sortedActions = allActions.sort((a, b) => {
      const aUsage = usageStats[a.id] || 0;
      const bUsage = usageStats[b.id] || 0;
      return bUsage - aUsage;
    });

    // Take top 6 most used categories
    const topActions = sortedActions.slice(0, 6);
    setQuickActions(topActions);
  };

  // Get welcome message based on language
  const getWelcomeMessage = (lang: string): string => {
    const messages = {
      en: "Hi! I'm your MyMoolah support assistant. I'm here to help you with any questions about your wallet, transactions, or account. How can I assist you today?",
      af: "Hallo! Ek is jou MyMoolah ondersteuningsassistent. Ek is hier om jou te help met enige vrae oor jou beursie, transaksies of rekening. Hoe kan ek jou vandag help?",
      zu: "Sawubona! Ngingumsizi wakho wokuxhasa i-MyMoolah. Ngilapha ukukusiza nganoma yimiphi imibuzo mayelana nesikhwama sakho, ukuthengiselana, noma i-akhawunti. Ngingakusiza kanjani namhlanje?",
      xh: "Molo! Ndingumncedi wakho we-MyMoolah. Ndilapha ukukunceda nganoma yimiphi imibuzo malunga nesikhwama sakho, iintengiselwano, okanye i-akhawunti. Ndingakunceda njani namhlanje?",
      st: "Lumela! Ke mothusi wa hao wa MyMoolah. Ke teng ho u thusa ka dipotso tsepe tsa wallet ya hao, ditransaction, kapa account. Ke ka u thusa jwang kajeno?"
    };
    return messages[lang as keyof typeof messages] || messages.en;
  };

  // Extract user ID from JWT token
  const getUserIdFromToken = async (): Promise<number | null> => {
    try {
      const token = await getToken();
      if (!token) return null;
      
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || null;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      return null;
    }
  };

  // Send message
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
          context: {
            currentPage: 'support',
            userId: userId,
          },
        }),
      });

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: (data && data.message) || "I'm here to help! Please check our FAQ or contact support.",
        timestamp: new Date(),
        language: selectedLanguage,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Support chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again or contact our support team.',
        timestamp: new Date(),
        language: selectedLanguage,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle quick action
  const handleQuickAction = (action: QuickAction) => {
    // Track usage statistics
    setUsageStats(prev => {
      const newStats = { ...prev };
      newStats[action.id] = (newStats[action.id] || 0) + 1;
      
      // Store in localStorage for persistence
      localStorage.setItem('supportUsageStats', JSON.stringify(newStats));
      
      return newStats;
    });
    
    sendMessage(action.text);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
  };

  // Voice input handlers
  const handleVoiceTranscript = (transcript: string) => {
    setInputValue(transcript);
    setIsVoiceInputActive(false);
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice input error:', error);
    // Optionally show error to user
  };

  const toggleVoiceInput = () => {
    setIsVoiceInputActive(!isVoiceInputActive);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
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
      
      // Set success state
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #16a34a;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toast.textContent = 'Response copied!';
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy text: ', error);
      // Show error feedback to user
      alert('Failed to copy response. Please try again.');
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      {/* Main Content Area */}
      <div style={{ 
        padding: '16px 16px 0px 16px', 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        {/* Card 1: Page Header (Left arrow - Title) */}
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
              onChange={(e) => handleLanguageChange(e.target.value)}
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

        {/* Card 3: AI Assistant - Loose Standing Card */}
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
          {/* Chat Header */}
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

          {/* Messages */}
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
                  <p style={{ margin: '0 0 4px 0' }}>{message.content}</p>
                  <p style={{ 
                    fontSize: '12px', 
                    opacity: 0.7, 
                    margin: 0,
                    fontFamily: 'Montserrat, sans-serif'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                  
                  {/* Copy to Clipboard Button - Only for bot messages */}
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
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
            
            {/* Typing Indicator */}
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

        {/* Card 4: Input Field - Loose Standing Card */}
        <div style={{ 
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          marginBottom: '12px',
          padding: '12px 16px'
        }}>
          {/* Voice Input Toggle */}
          {isVoiceInputActive && (
            <div style={{ marginBottom: '12px' }}>
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onError={handleVoiceError}
                language={selectedLanguage === 'en' ? 'en-ZA' : selectedLanguage === 'af' ? 'af-ZA' : 'en-ZA'}
                disabled={isTyping}
              />
            </div>
          )}
          
          {/* Microphone Test */}
          {showMicrophoneTest && (
            <div style={{ marginBottom: '12px' }}>
              <MicrophoneTest />
            </div>
          )}
          
          {/* Voice Input Controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '8px',
            marginBottom: '8px' 
          }}>
            <button
              type="button"
              onClick={toggleVoiceInput}
              style={{
                padding: '6px 12px',
                backgroundColor: isVoiceInputActive ? '#3b82f6' : '#f3f4f6',
                color: isVoiceInputActive ? '#ffffff' : '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Mic style={{ width: '12px', height: '12px' }} />
              {isVoiceInputActive ? 'Hide Voice Input' : 'Show Voice Input'}
            </button>
            
            <button
              type="button"
              onClick={() => setShowMicrophoneTest(!showMicrophoneTest)}
              style={{
                padding: '6px 12px',
                backgroundColor: showMicrophoneTest ? '#10b981' : '#f3f4f6',
                color: showMicrophoneTest ? '#ffffff' : '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Mic style={{ width: '12px', height: '12px' }} />
              {showMicrophoneTest ? 'Hide Test' : 'Test Mic'}
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            maxWidth: '100%'
          }}>
            {/* Voice Input Button - Compact */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: isVoiceInputActive ? '#3b82f6' : '#f3f4f6',
                color: isVoiceInputActive ? '#ffffff' : '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
              title={isVoiceInputActive ? 'Voice input active' : 'Click to enable voice input'}
            >
              <Mic style={{ width: '14px', height: '14px' }} />
            </button>
            
            {/* Text Input Field */}
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
            
            {/* Send Button */}
            <button
              type="button"
              onClick={() => {
                if (inputValue.trim()) {
                  sendMessage(inputValue);
                }
              }}
              disabled={!inputValue.trim() || isTyping}
              style={{
                width: '28px',
                height: '28px',
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

        {/* Card 5: Quick Actions - Loose Standing Card */}
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
    </div>
  );
};
