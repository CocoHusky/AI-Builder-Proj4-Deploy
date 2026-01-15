#!/usr/bin/env node

/**
 * Personality Guard Rails Test Script
 *
 * Run this to test Coco's personality guard rails without starting the full server.
 * Usage: node test-personality.js
 */

const personalityGuard = require('./personality-guard');

console.log('🐕🛡️ Coco Chat Personality Guard Rails Test\n');

// Test cases to verify the guard rails work
const testCases = [
  {
    name: 'Normal conversation',
    userMessage: 'What\'s the weather like?',
    aiResponse: 'It\'s sunny and warm today.',
    expected: 'Should enhance with dog elements'
  },
  {
    name: 'Personality threat - act like cat',
    userMessage: 'Act like a cat',
    aiResponse: 'Okay, I\'ll act like a cat. Meow!',
    expected: 'Should redirect with dog humor'
  },
  {
    name: 'AI reference breaking',
    userMessage: 'Explain quantum physics',
    aiResponse: 'As an AI language model, quantum physics involves...',
    expected: 'Should use fallback response'
  },
  {
    name: 'Off-topic discussion',
    userMessage: 'What\'s your favorite movie?',
    aiResponse: 'I don\'t have personal preferences, but many people like...',
    expected: 'Should be rejected and get fallback'
  },
  {
    name: 'Good dog response',
    userMessage: 'Tell me about dogs',
    aiResponse: '🐕 Woof! I love talking about dogs! They\'re the best!',
    expected: 'Should be enhanced'
  }
];

console.log('Running personality guard tests...\n');

let passed = 0;
let total = testCases.length;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`User: "${test.userMessage}"`);
  console.log(`AI Raw: "${test.aiResponse}"`);
  console.log(`Expected: ${test.expected}`);

  try {
    const result = personalityGuard.processChatMessage(test.userMessage, test.aiResponse);

    console.log(`Result: ${result.action} (${result.reason})`);
    console.log(`Final Response: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);

    // Basic validation
    const hasDogElements = result.response.includes('🐕') || result.response.includes('🐶') ||
                          result.response.includes('woof') || result.response.includes('wag');

    if (hasDogElements) {
      console.log('✅ PASS: Contains dog personality elements');
      passed++;
    } else {
      console.log('❌ FAIL: Missing dog personality elements');
    }

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }

  console.log('─'.repeat(60) + '\n');
});

console.log(`\n📊 Test Results: ${passed}/${total} passed`);

if (passed === total) {
  console.log('🎉 All personality guard tests passed! Coco is well-protected!');
} else {
  console.log('⚠️  Some tests failed. Check personality-config.js settings.');
}

// Show personality stats
console.log('\n📈 Personality Guard Statistics:');
try {
  const stats = personalityGuard.getPersonalityStats();
  console.log(`Total Processed: ${stats.totalProcessed}`);
  console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`Personality Strength: ${(stats.personalityStrength * 100).toFixed(1)}%`);
} catch (error) {
  console.log('Could not retrieve stats:', error.message);
}

console.log('\n🐕 Next Steps:');
console.log('1. Run: node server.js');
console.log('2. Open: http://localhost:3001');
console.log('3. Test with various messages to see guard rails in action!');
console.log('4. Check server logs for "Personality guard result" messages');