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
    this.apiUrl = process.env.MYMOBILEAPI_URL || 'https://api.mymobileapi.com';
    this.username = process.env.MYMOBILEAPI_USERNAME;
    this.password = process.env.MYMOBILEAPI_PASSWORD;
    this.senderId = process.env.MYMOBILEAPI_SENDER_ID || 'MyMoolah';
    
    // Validate credentials (warn if missing, but don't fail)
    if (!this.username || !this.password) {
      console.warn('⚠️ MyMobileAPI credentials not configured. SMS features will be disabled.');
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
      // MyMobileAPI authentication (basic auth)
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      // Prepare request payload
      const payload = {
        to: phoneNumber,
        message: message,
        from: this.senderId,
        ...(options.reference && { reference: options.reference }),
        ...(options.type && { type: options.type })
      };

      // Send SMS
      const response = await axios.post(
        `${this.apiUrl}/sms/send`,
        payload,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log(`✅ SMS sent to ${phoneNumber}: ${response.data.messageId || 'success'}`);
      
      return {
        success: true,
        messageId: response.data.messageId || response.data.id,
        status: response.data.status || 'sent',
        phoneNumber,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ SMS sending failed:', error.response?.data || error.message);
      throw new Error(`Failed to send SMS: ${error.response?.data?.message || error.message}`);
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
   * @param {string} referrerName - Name of referrer
   * @param {string} code - Referral code
   * @param {string} language - Language code
   * @returns {string} Localized message
   */
  getReferralTemplate(referrerName, code, language = 'en') {
    // Signup URL with referral code (MyMobileAPI will auto-shorten)
    const url = `https://app.mymoolah.africa/signup?ref=${code}`;
    
    const templates = {
      en: `${referrerName} invites you to MyMoolah! Join and earn money. Use code ${code} for R50 bonus. Sign up: ${url}`,
      af: `${referrerName} nooi jou na MyMoolah! Sluit aan en verdien geld. Gebruik kode ${code} vir R50 bonus. Teken aan: ${url}`,
      zu: `${referrerName} ukumema ku-MyMoolah! Joyina ukhokhe imali. Sebenzisa ikhodi ${code} ukuthola i-R50 bonus. Bhalisa: ${url}`,
      xh: `${referrerName} ukukumema eMyMoolah! Joyina ufumane imali. Sebenzisa ikhodi ${code} ukufumana i-R50 bonus. Bhalisa: ${url}`,
      st: `${referrerName} o u mema ho MyMoolah! Kena o fumane chelete. Sebedisa khoutu ${code} ho fumana R50 bonus. Ngodisa: ${url}`,
      tn: `${referrerName} o go mema go MyMoolah! Tsena o bona madi. Dirisa khoutu ${code} go bona R50 bonus. Ngwadisisa: ${url}`,
      nso: `${referrerName} o go mema go MyMoolah! Tsena o bona madi. Dirisa khoutu ${code} go bona R50 bonus. Ngwadisisa: ${url}`,
      ve: `${referrerName} a u vhuledza kha MyMoolah! Dzhena u wana tshelede. Shumisa khoutu ${code} u wana R50 bonus. Ngwadisa: ${url}`,
      ts: `${referrerName} u ku vula eka MyMoolah! Nghena u wana mali. Tirisa khoutu ${code} u wana R50 bonus. Ngwadisa: ${url}`,
      ss: `${referrerName} u ku mema eMyMoolah! Ngcena u wana mali. Sebenzisa ikhodi ${code} u wana i-R50 bonus. Bhalisa: ${url}`,
      nr: `${referrerName} u ku mema eMyMoolah! Ngcena u wana mali. Sebenzisa ikhodi ${code} u wana i-R50 bonus. Bhalisa: ${url}`
    };
    
    return templates[language] || templates.en;
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

