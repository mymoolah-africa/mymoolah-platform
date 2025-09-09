'use strict';

const OpenAI = require('openai');
require('dotenv').config();

class FeedbackService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Analyze feedback using AI
   */
  async analyzeFeedback(feedback) {
    try {
      const analysis = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an AI feedback analyst for MyMoolah, a South African fintech platform. 
            Analyze the feedback and provide insights for:
            1. Sentiment analysis (very_negative, negative, neutral, positive, very_positive)
            2. Priority assessment (1-5 scale)
            3. Topic categorization
            4. SEO keywords extraction
            5. Marketing content ideas
            
            Be thorough and provide actionable insights.`
          },
          {
            role: 'user',
            content: `Analyze this feedback:
            Title: ${feedback.title}
            Description: ${feedback.description}
            Category: ${feedback.category?.name || 'Unknown'}
            Priority: ${feedback.priority}
            
            Provide analysis in JSON format with the following structure:
            {
              "sentiment": "sentiment_value",
              "sentimentConfidence": 0.95,
              "priority": priority_number,
              "priorityReason": "explanation",
              "topics": ["topic1", "topic2"],
              "keywords": ["keyword1", "keyword2"],
              "seoInsights": {
                "title": "SEO optimized title",
                "metaDescription": "SEO meta description",
                "focusKeywords": ["kw1", "kw2"]
              },
              "marketingContent": {
                "blogPost": "Blog post idea",
                "socialMedia": "Social media post idea",
                "featureAnnouncement": "Feature announcement idea"
              },
              "userJourney": "User journey insights",
              "businessImpact": "Business impact assessment"
            }`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const analysisContent = analysis.choices[0].message.content;
      return JSON.parse(analysisContent);
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.getFallbackAnalysis(feedback);
    }
  }

  /**
   * Generate marketing content from feedback
   */
  async generateMarketingContent(feedback, analysis, contentType = 'blog_post') {
    try {
      const contentPrompt = this.getContentPrompt(contentType, feedback, analysis);
      
      const generation = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a marketing content creator for MyMoolah. 
            Create engaging, SEO-optimized content based on user feedback.
            Focus on South African fintech market and use appropriate tone and language.`
          },
          {
            role: 'user',
            content: contentPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      const content = generation.choices[0].message.content;
      
      // Calculate SEO score
      const seoScore = this.calculateSEOScore(content, analysis.keywords);
      
      return {
        content,
        seoScore,
        keywords: analysis.keywords,
        platform: contentType,
        status: 'draft'
      };
    } catch (error) {
      console.error('Content generation error:', error);
      return this.getFallbackContent(contentType, feedback);
    }
  }

  /**
   * Generate SEO-optimized content
   */
  async generateSEOContent(feedback, analysis) {
    try {
      const seoPrompt = `Create SEO-optimized content for MyMoolah based on this feedback:
      
      Feedback: ${feedback.title} - ${feedback.description}
      Keywords: ${analysis.keywords.join(', ')}
      
      Generate:
      1. SEO-optimized title (60 characters max)
      2. Meta description (160 characters max)
      3. Focus keywords (5-8 keywords)
      4. Content outline with H2 and H3 headings
      5. Internal linking suggestions
      
      Format as JSON:
      {
        "title": "SEO title",
        "metaDescription": "Meta description",
        "focusKeywords": ["kw1", "kw2"],
        "contentOutline": ["H2: Section 1", "H3: Subsection 1.1"],
        "internalLinks": ["/feature1", "/feature2"],
        "seoScore": 85
      }`;

      const generation = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert specializing in fintech content.'
          },
          {
            role: 'user',
            content: seoPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      const seoContent = generation.choices[0].message.content;
      return JSON.parse(seoContent);
    } catch (error) {
      console.error('SEO content generation error:', error);
      return this.getFallbackSEOContent(feedback);
    }
  }

  /**
   * Generate social media content
   */
  async generateSocialMediaContent(feedback, analysis, platform = 'twitter') {
    try {
      const platformPrompts = {
        twitter: 'Create a Twitter post (280 characters max) with relevant hashtags',
        linkedin: 'Create a LinkedIn post (1300 characters max) with professional tone',
        facebook: 'Create a Facebook post (632 characters max) with engaging tone',
        instagram: 'Create an Instagram caption (2200 characters max) with emojis'
      };

      const prompt = `Create ${platformPrompts[platform]} for MyMoolah based on this feedback:
      
      Feedback: ${feedback.title} - ${feedback.description}
      Sentiment: ${analysis.sentiment}
      Keywords: ${analysis.keywords.join(', ')}
      
      Make it engaging and include relevant hashtags for the South African fintech market.`;

      const generation = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a social media expert for MyMoolah. 
            Create engaging content for ${platform} that resonates with South African users.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      });

      return {
        content: generation.choices[0].message.content,
        platform,
        status: 'draft'
      };
    } catch (error) {
      console.error('Social media content generation error:', error);
      return this.getFallbackSocialContent(platform, feedback);
    }
  }

  /**
   * Get content generation prompt based on type
   */
  getContentPrompt(contentType, feedback, analysis) {
    const prompts = {
      blog_post: `Create a blog post (800-1200 words) for MyMoolah based on this feedback:
        Title: ${feedback.title}
        Description: ${feedback.description}
        Sentiment: ${analysis.sentiment}
        Keywords: ${analysis.keywords.join(', ')}
        
        Include:
        - Engaging introduction
        - Problem/solution structure
        - User benefits
        - Call-to-action
        - SEO optimization`,
      
      feature_announcement: `Create a feature announcement (300-500 words) for MyMoolah:
        Feedback: ${feedback.title} - ${feedback.description}
        Sentiment: ${analysis.sentiment}
        
        Make it exciting and highlight user benefits.`,
      
      marketing_copy: `Create marketing copy (200-300 words) for MyMoolah:
        Based on: ${feedback.title} - ${feedback.description}
        Target: South African fintech users
        Tone: Professional yet friendly
        
        Focus on value proposition and user benefits.`
    };

    return prompts[contentType] || prompts.blog_post;
  }

  /**
   * Calculate SEO score for content
   */
  calculateSEOScore(content, keywords) {
    let score = 0;
    const contentLower = content.toLowerCase();
    
    // Keyword density (30 points)
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        const density = matches.length / contentLower.split(' ').length;
        if (density >= 0.01 && density <= 0.03) score += 10; // Optimal density
        else if (density > 0) score += 5; // Present but not optimal
      }
    });
    
    // Content length (20 points)
    const wordCount = content.split(' ').length;
    if (wordCount >= 800 && wordCount <= 1200) score += 20; // Optimal length
    else if (wordCount >= 500) score += 15; // Good length
    else if (wordCount >= 300) score += 10; // Minimum acceptable
    
    // Readability (25 points)
    const sentences = content.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / sentences;
    if (avgSentenceLength >= 15 && avgSentenceLength <= 25) score += 25; // Optimal
    else if (avgSentenceLength >= 10 && avgSentenceLength <= 30) score += 20; // Good
    else if (avgSentenceLength >= 5 && avgSentenceLength <= 35) score += 15; // Acceptable
    
    // Structure (25 points)
    if (content.includes('##') || content.includes('H2')) score += 10; // Headings
    if (content.includes('**') || content.includes('*')) score += 5; // Bold/italic
    if (content.includes('- ') || content.includes('•')) score += 5; // Lists
    if (content.includes('[') && content.includes(']')) score += 5; // Links
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get fallback analysis when AI fails
   */
  getFallbackAnalysis(feedback) {
    const sentiment = this.analyzeSentimentBasic(feedback.description);
    const priority = feedback.priority;
    
    return {
      sentiment,
      sentimentConfidence: 0.7,
      priority,
      priorityReason: 'Based on user input',
      topics: ['general', 'user-feedback'],
      keywords: this.extractBasicKeywords(feedback.description),
      seoInsights: {
        title: feedback.title,
        metaDescription: feedback.description.substring(0, 160),
        focusKeywords: ['mymoolah', 'feedback', 'user-experience']
      },
      marketingContent: {
        blogPost: 'User feedback on MyMoolah platform improvements',
        socialMedia: 'Listening to our users to improve MyMoolah',
        featureAnnouncement: 'New features based on user feedback'
      },
      userJourney: 'User provided feedback for platform improvement',
      businessImpact: 'Feedback helps improve user experience and platform features'
    };
  }

  /**
   * Basic sentiment analysis
   */
  analyzeSentimentBasic(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'helpful', 'useful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'useless', 'broken', 'problem'];
    
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract basic keywords
   */
  extractBasicKeywords(text) {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
    const keywords = words.filter(word => 
      word.length > 3 && !stopWords.includes(word)
    );
    return [...new Set(keywords)].slice(0, 5);
  }

  /**
   * Get fallback content when AI fails
   */
  getFallbackContent(contentType, feedback) {
    const fallbacks = {
      blog_post: `User Feedback: ${feedback.title}\n\n${feedback.description}\n\nWe appreciate your feedback and are working to improve MyMoolah based on user input like yours.`,
      feature_announcement: `Based on user feedback, we're working on improvements to make MyMoolah even better for our users.`,
      marketing_copy: `Your feedback helps us improve MyMoolah. We're committed to building the best fintech platform for South Africa.`
    };
    
    return {
      content: fallbacks[contentType] || fallbacks.blog_post,
      seoScore: 60,
      keywords: ['mymoolah', 'feedback', 'improvement'],
      platform: contentType,
      status: 'draft'
    };
  }

  /**
   * Get fallback SEO content
   */
  getFallbackSEOContent(feedback) {
    return {
      title: feedback.title,
      metaDescription: feedback.description.substring(0, 160),
      focusKeywords: ['mymoolah', 'feedback', 'fintech'],
      contentOutline: ['Introduction', 'User Feedback', 'Our Response', 'Conclusion'],
      internalLinks: ['/features', '/about'],
      seoScore: 70
    };
  }

  /**
   * Get fallback social content
   */
  getFallbackSocialContent(platform, feedback) {
    const content = `User feedback helps us improve MyMoolah! We're listening and working to make our platform better. #MyMoolah #Fintech #UserExperience`;
    
    return {
      content,
      platform,
      status: 'draft'
    };
  }
}

module.exports = FeedbackService;
