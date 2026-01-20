/**
 * Engagement Service for Watch to Earn
 * 
 * Handles user engagements (lead captures) for Engagement ads.
 * When user clicks "I'm Interested", captures their details and sends to merchant.
 * Credits user additional R1.00 bonus (total R3.00 for Engagement ads).
 * 
 * @author MyMoolah Development Team
 * @date 2026-01-20
 */

'use strict';

const { AdEngagement, AdView, AdCampaign, User, Wallet, Transaction, sequelize } = require('../models');
const nodemailer = require('nodemailer');
const axios = require('axios');

class EngagementService {
  /**
   * Record engagement (lead capture) for Engagement ads
   * 
   * @param {number} userId - User ID
   * @param {string} campaignId - Campaign ID
   * @param {string} adViewId - Ad view ID
   * @returns {Promise<Object>} Engagement result
   */
  async recordEngagement(userId, campaignId, adViewId) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Get user details
      const user = await User.findByPk(userId, {
        attributes: ['firstName', 'lastName', 'phoneNumber', 'email'],
        transaction
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 2. Get campaign (must be Engagement type)
      const campaign = await AdCampaign.findByPk(campaignId, { transaction });
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.adType !== 'engagement') {
        throw new Error('Engagement recording only allowed for Engagement ads');
      }

      // 3. Verify ad view was completed
      const adView = await AdView.findOne({
        where: {
          id: adViewId,
          userId,
          campaignId,
          status: 'completed'
        },
        transaction
      });

      if (!adView) {
        throw new Error('Ad view not found or not completed. You must watch the ad first.');
      }

      // 4. Check if engagement already recorded (idempotency)
      const existingEngagement = await AdEngagement.findOne({
        where: { adViewId, userId },
        transaction
      });

      if (existingEngagement) {
        await transaction.rollback();
        return {
          success: true,
          engagementId: existingEngagement.id,
          bonusAmount: 0, // Already paid
          message: 'Engagement already recorded'
        };
      }

      // 5. Create engagement record
      const engagement = await AdEngagement.create({
        campaignId,
        userId,
        adViewId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userPhone: user.phoneNumber,
        userEmail: user.email || null,
        sentToMerchant: false,
        deliveryMethod: campaign.conversionEmail ? 'email' : (campaign.conversionWebhookUrl ? 'webhook' : null)
      }, { transaction });

      // 6. Credit user additional R1.00 bonus (total R3.00 for Engagement ads)
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction
      });

      if (!wallet) {
        throw new Error('User wallet not found');
      }

      await wallet.credit(1.00, 'ad_engagement_bonus', { transaction });

      // 7. Update campaign engagement stats
      await campaign.increment('totalEngagements', { by: 1, transaction });

      // 8. Create transaction record for bonus
      const transactionId = `AD_ENGAGE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await Transaction.create({
        transactionId,
        userId,
        walletId: wallet.walletId,
        amount: 1.00,
        type: 'credit',
        status: 'completed',
        description: `Watch to Earn Engagement Bonus: ${campaign.title}`,
        currency: 'ZAR',
        fee: 0,
        metadata: {
          campaignId: campaign.id,
          engagementId: engagement.id,
          adType: 'engagement',
          isEngagementBonus: true
        }
      }, { transaction });

      await transaction.commit();

      // 9. Send lead to merchant (async, non-blocking)
      setImmediate(async () => {
        try {
          await this.sendLeadToMerchant(campaign, user, engagement.id);
          await engagement.update({ sentToMerchant: true });
          console.log(`✅ Lead sent to merchant for engagement ${engagement.id}`);
        } catch (error) {
          console.error('❌ Failed to send lead to merchant (non-blocking):', error);
        }
      });

      console.log(`✅ Engagement recorded: User ${userId} earned R1.00 bonus for "${campaign.title}"`);

      return {
        success: true,
        engagementId: engagement.id,
        bonusAmount: 1.00,
        totalReward: 3.00, // R2.00 (view) + R1.00 (engagement)
        walletBalance: parseFloat(wallet.balance) + 1.00
      };
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error recording engagement:', error);
      throw error;
    }
  }

  /**
   * Send lead to merchant via email or webhook
   * 
   * @param {Object} campaign - Ad campaign
   * @param {Object} user - User object
   * @param {string} engagementId - Engagement ID
   */
  async sendLeadToMerchant(campaign, user, engagementId) {
    const userData = {
      name: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phoneNumber,
      email: user.email || null,
      engagementId,
      campaignTitle: campaign.title,
      campaignId: campaign.id,
      timestamp: new Date().toISOString()
    };

    let deliveryMethod = null;

    // Email delivery
    if (campaign.conversionEmail) {
      try {
        const transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'leads@mymoolah.africa',
          to: campaign.conversionEmail,
          subject: `New Lead from "${campaign.title}" - MyMoolah Watch to Earn`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #86BE41; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
                .lead-details { background-color: white; padding: 15px; margin-top: 15px; border-left: 4px solid #86BE41; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>🎯 New Lead Captured</h2>
                  <p>MyMoolah Watch to Earn Platform</p>
                </div>
                <div class="content">
                  <p>A user has shown interest in your ad campaign:</p>
                  <p><strong>Campaign:</strong> ${campaign.title}</p>
                  
                  <div class="lead-details">
                    <h3>Lead Information</h3>
                    <p><strong>Name:</strong> ${userData.name}</p>
                    <p><strong>Phone:</strong> ${userData.phone}</p>
                    <p><strong>Email:</strong> ${userData.email || 'Not provided'}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
                    <p><strong>Engagement ID:</strong> ${engagementId}</p>
                  </div>
                  
                  <p style="margin-top: 20px;">
                    <strong>Next Steps:</strong> Contact this lead within 24 hours for best conversion results.
                  </p>
                </div>
                <div class="footer">
                  <p>MyMoolah Treasury Platform - Watch to Earn</p>
                  <p>This lead was generated through our video advertising platform</p>
                </div>
              </div>
            </body>
            </html>
          `
        });

        deliveryMethod = 'email';
        console.log(`✅ Lead email sent to ${campaign.conversionEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send lead email:', emailError);
      }
    }

    // Webhook delivery
    if (campaign.conversionWebhookUrl) {
      try {
        await axios.post(campaign.conversionWebhookUrl, userData, {
          headers: {
            'Content-Type': 'application/json',
            'X-MyMoolah-Event': 'ad_engagement',
            'X-MyMoolah-Timestamp': new Date().toISOString()
          },
          timeout: 5000
        });

        deliveryMethod = deliveryMethod ? 'both' : 'webhook';
        console.log(`✅ Lead webhook sent to ${campaign.conversionWebhookUrl}`);
      } catch (webhookError) {
        console.error('❌ Failed to send lead webhook:', webhookError);
      }
    }

    // Update engagement with delivery method
    if (deliveryMethod) {
      const engagement = await AdEngagement.findByPk(engagementId);
      if (engagement) {
        await engagement.update({
          sentToMerchant: true,
          deliveryMethod,
          deliveredAt: new Date()
        });
      }
    }
  }

  /**
   * Get campaign engagement statistics
   * 
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Engagement stats
   */
  async getCampaignEngagementStats(campaignId) {
    const engagements = await AdEngagement.findAll({
      where: { campaignId },
      include: [{
        model: AdView,
        as: 'adView',
        attributes: ['completedAt']
      }]
    });

    return {
      totalEngagements: engagements.length,
      delivered: engagements.filter(e => e.sentToMerchant).length,
      pending: engagements.filter(e => !e.sentToMerchant).length,
      deliveryRate: engagements.length > 0 
        ? ((engagements.filter(e => e.sentToMerchant).length / engagements.length) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

module.exports = new EngagementService();
