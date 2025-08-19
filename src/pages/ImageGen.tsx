import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Download, AlertCircle, History, Wand2, FileUp, X, Text, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveHistoryItem as firebaseSaveHistoryItem, getHistoryItems as loadHistoryItems } from '../lib/firebaseHistory';
import { generateImage } from '../lib/openai';

interface HistoryItem {
  id: string;
  content: string;
  metadata: {
    image_url: string;
  };
  created_at: Date;
}

type GenerationMode = 'standard' | 'pro' | 'flash';

interface Resolution {
  label: string;
  width: number;
  height: number;
  disabled?: boolean;
}

interface AspectRatio {
  label: string;
  value: number;
  disabled?: boolean;
}

const RESOLUTIONS: Resolution[] = [
  { label: '480p', width: 854, height: 480, disabled: true },
  { label: '720p', width: 1280, height: 720, disabled: true },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '1440p', width: 2560, height: 1440, disabled: true }
];

const ASPECT_RATIOS: AspectRatio[] = [
  { label: '16:9', value: 16/9, disabled: true },
  { label: '4:3', value: 4/3, disabled: true },
  { label: '1:1', value: 1 },
  { label: '9:16', value: 9/16, disabled: true }
];

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

export default function ImageGen() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalText, setAdditionalText] = useState('');
  const [textPrompt, setTextPrompt] = useState('');
  const [mode, setMode] = useState<GenerationMode>('standard');
  const [selectedResolution, setSelectedResolution] = useState<Resolution>(RESOLUTIONS[2]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[2]);
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const isValidImageUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const loadHistory = async () => {
    try {
      const data = await loadHistoryItems(user?.uid || '', 'image');
      
      const processedData = data.map(item => {
        const imageUrl = item.metadata.image_url;
        
        if (!isValidImageUrl(imageUrl)) {
          console.warn(`Invalid image URL in history item ${item.id}`);
          return {
            ...item,
            metadata: {
              ...item.metadata,
              image_url: '/placeholder-image.png'
            }
          };
        }

        return {
          ...item,
          metadata: {
            ...item.metadata,
            image_url: imageUrl
          }
        };
      });
      
      setHistory(processedData || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history');
    }
  };

  const handleGenerate = async () => {
    if (!textPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGenerationStatus('Generating image');

    try {
      const imageUrl = await generateImage(textPrompt, mode);
      setGeneratedImage(imageUrl);
      await handleSaveImageHistory(textPrompt, imageUrl);
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleSaveImageHistory = async (prompt: string, imageUrl: string) => {
    try {
      await firebaseSaveHistoryItem(user?.uid || '', 'image', prompt, {
        image_url: imageUrl,
        mode: mode
      });
      
      loadHistory();
    } catch (err) {
      console.error('Error saving to history:', err);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading image:', err);
      setError('Failed to download image. Please try again.');
    }
  };

  useEffect(() => {
    return () => {
      if (generatedImage && generatedImage.startsWith('blob:')) {
        URL.revokeObjectURL(generatedImage);
      }
    };
  }, [generatedImage]);

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
          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Panel */}
            <motion.div 
              variants={fadeIn}
              className="w-full lg:w-[45%] flex flex-col"
            >
              <div className="mac-window rounded-xl overflow-hidden flex flex-col">
                <div className="mac-titlebar">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium text-gray-600">MCT Labs Canvas</span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowHistory(!showHistory)}
                      className="px-2 py-1 rounded-full text-gray-600 hover:bg-gray-100"
                    >
                      <History className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-6 space-y-6">
                  {/* Mode Selection */}
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMode('standard')}
                        className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                          mode === 'standard'
                            ? 'mode-button-stable text-white shadow-lg'
                            : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-orange-600 shadow-sm'
                        }`}
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <AnimatePresence>
                          {(mode === 'standard' || window.innerWidth > 640) && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="overflow-hidden whitespace-nowrap"
                            >
                              Standard
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMode('pro')}
                        className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                          mode === 'pro'
                            ? 'mode-button-beta text-white shadow-lg'
                            : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-blue-600 shadow-sm'
                        }`}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <AnimatePresence>
                          {(mode === 'pro' || window.innerWidth > 640) && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="overflow-hidden whitespace-nowrap"
                            >
                              Pro
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMode('flash')}
                        className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                          mode === 'flash'
                            ? 'mode-button-advanced text-white shadow-lg'
                            : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-purple-600 shadow-sm'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <AnimatePresence>
                          {(mode === 'flash' || window.innerWidth > 640) && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="overflow-hidden whitespace-nowrap"
                            >
                              Flash
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <textarea
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                      placeholder="Describe the image you want to generate..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 min-h-[150px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resolution
                      </label>
                      <select
                        value={`${selectedResolution.width}x${selectedResolution.height}`}
                        onChange={(e) => {
                          const [width, height] = e.target.value.split('x').map(Number);
                          setSelectedResolution({ label: e.target.value, width, height });
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                      >
                        {RESOLUTIONS.map((res) => (
                          <option 
                            key={res.label} 
                            value={`${res.width}x${res.height}`}
                            disabled={res.disabled}
                            className={res.disabled ? 'text-gray-400' : ''}
                          >
                            {res.label}{res.disabled ? ' (Coming Soon)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aspect Ratio
                      </label>
                      <select
                        value={selectedAspectRatio.label}
                        onChange={(e) => {
                          const ratio = ASPECT_RATIOS.find(r => r.label === e.target.value);
                          if (ratio && !ratio.disabled) setSelectedAspectRatio(ratio);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                      >
                        {ASPECT_RATIOS.map((ratio) => (
                          <option 
                            key={ratio.label} 
                            value={ratio.label}
                            disabled={ratio.disabled}
                            className={ratio.disabled ? 'text-gray-400' : ''}
                          >
                            {ratio.label}{ratio.disabled ? ' (Coming Soon)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGenerate}
                      disabled={isGenerating || !textPrompt.trim()}
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
                          <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="font-medium truncate">Generate Image</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPreview(true)}
                      className="lg:hidden w-12 sm:w-14 h-10 sm:h-12 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg"
                    >
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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
                    {generatedImage ? (
                      <div className="w-full max-w-xl">
                        <img
                          src={generatedImage}
                          alt="Generated"
                          className="w-full h-auto rounded-lg shadow-lg"
                          onError={(e) => {
                            console.error('Image failed to load:', e);
                            setError('Failed to load the generated image. Please try again.');
                          }}
                        />
                        <div className="mt-4 flex justify-center">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleDownload}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Image</span>
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <ImagePlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Generated image will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden mt-16"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-medium">History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {history.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100"
                    >
                      <img
                        src={item.metadata.image_url}
                        alt={item.content}
                        className="w-full aspect-square object-cover bg-gray-100"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-image.png';
                          console.warn(`Failed to load image for history item ${item.id}`);
                        }}
                      />
                      <div className="p-4">
                        <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {item.created_at.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {generatedImage ? (
                  <div className="space-y-4">
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full h-auto rounded-lg shadow-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-image.png';
                        setError('Failed to load the generated image. Please try again.');
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDownload}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Image</span>
                    </motion.button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <ImagePlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Generated image will appear here</p>
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