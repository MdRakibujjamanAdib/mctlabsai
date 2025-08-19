import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Download, Heart, Eye, Search, Filter, Star, Calendar, TrendingUp, Code2, X } from 'lucide-react';
import { getPublishedApps, getPopularApps, incrementDownloads, incrementLikes, generateCodePackage, PublishedApp, getAppStats, AppStats } from '../lib/gameCenter';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const categories = [
  { id: 'all', name: 'All', icon: '🎯' },
  { id: 'game', name: 'Games', icon: '🎮' },
  { id: 'utility', name: 'Utilities', icon: '🛠️' },
  { id: 'creative', name: 'Creative', icon: '🎨' },
  { id: 'educational', name: 'Educational', icon: '📚' }
];

export default function GameCenter() {
  const [apps, setApps] = useState<PublishedApp[]>([]);
  const [popularApps, setPopularApps] = useState<PublishedApp[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<PublishedApp | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [appsData, popularData, statsData] = await Promise.all([
        getPublishedApps(selectedCategory === 'all' ? undefined : selectedCategory),
        getPopularApps(),
        getAppStats()
      ]);

      setApps(appsData);
      setPopularApps(popularData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading Game Center data:', err);
      setError('Failed to load apps. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = apps.filter(app =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDownload = async (app: PublishedApp) => {
    try {
      if (app.id) {
        await incrementDownloads(app.id);
      }

      const blob = generateCodePackage(app.html, app.css, app.javascript, app.title);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${app.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Refresh data to show updated download count
      loadData();
    } catch (err) {
      console.error('Error downloading app:', err);
      setError('Failed to download app. Please try again.');
    }
  };

  const handleLike = async (app: PublishedApp) => {
    try {
      if (app.id) {
        await incrementLikes(app.id);
        loadData(); // Refresh data to show updated like count
      }
    } catch (err) {
      console.error('Error liking app:', err);
      setError('Failed to like app. Please try again.');
    }
  };

  const handlePreview = (app: PublishedApp) => {
    setSelectedApp(app);
    setShowPreview(true);
  };

  const generatePreviewHTML = (app: PublishedApp) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${app.title}</title>
          <style>${app.css}</style>
        </head>
        <body>
          ${app.html}
          <script>${app.javascript}</script>
        </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="w-full max-w-7xl mx-auto p-6"
    >
      <motion.div variants={fadeIn} className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Game Center
        </h1>
        <p className="text-gray-600 mb-6">
          Discover and play amazing apps created by the MCT Labs community
        </p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{stats.totalApps}</div>
              <div className="text-sm text-gray-600">Total Apps</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.totalDownloads}</div>
              <div className="text-sm text-gray-600">Total Downloads</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.categories).length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
        )}
      </motion.div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <motion.div variants={fadeIn} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/80 text-gray-700 hover:bg-blue-50'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Popular Apps Section */}
      {popularApps.length > 0 && (
        <motion.div variants={fadeIn} className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">Popular Apps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularApps.slice(0, 6).map((app, index) => (
              <AppCard
                key={app.id}
                app={app}
                onDownload={handleDownload}
                onLike={handleLike}
                onPreview={handlePreview}
                isPopular
                rank={index + 1}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* All Apps Section */}
      <motion.div variants={fadeIn}>
        <div className="flex items-center gap-2 mb-6">
          <Code2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedCategory === 'all' ? 'All Apps' : categories.find(c => c.id === selectedCategory)?.name}
          </h2>
          <span className="text-gray-500">({filteredApps.length})</span>
        </div>

        {filteredApps.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Code2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No apps found</p>
              <p className="text-sm">Try adjusting your search or category filter</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onDownload={handleDownload}
                onLike={handleLike}
                onPreview={handlePreview}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{selectedApp.title}</h3>
                  <p className="text-sm text-gray-600">by {selectedApp.author}</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="h-[70vh]">
                <iframe
                  srcDoc={generatePreviewHTML(selectedApp)}
                  title={selectedApp.title}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                />
              </div>
              <div className="p-4 border-t flex justify-between items-center">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {selectedApp.downloads}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {selectedApp.likes}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLike(selectedApp)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    Like
                  </button>
                  <button
                    onClick={() => handleDownload(selectedApp)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface AppCardProps {
  app: PublishedApp;
  onDownload: (app: PublishedApp) => void;
  onLike: (app: PublishedApp) => void;
  onPreview: (app: PublishedApp) => void;
  isPopular?: boolean;
  rank?: number;
}

function AppCard({ app, onDownload, onLike, onPreview, isPopular, rank }: AppCardProps) {
  const categoryIcons = {
    game: '🎮',
    utility: '🛠️',
    creative: '🎨',
    educational: '📚'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden relative"
    >
      {isPopular && rank && (
        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
          #{rank}
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{categoryIcons[app.category]}</span>
              <h3 className="font-semibold text-gray-900 truncate">{app.title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">by {app.author}</p>
            <p className="text-sm text-gray-700 line-clamp-2 mb-3">{app.description}</p>
          </div>
        </div>

        {app.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {app.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {app.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{app.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              {app.downloads}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {app.likes}
            </span>
          </div>
          <span className="text-xs">
            {new Date(app.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onPreview(app)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => onLike(app)}
            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDownload(app)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}