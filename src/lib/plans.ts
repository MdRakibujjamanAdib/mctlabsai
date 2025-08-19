import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';

export interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceWeekly: number;
  features: string[];
  limits: {
    imageGeneration?: number;
    echoMessages?: number;
    animationGeneration?: number;
    threeDModels?: number;
    speechToText?: number;
    codeAnalysis?: number;
  };
  isActive: boolean;
  color: string;
  popular?: boolean;
  support: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  billingCycle: 'monthly' | 'weekly' | 'one_time';
  currentUsage: {
    imageGeneration?: number;
    echoMessages?: number;
    animationGeneration?: number;
    threeDModels?: number;
    speechToText?: number;
    codeAnalysis?: number;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Default plans configuration
export const DEFAULT_PLANS: Omit<Plan, 'id'>[] = [
  {
    name: 'Free',
    description: 'Perfect for trying out MCT Labs with basic features',
    priceMonthly: 0,
    priceWeekly: 0,
    features: [
      'Basic chat functionality',
      'Limited image generation',
      'Basic code analysis',
      'Community support'
    ],
    limits: {
      imageGeneration: 10,
      echoMessages: 50,
      animationGeneration: 2,
      threeDModels: 1,
      speechToText: 30,
      codeAnalysis: 20
    },
    isActive: true,
    color: 'gray',
    support: 'Community support'
  },
  {
    name: 'Education',
    description: 'Unlimited access for students and educators - completely free!',
    priceMonthly: 0,
    priceWeekly: 0,
    features: [
      'Unlimited everything',
      'All AI models access',
      'Advanced features',
      'Priority support',
      'Educational resources',
      'Collaboration tools'
    ],
    limits: {},
    isActive: true,
    color: 'green',
    popular: true,
    support: 'Priority email support'
  },
  {
    name: 'Individual',
    description: 'Pay-as-you-go pricing for individual creators and developers',
    priceMonthly: 0,
    priceWeekly: 0,
    features: [
      'Pay only for what you use',
      'All features available',
      'Flexible usage',
      'Standard support',
      'Usage analytics'
    ],
    limits: {
      imageGeneration: 500, // Free tier, then pay per use
      echoMessages: 1000,
      animationGeneration: 50,
      threeDModels: 25,
      speechToText: 500,
      codeAnalysis: 200
    },
    isActive: true,
    color: 'blue',
    support: 'Standard support'
  },
  {
    name: 'Business',
    description: 'Premium features with dedicated support for teams and businesses',
    priceMonthly: 49.99,
    priceWeekly: 14.99,
    features: [
      'Unlimited usage',
      'Premium AI models',
      'Team collaboration',
      'Priority processing',
      'Advanced analytics',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ],
    limits: {},
    isActive: true,
    color: 'purple',
    support: '24/7 premium support + dedicated account manager'
  }
];

export const initializePlans = async () => {
  try {
    const plansCollection = collection(db, 'plans');
    const existingPlans = await getDocs(plansCollection);
    
    if (existingPlans.empty) {
      // Create default plans
      for (const plan of DEFAULT_PLANS) {
        const planRef = doc(plansCollection);
        await setDoc(planRef, {
          ...plan,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      console.log('Default plans created successfully');
    }
  } catch (error) {
    console.error('Error initializing plans:', error);
  }
};

export const getPlans = async (): Promise<Plan[]> => {
  try {
    const plansCollection = collection(db, 'plans');
    const plansSnapshot = await getDocs(query(plansCollection, where('isActive', '==', true)));
    
    return plansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Plan));
  } catch (error) {
    console.error('Error fetching plans:', error);
    return [];
  }
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    const subscriptionRef = doc(db, 'userSubscriptions', userId);
    const subscriptionDoc = await getDoc(subscriptionRef);
    
    if (subscriptionDoc.exists()) {
      const data = subscriptionDoc.data();
      return {
        id: subscriptionDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate()
      } as UserSubscription;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

export const createUserSubscription = async (userId: string, planId: string, billingCycle: 'monthly' | 'weekly' | 'one_time' = 'monthly'): Promise<void> => {
  try {
    const subscriptionRef = doc(db, 'userSubscriptions', userId);
    const subscription: Omit<UserSubscription, 'id'> = {
      userId,
      planId,
      status: 'active',
      billingCycle,
      currentUsage: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(subscriptionRef, subscription);
  } catch (error) {
    console.error('Error creating user subscription:', error);
    throw error;
  }
};

export const updateUserUsage = async (userId: string, usageType: keyof UserSubscription['currentUsage'], increment: number = 1): Promise<void> => {
  try {
    const subscriptionRef = doc(db, 'userSubscriptions', userId);
    const subscriptionDoc = await getDoc(subscriptionRef);
    
    if (subscriptionDoc.exists()) {
      const currentData = subscriptionDoc.data();
      const currentUsage = currentData.currentUsage || {};
      
      await updateDoc(subscriptionRef, {
        [`currentUsage.${usageType}`]: (currentUsage[usageType] || 0) + increment,
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error updating user usage:', error);
  }
};

export const checkUsageLimit = async (userId: string, usageType: keyof UserSubscription['currentUsage']): Promise<{ allowed: boolean; current: number; limit: number | null }> => {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      return { allowed: false, current: 0, limit: 0 };
    }
    
    const plans = await getPlans();
    const userPlan = plans.find(p => p.id === subscription.planId);
    
    if (!userPlan) {
      return { allowed: false, current: 0, limit: 0 };
    }
    
    const limit = userPlan.limits[usageType];
    const current = subscription.currentUsage[usageType] || 0;
    
    // If no limit is set, usage is unlimited
    if (limit === undefined || limit === null) {
      return { allowed: true, current, limit: null };
    }
    
    return {
      allowed: current < limit,
      current,
      limit
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return { allowed: false, current: 0, limit: 0 };
  }
};

export const assignEducationPlan = async (userId: string): Promise<void> => {
  try {
    const plans = await getPlans();
    const educationPlan = plans.find(p => p.name === 'Education');
    
    if (educationPlan) {
      await createUserSubscription(userId, educationPlan.id, 'one_time');
    }
  } catch (error) {
    console.error('Error assigning education plan:', error);
    throw error;
  }
};