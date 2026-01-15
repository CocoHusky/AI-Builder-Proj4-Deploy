const express = require('express');
const path = require('path');
const fs = require('fs').promises;

// Import personality guard system
let personalityGuard;
try {
  personalityGuard = require('./personality-guard');
  console.log('✅ Personality guard loaded successfully');
} catch (error) {
  console.error('❌ Failed to load personality guard:', error.message);
  personalityGuard = null;
}

const app = express();
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for conversations
app.use(express.static(path.join(__dirname, 'public')));

// Create conversations directory
const conversationsDir = path.join(__dirname, 'conversations');
fs.mkdir(conversationsDir, { recursive: true }).catch(console.error);

// Trust proxy for proper IP detection in production
app.set('trust proxy', 1);

// Model capabilities for server-side processing
const modelCapabilities = {
  'deepseek': ['text'],
  'gpt-5': ['text', 'vision'],
  'gpt-image-1.5': ['image_generation'],
  'grok-4-fast': ['text'],
  'gemini-2.5-pro': ['text', 'vision'],
  'gemini-3-flash-preview': ['text', 'vision'],
  'gemini-2.5-flash-image': ['image_generation'],
  'supermind-agent-v1': ['text', 'web_search']
};

// Import personality guard system
const personalityGuard = require('./personality-guard');

// Chat with AI models
app.post('/chat', async (req, res) => {
  const { messages, model = 'grok-4-fast' } = req.body;
  console.log('Chat request received - Model:', model, 'Messages count:', messages.length);

  try {
    const token = process.env.AI_BUILDER_TOKEN;
    if (!token) {
      return res.json({
        choices: [{ message: { role: 'assistant', content: 'AI_BUILDER_TOKEN not set' } }]
      });
    }

    // Process messages for personality guard rails
    let processedMessages = messages.map(msg => {
      const { image, ...cleanMsg } = msg; // Remove image field
      return cleanMsg;
    });

    // Ensure system prompt is present at the beginning
    if (processedMessages.length === 0 || processedMessages[0].role !== 'system') {
      processedMessages.unshift({
        role: 'system',
        content: personalityGuard.generateSystemPrompt()
      });
    }

    const requestBody = {
      model,
      messages: processedMessages,
      temperature: 0.7
    };

    console.log('Sending to AI Builder with personality guard:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://space.ai-builders.com/backend/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Builder API Error:', response.status, errorText);
      return res.json({
        choices: [{ message: { role: 'assistant', content: `API Error: ${response.status}` } }]
      });
    }

    const data = await response.json();
    console.log('AI Builder API Raw Response:', JSON.stringify(data, null, 2));

    // Apply personality guard rails to the response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const rawResponse = data.choices[0].message.content;
      const userMessage = messages[messages.length - 1]?.content || '';

      console.log('Raw AI response:', rawResponse.substring(0, 100) + '...');

      if (personalityGuard) {
        try {
          // Process through personality guard
          const guardResult = personalityGuard.processChatMessage(userMessage, rawResponse);
          console.log('✅ Personality guard result:', guardResult.action, guardResult.reason);
          console.log('Final response:', guardResult.response.substring(0, 100) + '...');

          // Update learning data
          personalityGuard.updateLearningData(rawResponse, guardResult.response, guardResult.action, guardResult.reason);

          // Replace response with personality-corrected version
          data.choices[0].message.content = guardResult.response;
        } catch (error) {
          console.error('❌ Personality guard processing error:', error.message);
          // Continue without personality guard if there's an error
        }
      } else {
        console.log('⚠️ Personality guard not available, using raw response');
      }
    }

    console.log('Final Response with Personality Guard:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    res.json({
      choices: [{ message: { role: 'assistant', content: `Error: ${error.message}` } }]
    });
  }
});

// Get available models
app.get('/models', async (req, res) => {
  try {
    const token = process.env.AI_BUILDER_TOKEN;
    if (!token) return res.status(500).json({ error: 'AI_BUILDER_TOKEN not set' });

    const response = await fetch('https://space.ai-builders.com/backend/v1/models', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return res.status(500).json({ error: 'Failed to fetch models' });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save conversation
app.post('/conversations', async (req, res) => {
  try {
    const { id, title, messages, model } = req.body;
    const conversation = {
      id,
      title: title || 'New Chat',
      messages,
      model: model, // No hardcoded default - frontend must provide valid model
      timestamp: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(conversationsDir, `${id}.json`),
      JSON.stringify(conversation, null, 2)
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations
app.get('/conversations', async (req, res) => {
  try {
    const files = await fs.readdir(conversationsDir);
    const conversations = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(path.join(conversationsDir, file), 'utf8');
          const conv = JSON.parse(data);
          conversations.push({
            id: conv.id,
            title: conv.title,
            model: conv.model,
            timestamp: conv.timestamp
          });
        } catch (e) { /* skip invalid files */ }
      }
    }

    conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(conversations);
  } catch (error) {
    res.json([]);
  }
});

// Load specific conversation
app.get('/conversations/:id', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(conversationsDir, `${req.params.id}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
});

// Delete conversation
app.delete('/conversations/:id', async (req, res) => {
  try {
    await fs.unlink(path.join(conversationsDir, `${req.params.id}.json`));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve chat interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use AI Builder's assigned port or default to 3001 for local development
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐕 Coco Chat server running on port ${PORT}`);
  console.log(`🐶 Woof woof! Ready to chat with your furry AI friend!`);

  // Log environment info for debugging
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`AI Builder Token: ${process.env.AI_BUILDER_TOKEN ? 'Set' : 'Not set'}`);
});
