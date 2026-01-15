# Coco Chat 🐕

A paw-some ChatGPT-like interface for chatting with AI models via the AI Builder API. Woof woof! 🐶

## 🚀 Simple Deployment on AI Builder

**All files are in repository root - no copying needed!**

### Deploy Steps:
```bash
# 1. Commit your changes
git add .
git commit -m "Update Coco Chat"

# 2. Push to GitHub
git push origin main

# 3. Deploy via AI Builder API
curl -X POST "https://space.ai-builders.com/backend/v1/deployments" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/CocoHusky/AI-Builder",
    "service_name": "coco-chat",
    "branch": "main",
    "port": 3001
  }'
```

## Features

- **🐕 Coco Chat interface** - Dog-themed design with sidebar and chat area
- **🐾 Paw-some conversations** - Save, load, and delete conversations
- **🦴 Model selection** - Choose from available AI models
- **🏡 Individual conversations** - Each chat is completely isolated like good dogs

## Quick Start

1. Set your AI Builder token:
   ```bash
   export AI_BUILDER_TOKEN=your_token_here
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open http://localhost:3001 in your browser and start chatting with your furry AI friend! 🐶

## 🌐 AI Builder Deployment

### Prerequisites
- AI Builder account with API access
- Valid `AI_BUILDER_TOKEN`
- **Public GitHub repository** (required for deployment)

### Deployment Steps

1. **Prepare the Application**
   - Ensure all files are committed to your repository
   - Verify `package.json` includes all dependencies
   - Test locally: `npm install && npm start`
   - **Make repository public** on GitHub (Settings → Danger Zone → Make public)

2. **AI Builder Deployment with Organized Code Structure**

   **Code Organization:** All source code stays in `proj4_image_content_analysis/mcp-chat/`
   **Deployment:** Use `deploy.js` script (in repository root) to copy files for AI Builder

   **Deployment Steps:**
   ```bash
   # 1. From repository root, prepare deployment files
   node deploy.js

   # 2. Commit the copied files
   git add .
   git commit -m "Deploy Coco Chat"

   # 3. Push to GitHub
   git push origin main

   # 4. Deploy via AI Builder API
   curl -X POST "https://space.ai-builders.com/backend/v1/deployments" \
     -H "Authorization: Bearer sk_c806f15a_00c8115f3cb021c8de40cb4dd9ff2a704f85" \
     -H "Content-Type: application/json" \
     -d '{
       "repo_url": "https://github.com/CocoHusky/AI-Builder",
       "service_name": "coco-chat",
       "branch": "main",
       "port": 3001
     }'
   ```

   **Alternative: Dashboard Deployment**
   - Access your AI Builder deployment dashboard
   - Create a new web application deployment
   - Select "Node.js" as the runtime environment
   - Set the entry point to `server.js`

3. **Environment Configuration**
   - Set environment variable: `AI_BUILDER_TOKEN=your_token_here`
   - Optionally set: `NODE_ENV=production`
   - The application will automatically use AI Builder's assigned PORT

4. **Upload & Deploy**
   - Upload the entire project directory
   - AI Builder will automatically install dependencies and start the application
   - The application will be available at your AI Builder deployment URL

### Production Features
- ✅ Automatic port detection (`process.env.PORT`)
- ✅ Production-ready error handling
- ✅ Shared conversation storage for all users
- ✅ Static file serving optimized
- ✅ Environment variable support

### Troubleshooting
- Check AI Builder logs for any startup errors
- Verify `AI_BUILDER_TOKEN` is properly set
- Ensure all dependencies are listed in `package.json`

## Usage

- Click "New Chat" to start a conversation
- Select your preferred AI model from the dropdown
- Type messages and press Enter to send
- Conversations are automatically saved
- Click on saved conversations in the sidebar to reload them
- Hover over conversations and click × to delete them

## Project Structure

- `server.js` - Express server with API endpoints
- `public/index.html` - Chat interface
- `conversations/` - Auto-created directory for saved chats