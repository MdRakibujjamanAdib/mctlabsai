import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Save, Mic, Download, AlertCircle, ExternalLink, Headphones, MicOff, Wand2, Copy, Check, History } from 'lucide-react';
import { getVoices, generateSpeech } from '../lib/elevenlabs';
import { useAuth } from '../contexts/AuthContext';
import { getTunerHistory, saveTunerHistory as saveTunerHistoryToFirebase, getChatMessages, saveChatMessage } from '../lib/firebaseHistory';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
}

type TunerMode = 'speech-to-text' | 'text-to-speech';

interface HistoryItem {
  content: string;
  created_at: string;
  voice_gender?: string;
  voice_id?: string;
}

export default function Tuner() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<TunerMode>('text-to-speech');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedText, setCopiedText] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadVoices();
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, mode]);

  const loadHistory = async () => {
    try {
      if (!user) return;

      if (mode === 'text-to-speech') {
        const data = await getTunerHistory(user.uid);
        setHistory(data || []);
      } else {
        const data = await getChatMessages(user.uid, 'speech-to-text');
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history. Please try again.');
    }
  };

  const saveSpeechToTextHistory = async (content: string) => {
    if (!user || !content.trim()) return;

    try {
      await saveChatMessage(user.uid, 'user', content.trim(), 'speech-to-text');
      
      await loadHistory();
    } catch (err) {
      console.error('Error saving speech to text history:', err);
      setError('Failed to save speech to text. Please try again.');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        if (finalTranscript) {
          setText(prev => prev + ' ' + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError('Speech recognition failed. Please try again.');
        setIsRecording(false);
      };

      setRecognition(recognition);
    }
  };

  const toggleRecording = async () => {
    if (!recognition) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      if (text.trim()) {
        await saveSpeechToTextHistory(text.trim());
      }
    } else {
      setText('');
      recognition.start();
      setIsRecording(true);
      setError(null);
    }
  };

  const loadVoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const availableVoices = await getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0].voice_id);
      }
    } catch (err: any) {
      console.error('Error loading voices:', err);
      setError(err.message || 'Failed to load voices. Please check your API key configuration.');
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return;

    setIsGenerating(true);
    setError(null);

    try {
      const audio = await generateSpeech(text, selectedVoice);
      const blob = new Blob([audio], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      if (user) {
        await saveTunerHistory(text, selectedVoice);
      }
    } catch (err: any) {
      console.error('Error generating speech:', err);
      setError(err.message || 'Failed to generate speech. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `generated-speech-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveTunerHistory = async (content: string, voiceId: string) => {
    try {
      if (!user) return;
      
      await saveTunerHistoryToFirebase({
        user_id: user.uid,
        content: content,
        voice_id: voiceId,
        voice_gender: 'female'
      });
      loadHistory();
    } catch (err) {
      console.error('Error saving tuner history:', err);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col relative pt-24">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex-1 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col bg-white/80 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-purple-50/30 to-pink-50/30 pointer-events-none" />

            <div className="p-4 sm:p-5 border-b border-gray-100/10 relative">
              <div className="flex items-center justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowHistory(!showHistory)}
                  className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                    showHistory
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-indigo-600 shadow-sm'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="relative z-10">History</span>
                </motion.button>

                <div className="flex items-center justify-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMode('text-to-speech')}
                    className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                      mode === 'text-to-speech'
                        ? 'mode-button-beta text-white shadow-lg'
                        : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-indigo-600 shadow-sm'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <AnimatePresence>
                      {(mode === 'text-to-speech' || window.innerWidth > 640) && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          Text to Speech
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMode('speech-to-text')}
                    className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                      mode === 'speech-to-text'
                        ? 'mode-button-advanced text-white shadow-lg'
                        : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-purple-600 shadow-sm'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <AnimatePresence>
                      {(mode === 'speech-to-text' || window.innerWidth > 640) && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          Speech to Text
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>

                {/* Empty div to maintain flex spacing */}
                <div className="w-[72px]"></div>
              </div>
            </div>

            {error && (
              <div className="px-6 py-3 bg-red-50 border-b">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                  {error.includes('API key') && (
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      <a 
                        href="https://elevenlabs.io/sign-up" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-red-700"
                      >
                        Get your API key from ElevenLabs
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 p-6 space-y-6 relative">
              {mode === 'text-to-speech' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Voice
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50"
                    disabled={voices.length === 0}
                  >
                    {voices.length === 0 ? (
                      <option value="">No voices available</option>
                    ) : (
                      voices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {mode === 'speech-to-text' && (
                <div className="flex items-center justify-center mb-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleRecording}
                    className={`relative w-32 h-32 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-red-500' : 'bg-indigo-600'
                    } text-white shadow-lg hover:shadow-xl transition-all`}
                  >
                    {isRecording && (
                      <>
                        <div className="recording-wave" />
                        <div className="recording-wave recording-wave-2" />
                        <div className="recording-wave recording-wave-3" />
                      </>
                    )}
                    <div className="relative flex flex-col items-center gap-2">
                      {isRecording ? (
                        <>
                          <MicOff className="w-8 h-8" />
                          <span className="text-sm font-medium">Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8" />
                          <span className="text-sm font-medium">Record</span>
                        </>
                      )}
                    </div>
                  </motion.button>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    {mode === 'text-to-speech' ? 'Text to Speech' : 'Speech to Text'}
                  </label>
                  {mode === 'speech-to-text' && text && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={mode === 'text-to-speech' ? "Enter text to convert to speech..." : "Your speech will appear here..."}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 min-h-[150px] resize-none"
                  readOnly={mode === 'speech-to-text' && isRecording}
                />
              </div>

              {showHistory && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {mode === 'text-to-speech' ? 'Text to Speech History' : 'Speech to Text History'}
                  </h3>
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
                      >
                        <p className="text-sm text-gray-600">{item.content}</p>
                        {mode === 'text-to-speech' && item.voice_gender && (
                          <p className="text-xs text-indigo-600 mt-1">
                            Voice: {item.voice_gender.charAt(0).toUpperCase() + item.voice_gender.slice(1)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'text-to-speech' && audioUrl && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePlay}
                    className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center"
                  >
                    <AnimatePresence mode="wait">
                      {isPlaying ? (
                        <motion.div
                          key="pause"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Pause className="w-6 h-6 text-indigo-600" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="play"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Play className="w-6 h-6 text-indigo-600 ml-1" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleDownload}
                    className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center"
                  >
                    <Download className="w-6 h-6 text-indigo-600" />
                  </motion.button>

                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t">
              <div className="flex items-center justify-center">
                {mode === 'text-to-speech' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerate}
                    disabled={isGenerating || !text.trim() || !selectedVoice || voices.length === 0}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:translate-y-[-2px]"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        <span className="font-medium">Generate Speech</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}