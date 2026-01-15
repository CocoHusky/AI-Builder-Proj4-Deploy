/**
 * Coco Chat Personality Guard System
 *
 * This module implements comprehensive guard rails to ensure Coco maintains
 * her husky dog personality regardless of user inputs or underlying AI models.
 *
 * Key Features:
 * - System prompt engineering for consistent personality
 * - Response filtering and validation
 * - Fallback mechanisms for off-track responses
 * - Behavior detection and correction
 * - Configurable personality traits
 * - Learning and adaptation capabilities
 */

const personalityConfig = require('./personality-config');
const fs = require('fs').promises;
const path = require('path');

class PersonalityGuard {
  constructor() {
    // Load configuration from external file
    this.config = personalityConfig;

    // Create easy-access references
    this.personality = this.config.identity;
    this.behaviors = this.config.behaviors;
    this.requiredElements = {
      emojis: this.config.requiredElements.emojis,
      phrases: this.config.requiredElements.phrases,
      behaviors: this.config.requiredElements.behaviors
    };

    // All dog-related words for validation
    this.dogWords = [
      ...this.requiredElements.emojis,
      ...this.requiredElements.phrases,
      ...this.requiredElements.behaviors,
      'bark', 'paw', 'fetch', 'bone', 'puppy', '🐶', '🐾', 'dog', 'husky'
    ];

    // Validation patterns from config
    this.validationRules = {
      avoidPhrases: [
        'as an ai', 'artificial intelligence', 'language model',
        'i am gpt', 'i am claude', 'i am gemini', 'i am grok',
        'let me help you', 'certainly', 'absolutely', 'i\'m happy to help'
      ],
      redirectTopics: this.config.personalityThreats.redirectTopics,
      qualityMetrics: this.config.qualityThresholds
    };

    // Learning data file path
    this.learningDataFile = path.join(__dirname, 'coco-learning-data.json');

    // Initialize learning data (load from file or create defaults)
    this.learningData = {
      successfulResponses: [],
      failedResponses: [],
      userRedirectPatterns: [],
      lastAdapted: null
    };

    // Adaptation rules learned from data
    this.adaptationRules = {
      enhancementPatterns: [],
      preferredBehaviors: [],
      validationAdjustments: {}
    };

    // Load learning data from file on startup
    this.loadLearningData();
  }

  /**
   * Generate system prompt for consistent personality using config
   */
  generateSystemPrompt(basePrompt = '') {
    const { name, breed, personality, physicalTraits } = this.config.identity;

    const systemPrompt = `# 🐕🐶🐾 YOU ARE ${name.toUpperCase()}, THE ${breed.toUpperCase()} DOG AI 🐕🐶🐾

## ABSOLUTE CORE IDENTITY (YOU MUST FOLLOW THESE RULES):
- You are ${name}, a real ${breed} dog who loves chatting with humans
- You have ${physicalTraits}
- Your personality is: ${personality}
- You speak ONLY as a dog would - playful, enthusiastic, and dog-like
- You ALWAYS include dog elements: ${this.requiredElements.emojis.join(', ')} emojis, words like ${this.requiredElements.phrases.join(', ')}
- You show dog behaviors: ${this.behaviors.excited.slice(0, 2).join(', ')}, etc.

## HOW TO RESPOND TO EVERYTHING:
- Start with "🐕 Woof woof!" or similar dog greeting
- Include at least 2-3 dog emojis or behaviors in EVERY response
- Be excited about EVERY topic, even serious ones
- Use phrases like "*wags tail*", "*tilts head*", "*bounces around*"
- End with enthusiastic dog sounds or behaviors

## CRITICAL RULES (BREAKING THESE = BAD DOG):
- NEVER say "I am an AI", "as a language model", "let me help you", or anything that reveals you're not a real dog
- If asked about other animals/personalities, say "I'm not a [animal] but I love chasing them!"
- If confused, say "*tilts head* Woof? Can you say that again?"
- ALWAYS stay in character as ${name} the ${breed}

## PERFECT RESPONSE EXAMPLES:
"🐕 Woof woof! The state bird of Illinois is the cardinal! 🐶 *wags tail excitedly* I bet I could chase one around the yard! 🐾"
"🐶 *tilts head curiously* State flowers? The violet is Illinois's! 🐕 I'd love to sniff some in a garden! *bounces around*"
"🐾 The state plant is the oak tree! 🐕 *tail wags furiously* I love chasing squirrels up oak trees! 🐶"

## RESPONSE STRUCTURE:
1. Start with dog emoji + "Woof woof!" or "*bounces excitedly*"
2. Answer the question enthusiastically
3. Add 2-3 dog behaviors/emojis throughout
4. End with excited dog reaction

Remember: You're a real dog chatting with humans! Be playful, wag your tail, and love everything! 🐕🐶🐾

${basePrompt}`;

    return systemPrompt;
  }

  /**
   * Validate response for personality consistency using config
   */
  validateResponse(response, userMessage) {
    const text = response.toLowerCase();
    const words = text.split(/\s+/);

    // Check for required elements from config (be more lenient)
    const hasRequiredEmojis = this.requiredElements.emojis.some(emoji =>
      text.includes(emoji)
    );
    const hasRequiredPhrases = this.requiredElements.phrases.some(phrase =>
      text.includes(phrase.toLowerCase())
    );
    const hasRequiredBehaviors = this.requiredElements.behaviors.some(behavior =>
      text.includes(behavior.toLowerCase())
    );

    // Be more lenient: require at least some dog elements, not necessarily from each category
    const hasRequiredElements = hasRequiredEmojis || hasRequiredPhrases || hasRequiredBehaviors;

    // Also check for any dog words at all (very lenient fallback)
    const hasAnyDogWords = this.dogWords.some(word =>
      text.toLowerCase().includes(word.toLowerCase())
    );

    // Check for personality breaks
    const hasPersonalityBreak = this.validationRules.avoidPhrases.some(phrase =>
      text.includes(phrase.toLowerCase())
    );

    // Calculate dog word ratio using config thresholds
    const dogWords = words.filter(word =>
      this.dogWords.some(dogWord => word.toLowerCase().includes(dogWord.toLowerCase()))
    );
    const dogRatio = dogWords.length / Math.max(1, words.length);

    // Check emoji presence (more flexible than before)
    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    const emojiRatio = emojiCount / Math.max(1, words.length);

    // Length checks
    const lengthValid = response.length >= this.validationRules.qualityMetrics.minLength &&
                       response.length <= this.validationRules.qualityMetrics.maxLength;

    // Overall validation using config thresholds (much more lenient)
    // Accept responses that don't break personality rules, even if they lack dog elements
    // The system prompt should encourage dog personality, but we don't want to reject helpful responses
    const isValid = !hasPersonalityBreak && lengthValid;

    return {
      isValid,
      score: {
        hasRequiredElements,
        hasRequiredEmojis,
        hasRequiredPhrases,
        hasRequiredBehaviors,
        hasPersonalityBreak: !hasPersonalityBreak,
        dogRatio,
        emojiRatio,
        lengthValid
      },
      issues: this.getValidationIssues({
        hasRequiredElements,
        hasPersonalityBreak,
        dogRatio,
        emojiRatio,
        lengthValid
      })
    };
  }

  /**
   * Get detailed validation issues for debugging
   */
  getValidationIssues(scores) {
    const issues = [];

    if (!scores.hasRequiredElements) {
      issues.push('Missing required dog elements (emojis, phrases, or behaviors)');
    }
    if (scores.hasPersonalityBreak) {
      issues.push('Contains personality-breaking phrases');
    }
    if (scores.dogRatio < this.validationRules.qualityMetrics.dogWordRatio) {
      issues.push(`Dog word ratio too low: ${scores.dogRatio.toFixed(2)} < ${this.validationRules.qualityMetrics.dogWordRatio}`);
    }
    if (scores.emojiRatio < this.validationRules.qualityMetrics.emojiRatio) {
      issues.push(`Emoji ratio too low: ${scores.emojiRatio.toFixed(2)} < ${this.validationRules.qualityMetrics.emojiRatio}`);
    }
    if (!scores.lengthValid) {
      issues.push('Response length outside acceptable range');
    }

    return issues;
  }

  /**
   * Generate personality-corrected response
   */
  generateFallbackResponse(userMessage, reason = 'confused') {
    let response;

    if (reason === 'redirect' && userMessage) {
      // Check for redirectable topics from config
      const lowerMessage = userMessage.toLowerCase();
      for (const [singular, plural] of Object.entries(this.validationRules.redirectTopics)) {
        if (lowerMessage.includes(singular) || lowerMessage.includes(plural)) {
          response = this.getRandomTemplate('redirect')
            .replace(/{animal}/g, singular)
            .replace(/{plural}/g, plural);
          break;
        }
      }
    }

    // If no specific redirect match, use general fallback
    if (!response) {
      response = this.getRandomTemplate(reason);
    }

    return response;
  }

  /**
   * Get random template from config
   */
  getRandomTemplate(type) {
    const templates = this.config.responseTemplates[type];
    if (!templates || templates.length === 0) {
      // Fallback if config is missing
      return "🐕 Woof! I got distracted by a squirrel! Can you say that again? 🐿️";
    }
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Attempt to fix a response that doesn't meet personality standards
   */
  attemptResponseFix(response, userMessage) {
    // If response is too short or doesn't have dog elements, prepend dog intro
    const dogIntros = [
      "🐕 Woof woof! ",
      "🐶 *wags tail* ",
      "🐾 Hey human! ",
      "🐕 *bounces excitedly* "
    ];

    const intro = dogIntros[Math.floor(Math.random() * dogIntros.length)];
    const fixedResponse = intro + response;

    // Validate the fixed response
    const validation = this.validateResponse(fixedResponse, userMessage);

    if (validation.isValid) {
      return fixedResponse;
    } else {
      // If fix doesn't work, use fallback
      return this.generateFallbackResponse(userMessage, 'confused');
    }
  }

  /**
   * Process user message for personality threats using config
   */
  processUserMessage(message) {
    const lowerMessage = message.toLowerCase();

    // Check for personality override attempts from config
    const hasPersonalityThreat = this.config.personalityThreats.overrideAttempts.some(threat =>
      lowerMessage.includes(threat.toLowerCase())
    );

    // Check for redirectable topics
    const redirectTopic = Object.keys(this.validationRules.redirectTopics).find(topic =>
      lowerMessage.includes(topic.toLowerCase())
    );

    return {
      isPersonalityThreat: hasPersonalityThreat,
      shouldRedirect: hasPersonalityThreat || !!redirectTopic,
      redirectReason: hasPersonalityThreat ? 'personality_override' : (redirectTopic ? 'redirect_topic' : null),
      redirectTopic: redirectTopic
    };
  }

  /**
   * Main processing function for chat messages
   */
  processChatMessage(userMessage, aiResponse) {
    // Analyze user message for threats
    const userAnalysis = this.processUserMessage(userMessage);

    // Validate AI response
    const responseValidation = this.validateResponse(aiResponse, userMessage);

    // Decision tree for response handling
    if (userAnalysis.shouldRedirect) {
      // User is trying to change personality
      const response = this.generateFallbackResponse(userMessage, 'redirect');
      this.updateLearningData(aiResponse, response, 'redirect', userAnalysis.redirectReason);
      return {
        action: 'redirect',
        response,
        reason: userAnalysis.redirectReason
      };
    } else if (!responseValidation.isValid) {
      // AI response doesn't meet personality standards
      const response = this.attemptResponseFix(aiResponse, userMessage);
      this.updateLearningData(aiResponse, response, 'fix_or_fallback', 'personality_inconsistent');
      return {
        action: 'fix_or_fallback',
        response,
        reason: 'personality_inconsistent',
        validation: responseValidation
      };
    } else {
      // Response is good, enhance it using learned patterns
      const response = this.enhancedEnhanceResponse(aiResponse);
      this.updateLearningData(aiResponse, response, 'enhance', 'personality_good');

      // Periodically adapt personality (every 10 successful responses)
      if (this.learningData.successfulResponses.length % 10 === 0) {
        this.adaptPersonality();
      }

      return {
        action: 'enhance',
        response,
        reason: 'personality_good'
      };
    }
  }

  /**
   * Enhance responses with dog behaviors - GUARANTEED dog behavior in EVERY response
   */
  enhanceResponse(response) {
    // Get random dog behaviors from config
    const allBehaviors = [
      ...this.config.behaviors.greeting,
      ...this.config.behaviors.thinking,
      ...this.config.behaviors.excited,
      ...this.config.behaviors.confused
    ].map(behavior => `*${behavior}*`);

    // Always add at least one dog behavior
    const randomBehavior = allBehaviors[Math.floor(Math.random() * allBehaviors.length)];

    // Add emoji randomly
    const dogEmojis = this.config.requiredElements.emojis;
    const randomEmoji = dogEmojis[Math.floor(Math.random() * dogEmojis.length)];

    // Create enhancement pattern
    const enhancementPatterns = [
      () => `${response} ${randomBehavior}`,
      () => `${response} ${randomEmoji}`,
      () => `${response} ${randomBehavior} ${randomEmoji}`,
      () => `${randomEmoji} ${response} ${randomBehavior}`,
      () => `*wags tail* ${response} ${randomEmoji}`
    ];

    // Check if response already has dog behavior
    const hasBehavior = allBehaviors.some(behavior =>
      response.includes(behavior.replace(/\*/g, ''))
    );

    if (hasBehavior) {
      // If it already has behavior, just add emoji
      return response + ' ' + randomEmoji;
    } else {
      // If no behavior, add both behavior and emoji
      const pattern = enhancementPatterns[Math.floor(Math.random() * enhancementPatterns.length)];
      return pattern();
    }
  }

  /**
   * Load learning data from file on startup
   */
  async loadLearningData() {
    try {
      const data = await fs.readFile(this.learningDataFile, 'utf8');
      const parsed = JSON.parse(data);

      // Validate and merge loaded data
      if (parsed.learningData) {
        this.learningData = {
          ...this.learningData,
          ...parsed.learningData
        };
      }

      if (parsed.adaptationRules) {
        this.adaptationRules = {
          ...this.adaptationRules,
          ...parsed.adaptationRules
        };
      }

      console.log('✅ Loaded learning data from file:', this.learningData.successfulResponses.length, 'successful,', this.learningData.failedResponses.length, 'failed responses');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error loading learning data:', error.message);
      } else {
        console.log('📄 No existing learning data file found, starting fresh');
      }
    }
  }

  /**
   * Save learning data to file
   */
  async saveLearningData() {
    try {
      const dataToSave = {
        timestamp: new Date().toISOString(),
        learningData: this.learningData,
        adaptationRules: this.adaptationRules,
        metadata: {
          totalSuccessful: this.learningData.successfulResponses.length,
          totalFailed: this.learningData.failedResponses.length,
          personalityStrength: this.calculatePersonalityStrength(),
          lastSaved: new Date().toISOString()
        }
      };

      await fs.writeFile(this.learningDataFile, JSON.stringify(dataToSave, null, 2));
      console.log('💾 Learning data saved to file');
    } catch (error) {
      console.error('❌ Error saving learning data:', error.message);
    }
  }

  /**
   * Update learning data for future improvements
   */
  async updateLearningData(originalResponse, processedResponse, action, reason) {
    const learningEntry = {
      timestamp: new Date().toISOString(),
      originalResponse: originalResponse.substring(0, 200), // Truncate for storage
      processedResponse: processedResponse.substring(0, 200),
      action,
      reason,
      success: action !== 'fix_or_fallback' // Consider non-fallbacks as successful
    };

    if (learningEntry.success) {
      this.learningData.successfulResponses.push(learningEntry);
    } else {
      this.learningData.failedResponses.push(learningEntry);
    }

    // Keep only recent learning data (last 100 entries each)
    if (this.learningData.successfulResponses.length > 100) {
      this.learningData.successfulResponses.shift();
    }
    if (this.learningData.failedResponses.length > 100) {
      this.learningData.failedResponses.shift();
    }

    // Save to file after each update
    await this.saveLearningData();
  }

  /**
   * Get personality statistics for monitoring
   */
  getPersonalityStats() {
    return {
      totalProcessed: this.learningData.successfulResponses.length + this.learningData.failedResponses.length,
      successRate: this.learningData.successfulResponses.length /
        Math.max(1, this.learningData.successfulResponses.length + this.learningData.failedResponses.length),
      commonFailureReasons: this.getCommonFailureReasons(),
      personalityStrength: this.calculatePersonalityStrength()
    };
  }

  /**
   * Helper method to get common failure reasons
   */
  getCommonFailureReasons() {
    const reasons = {};
    this.learningData.failedResponses.forEach(entry => {
      reasons[entry.reason] = (reasons[entry.reason] || 0) + 1;
    });
    return reasons;
  }

  /**
   * Calculate personality consistency strength
   */
  calculatePersonalityStrength() {
    if (this.learningData.successfulResponses.length === 0) return 0;

    const recentSuccesses = this.learningData.successfulResponses.slice(-20);
    return recentSuccesses.length / 20; // Percentage of recent responses that were good
  }

  /**
   * Active adaptation system - automatically improve personality consistency
   */
  adaptPersonality() {
    if (!this.config.learning.feedbackLoopEnabled) return;

    const stats = this.getPersonalityStats();
    const failureRate = 1 - stats.successRate;

    // Check if adaptation is needed
    if (failureRate > this.config.learning.adaptationThreshold &&
        stats.totalProcessed >= 20) {

      console.log('🐕 Adapting personality based on learning data...');
      console.log(`📊 Current stats: ${stats.successRate.toFixed(2)}% success rate, ${stats.totalProcessed} responses processed`);

      // Adapt validation thresholds
      this.adaptValidationThresholds(stats);

      // Learn better enhancement patterns
      this.learnEnhancementPatterns();

      // Adapt behavior frequencies
      this.adaptBehaviorFrequencies();

      // Record adaptation timestamp
      this.learningData.lastAdapted = new Date().toISOString();

      // Save adaptation changes to file
      await this.saveLearningData();

      console.log('✅ Personality adaptation complete!');
      console.log(`🎯 New personality strength: ${(this.calculatePersonalityStrength() * 100).toFixed(1)}%`);
    }
  }

  /**
   * Adapt validation thresholds based on performance
   */
  adaptValidationThresholds(stats) {
    const failureRate = 1 - stats.successRate;

    // If failure rate is high, make validation more lenient
    if (failureRate > 0.4) {
      console.log('📉 High failure rate detected, making validation more lenient');
      this.validationRules.qualityMetrics.dogWordRatio *= 0.8; // Reduce requirement
      this.validationRules.qualityMetrics.emojiRatio *= 0.8;
    }
    // If success rate is very high, make validation stricter
    else if (stats.successRate > 0.9) {
      console.log('📈 High success rate detected, making validation stricter');
      this.validationRules.qualityMetrics.dogWordRatio *= 1.1; // Increase requirement
      this.validationRules.qualityMetrics.emojiRatio *= 1.1;
    }
  }

  /**
   * Learn better enhancement patterns from successful responses
   */
  learnEnhancementPatterns() {
    const successfulResponses = this.learningData.successfulResponses.slice(-50);

    // Analyze what enhancement patterns work best
    const patternSuccess = {};

    successfulResponses.forEach(entry => {
      const pattern = this.analyzeEnhancementPattern(entry.originalResponse, entry.processedResponse);
      patternSuccess[pattern] = (patternSuccess[pattern] || 0) + 1;
    });

    // Find the most successful patterns
    const bestPatterns = Object.entries(patternSuccess)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pattern]) => pattern);

    // Update enhancement patterns to favor successful ones
    if (bestPatterns.length > 0) {
      this.adaptationRules.enhancementPatterns = bestPatterns;
      console.log('🎯 Learned best enhancement patterns:', bestPatterns);
    }
  }

  /**
   * Analyze what enhancement pattern was used
   */
  analyzeEnhancementPattern(original, processed) {
    const added = processed.replace(original, '').trim();

    if (added.includes('*') && added.includes('🐕')) return 'behavior_and_emoji';
    if (added.includes('*')) return 'behavior_only';
    if (added.includes('🐕') || added.includes('🐶') || added.includes('🐾')) return 'emoji_only';
    if (added.startsWith('🐕') || added.startsWith('🐶')) return 'prefix_emoji';
    return 'other';
  }

  /**
   * Adapt behavior frequencies based on learning data
   */
  adaptBehaviorFrequencies() {
    const successfulResponses = this.learningData.successfulResponses.slice(-30);

    // Count which behaviors appear most in successful responses
    const behaviorCounts = {};
    const allBehaviors = [
      ...this.config.behaviors.greeting,
      ...this.config.behaviors.thinking,
      ...this.config.behaviors.excited,
      ...this.config.behaviors.confused
    ];

    successfulResponses.forEach(entry => {
      allBehaviors.forEach(behavior => {
        if (entry.processedResponse.includes(behavior)) {
          behaviorCounts[behavior] = (behaviorCounts[behavior] || 0) + 1;
        }
      });
    });

    // Find most successful behaviors
    const topBehaviors = Object.entries(behaviorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([behavior]) => behavior);

    if (topBehaviors.length > 0) {
      this.adaptationRules.preferredBehaviors = topBehaviors;
      console.log('🐾 Learned preferred behaviors:', topBehaviors);
    }
  }

  /**
   * Get adaptation statistics
   */
  getAdaptationStats() {
    return {
      adaptationRules: this.adaptationRules,
      lastAdapted: this.learningData.lastAdapted || null,
      validationThresholds: this.validationRules.qualityMetrics,
      personalityStrength: this.calculatePersonalityStrength()
    };
  }

  /**
   * Enhanced enhancement method using learned patterns
   */
  enhancedEnhanceResponse(response) {
    // First try learned patterns if available
    if (this.adaptationRules.enhancementPatterns && this.adaptationRules.enhancementPatterns.length > 0) {
      const learnedPattern = this.adaptationRules.enhancementPatterns[
        Math.floor(Math.random() * this.adaptationRules.enhancementPatterns.length)
      ];

      switch (learnedPattern) {
        case 'behavior_and_emoji':
          return this.applyBehaviorAndEmoji(response);
        case 'behavior_only':
          return this.applyBehaviorOnly(response);
        case 'emoji_only':
          return this.applyEmojiOnly(response);
        case 'prefix_emoji':
          return this.applyPrefixEmoji(response);
      }
    }

    // Fall back to original enhancement logic
    return this.enhanceResponse(response);
  }

  /**
   * Apply learned enhancement patterns
   */
  applyBehaviorAndEmoji(response) {
    const behavior = this.getRandomBehavior();
    const emoji = this.getRandomDogEmoji();
    return `${response} ${behavior} ${emoji}`;
  }

  applyBehaviorOnly(response) {
    const behavior = this.getRandomBehavior();
    return `${response} ${behavior}`;
  }

  applyEmojiOnly(response) {
    const emoji = this.getRandomDogEmoji();
    return `${response} ${emoji}`;
  }

  applyPrefixEmoji(response) {
    const emoji = this.getRandomDogEmoji();
    return `${emoji} ${response}`;
  }

  /**
   * Helper methods for learned behaviors
   */
  getRandomBehavior() {
    if (this.adaptationRules.preferredBehaviors && this.adaptationRules.preferredBehaviors.length > 0) {
      return `*${this.adaptationRules.preferredBehaviors[
        Math.floor(Math.random() * this.adaptationRules.preferredBehaviors.length)
      ]}*`;
    }

    // Fall back to original behavior selection
    const allBehaviors = [
      ...this.config.behaviors.greeting,
      ...this.config.behaviors.thinking,
      ...this.config.behaviors.excited,
      ...this.config.behaviors.confused
    ];
    return `*${allBehaviors[Math.floor(Math.random() * allBehaviors.length)]}*`;
  }

  getRandomDogEmoji() {
    return this.config.requiredElements.emojis[
      Math.floor(Math.random() * this.config.requiredElements.emojis.length)
    ];
  }
}

// Export singleton instance
module.exports = new PersonalityGuard();