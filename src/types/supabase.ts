export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          university: string | null
          department: string | null
          batch: string | null
          avatar_url: string | null
          website: string | null
          about: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          university?: string | null
          department?: string | null
          batch?: string | null
          avatar_url?: string | null
          website?: string | null
          about?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          university?: string | null
          department?: string | null
          batch?: string | null
          avatar_url?: string | null
          website?: string | null
          about?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          type: 'general' | 'coder' | 'image' | 'speech-to-text' | '3d_model'
          image_url?: string | null
          model_url?: string | null
          prompt?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          type: 'general' | 'coder' | 'image' | 'speech-to-text' | '3d_model'
          image_url?: string | null
          model_url?: string | null
          prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant'
          content?: string
          type?: 'general' | 'coder' | 'image' | 'speech-to-text' | '3d_model'
          image_url?: string | null
          model_url?: string | null
          prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme: string
          language: string
          notifications_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string
          language?: string
          notifications_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string
          language?: string
          notifications_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          total_messages: number
          total_images_generated: number
          total_code_snippets: number
          total_3d_models: number
          last_active_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_messages?: number
          total_images_generated?: number
          total_code_snippets?: number
          total_3d_models?: number
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_messages?: number
          total_images_generated?: number
          total_code_snippets?: number
          total_3d_models?: number
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}