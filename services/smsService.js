/**
 * SMS Service - MyMoolah Treasury Platform
 * 
 * Handles SMS sending via MyMobileAPI for:
 * - Referral invitations
 * - OTP for password resets
 * - OTP for phone number changes
 * - Marketing messages
 * 
 * Features:
 * - Multi-language templates (11 South African languages)
 * - URL shortening (MyMobileAPI auto-shortens)
 * - Delivery tracking
 * - Banking-grade security
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

const axios = require('axios');

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'af', 'zu', 'xh', 'st', 'tn', 'nso', 've', 'ts', 'ss', 'nr'];

class SmsService {
  constructor() {
    this.apiUrl = process.env.MYMOBILEAPI_URL || 'https://rest.mymobileapi.com';
    this.apiPath = process.env.MYMOBILEAPI_PATH || '/bulkmessages'; // Default for MyMobileAPI/SMS South Africa
    this.username = process.env.MYMOBILEAPI_USERNAME;
    this.password = process.env.MYMOBILEAPI_PASSWORD;
    this.senderId = process.env.MYMOBILEAPI_SENDER_ID || 'MyMoolah';
    
    // Validate credentials (warn if missing, but don't fail)
    if (!this.username || !this.password) {
      console.warn('⚠️ MyMobileAPI credentials not configured. SMS features will be disabled.');
    } else {
      console.log(`📱 SMS Service configured: ${this.apiUrl}${this.apiPath}`);
    }
  }

  /**
   * Send SMS via MyMobileAPI
   * @param {string} phoneNumber - Recipient phone number (E.164 format)
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} API response
   */
  async sendSms(phoneNumber, message, options = {}) {
    if (!this.username || !this.password) {
      throw new Error('MyMobileAPI credentials not configured');
    }

    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +27123456789)');
    }

    try {
      // MyMobileAPI / SMS South Africa authentication (basic auth)
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      // Prepare request payload (MyMobileAPI / SMS South Africa format)
      // Format: { messages: [{ content: "...", destination: "27821234567" }] }
      const payload = {
        messages: [{
          content: message,
          destination: phoneNumber.replace('+', ''), // Remove + for API
          ...(this.senderId && { customerId: this.senderId })
        }]
      };

      const endpoint = `${this.apiUrl}${this.apiPath}`;
      console.log(`📱 Sending SMS to ${phoneNumber} via ${endpoint}`);

      // Send SMS
      const response = await axios.post(
        endpoint,
        payload,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      );

      console.log(`✅ SMS sent to ${phoneNumber}:`, JSON.stringify(response.data).substring(0, 200));
      
      // Parse response (MyMobileAPI returns array of results)
      const result = response.data?.messages?.[0] || response.data;
      
      return {
        success: true,
        messageId: result?.id || result?.messageId || response.data?.id,
        status: result?.status || 'sent',
        phoneNumber,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ SMS sending failed:', error.response?.status, error.response?.data || error.message);
      throw new Error(`Failed to send SMS: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Send referral invitation SMS
   * @param {string} referrerName - Name of person sending invite
   * @param {string} phoneNumber - Recipient phone number (E.164)
   * @param {string} referralCode - Referral code (e.g., REF-ABC123)
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Object>} SMS send result
   */
  async sendReferralInvite(referrerName, phoneNumber, referralCode, language = 'en') {
    const message = this.getReferralTemplate(referrerName, referralCode, language);
    return await this.sendSms(phoneNumber, message, { 
      type: 'referral',
      reference: `REF-${referralCode}`
    });
  }

  /**
   * Get referral invitation template in specified language
   * 
   * OPTIMIZED FOR CONVERSION (under 141 chars):
   * - Personal touch (referrer name)
   * - Trust signal (SA's trusted / FSCA regulated)
   * - Clear benefit (earn on purchases)
   * - Urgency (start now)
   * - Short link
   * 
   * @param {string} referrerName - Name of referrer
   * @param {string} code - Referral code (included in link)
   * @param {string} language - Language code
   * @returns {string} Localized message (max 141 chars)
   */
  getReferralTemplate(referrerName, code, language = 'en') {
    // UAT testing link (switch to production link later)
    // Production: https://app.mymoolah.africa/signup?ref=${code}
    const signupUrl = process.env.REFERRAL_SIGNUP_URL || 'https://bit.ly/3YhGGlq';
    
    // First name only for shorter message
    const firstName = referrerName.split(' ')[0];
    
    // All messages MUST be under 141 characters
    // Structure: [Name] + trust + benefit + CTA + link
    const templates = {
      // English: "Andre sent you a MyMoolah invite! Earn cash on every purchase. SA's trusted wallet. Join: bit.ly/3YhGGlq" (106 chars)
      en: `${firstName} sent you a MyMoolah invite! Earn cash on every purchase. SA's trusted wallet. Join: ${signupUrl}`,
      
      // Afrikaans: "Andre nooi jou na MyMoolah! Verdien geld op elke aankoop. SA se betroubare beursie. Begin: bit.ly/3YhGGlq" (107 chars)
      af: `${firstName} nooi jou na MyMoolah! Verdien geld op elke aankoop. SA se betroubare beursie. Begin: ${signupUrl}`,
      
      // Zulu: "Andre ukuthumele isimemo se-MyMoolah! Thola imali. Ithuliwe yi-SA. Joyina: bit.ly/3YhGGlq" (91 chars)
      zu: `${firstName} ukuthumele isimemo se-MyMoolah! Thola imali. Ithuliwe yi-SA. Joyina: ${signupUrl}`,
      
      // Xhosa: "Andre ukuthumele isimemo se-MyMoolah! Fumana imali. Ithembakele. Joyina: bit.ly/3YhGGlq" (88 chars)
      xh: `${firstName} ukuthumele isimemo se-MyMoolah! Fumana imali. Ithembakele. Joyina: ${signupUrl}`,
      
      // Sesotho: "Andre o u romela memo ya MyMoolah! Fumana chelete. E tsepuoa SA. Kena: bit.ly/3YhGGlq" (86 chars)
      st: `${firstName} o u romela memo ya MyMoolah! Fumana chelete. E tsepuoa SA. Kena: ${signupUrl}`,
      
      // Setswana: "Andre o go romela memo ya MyMoolah! Bona madi. E tsepilwe SA. Tsena: bit.ly/3YhGGlq" (84 chars)
      tn: `${firstName} o go romela memo ya MyMoolah! Bona madi. E tsepilwe SA. Tsena: ${signupUrl}`,
      
      // Sepedi: "Andre o go romela memo ya MyMoolah! Hwetsa madi. E tsepilwe SA. Tsena: bit.ly/3YhGGlq" (86 chars)
      nso: `${firstName} o go romela memo ya MyMoolah! Hwetsa madi. E tsepilwe SA. Tsena: ${signupUrl}`,
      
      // Tshivenda: "Andre u rumela memo ya MyMoolah! Wana tshelede. I fulufhedzeaho. Dzhena: bit.ly/3YhGGlq" (88 chars)
      ve: `${firstName} u rumela memo ya MyMoolah! Wana tshelede. I fulufhedzeaho. Dzhena: ${signupUrl}`,
      
      // Xitsonga: "Andre u ku rhumela memo ya MyMoolah! Kuma mali. Yi tshembekile. Nghena: bit.ly/3YhGGlq" (87 chars)
      ts: `${firstName} u ku rhumela memo ya MyMoolah! Kuma mali. Yi tshembekile. Nghena: ${signupUrl}`,
      
      // Siswati: "Andre ukutfumele memo ye-MyMoolah! Thola imali. Ithembekile. Joyina: bit.ly/3YhGGlq" (84 chars)
      ss: `${firstName} ukutfumele memo ye-MyMoolah! Thola imali. Ithembekile. Joyina: ${signupUrl}`,
      
      // isiNdebele: "Andre ukutfumele memo ye-MyMoolah! Thola imali. Ithembekile. Joyina: bit.ly/3YhGGlq" (84 chars)
      nr: `${firstName} ukutfumele memo ye-MyMoolah! Thola imali. Ithembekile. Joyina: ${signupUrl}`
    };
    
    const message = templates[language] || templates.en;
    
    // Safety check - truncate if somehow over 160 chars (1 SMS limit)
    if (message.length > 160) {
      console.warn(`⚠️ SMS message too long (${message.length} chars), truncating`);
      return message.substring(0, 157) + '...';
    }
    
    return message;
  }

  /**
   * Send OTP for password reset
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} otp - One-time password
   * @param {string} language - Language code
   * @returns {Promise<Object>} SMS send result
   */
  async sendPasswordResetOtp(phoneNumber, otp, language = 'en') {
    const message = this.getOtpTemplate(otp, 'password_reset', language);
    return await this.sendSms(phoneNumber, message, {
      type: 'otp',
      reference: `OTP-PW-${Date.now()}`
    });
  }

  /**
   * Send OTP for phone number change
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} otp - One-time password
   * @param {string} language - Language code
   * @returns {Promise<Object>} SMS send result
   */
  async sendPhoneChangeOtp(phoneNumber, otp, language = 'en') {
    const message = this.getOtpTemplate(otp, 'phone_change', language);
    return await this.sendSms(phoneNumber, message, {
      type: 'otp',
      reference: `OTP-PHONE-${Date.now()}`
    });
  }

  /**
   * Get OTP template in specified language
   * @param {string} otp - One-time password
   * @param {string} type - OTP type ('password_reset' or 'phone_change')
   * @param {string} language - Language code
   * @returns {string} Localized message
   */
  getOtpTemplate(otp, type, language = 'en') {
    const templates = {
      password_reset: {
        en: `Your MyMoolah password reset code is ${otp}. Valid for 10 minutes. Do not share this code.`,
        af: `Jou MyMoolah wagwoord herstel kode is ${otp}. Geldig vir 10 minute. Moenie hierdie kode deel nie.`,
        zu: `Ikhodi yakho yokubuyisela iphasiwedi ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`,
        xh: `Ikhodi yakho yokubuyisela iphasiwedi ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`,
        st: `Khoutu ya hau ya ho boela hape password ya MyMoolah ke ${otp}. E sebetsa metsotso e 10. Se arolelane khoutu ena.`,
        tn: `Khoutu ya gago ya go boela password ya MyMoolah ke ${otp}. E sebetsa metsotso e 10. O se arolelane khoutu ena.`,
        nso: `Khoutu ya gago ya go boela password ya MyMoolah ke ${otp}. E sebetsa metsotso e 10. O se arolelane khoutu ena.`,
        ve: `Khoutu ya vhugala ya u bvisa password ya MyMoolah ndi ${otp}. I shuma miniti dza 10. U songo vhuledza khoutu iyi.`,
        ts: `Khoutu ya vhugala ya u bvisa password ya MyMoolah ndi ${otp}. I shuma miniti dza 10. U songo vhuledza khoutu iyi.`,
        ss: `Ikhodi yakho yokubuyisela iphasiwedi ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`,
        nr: `Ikhodi yakho yokubuyisela iphasiwedi ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`
      },
      phone_change: {
        en: `Your MyMoolah phone number change code is ${otp}. Valid for 10 minutes. Do not share this code.`,
        af: `Jou MyMoolah telefoon nommer verandering kode is ${otp}. Geldig vir 10 minute. Moenie hierdie kode deel nie.`,
        zu: `Ikhodi yakho yokushintsha inombolo yocingo ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`,
        xh: `Ikhodi yakho yokushintsha inombolo yocingo ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`,
        st: `Khoutu ya hau ya ho fetola nomoro ya mohala ya MyMoolah ke ${otp}. E sebetsa metsotso e 10. Se arolelane khoutu ena.`,
        tn: `Khoutu ya gago ya go fetola nomoro ya mogala ya MyMoolah ke ${otp}. E sebetsa metsotso e 10. O se arolelane khoutu ena.`,
        nso: `Khoutu ya gago ya go fetola nomoro ya mogala ya MyMoolah ke ${otp}. E sebetsa metsotso e 10. O se arolelane khoutu ena.`,
        ve: `Khoutu ya vhugala ya u shandukisa nomoro ya luṱingo lwa MyMoolah ndi ${otp}. I shuma miniti dza 10. U songo vhuledza khoutu iyi.`,
        ts: `Khoutu ya vhugala ya u shandukisa nomoro ya luṱingo lwa MyMoolah ndi ${otp}. I shuma miniti dza 10. U songo vhuledza khoutu iyi.`,
        ss: `Ikhodi yakho yokushintsha inombolo yocingo ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`,
        nr: `Ikhodi yakho yokushintsha inombolo yocingo ye-MyMoolah ngu-${otp}. Iyasebenza imizuzu eyi-10. Ungayabelani naleli khodi.`
      }
    };

    const typeTemplates = templates[type] || templates.password_reset;
    return typeTemplates[language] || typeTemplates.en;
  }

  /**
   * Send marketing message
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Marketing message
   * @param {string} language - Language code
   * @returns {Promise<Object>} SMS send result
   */
  async sendMarketingMessage(phoneNumber, message, language = 'en') {
    return await this.sendSms(phoneNumber, message, {
      type: 'marketing',
      reference: `MARKETING-${Date.now()}`
    });
  }

  /**
   * Check if SMS service is configured
   * @returns {boolean} True if credentials are set
   */
  isConfigured() {
    return !!(this.username && this.password);
  }
}

module.exports = new SmsService();

