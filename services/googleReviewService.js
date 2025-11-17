'use strict';

const OpenAI = require('openai');
require('dotenv').config();

class GoogleReviewService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate Google Review from user feedback
   */
  async generateReviewFromFeedback(feedback) {
    try {
      const prompt = this.buildReviewPrompt(feedback);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `You are an expert at converting user feedback into compelling Google Reviews for MyMoolah, a South African fintech platform.

IMPORTANT RULES:
1. Generate authentic, natural-sounding reviews
2. Focus on positive aspects and user benefits
3. Include relevant keywords for SEO (fintech, banking, South Africa, digital wallet, etc.)
4. Keep reviews between 50-150 words
5. Use natural language that sounds like real users
6. Highlight specific features mentioned in feedback
7. Maintain professional but friendly tone
8. Include location-specific references when appropriate

Review Structure:
- Opening statement about experience
- Specific feature or benefit mentioned
- Overall satisfaction and recommendation
- Optional: mention of future use or referral`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      const reviewContent = response.choices[0].message.content;
      const rating = this.calculateRatingFromSentiment(feedback.sentiment);
      
      // Analyze the generated review for SEO and quality
      const analysis = await this.analyzeReviewQuality(reviewContent, feedback);
      
      return {
        reviewContent: reviewContent.trim(),
        rating: rating,
        aiGenerationData: {
          sentiment: feedback.sentiment,
          originalFeedback: feedback.description,
          confidence: analysis.confidence,
          seoScore: analysis.seoScore,
          keywords: analysis.keywords,
          model: 'gpt-5',
          tokens: response.usage?.total_tokens || 0
        },
        status: 'generated'
      };

    } catch (error) {
      console.error('Error generating Google review:', error);
      return this.getFallbackReview(feedback);
    }
  }

  /**
   * Build the prompt for review generation
   */
  buildReviewPrompt(feedback) {
    const sentimentContext = this.getSentimentContext(feedback.sentiment);
    const featureContext = this.extractFeatures(feedback.description);
    
    return `Generate a Google Review based on this user feedback:

USER FEEDBACK: "${feedback.description}"
SENTIMENT: ${feedback.sentiment} (${sentimentContext})
FEATURES MENTIONED: ${featureContext.join(', ') || 'General platform experience'}

CONTEXT: MyMoolah is a South African fintech platform offering digital wallet services, money transfers, vouchers, and financial services.

REQUIREMENTS:
- Rating: ${this.calculateRatingFromSentiment(feedback.sentiment)} stars
- Tone: ${sentimentContext}
- Length: 50-150 words
- Include: SEO keywords, specific features, authentic language
- Target: South African users and fintech enthusiasts

Generate a natural, engaging review that sounds like it was written by a real user.`;
  }

  /**
   * Get sentiment context for review generation
   */
  getSentimentContext(sentiment) {
    const contexts = {
      'very_positive': 'extremely satisfied and enthusiastic',
      'positive': 'satisfied and positive',
      'neutral': 'generally satisfied with room for improvement',
      'negative': 'somewhat dissatisfied but constructive',
      'very_negative': 'dissatisfied but looking for solutions'
    };
    return contexts[sentiment] || 'satisfied';
  }

  /**
   * Extract features mentioned in feedback
   */
  extractFeatures(description) {
    const features = [
      'digital wallet', 'money transfer', 'vouchers', 'payments',
      'user interface', 'mobile app', 'security', 'customer service',
      'transaction speed', 'fees', 'ease of use', 'reliability'
    ];
    
    const mentionedFeatures = features.filter(feature => 
      description.toLowerCase().includes(feature)
    );
    
    return mentionedFeatures.length > 0 ? mentionedFeatures : ['platform experience'];
  }

  /**
   * Calculate rating from sentiment
   */
  calculateRatingFromSentiment(sentiment) {
    const ratingMap = {
      'very_positive': 5,
      'positive': 4,
      'neutral': 4,
      'negative': 3,
      'very_negative': 2
    };
    return ratingMap[sentiment] || 4;
  }

  /**
   * Analyze review quality and SEO value
   */
  async analyzeReviewQuality(reviewContent, originalFeedback) {
    try {
      const analysis = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'Analyze this Google Review for quality and SEO value. Return JSON with: confidence (0-1), seoScore (0-100), keywords (array), quality (excellent/good/fair/poor)'
          },
          {
            role: 'user',
            content: `Review: "${reviewContent}"
Original Feedback: "${originalFeedback}"

Analyze for:
1. Authenticity and natural language
2. SEO keyword usage
3. Relevance to MyMoolah services
4. Overall quality and engagement`
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const analysisContent = analysis.choices[0].message.content;
      return JSON.parse(analysisContent);
      
    } catch (error) {
      console.error('Error analyzing review quality:', error);
      return {
        confidence: 0.8,
        seoScore: 75,
        keywords: ['mymoolah', 'fintech', 'digital wallet'],
        quality: 'good'
      };
    }
  }

  /**
   * Generate response to existing Google reviews
   */
  async generateReviewResponse(reviewContent, reviewRating) {
    try {
      const prompt = `Generate a professional response to this Google Review for MyMoolah:

REVIEW: "${reviewContent}"
RATING: ${reviewRating} stars

REQUIREMENTS:
- Professional and friendly tone
- Thank the reviewer
- Address any concerns constructively
- Highlight MyMoolah's commitment to excellence
- Keep response under 100 words
- Include call-to-action for further engagement

Generate a response that shows excellent customer service and engagement.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a customer service representative for MyMoolah, responding to Google Reviews professionally and helpfully.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.6
      });

      return {
        responseContent: response.choices[0].message.content.trim(),
        aiGenerationData: {
          model: 'gpt-5',
          tokens: response.usage?.total_tokens || 0,
          reviewRating: reviewRating
        }
      };

    } catch (error) {
      console.error('Error generating review response:', error);
      return this.getFallbackResponse(reviewRating);
    }
  }

  /**
   * Get fallback review when AI fails
   */
  getFallbackReview(feedback) {
    const rating = this.calculateRatingFromSentiment(feedback.sentiment);
    const baseReview = `I've been using MyMoolah for my financial needs and it's been a great experience. The platform is user-friendly and the services are reliable. I appreciate the convenience of digital banking in South Africa. Highly recommend for anyone looking for modern fintech solutions.`;
    
    return {
      reviewContent: baseReview,
      rating: rating,
      aiGenerationData: {
        sentiment: feedback.sentiment,
        originalFeedback: feedback.description,
        confidence: 0.6,
        seoScore: 60,
        keywords: ['mymoolah', 'fintech', 'digital banking', 'south africa'],
        model: 'fallback',
        tokens: 0
      },
      status: 'generated'
    };
  }

  /**
   * Get fallback response when AI fails
   */
  getFallbackResponse(rating) {
    const responses = {
      5: 'Thank you for your amazing review! We\'re thrilled you\'re having such a great experience with MyMoolah. We\'re committed to maintaining this level of service excellence.',
      4: 'Thank you for your positive feedback! We appreciate your support and are always working to improve our services.',
      3: 'Thank you for your review. We value all feedback and are committed to continuously improving our platform.',
      2: 'Thank you for your feedback. We take all reviews seriously and would love to address any concerns you may have.',
      1: 'We\'re sorry to hear about your experience. Please contact our support team so we can help resolve any issues.'
    };
    
    return {
      responseContent: responses[rating] || responses[3],
      aiGenerationData: {
        model: 'fallback',
        tokens: 0,
        reviewRating: rating
      }
    };
  }

  /**
   * Validate review content for Google policies
   */
  validateReviewContent(reviewContent) {
    const violations = [];
    
    // Check for inappropriate content
    const inappropriateWords = ['spam', 'fake', 'bot', 'automated'];
    if (inappropriateWords.some(word => reviewContent.toLowerCase().includes(word))) {
      violations.push('Contains inappropriate language');
    }
    
    // Check length
    if (reviewContent.length < 10) {
      violations.push('Review too short');
    }
    
    if (reviewContent.length > 500) {
      violations.push('Review too long');
    }
    
    // Check for excessive keywords
    const keywordCount = (reviewContent.match(/mymoolah|fintech|digital|wallet/gi) || []).length;
    if (keywordCount > 5) {
      violations.push('Excessive keyword usage');
    }
    
    return {
      isValid: violations.length === 0,
      violations: violations
    };
  }
}

module.exports = GoogleReviewService;
