import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ImagePlus, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const fadeInUp = {
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

const blobAnimation = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 0.3,
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};

const cardHover = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial="initial"
          animate="animate"
          variants={blobAnimation}
          className="absolute -top-48 -left-48 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl"
        />
        <motion.div
          initial="initial"
          animate="animate"
          variants={blobAnimation}
          transition={{ delay: 1 }}
          className="absolute top-48 -right-48 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl"
        />
        <motion.div
          initial="initial"
          animate="animate"
          variants={blobAnimation}
          transition={{ delay: 2 }}
          className="absolute -bottom-48 left-48 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl"
        />
      </div>

      <div className="relative w-full">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full px-4 sm:px-6 lg:px-8 pt-12 pb-24"
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm text-blue-600 mb-8 shadow-sm relative z-10"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Experience the future of AI</span>
            </motion.div>
            
            <motion.h1
              variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight sm:leading-tight md:leading-tight tracking-tight mb-6 relative z-20"
            >
              Transform Your Ideas<br className="hidden sm:block" /> into Reality<br />    <br /> 
            </motion.h1>
            
            <motion.p
              variants={fadeInUp}
              className="text-base sm:text-lg md:text-xl text-gray-600 mt-8 mb-12 max-w-3xl mx-auto relative z-10 px-4"
            >
              Unlock the power of artificial intelligence with our advanced tools. Create stunning visuals and engage in intelligent conversations.
            </motion.p>
            
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row justify-center gap-4 mb-16 relative z-10 px-4"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to={user ? "/chat" : "/login"}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-full hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm text-sm sm:text-base"
                >
                  <span>{user ? 'Start Creating' : 'Get Started'}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="relative py-16 sm:py-24 w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full px-4 sm:px-6 lg:px-8"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              variants={fadeInUp}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Powerful AI Tools at Your Fingertips
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Explore our suite of advanced AI-powered features
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <motion.div
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Link
                  to={user ? "/chat" : "/login"}
                  className="group relative bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 block"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                      <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">MCT GPT</h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Experience intelligent conversations with our advanced AI model. Get help with tasks or brainstorm ideas.
                    </p>
                  </div>
                </Link>
              </motion.div>

              <motion.div
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Link
                  to={user ? "/image-generator" : "/login"}
                  className="group relative bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 block"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                      <ImagePlus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">MCT Canvas</h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Transform your ideas into stunning visuals with our AI-powered image generator. Create unique artwork.
                    </p>
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}