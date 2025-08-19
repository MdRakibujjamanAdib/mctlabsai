import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Gamepad2, ArrowLeft } from 'lucide-react';
import AppBuilder from '../components/AppBuilder';
import GameSpace from '../components/GameSpace';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'selection' | 'builder' | 'explorer';

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

const cardHover = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

export default function Build() {
  const [mode, setMode] = useState<Mode>('selection');
  const { user } = useAuth();

  const handleBack = () => {
    setMode('selection');
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100/20 via-teal-100/20 to-cyan-100/20 blur-3xl pointer-events-none" />
      
      <div className="flex-1 flex justify-center items-center relative z-10 p-6">
        {mode !== 'selection' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-6 left-6"
          >
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </motion.div>
        )}

        {mode === 'selection' ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="w-full max-w-4xl"
          >
            <motion.div 
              variants={fadeIn}
              className="text-center mb-12"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                Welcome to MCT Labs Build
              </h1>
              <p className="text-gray-600">
                Choose your path: Build your own games or explore existing ones
              </p>
            </motion.div>

            <motion.div
              variants={fadeIn}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <motion.div
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg cursor-pointer group"
                onClick={() => setMode('builder')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center mb-6">
                    <Code2 className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">I'm a Builder</h3>
                  <p className="text-gray-600">
                    Create your own games using HTML, CSS, and JavaScript. Build, test, and share your creations.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg cursor-pointer group"
                onClick={() => setMode('explorer')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mb-6">
                    <Gamepad2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">I'm an Explorer</h3>
                  <p className="text-gray-600">
                    Discover and play games created by the MCT Labs community. Experience unique and engaging gameplay.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            {mode === 'builder' ? <AppBuilder /> : <GameSpace />}
          </motion.div>
        )}
      </div>
    </div>
  );
}