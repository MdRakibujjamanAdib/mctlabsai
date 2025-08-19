import { supabase } from './supabase';

export async function saveHistoryItem(
  userId: string,
  type: string,
  content: string,
  metadata: any = {}
) {
  try {
    const { error } = await supabase
      .from('history_items')
      .insert({
        user_id: userId,
        type,
        content,
        metadata
      });

    if (error) throw error;
  } catch (err) {
    console.error('Error saving history item:', err);
    throw err;
  }
}

export async function deleteHistoryItem(id: string) {
  try {
    const { error } = await supabase
      .from('history_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting history item:', err);
    throw err;
  }
}

export async function getHistoryItems(userId: string, type: string) {
  try {
    const { data, error } = await supabase
      .from('history_items')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error getting history items:', err);
    throw err;
  }
}