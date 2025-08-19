import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Download, AlertCircle, History, Wand2, FileUp, X, Text, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateAnimation } from '../lib/animation';

interface HistoryItem {
  id: string;
  prompt: string;
  video_url: string;
  created_at: string;
}

type Mode = 'text-to-3d' | 'image-to-3d';
type ModelStyle = 'realistic' | 'stylized' | 'gameready';

interface Resolution {
  label: string;
  width: number;
  height: number;
}

interface AspectRatio {
  label: string;
  value: number;
  disabled?: boolean;
}

const RESOLUTIONS: Resolution[] = [
  { label: '480p', width: 854, height: 480 },
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '1440p', width: 2560, height: 1440 }
];

const ASPECT_RATIOS: AspectRatio[] = [
  { label: '16:9', value: 16/9 },
  { label: '4:3', value: 4/3 },
  { label: '1:1', value: 1 },
  { label: '9:16', value: 9/16 },
  { label: '21:9', value: 21/9, disabled: true },
  { label: '32:9', value: 32/9, disabled: true },
  { label: '1:2', value: 1/2, disabled: true }
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

export default function ThreeDPage() {
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
  const [mode, setMode] = useState<Mode>('text-to-3d');
  const [selectedResolution, setSelectedResolution] = useState<Resolution>(RESOLUTIONS[1]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const [selectedStyle, setSelectedStyle] = useState<ModelStyle>('realistic');
  const [isTextured, setIsTextured] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('history_items')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', '3d_model')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history');
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

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setError('This feature is currently under maintenance and will be available soon. Thank you for your patience!');
    } finally {
      setIsGenerating(false);
    }
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
          {/* Language Selection Bar */}
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
                onClick={() => setMode('text-to-3d')}
                className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                  mode === 'text-to-3d'
                    ? 'mode-button-beta text-white shadow-lg'
                    : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-blue-600 shadow-sm'
                }`}
              >
                <Text className="w-3.5 h-3.5" />
                <AnimatePresence>
                  {(mode === 'text-to-3d' || window.innerWidth > 640) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Text to 3D
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode('image-to-3d')}
                className={`saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm ${
                  mode === 'image-to-3d'
                    ? 'mode-button-advanced text-white shadow-lg'
                    : 'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-purple-600 shadow-sm'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <AnimatePresence>
                  {(mode === 'image-to-3d' || window.innerWidth > 640) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Image to 3D
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
                  <span className="ml-4 text-sm font-medium text-gray-600">MCT Labs 3D Modeler</span>
                </div>
                <div className="flex-1 bg-white/80 backdrop-blur-sm p-4 sm:p-6 space-y-6 min-h-[500px] lg:h-[600px] overflow-y-auto">
                  {mode === 'text-to-3d' ? (
                    <div className="space-y-4">
                      <textarea
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        placeholder="Describe the 3D model you want to generate..."
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
                          placeholder="Add any specific instructions for 3D conversion..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 min-h-[100px] resize-none"
                        />
                      </div>
                    </div>
                  )}

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
                          <option key={res.label} value={`${res.width}x${res.height}`}>
                            {res.label}
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
                          >
                            {ratio.label}{ratio.disabled ? ' (Coming Soon)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Textured</span>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsTextured(!isTextured)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isTextured ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <motion.span
                        initial={false}
                        animate={{
                          x: isTextured ? 20 : 2,
                          backgroundColor: isTextured ? '#fff' : '#fff'
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="inline-block h-4 w-4 transform rounded-full shadow-lg"
                      />
                    </motion.button>
                  </div>

                  {mode === 'text-to-3d' && (
                    <div className="flex gap-2 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedStyle('realistic')}
                        className={`flex-1 px-4 py-2 rounded-lg ${
                          selectedStyle === 'realistic'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/50 text-gray-700 hover:bg-purple-50'
                        } transition-colors`}
                      >
                        Realistic
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedStyle('stylized')}
                        className={`flex-1 px-4 py-2 rounded-lg ${
                          selectedStyle === 'stylized'
                            ? 'bg-pink-600 text-white'
                            : 'bg-white/50 text-gray-700 hover:bg-pink-50'
                        } transition-colors`}
                      >
                        Stylized
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedStyle('gameready')}
                        className={`flex-1 px-4 py-2 rounded-lg ${
                          selectedStyle === 'gameready'
                            ? 'bg-red-600 text-white'
                            : 'bg-white/50 text-gray-700 hover:bg-red-50'
                        } transition-colors`}
                      >
                        GameReady
                      </motion.button>
                    </div>
                  )}

                  <div className="flex gap-3 sm:gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGenerate}
                      disabled={isGenerating || (mode === 'image-to-3d' ? !selectedImage : !textPrompt.trim())}
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
                          <span className="font-medium truncate">Generate 3D Model</span>
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
                <div className="flex-1 bg-gray-50 p-4 sm:p-6 min-h-[500px] lg:h-[600px] flex flex-col">
                  <div className="flex-1 flex items-center justify-center">
                    {videoUrl ? (
                      <div className="w-[400px] h-[400px]">
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full object-cover rounded-lg shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-full max-w-[500px] h-[300px] flex flex-col items-center justify-center">
                        <Video className="w-12 h-12 opacity-50 mb-2" />
                        <p className="text-gray-500">Generated 3D model will appear here</p>
                      </div>
                    )}
                  </div>

                  {showHistory && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">History</h3>
                      <div className="grid grid-cols-2 gap-4 max-h-[200px] overflow-y-auto">
                        {history.map((item, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100"
                          >
                            <video
                              src={item.video_url}
                              controls
                              className="w-full aspect-video object-cover bg-gray-100"
                            />
                            <div className="p-4">
                              <p className="text-sm text-gray-600 line-clamp-2">{item.prompt}</p>
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
                    <p>Generated 3D model will appear here</p>
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