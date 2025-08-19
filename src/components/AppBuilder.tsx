import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Play, Save, Copy, Check, Sparkles, AlertCircle, Download, Upload, Heart, Eye } from 'lucide-react';
import { codeExplainerAI } from '../lib/openai';
import { publishApp, generateCodePackage, PublishedApp } from '../lib/gameCenter';
import { useAuth } from '../contexts/AuthContext';

interface CodeEditor {
  html: string;
  css: string;
  javascript: string;
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AppBuilder() {
  const [code, setCode] = useState<CodeEditor>({
    html: '',
    css: '',
    javascript: ''
  });
  const [preview, setPreview] = useState<string>('');
  const [copied, setCopied] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishData, setPublishData] = useState({
    title: '',
    description: '',
    category: 'game' as PublishedApp['category'],
    tags: ''
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const { user } = useAuth();

  const handleCodeChange = (type: keyof CodeEditor, value: string) => {
    setCode(prev => ({ ...prev, [type]: value }));
  };

  const generatePreview = () => {
    const previewHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${code.css}</style>
        </head>
        <body>
          ${code.html}
          <script>${code.javascript}</script>
        </body>
      </html>
    `;
    setPreview(previewHTML);
  };

  const copyCode = async (type: keyof CodeEditor) => {
    try {
      await navigator.clipboard.writeText(code[type]);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const parseAIResponse = (response: string): CodeEditor => {
    const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/i);
    const cssMatch = response.match(/```css\n([\s\S]*?)\n```/i);
    const jsMatch = response.match(/```(?:javascript|js)\n([\s\S]*?)\n```/i);

    // If no code blocks found, try alternative parsing
    if (!htmlMatch && !cssMatch && !jsMatch) {
      // Look for HTML section
      const htmlSection = response.match(/HTML:?\s*\n([\s\S]*?)(?=CSS:|JavaScript:|JS:|$)/i);
      const cssSection = response.match(/CSS:?\s*\n([\s\S]*?)(?=HTML:|JavaScript:|JS:|$)/i);
      const jsSection = response.match(/(?:JavaScript|JS):?\s*\n([\s\S]*?)(?=HTML:|CSS:|$)/i);

      return {
        html: htmlSection ? htmlSection[1].trim() : generateDefaultHTML(),
        css: cssSection ? cssSection[1].trim() : generateDefaultCSS(),
        javascript: jsSection ? jsSection[1].trim() : generateDefaultJS()
      };
    }

    return {
      html: htmlMatch ? htmlMatch[1].trim() : generateDefaultHTML(),
      css: cssMatch ? cssMatch[1].trim() : generateDefaultCSS(),
      javascript: jsMatch ? jsMatch[1].trim() : generateDefaultJS()
    };
  };

  const generateDefaultHTML = () => `<div class="container">
  <h1>Welcome to Your App</h1>
  <p>This is a basic HTML structure. Modify it as needed!</p>
  <button id="actionBtn">Click Me</button>
</div>`;

  const generateDefaultCSS = () => `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

button:hover {
  background: #5a67d8;
}`;

  const generateDefaultJS = () => `document.addEventListener('DOMContentLoaded', function() {
  const button = document.getElementById('actionBtn');
  
  if (button) {
    button.addEventListener('click', function() {
      alert('Hello from your app!');
    });
  }
});`;

  const handleGenerateCode = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const systemPrompt = `You are an expert web developer. Generate clean, modern, and functional code for a web application based on the user's request. 

IMPORTANT: Always provide your response in this exact format:

\`\`\`html
[HTML code here]
\`\`\`

\`\`\`css
[CSS code here]
\`\`\`

\`\`\`javascript
[JavaScript code here]
\`\`\`

Requirements:
- HTML: Create semantic, accessible HTML structure
- CSS: Use modern CSS with responsive design, attractive styling, and smooth animations
- JavaScript: Add interactive functionality, event handlers, and dynamic behavior
- Make it visually appealing with gradients, shadows, and modern design
- Ensure the code is production-ready and follows best practices
- Include proper error handling in JavaScript
- Make it mobile-responsive

User Request: ${prompt}`;

      const response = await codeExplainerAI.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      });

      const aiResponse = response.choices[0]?.message?.content || '';
      const parsedCode = parseAIResponse(aiResponse);
      
      setCode(parsedCode);
      
      // Auto-generate preview after setting code
      setTimeout(() => {
        const previewHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${parsedCode.css}</style>
            </head>
            <body>
              ${parsedCode.html}
              <script>${parsedCode.javascript}</script>
            </body>
          </html>
        `;
        setPreview(previewHTML);
      }, 100);
      
    } catch (err: any) {
      console.error('Error generating code:', err);
      setError(err.message || 'Failed to generate code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCode = () => {
    if (!code.html && !code.css && !code.javascript) {
      setError('No code to download. Please generate or write some code first.');
      return;
    }

    const title = publishData.title || 'My App';
    const blob = generateCodePackage(code.html, code.css, code.javascript, title);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePublishApp = async () => {
    if (!publishData.title.trim() || !publishData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!code.html && !code.css && !code.javascript) {
      setError('No code to publish. Please generate or write some code first.');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const tags = publishData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await publishApp({
        title: publishData.title,
        description: publishData.description,
        author: user?.displayName || 'Anonymous',
        html: code.html,
        css: code.css,
        javascript: code.javascript,
        category: publishData.category,
        tags
      });

      setPublishSuccess(true);
      setShowPublishModal(false);
      
      // Reset form
      setPublishData({
        title: '',
        description: '',
        category: 'game',
        tags: ''
      });

      setTimeout(() => setPublishSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error publishing app:', err);
      setError(err.message || 'Failed to publish app. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      className="w-full max-w-7xl mx-auto p-6"
    >
      <motion.div variants={fadeIn} className="mb-8 text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          AI-Powered App Builder
        </h2>
        <p className="text-gray-600 mt-2">
          Describe your app idea and let AI generate the code for you
        </p>
      </motion.div>

      <motion.div variants={fadeIn} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* AI Prompt Input */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" /> AI Code Generator
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {publishSuccess && (
                <div className="p-4 bg-green-50 rounded-lg flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-green-600 text-sm">App published successfully! It's now available in the Game Center.</p>
                </div>
              )}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the app you want to create... 

Examples:
- Create a todo list app with add, delete, and mark complete features
- Build a calculator with basic math operations
- Make a simple weather app interface
- Create a photo gallery with lightbox effect
- Build a contact form with validation"
                className="w-full h-40 p-4 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm leading-relaxed"
              />
              <button
                onClick={handleGenerateCode}
                disabled={isGenerating || !prompt.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Code...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate App Code</span>
                  </>
                )}
              </button>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleDownloadCode}
                  disabled={!code.html && !code.css && !code.javascript}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Code</span>
                </button>

                <button
                  onClick={() => setShowPublishModal(true)}
                  disabled={!code.html && !code.css && !code.javascript}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Publish to Game Center</span>
                </button>
              </div>
            </div>
          </div>

          {/* Code Editors */}
          <div className="space-y-4">
            {/* HTML Editor */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b bg-orange-50">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-orange-600" /> HTML
                </h3>
                <button
                  onClick={() => copyCode('html')}
                  className="p-1.5 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  {copied === 'html' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
              <textarea
                value={code.html}
                onChange={(e) => handleCodeChange('html', e.target.value)}
                className="w-full h-48 p-4 bg-transparent focus:outline-none resize-none font-mono text-sm"
                placeholder="HTML code will appear here after generation..."
              />
            </div>

            {/* CSS Editor */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b bg-blue-50">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-600" /> CSS
                </h3>
                <button
                  onClick={() => copyCode('css')}
                  className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  {copied === 'css' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
              <textarea
                value={code.css}
                onChange={(e) => handleCodeChange('css', e.target.value)}
                className="w-full h-48 p-4 bg-transparent focus:outline-none resize-none font-mono text-sm"
                placeholder="CSS code will appear here after generation..."
              />
            </div>

            {/* JavaScript Editor */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b bg-green-50">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-green-600" /> JavaScript
                </h3>
                <button
                  onClick={() => copyCode('javascript')}
                  className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
                >
                  {copied === 'javascript' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
              <textarea
                value={code.javascript}
                onChange={(e) => handleCodeChange('javascript', e.target.value)}
                className="w-full h-48 p-4 bg-transparent focus:outline-none resize-none font-mono text-sm"
                placeholder="JavaScript code will appear here after generation..."
              />
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden h-full">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-teal-50">
              <h3 className="font-semibold text-gray-700">Live Preview</h3>
              <button
                onClick={generatePreview}
                disabled={!code.html && !code.css && !code.javascript}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                <span>Run Code</span>
              </button>
            </div>
            <div className="h-[calc(100vh-20rem)] bg-white relative">
              {preview ? (
                <iframe
                  srcDoc={preview}
                  title="preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Play className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Ready to Preview</p>
                  <p className="text-sm text-center max-w-md">
                    Generate code with AI or write your own, then click "Run Code" to see your app in action
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Publish to Game Center
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Title *
                </label>
                <input
                  type="text"
                  value={publishData.title}
                  onChange={(e) => setPublishData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter app title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={publishData.description}
                  onChange={(e) => setPublishData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Describe your app..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={publishData.category}
                  onChange={(e) => setPublishData(prev => ({ ...prev, category: e.target.value as PublishedApp['category'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="game">Game</option>
                  <option value="utility">Utility</option>
                  <option value="creative">Creative</option>
                  <option value="educational">Educational</option>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={publishData.tags}
                  onChange={(e) => setPublishData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., puzzle, fun, interactive"
                />
              </div>
                </select>
              <div className="text-xs text-gray-500">
                * Required fields. Your app will be publicly available in the Game Center.
              </div>
            </div>
              </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishApp}
                disabled={isPublishing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Publish App
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}