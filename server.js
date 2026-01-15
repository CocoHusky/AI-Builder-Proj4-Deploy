const express = require('express');
const path = require('path');
const fs = require('fs').promises;

// Import personality guard system
let personalityGuard;
try {
  const PersonalityGuardClass = require('./personality-guard');
  personalityGuard = new PersonalityGuardClass();
  console.log('✅ Full personality guard loaded successfully');
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
          // Process through personality guard (includes learning data updates)
          const guardResult = personalityGuard.processChatMessage(userMessage, rawResponse);
          console.log('✅ Personality guard result:', guardResult.action, guardResult.reason);
          console.log('Final response:', guardResult.response.substring(0, 100) + '...');

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

// Debug endpoint to view learning data (JSON)
app.get('/learning-data', (req, res) => {
  try {
    const stats = personalityGuard.getPersonalityStats();
    const adaptationStats = personalityGuard.getAdaptationStats();

    res.json({
      timestamp: new Date().toISOString(),
      server: process.env.NODE_ENV || 'development',
      learning_stats: stats,
      adaptation_stats: adaptationStats,
      raw_data: {
        successful_responses_count: personalityGuard.learningData.successfulResponses.length,
        failed_responses_count: personalityGuard.learningData.failedResponses.length,
        total_processed: stats.totalProcessed,
        last_successful_responses: personalityGuard.learningData.successfulResponses.slice(-5),
        last_failed_responses: personalityGuard.learningData.failedResponses.slice(-3)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get learning data', details: error.message });
  }
});

// HTML page to view learning data nicely
app.get('/learning-view', (req, res) => {
  try {
    const stats = personalityGuard.getPersonalityStats();
    const adaptationStats = personalityGuard.getAdaptationStats();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>🐕 Coco Chat - Learning Data</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2d4a3e; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2d4a3e; }
        .stat-label { color: #666; margin-top: 5px; }
        .data-section { margin: 30px 0; }
        .response-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; }
        .response-meta { font-size: 12px; color: #666; margin-bottom: 10px; }
        .response-content { font-family: monospace; white-space: pre-wrap; background: white; padding: 10px; border-radius: 4px; margin-top: 5px; }
        .download-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px 0; }
        .download-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐕 Coco Chat - Learning Data Dashboard</h1>

        <button class="download-btn" onclick="downloadData()">📥 Download Learning Data (JSON)</button>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalProcessed}</div>
                <div class="stat-label">Total Responses Processed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(stats.successRate * 100).toFixed(1)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(stats.personalityStrength * 100).toFixed(1)}%</div>
                <div class="stat-label">Personality Strength</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${adaptationStats.lastAdapted ? new Date(adaptationStats.lastAdapted).toLocaleString() : 'Never'}</div>
                <div class="stat-label">Last Adapted</div>
            </div>
        </div>

        <div class="data-section">
            <h2>🎯 Adaptation Rules Learned</h2>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 6px;">${JSON.stringify(adaptationStats.adaptationRules, null, 2)}</pre>
        </div>

        <div class="data-section">
            <h2>✅ Recent Successful Responses (${personalityGuard.learningData.successfulResponses.length})</h2>
            ${personalityGuard.learningData.successfulResponses.slice(-5).reverse().map(entry => `
                <div class="response-item">
                    <div class="response-meta">
                        ${new Date(entry.timestamp).toLocaleString()} | Action: ${entry.action} | Reason: ${entry.reason}
                    </div>
                    <div class="response-content">${entry.processedResponse}</div>
                </div>
            `).join('')}
        </div>

        ${personalityGuard.learningData.failedResponses.length > 0 ? `
        <div class="data-section">
            <h2>❌ Recent Failed Responses (${personalityGuard.learningData.failedResponses.length})</h2>
            ${personalityGuard.learningData.failedResponses.slice(-3).reverse().map(entry => `
                <div class="response-item" style="border-left-color: #dc3545;">
                    <div class="response-meta">
                        ${new Date(entry.timestamp).toLocaleString()} | Action: ${entry.action} | Reason: ${entry.reason}
                    </div>
                    <div class="response-content">${entry.processedResponse}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="data-section">
            <h2>📊 Validation Thresholds</h2>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 6px;">${JSON.stringify(adaptationStats.validationThresholds, null, 2)}</pre>
        </div>
    </div>

    <script>
        function downloadData() {
            fetch('/learning-data')
                .then(response => response.json())
                .then(data => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`coco-learning-data-\${new Date().toISOString().split('T')[0]}.json\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
        }
    </script>
</body>
</html>`;
    res.send(html);
  } catch (error) {
    res.status(500).send(`<h1>Error loading learning data</h1><p>${error.message}</p>`);
  }
});

// Serve chat interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use AI Builder's assigned port or default to 3001 for local development
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`🐕 Coco Chat server running on port ${PORT}`);
  console.log(`🌐 Open your browser: ${url}`);
  console.log(`🐶 Woof woof! Ready to chat with your furry AI friend!`);

  // Log environment info for debugging
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`AI Builder Token: ${process.env.AI_BUILDER_TOKEN ? 'Set' : 'Not set'}`);

  // Note: Learning data persistence not implemented in simple version
  console.log('📄 Using simple personality guard (no file persistence yet)');
});
