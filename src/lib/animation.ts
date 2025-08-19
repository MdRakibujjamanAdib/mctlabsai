import axios from 'axios';
import { getAPIKey } from './apiKeyManager';

const API_BASE_URL = 'https://api.minimaxi.chat/v1';

interface VideoGenerationResponse {
  task_id: string;
}

interface QueryResponse {
  status: 'Preparing' | 'Queueing' | 'Processing' | 'Success' | 'Fail';
  file_id?: string;
}

interface FileResponse {
  file: {
    download_url: string;
  };
}

interface GenerateOptions {
  prompt: string;
  image?: File;
}

export const generateAnimation = async ({ prompt, image }: GenerateOptions): Promise<string> => {
  try {
    const apiKey = await getAPIKey('minimaxi');
    
    if (!apiKey) {
      throw new Error('MiniMaxi API key is not configured');
    }

    let payload: any = {
      prompt,
      model: image ? 'I2V-01-Director' : 'T2V-01'
    };

    // If image is provided, convert it to base64
    if (image) {
      const base64Image = await fileToBase64(image);
      payload.first_frame_image = `data:${image.type};base64,${base64Image}`;
    }

    // Step 1: Submit video generation task
    const { data: submitData } = await axios.post<VideoGenerationResponse>(
      `${API_BASE_URL}/video_generation`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const taskId = submitData.task_id;

    // Step 2: Poll for completion
    let fileId = '';
    while (true) {
      const { data: queryData } = await axios.get<QueryResponse>(
        `${API_BASE_URL}/query/video_generation?task_id=${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      if (queryData.status === 'Success' && queryData.file_id) {
        fileId = queryData.file_id;
        break;
      } else if (queryData.status === 'Fail') {
        throw new Error('Video generation failed');
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 3: Get download URL
    const { data: fileData } = await axios.get<FileResponse>(
      `${API_BASE_URL}/files/retrieve?file_id=${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return fileData.file.download_url;
  } catch (error: any) {
    console.error('Error generating animation:', error);
    throw new Error(error?.response?.data?.message || 'Failed to generate animation');
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};