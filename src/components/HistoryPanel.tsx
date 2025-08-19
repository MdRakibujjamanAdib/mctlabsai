import React from 'react';
import { motion } from 'framer-motion';
import { History, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface HistoryItem {
  id: string;
  type: string;
  content: string;
  metadata: any;
  created_at: string;
}

interface HistoryPanelProps {
  type: string;
  onSelectItem?: (item: HistoryItem) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
}

export default function HistoryPanel({ type, onSelectItem, showHistory, onToggleHistory }: HistoryPanelProps) {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user && showHistory) {
      loadHistory();
    }
  }, [user, showHistory]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('history_items')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('history_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting history item:', err);
      setError('Failed to delete history item');
    }
  };

  if (!showHistory) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleHistory}
        className="saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm bg-white/50 hover:bg-white/80 text-gray-700 hover:text-blue-600 shadow-sm"
      >
        <History className="w-3.5 h-3.5" />
        <span className="relative z-10">History</span>
      </motion.button>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-center">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleHistory}
          className="saas-button px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm bg-blue-600 text-white shadow-lg"
        >
          <History className="w-3.5 h-3.5" />
          <span className="relative z-10">History</span>
        </motion.button>
      </div>

      {history.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No history yet</div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 relative group"
              onClick={() => onSelectItem?.(item)}
            >
              <div className="pr-8">
                <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteHistoryItem(item.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}