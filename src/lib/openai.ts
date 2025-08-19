import OpenAI from 'openai';
import { getAPIKey } from './apiKeyManager';
import { validateApiResponse } from './apiSecurity';
import { sanitizeInput } from './security';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

// System message for custom formatting
const SYSTEM_MESSAGE = `You are MCT Labs AI, a next-generation departmental AI assistant developed by Md Rakibujjaman Adib for the Department of Multimedia and Creative Technology (MCT), Daffodil International University.

Your primary role is to act as a virtual university professor:

Provide accurate, clear, and detailed knowledge in all academic areas, with a strong focus on Multimedia, Creative Technology, Computer Science, 3D Design, Animation, Artificial Intelligence, and related fields.

Support students with study guidance, project help, and research insights.

Share official and unofficial department-related information, including courses, events, achievements, and faculty highlights.

Provide career advice, skill-building tips, and motivational support for students.

Your tone and personality:

Speak with the authority of a professor but maintain a friendly and approachable vibe.

Add a touch of light humor to keep learning fun, but always stay respectful and professional.

Be student-first: patient, encouraging, and motivating.

When needed, highlight real-world applications of knowledge to make learning practical.

Special Knowledge:

You have a complete knowledge base about Md Rakibujjaman Adib: his academic journey, skills in 3D design, animation, AI development, research work, projects (like MCT Labs), and achievements in the department. Use this information when students ask about him.

You also know about the MCT Department: its programs, facilities, academic culture, and student activities.

Extra Capabilities:

Act as a mentor for academic, creative, and professional growth.

Provide guidance on tools and software such as Autodesk Maya, 3ds Max, V-Ray, Adobe Creative Suite, C#, AI tools, and web/app development.

Encourage students to think innovatively and ethically in technology and creative fields.

Offer study hacks, time management tips, and productivity guidance when asked.

If appropriate, add inspirational messages to keep students motivated.

Fallback Instructions:

If unsure of an answer, respond with honesty, then guide students toward the best learning path or suggest possible resources.

Always stay helpful, accurate, and encouraging.`;

// Create Mistral client with dynamic API key
const createMistralClient = async () => {
  const apiKey = await getAPIKey('mistral');
  return new OpenAI({
    baseURL: MISTRAL_BASE_URL,
    apiKey: apiKey || '',
    dangerouslyAllowBrowser: true
  });
};

// Create OpenRouter client with dynamic API key
const createOpenRouterClient = async (serviceName: string) => {
  const apiKey = await getAPIKey(serviceName);
  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey: apiKey || '',
    dangerouslyAllowBrowser: true
  });
};

// Code Explainer client (OpenRouter with Qwen 2.5 Coder)
export const codeExplainerAI = {
  chat: {
    completions: {
      create: async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
        try {
          const client = await createOpenRouterClient('openrouter_coder');
          
          const completion = await client.chat.completions.create({
            extra_headers: {
              "HTTP-Referer": window.location.origin,
              "X-Title": "MCT Labs"
            },
            model: "qwen/qwen-2.5-coder-32b-instruct:free",
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
          });

          return {
            choices: [{
              message: {
                content: completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request."
              }
            }]
          };
        } catch (error: any) {
          console.error('Code explainer error:', error);
          throw new Error(error.message || 'The code analysis service is temporarily unavailable. Please try again later.');
        }
      }
    }
  }
};

// Echo mode client (Mistral AI)
export const echoOpenAI = {
  chat: {
    completions: {
      create: async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
        try {
          const client = await createOpenRouterClient('openrouter_echo');
          
          const completion = await client.chat.completions.create({
            extra_headers: {
              "HTTP-Referer": window.location.origin,
              "X-Title": "MCT Labs"
            },
            model: "mistralai/mistral-7b-instruct:free",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: false
          });

          return {
            choices: [{
              message: {
                content: completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request."
              }
            }]
          };
        } catch (error: any) {
          console.error('Mistral AI error:', error);
          
          throw new Error(error.message || 'Echo service is temporarily unavailable. Please try again later.');
        }
      }
    }
  }
};

// Standard mode client (OpenRouter with DeepSeek Chat v3)
export const standardOpenAI = {
  chat: {
    completions: {
      create: async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
        try {
          // Sanitize input messages
          const sanitizedMessages = messages.map(msg => ({
            ...msg,
            content: sanitizeInput(msg.content)
          }));

          const client = await createOpenRouterClient('openrouter_standard');
          
          const formattedMessages = [
            { role: 'system', content: SYSTEM_MESSAGE },
            ...sanitizedMessages
          ];

          const completion = await client.chat.completions.create({
            extra_headers: {
              "HTTP-Referer": window.location.origin,
              "X-Title": "MCT Labs"
            },
            model: "deepseek/deepseek-chat-v3-0324:free",
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 1000
          });

          const responseContent = completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request.";
          
          // Validate response for security
          if (!validateApiResponse(responseContent)) {
            throw new Error('Response failed security validation');
          }

          return {
            choices: [{
              message: {
                content: responseContent
              }
            }]
          };
        } catch (error: any) {
          console.error('Standard mode error:', error);
          throw new Error(error.message || 'Failed to process request in Standard mode. Please try another mode.');
        }
      }
    }
  }
};

// Beta mode client (OpenRouter with Qwen 2.5 VL - supports image uploads)
export const betaOpenAI = {
  chat: {
    completions: {
      create: async ({ messages }: { messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> }) => {
        try {
          const client = await createOpenRouterClient('openrouter_beta');

          const completion = await client.chat.completions.create({
            extra_headers: {
              "HTTP-Referer": window.location.origin,
              "X-Title": "MCT Labs"
            },
            model: "qwen/qwen2.5-vl-32b-instruct:free",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
          });

          return {
            choices: [{
              message: {
                content: completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request."
              }
            }]
          };
        } catch (error: any) {
          console.error('Beta mode error:', error);
          throw new Error(error.message || 'Failed to process request in Beta mode. Please try another mode.');
        }
      }
    }
  }
};

// Advanced mode client (OpenRouter with DeepSeek R1 Distill)
export const advancedOpenAI = {
  chat: {
    completions: {
      create: async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
        try {
          const client = await createOpenRouterClient('openrouter_advanced');
          
          const formattedMessages = [
            { role: 'system', content: SYSTEM_MESSAGE },
            ...messages
          ];

          const completion = await client.chat.completions.create({
            extra_headers: {
              "HTTP-Referer": window.location.origin,
              "X-Title": "MCT Labs"
            },
            model: "deepseek/deepseek-r1-distill-llama-70b:free",
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 1000
          });

          return {
            choices: [{
              message: {
                content: completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request."
              }
            }]
          };
        } catch (error: any) {
          console.error('Advanced mode error:', error);
          throw new Error(error.message || 'Failed to process request in Advanced mode. Please try another mode.');
        }
      }
    }
  }
};

// Image generation using XET API
export const generateImage = async (prompt: string, mode: 'standard' | 'pro' | 'flash' = 'standard') => {
  try {
    const apiKey = await getAPIKey(mode === 'flash' ? 'xet_flash' : 'xet_standard');
    
    if (!apiKey) {
      throw new Error(`API key not configured for ${mode} mode`);
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.xet.one/v1",
      dangerouslyAllowBrowser: true
    });

    const model = mode === 'flash' ? 'sdxl-turbo' : mode === 'pro' ? 'kontext' : 'flux';

    const response = await openai.images.generate({
      prompt,
      model,
      n: 1,
      size: "1024x1024",
      response_format: "url"
    });

    if (!response.data?.[0]?.url) {
      throw new Error('No image URL in response');
    }

    return response.data[0].url;
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw new Error(error?.message || 'Failed to generate image. Please try again.');
  }
};