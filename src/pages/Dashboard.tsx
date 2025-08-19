import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, AlertCircle, ArrowRight, Clock, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Plan {
  id: string;
  name: string;
  description: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  pricing: Record<string, number>;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: 'active' | 'pending' | 'cancelled';
  usage: Record<string, number>;
  plan: Plan;
}

export default function Dashboard() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user's subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:plan_id (*)
        `)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData);

      // Load available plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*');

      if (plansError) throw plansError;
      setAvailablePlans(plansData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanRequest = async () => {
    if (!selectedPlan || !user?.id) return;

    try {
      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          status: 'pending',
          notes: requestNotes
        });

      if (error) throw error;

      setShowRequestForm(false);
      setRequestNotes('');
      setSelectedPlan(null);
      loadData();
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please log in to view your dashboard</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Plan */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <h2 className="text-lg font-medium mb-4">Current Plan</h2>
                {subscription ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold">{subscription.plan.name}</h3>
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                        {subscription.status}
                      </span>
                    </div>
                    <p className="text-white/80 mb-6">{subscription.plan.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Features</h4>
                        <ul className="space-y-1">
                          {Object.entries(subscription.plan.features).map(([key, value]) => (
                            <li key={key} className="text-sm flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-white/60" />
                              {key}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Usage</h4>
                        <ul className="space-y-1">
                          {Object.entries(subscription.usage || {}).map(([key, value]) => (
                            <li key={key} className="text-sm">
                              {key}: {value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="mb-4">No active subscription</p>
                    <button
                      onClick={() => setShowRequestForm(true)}
                      className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Choose a Plan
                    </button>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
                <div className="space-y-4">
                  {subscription?.usage && Object.entries(subscription.usage).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">{key}</h3>
                        <span className="text-lg font-bold text-gray-900">{value}</span>
                      </div>
                      {subscription.plan.limits[`${key}_limit`] && (
                        <div className="mt-2">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{
                                width: `${(value / subscription.plan.limits[`${key}_limit`]) * 100}%`
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {value} / {subscription.plan.limits[`${key}_limit`]} used
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Available Plans */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-500 mt-2">{plan.description}</p>
                    <ul className="mt-4 space-y-2">
                      {Object.entries(plan.features).map(([key, value]) => (
                        <li
                          key={key}
                          className={`text-sm flex items-center gap-2 ${
                            value ? 'text-gray-900' : 'text-gray-400 line-through'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          {key}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowRequestForm(true);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Request Plan</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Request Modal */}
      {showRequestForm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Request {selectedPlan.name} Plan
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Why do you want to switch to this plan?"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowRequestForm(false);
                    setSelectedPlan(null);
                    setRequestNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlanRequest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}