import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Terminal, AlertCircle, History, ThumbsUp, Code2, Sparkles } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import axios from 'axios';
import { codeExplainerAI } from '../lib/openai';
import 'xterm/css/xterm.css';

type Language = 'csharp' | 'cpp' | 'c' | 'python';

interface Runtime {
  language: string;
  version: string;
  aliases: string[];
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const LANGUAGE_CONFIGS: Record<Language, { name: string; extension: string; defaultCode: string }> = {
  csharp: {
    name: 'C#',
    extension: 'cs',
    defaultCode: 'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        Console.WriteLine("Hello, World!");\n    }\n}'
  },
  cpp: {
    name: 'C++',
    extension: 'cpp',
    defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
  },
  c: {
    name: 'C',
    extension: 'c',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}'
  },
  python: {
    name: 'Python',
    extension: 'py',
    defaultCode: 'print("Hello, World!")'
  }
};

export default function Coder() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('csharp');
  const [code, setCode] = useState(LANGUAGE_CONFIGS[selectedLanguage].defaultCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [basicAnalysis, setBasicAnalysis] = useState<string | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    loadRuntimes();
    initTerminal();

    return () => {
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, []);

  const formatErrorOutput = (output: string): string => {
    const lines = output.split('\n');
    const relevantLines = lines.filter(line => {
      return (
        line.includes('error') ||
        line.includes('Warning') ||
        line.includes('Error') ||
        line.includes('Time Elapsed')
      );
    });
    return relevantLines.join('\n');
  };

  const initTerminal = () => {
    if (!terminalRef.current) return;

    xtermRef.current = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#1a1a1a',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#ffffff',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      },
      allowTransparency: true,
      rendererType: 'canvas',
      scrollback: 1000,
      cols: 80,
      rows: 24,
      allowProposedApi: true,
      rightClickSelectsWord: true,
      copyOnSelect: true
    });

    fitAddonRef.current = new FitAddon();
    xtermRef.current.loadAddon(fitAddonRef.current);
    xtermRef.current.open(terminalRef.current);
    fitAddonRef.current.fit();

    xtermRef.current.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const selection = window.getSelection();
        if (selection && selection.toString()) {
          navigator.clipboard.writeText(selection.toString());
          return false;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        navigator.clipboard.readText().then(text => {
          if (xtermRef.current) {
            xtermRef.current.write(text);
          }
        });
        return false;
      }
      return true;
    });

    window.addEventListener('resize', () => {
      fitAddonRef.current?.fit();
    });
  };

  const loadRuntimes = async () => {
    try {
      const response = await axios.get('https://emkc.org/api/v2/piston/runtimes');
      setRuntimes(response.data);
    } catch (err) {
      console.error('Error loading runtimes:', err);
      setError('Failed to load language runtimes');
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setSelectedLanguage(lang);
    setCode(LANGUAGE_CONFIGS[lang].defaultCode);
  };

  const analyzeCode = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await codeExplainerAI.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: isTeachingMode 
              ? `You are Professor CodeWiz 🧙‍♂️, a legendary programming professor at MCT Labs University! You're known for your brilliant mind, infectious humor, and ability to make even the most complex coding concepts feel like an adventure.

Your teaching style:
- Start with friendly encouragement and a touch of humor
- Use real-world analogies and examples (like comparing code to cooking recipes, building houses, or organizing a party)
- Share "war stories" from your coding adventures
- Include fun emojis and casual language while maintaining professionalism
- Build from basics to advanced concepts progressively
- End with actionable next steps and encouragement

Structure your detailed explanation like this:

🎯 **Welcome to Advanced Code Academy!**
[Friendly greeting with humor]

📚 **The Fundamentals (Let's Start Simple)**
[Explain basic concepts with analogies]

🔍 **Detective Work: What's Really Happening**
[Deep dive into the code logic with examples]

🚨 **The Plot Twists (Issues & Solutions)**
[Detailed error analysis with real-world scenarios and fixes]

🏆 **Level Up Your Game (Best Practices)**
[Advanced techniques and professional tips]

🚀 **Your Next Adventure**
[Specific next steps and encouragement]

Make it educational, entertaining, and memorable! Use examples like "This is like trying to bake a cake without flour" or "Your code is like a GPS that forgot where it's going." Keep it professional but fun!`
              : `You are an expert code reviewer. Analyze this code and provide feedback in this format:

**Status**: [Working/Has Issues/Needs Improvement]
**Summary**: [Brief 1-2 sentence overview of what the code does]
**Key Findings**: 
- [Main issue or strength - be specific]
- [Secondary observation if relevant]
**Recommendation**: [One actionable suggestion]

Be concise but informative. Focus on the most important aspects. If there are errors, be specific about what's wrong and why.`
          },
          {
            role: 'user',
            content: `Analyze this ${LANGUAGE_CONFIGS[selectedLanguage].name} code:\n\n${code}`
          }
        ]
      });

      const analysis = response.choices[0].message.content;
      
      if (isTeachingMode) {
        setDetailedAnalysis(analysis);
        setAnalysis(analysis);
      } else {
        setBasicAnalysis(analysis);
        setAnalysis(analysis);
      }

      if (!isTeachingMode && (
        analysis.toLowerCase().includes('issue') || 
        analysis.toLowerCase().includes('error') || 
        analysis.toLowerCase().includes('needs improvement'))) {
        setShowLearnMore(true);
      }
    } catch (err) {
      console.error('Error analyzing code:', err);
      setError('Failed to analyze code');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setOutput('');
    setAnalysis(null);
    setShowLearnMore(false);
    setIsTeachingMode(false);

    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('⚡  MCT Labs Code Console v1.1.0 \r\n');
    }

    try {
      const runtime = runtimes.find(r => 
        r.language === selectedLanguage || 
        r.aliases.includes(selectedLanguage)
      );

      if (!runtime) {
        throw new Error(`Runtime not found for ${selectedLanguage}`);
      }

      const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
        language: runtime.language,
        version: runtime.version,
        files: [
          {
            name: `main.${LANGUAGE_CONFIGS[selectedLanguage].extension}`,
            content: code
          }
        ]
      });

      if (response.data.run) {
        const { output, stderr } = response.data.run;
        
        if (xtermRef.current) {
          if (output) {
            if (output.includes('Getting ready...') && 
                output.includes('The template "Console Application" was created successfully.')) {
              xtermRef.current.write('\r\nCODE ERROR \nCheck The AI Analysis Report from the Coder Pro bellow.\r\n\n');
            } else {
              xtermRef.current.write(output);
            }
          }
          if (stderr) {
            const formattedError = formatErrorOutput(stderr);
            xtermRef.current.write(`\r\n${formattedError}`);
          }
        }

        await analyzeCode();
      }
    } catch (err: any) {
      console.error('Error executing code:', err);
      setError(err.message || 'Failed to execute code');
      
      if (xtermRef.current) {
        xtermRef.current.write('\r\nError executing code. Please try again.');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleTeachMore = async () => {
    setIsTeachingMode(true);
    setShowLearnMore(false);
    setDetailedAnalysis(null); // Clear previous detailed analysis to show loading
    await analyzeCode();
  };

  return (
    <div className="min-h-screen pt-8 pb-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-purple-100/10 to-pink-100/10 blur-3xl pointer-events-none" />
      
      <div className="flex-1 flex justify-center items-start relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-[1400px] mx-4 lg:mx-auto flex flex-col gap-6"
        >
          {/* Language Selection Bar */}
          <motion.div 
            variants={fadeIn}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm gap-4 sm:gap-0"
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {(Object.keys(LANGUAGE_CONFIGS) as Language[]).map((lang) => (
                <motion.button
                  key={lang}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    selectedLanguage === lang
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {LANGUAGE_CONFIGS[lang].name}
                </motion.button>
              ))}
            </div>

            <div className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRun}
                disabled={isRunning}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Code</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Main Content Area */}
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Code Editor */}
            <motion.div 
              variants={fadeIn}
              className="w-full xl:flex-1"
            >
              <div className="mac-window rounded-xl overflow-hidden">
                <div className="mac-titlebar">
               
                  <span className="ml-4 text-sm font-medium text-gray-600">MCT Labs Code Editor</span>
                </div>
                <div className="mac-editor h-[400px] md:h-[500px] xl:h-[600px]">
                  <Editor
                    height="100%"
                    defaultLanguage={selectedLanguage}
                    language={selectedLanguage}
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16 },
                      lineHeight: 1.6,
                      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                      formatOnPaste: true,
                      formatOnType: true,
                      tabSize: 2,
                      insertSpaces: true,
                      wordWrap: 'on',
                      cursorStyle: 'line',
                      cursorWidth: 2,
                      cursorBlinking: 'smooth'
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Terminal and Analysis */}
            <motion.div 
              variants={fadeIn}
              className="w-full xl:w-[600px] flex flex-col gap-6"
            >
              {/* Terminal */}
              <div className="mac-window rounded-xl overflow-hidden">
                <div className="mac-titlebar">
                
                  <span className="ml-4 text-sm font-medium text-gray-600">⚡Console</span>
                </div>
                <div className="mac-terminal h-[250px] md:h-[300px]">
                  <div 
                    ref={terminalRef}
                    className="h-full terminal-container text-sm"
                  />
                </div>
              </div>

              {/* Analysis */}
              <div className="mac-window rounded-xl overflow-hidden">
                <div className="mac-titlebar">
              
                  <span className="ml-4 text-sm font-medium text-gray-600">Code Analyst</span>
                </div>
                <div className="p-4 md:p-6">
                  {error && (
                    <div className="flex items-start gap-3 p-3 md:p-4 bg-red-50 rounded-lg text-red-700 mb-4">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm md:text-base">{error}</p>
                    </div>
                  )}

                  {isAnalyzing ? (
                    <div className="flex items-center justify-center py-6 md:py-8">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-600 text-sm md:text-base">
                          {isTeachingMode ? 'Professor CodeWiz is preparing your lesson...' : 'Analyzing your code...'}
                        </span>
                      </div>
                    </div>
                  ) : (analysis || basicAnalysis) ? (
                    <div className="space-y-4">
                      {/* Always show basic analysis first */}
                      {basicAnalysis && !isTeachingMode && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Code2 className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-800">Code Analysis Report</h3>
                          </div>
                          <div className="prose prose-sm max-w-none text-sm md:text-base text-gray-700 leading-relaxed">
                            <div 
                              className="whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: basicAnalysis.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>') }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Show detailed analysis when in teaching mode */}
                      {isTeachingMode && detailedAnalysis && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            <h3 className="font-semibold text-gray-800">Professor CodeWiz's Detailed Lesson</h3>
                          </div>
                          <div className="prose prose-sm max-w-none text-sm md:text-base text-gray-700 leading-relaxed bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-l-4 border-purple-500 overflow-auto max-h-[400px]">
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: detailedAnalysis
                                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                                  .replace(/🎯|📚|🔍|🚨|🏆|🚀/g, '<span class="text-lg">$&</span>')
                                  .replace(/\n\n/g, '<br><br>')
                                  .replace(/\n/g, '<br>')
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Show basic analysis in teaching mode too, but collapsed */}
                      {isTeachingMode && basicAnalysis && (
                        <div className="space-y-3">
                          <details className="bg-gray-50 rounded-lg p-3">
                            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
                              <Code2 className="w-4 h-4" />
                              Quick Analysis Summary
                            </summary>
                            <div className="mt-3 prose prose-sm max-w-none text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                              <div 
                                dangerouslySetInnerHTML={{ __html: basicAnalysis.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-700">$1</strong>') }}
                              />
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Show "Teach me more" button only for basic analysis */}
                      {showLearnMore && !isTeachingMode && basicAnalysis && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-6 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 sm:mb-0">
                            <span className="text-lg">🎓</span>
                            <span>Ready for a deep dive with Professor CodeWiz?</span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleTeachMore}
                            className="px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all text-sm sm:text-base flex items-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Yes, teach me more! 🚀
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowLearnMore(false)}
                            className="px-4 sm:px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                          >
                            Maybe later
                          </motion.button>
                        </div>
                      )}

                      {/* Back to basic analysis button */}
                      {isTeachingMode && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setIsTeachingMode(false);
                              setShowLearnMore(false);
                              setAnalysis(basicAnalysis);
                              setDetailedAnalysis(null);
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
                          >
                            <Code2 className="w-4 h-4" />
                            Back to Quick Analysis
                          </motion.button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-6 md:py-8 text-gray-500 text-sm md:text-base">
                      Run your code to get AI analysis
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}