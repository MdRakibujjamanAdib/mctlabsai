import axios from 'axios';
import { getAPIKey } from './apiKeyManager';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
}

export const getVoices = async (): Promise<Voice[]> => {
  try {
    const apiKey = await getAPIKey('elevenlabs');
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.data.voices) {
      throw new Error('Invalid response format from ElevenLabs API');
    }

    return response.data.voices;
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch voices');
  }
};

export const generateSpeech = async (text: string, voiceId: string): Promise<ArrayBuffer> => {
  try {
    const apiKey = await getAPIKey('elevenlabs');
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error generating speech:', error);
    throw new Error(error.response?.data?.detail || 'Failed to generate speech');
  }
};

export const convertSpeechToText = async (audioFile: File): Promise<string> => {
  try {
    const apiKey = await getAPIKey('elevenlabs');
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model_id', 'scribe_v1');

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/speech-to-text`,
      formData,
      {
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.data.text) {
      throw new Error('Invalid response format from ElevenLabs API');
    }

    return response.data.text;
  } catch (error: any) {
    console.error('Error converting speech to text:', error);
    throw new Error(error.response?.data?.detail || 'Failed to convert speech to text');
  }
};