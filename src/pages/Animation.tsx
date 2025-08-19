import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Download, AlertCircle, History, Wand2, FileUp, X, Text, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateAnimation } from '../lib/animation';

interface HistoryItem {
  id: string;
  content: string;
  metadata: {
    video_url: string;
  };
  created_at: string;
}

type GenerationMode = 'text-to-motion' | 'image-to-motion';

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

export default function Animation() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalText, setAdditionalText] = useState('');
  const [textPrompt, setTextPrompt] = useState('');
  const [mode, setMode] = useState<GenerationMode>('text-to-motion');
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('history_items')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'animation')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history');
    }
  };

  const handleGenerate = async () => {
    if ((!textPrompt.trim() && mode === 'text-to-motion') || 
        (!selectedImage && mode === 'image-to-motion') || 
        isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGenerationStatus(mode === 'text-to-motion' ? 'Preparing animation' : 'Processing image');

    try {
      const prompt = mode === 'image-to-motion' 
        ? `[Truck left,Pan right]${additionalText || 'Generate motion from this image'}`
        : textPrompt;

      const videoUrl = await generateAnimation({
        prompt,
        image: mode === 'image-to-motion' ? selectedImage : undefined
      });
      
      setVideoUrl(videoUrl);

      // Save to history
      if (user) {
        const { error } = await supabase
          .from('history_items')
          .insert({
            user_id: user.id,
            type: 'animation',
            content: mode === 'image-to-motion' ? additionalText : textPrompt,
            metadata: {
              video_url: videoUrl,
              mode
            }
          });

        if (error) throw error;
        loadHistory();
      }
    } catch (err: any) {
      console.error('Error generating animation:', err);
      setError(err.message || 'Failed to generate animation');
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-purple-100/10 to-pink-100/10 blur-3xl pointer-events-none" />
      
      <div className="flex-1 flex justify-center items-start relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-[1400px] mx-4 lg:mx-auto"
        >
          {/* Mode Selection Bar */}
          <motion.div 
            variants={fadeIn}
            className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm mb-6"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHistory(!showHistory)}
              className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                showHistory
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-blue-600 shadow-sm'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="relative z-10">History</span>
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode('text-to-motion')}
                className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                  mode === 'text-to-motion'
                    ? 'mode-button-beta text-white shadow-lg'
                    : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-blue-600 shadow-sm'
                }`}
              >
                <Text className="w-3.5 h-3.5" />
                <AnimatePresence>
                  {(mode === 'text-to-motion' || window.innerWidth > 640) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Text to Motion
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode('image-to-motion')}
                className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                  mode === 'image-to-motion'
                    ? 'mode-button-advanced text-white shadow-lg'
                    : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-purple-600 shadow-sm'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <AnimatePresence>
                  {(mode === 'image-to-motion' || window.innerWidth > 640) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Image to Motion
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.div>

          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Panel */}
            <motion.div 
              variants={fadeIn}
              className="w-full lg:w-[45%] flex flex-col"
            >
              <div className="mac-window rounded-xl overflow-hidden flex flex-col">
                <div className="mac-titlebar">
                  <span className="text-sm font-medium text-gray-600">MCT Labs Animator</span>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-6 space-y-6">
                  {mode === 'text-to-motion' ? (
                    <div className="space-y-4">
                      <textarea
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        placeholder="Describe the animation you want to generate..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 min-h-[150px] resize-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        
                        {imagePreview ? (
                          <div className="relative w-full">
                            <img
                              src={imagePreview}
                              alt="Selected"
                              className="w-full h-auto rounded-lg shadow-lg object-contain max-h-[200px]"
                            />
                            <button
                              onClick={clearSelectedImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center gap-3 text-gray-600 hover:text-gray-800"
                          >
                            <FileUp className="w-8 h-8" />
                            <span>Click to upload an image</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Additional Instructions (optional)
                        </label>
                        <textarea
                          value={additionalText}
                          onChange={(e) => setAdditionalText(e.target.value)}
                          placeholder="Add any specific instructions for animation..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 min-h-[100px] resize-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 sm:gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGenerate}
                      disabled={isGenerating || (mode === 'image-to-motion' ? !selectedImage : !textPrompt.trim())}
                      className="flex-1 min-w-0 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="font-medium truncate">
                            {generationStatus}...
                          </span>
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="font-medium truncate">Generate Animation</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPreview(true)}
                      className="lg:hidden w-12 sm:w-14 h-10 sm:h-12 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg"
                    >
                      <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Panel - Desktop Only */}
            <motion.div 
              variants={fadeIn}
              className="hidden lg:flex lg:flex-col w-[55%]"
            >
              <div className="mac-window rounded-xl overflow-hidden flex flex-col h-full">
                <div className="mac-titlebar">
                  <span className="text-sm font-medium text-gray-600">Preview</span>
                </div>
                <div className="flex-1 bg-gray-50 p-6 flex flex-col">
                  <div className="flex-1 flex items-center justify-center">
                    {videoUrl ? (
                      <div className="w-full max-w-xl">
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Generated animation will appear here</p>
                      </div>
                    )}
                  </div>

                  {showHistory && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">History</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {history.map((item, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100"
                          >
                            <video
                              src={item.metadata.video_url}
                              controls
                              className="w-full aspect-video object-cover bg-gray-100"
                            />
                            <div className="p-4">
                              <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Mobile Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 lg:hidden"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-auto rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Generated animation will appear here</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}