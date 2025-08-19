import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight, Users, Zap, Shield, Headphones, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Plan, UserSubscription, getPlans, getUserSubscription, createUserSubscription } from '../lib/plans';

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

const planColors = {
  gray: 'from-gray-500 to-gray-600',
  green: 'from-green-500 to-emerald-600',
  blue: 'from-blue-500 to-indigo-600',
  purple: 'from-purple-500 to-violet-600'
};

const planIcons = {
  Free: Users,
  Education: GraduationCap,
  Individual: Zap,
  Business: Shield
};

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadPlansAndSubscription();
  }, [user]);

  const loadPlansAndSubscription = async () => {
    try {
      const [plansData, subscriptionData] = await Promise.all([
        getPlans(),
        user ? getUserSubscription(user.uid) : null
      ]);
      
      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, billingCycle: 'monthly' | 'weekly' = 'monthly') => {
    if (!user) return;
    
    setSubscribing(planId);
    try {
      await createUserSubscription(user.uid, planId, billingCycle);
      await loadPlansAndSubscription();
    } catch (error) {
      console.error('Error subscribing to plan:', error);
    } finally {
      setSubscribing(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId && currentSubscription?.status === 'active';
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.h1
            variants={fadeIn}
            className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4"
          >
            Choose Your Plan
          </motion.h1>
          <motion.p
            variants={fadeIn}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Unlock the full potential of AI-powered creativity with our flexible pricing plans
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {plans.map((plan) => {
            const IconComponent = planIcons[plan.name as keyof typeof planIcons] || Users;
            const isPopular = plan.popular;
            const isCurrent = isCurrentPlan(plan.id);
            
            return (
              <motion.div
                key={plan.id}
                variants={fadeIn}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                  isPopular ? 'ring-2 ring-blue-500 scale-105' : ''
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 text-sm font-medium">
                    <Star className="w-4 h-4 inline mr-1" />
                    Most Popular
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center py-2 text-sm font-medium">
                    <Check className="w-4 h-4 inline mr-1" />
                    Current Plan
                  </div>
                )}

                <div className={`p-6 ${isPopular || isCurrent ? 'pt-12' : ''}`}>
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${planColors[plan.color as keyof typeof planColors]} flex items-center justify-center`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                    
                    <div className="mb-4">
                      {plan.priceMonthly === 0 ? (
                        <div className="text-3xl font-bold text-gray-900">Free</div>
                      ) : (
                        <div>
                          <div className="text-3xl font-bold text-gray-900">
                            ${plan.priceMonthly}
                            <span className="text-lg font-normal text-gray-600">/month</span>
                          </div>
                          {plan.priceWeekly > 0 && (
                            <div className="text-sm text-gray-500">
                              or ${plan.priceWeekly}/week
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Headphones className="w-4 h-4" />
                      <span>{plan.support}</span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing === plan.id}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        plan.name === 'Business'
                          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700'
                          : plan.name === 'Education'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {subscribing === plan.id ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Subscribing...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {plan.priceMonthly === 0 ? 'Get Started' : 'Subscribe'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  )}

                  {isCurrent && (
                    <div className="w-full py-3 px-4 bg-green-100 text-green-800 rounded-lg font-medium text-center">
                      Current Plan
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          variants={fadeIn}
          className="mt-16 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need a custom solution?</h2>
          <p className="text-gray-600 mb-6">
            Contact us for enterprise pricing and custom integrations
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Contact Sales
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}