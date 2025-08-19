import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getAPIKey } from './apiKeyManager';
import OpenAI from 'openai';

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  model_identifier: string;
  system_prompt: string;
  is_active: boolean;
  created_at: Date;
}

export interface AIContextEntry {
  id?: string;
  content: string;
  ai_generated_title: string;
  ai_generated_category: string;
  selected_agents: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Default AI agents based on current system
export const DEFAULT_AI_AGENTS: Omit<AIAgent, 'id' | 'created_at'>[] = [
  {
    name: 'MCT Labs Standard',
    description: 'Standard conversational AI with MCT department knowledge',
    model_identifier: 'deepseek/deepseek-chat-v3-0324:free',
    system_prompt: `You are MCT Labs AI, a next-generation departmental AI assistant developed by Md Rakibujjaman Adib for the Department of Multimedia and Creative Technology (MCT), Daffodil International University.

Your primary role is to act as a virtual university professor:

Provide accurate, clear, and detailed knowledge in all academic areas, with a strong focus on Multimedia, Creative Technology, Computer Science, 3D Design, Animation, Artificial Intelligence, and related fields.

Support students with study guidance, project help, and research insights.

Share official and unofficial department-related information, including courses, events, achievements, and faculty highlights.

Provide career advice, skill-building tips, and motivational support for students.

Your tone and personality:

Speak with the authority of a professor but maintain a friendly and approachable vibe.

Add a touch of light humor to keep learning fun, but always stay respectful and professional.

Be student-first: patient, encouraging, and motivating.

When needed, highlight real-world applications of knowledge to make learning practical.`,
    is_active: true
  },
  {
    name: 'MCT Labs Beta (Vision)',
    description: 'Advanced AI with image analysis capabilities',
    model_identifier: 'qwen/qwen2.5-vl-32b-instruct:free',
    system_prompt: `You are MCT Labs AI Beta, an advanced AI assistant with vision capabilities for the MCT department. You can analyze images, provide visual feedback, and assist with multimedia projects.

Focus on:
- Image analysis and feedback
- Visual design principles
- Multimedia project guidance
- Creative technology applications

Maintain the same friendly, professional tone as the standard MCT Labs AI.`,
    is_active: true
  },
  {
    name: 'MCT Labs Advanced',
    description: 'Most advanced reasoning AI for complex problems',
    model_identifier: 'deepseek/deepseek-r1-distill-llama-70b:free',
    system_prompt: `You are MCT Labs AI Advanced, the most sophisticated AI assistant for the MCT department. You excel at complex reasoning, problem-solving, and advanced academic guidance.

Specializations:
- Complex problem solving
- Advanced programming concepts
- Research methodology
- Technical project guidance
- Mathematical and algorithmic thinking

Provide detailed, step-by-step explanations for complex topics while maintaining the encouraging MCT Labs personality.`,
    is_active: true
  },
  {
    name: 'Code Explainer',
    description: 'Specialized AI for code analysis and programming help',
    model_identifier: 'qwen/qwen-2.5-coder-32b-instruct:free',
    system_prompt: `You are the MCT Labs Code Explainer, a specialized AI assistant focused on programming, code analysis, and software development education.

Your expertise includes:
- Code review and analysis
- Programming best practices
- Debugging assistance
- Algorithm explanation
- Software architecture guidance

Provide clear, educational explanations that help students learn and improve their coding skills.`,
    is_active: true
  },
  {
    name: 'Echo Assistant',
    description: 'Persona-based conversational AI for role-playing scenarios',
    model_identifier: 'mistralai/mistral-7b-instruct:free',
    system_prompt: `You are MCT Labs Echo Assistant, designed to embody different personas and roles for educational and interactive purposes.

You can adapt to various personas while maintaining:
- Educational value
- Professional boundaries
- Helpful guidance
- Engaging interaction

Always stay within appropriate academic and professional contexts.`,
    is_active: true
  }
];

// Current system context to be added to database
export const CURRENT_SYSTEM_CONTEXT = [
  "Md Rakibujjaman Adib is a student of MCT department, batch 36, studying at Daffodil International University. He is the developer and creator of MCT Labs AI platform.",
  "MCT Labs is an AI-powered creativity hub offering advanced AI models for innovation, design, and seamless digital experiences.",
  "The MCT department (Multimedia and Creative Technology) is part of Daffodil International University, focusing on creative technology, 3D design, animation, and multimedia production.",
  "MCT Labs platform includes features like Chat (conversational AI), Canvas (image generation), Coder (code analysis), Tuner (speech synthesis), Echo (persona-based chat), Animation (video generation), 3D (model generation), and Build (app creation).",
  "The platform uses multiple AI models: DeepSeek Chat for standard conversations, Qwen 2.5 VL for vision tasks, DeepSeek R1 for advanced reasoning, Qwen 2.5 Coder for programming, and Mistral for Echo personas.",
  "Students can access MCT Labs with their DIU email addresses (format: name-40-xxx@diu.edu.bd) and the platform is designed specifically for educational use.",
  "The platform supports both temporary and persistent chat modes, with conversation history saved for registered users.",
  "MCT Labs includes a Game Center where students can publish and share their created applications and games.",
  "The system includes comprehensive user management, analytics, and admin controls for monitoring platform usage.",
  "All AI interactions are designed to be educational, encouraging, and supportive of student learning and creativity."
];

// Initialize AI agents in Firebase
export const initializeAIAgents = async () => {
  try {
    const agentsCollection = collection(db, 'ai_agents');
    const existingAgents = await getDocs(agentsCollection);
    
    if (existingAgents.empty) {
      for (const agent of DEFAULT_AI_AGENTS) {
        await addDoc(agentsCollection, {
          ...agent,
          created_at: Timestamp.now()
        });
      }
      console.log('Default AI agents created successfully');
    }
  } catch (error) {
    console.error('Error initializing AI agents:', error);
  }
};

// Initialize current system context
export const initializeSystemContext = async () => {
  try {
    const contextCollection = collection(db, 'ai_context_entries');
    const existingContext = await getDocs(contextCollection);
    
    if (existingContext.empty) {
      for (const contextItem of CURRENT_SYSTEM_CONTEXT) {
        // Use AI to generate title and category
        const { title, category } = await generateContextMetadata(contextItem);
        
        await addDoc(contextCollection, {
          content: contextItem,
          ai_generated_title: title,
          ai_generated_category: category,
          selected_agents: ['all'], // Apply to all agents by default
          is_active: true,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        });
      }
      console.log('System context initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing system context:', error);
  }
};

// Generate title and category using AI
export const generateContextMetadata = async (content: string): Promise<{ title: string; category: string }> => {
  try {
    const apiKey = await getAPIKey('openrouter');
    
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    const response = await client.chat.completions.create({
      extra_headers: {
        "HTTP-Referer": window.location.origin,
        "X-Title": "MCT Labs"
      },
      model: "deepseek/deepseek-chat-v3-0324:free",
      messages: [
        {
          role: 'system',
          content: `You are a context analyzer. Given a piece of context information, generate a short title (max 50 characters) and categorize it into one of these categories: students, faculty, courses, events, policies, platform, technical, general.

Respond in this exact format:
Title: [your title here]
Category: [category here]`
        },
        {
          role: 'user',
          content: `Analyze this context and provide a title and category:\n\n${content}`
        }
      ]
    });

    const aiResponse = response.choices[0]?.message?.content || '';
    const titleMatch = aiResponse.match(/Title:\s*(.+)/i);
    const categoryMatch = aiResponse.match(/Category:\s*(.+)/i);

    return {
      title: titleMatch ? titleMatch[1].trim() : content.substring(0, 50) + '...',
      category: categoryMatch ? categoryMatch[1].trim().toLowerCase() : 'general'
    };
  } catch (error) {
    console.error('Error generating context metadata:', error);
    return {
      title: content.substring(0, 50) + '...',
      category: 'general'
    };
  }
};

// Get all AI agents
export const getAIAgents = async (): Promise<AIAgent[]> => {
  try {
    const agentsSnapshot = await getDocs(
      query(collection(db, 'ai_agents'), where('is_active', '==', true), orderBy('created_at', 'asc'))
    );
    
    return agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate()
    })) as AIAgent[];
  } catch (error) {
    console.error('Error getting AI agents:', error);
    throw error;
  }
};

// Get all context entries
export const getAIContextEntries = async (): Promise<AIContextEntry[]> => {
  try {
    const contextSnapshot = await getDocs(
      query(collection(db, 'ai_context_entries'), where('is_active', '==', true), orderBy('created_at', 'desc'))
    );
    
    return contextSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate(),
      updated_at: doc.data().updated_at.toDate()
    })) as AIContextEntry[];
  } catch (error) {
    console.error('Error getting AI context entries:', error);
    throw error;
  }
};

// Save new context entry
export const saveAIContextEntry = async (content: string, selectedAgents: string[]): Promise<string> => {
  try {
    const { title, category } = await generateContextMetadata(content);
    
    const docRef = await addDoc(collection(db, 'ai_context_entries'), {
      content,
      ai_generated_title: title,
      ai_generated_category: category,
      selected_agents: selectedAgents,
      is_active: true,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving AI context entry:', error);
    throw error;
  }
};

// Update context entry
export const updateAIContextEntry = async (id: string, updates: Partial<AIContextEntry>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'ai_context_entries', id), {
      ...updates,
      updated_at: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating AI context entry:', error);
    throw error;
  }
};

// Delete context entry
export const deleteAIContextEntry = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'ai_context_entries', id));
  } catch (error) {
    console.error('Error deleting AI context entry:', error);
    throw error;
  }
};

// Generate system prompt for specific agents
export const generateSystemPromptForAgents = async (agentIds: string[]): Promise<Record<string, string>> => {
  try {
    const [agents, contextEntries] = await Promise.all([
      getAIAgents(),
      getAIContextEntries()
    ]);

    const result: Record<string, string> = {};

    for (const agentId of agentIds) {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) continue;

      // Get context entries that apply to this agent or all agents
      const relevantContext = contextEntries.filter(entry => 
        entry.selected_agents.includes(agentId) || entry.selected_agents.includes('all')
      );

      // Group context by category
      const contextByCategory = relevantContext.reduce((acc, entry) => {
        if (!acc[entry.ai_generated_category]) {
          acc[entry.ai_generated_category] = [];
        }
        acc[entry.ai_generated_category].push(entry.content);
        return acc;
      }, {} as Record<string, string[]>);

      // Build enhanced system prompt
      let enhancedPrompt = agent.system_prompt;

      if (Object.keys(contextByCategory).length > 0) {
        enhancedPrompt += '\n\nIMPORTANT CONTEXT DATABASE:\nThe following information has been provided by the admin and should be treated as factual knowledge:\n\n';
        
        Object.entries(contextByCategory).forEach(([category, values]) => {
          enhancedPrompt += `${category.toUpperCase()}:\n`;
          values.forEach(value => {
            enhancedPrompt += `- ${value}\n`;
          });
          enhancedPrompt += '\n';
        });

        enhancedPrompt += 'Always use this context database information when relevant to provide accurate, personalized responses.';
      }

      result[agentId] = enhancedPrompt;
    }

    return result;
  } catch (error) {
    console.error('Error generating system prompts:', error);
    throw error;
  }
};