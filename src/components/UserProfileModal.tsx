import React, { useState, useEffect } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { UserProfileData, saveUserProfile } from '../lib/userProfile';
import { signOutCurrentUser } from '../lib/auth';
import type { AuthMode } from './AuthPage';
import { X, User, Check, LogOut, Flame, Target, Settings, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface UserProfileModalProps {
  currentUser: AuthUser | null;
  profile: UserProfileData | null;
  onClose: () => void;
  onOpenAuth: (mode: AuthMode) => void;
  onProfileUpdated: (updated: UserProfileData) => void;
}

const AVAILABLE_DIETS = [
  'High Protein',
  'Low Carb',
  'Keto',
  'Gluten Free',
  'Dairy Free',
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Mediterranean',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  onOpenAuth,
  profile,
  onClose,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(profile?.displayName || 'Chef');
  const [defaultServings, setDefaultServings] = useState(profile?.defaultServings || 2);
  const [measurementSystem, setMeasurementSystem] = useState<'metric' | 'imperial'>(
    profile?.measurementSystem || 'metric'
  );
  const [selectedDiets, setSelectedDiets] = useState<string[]>(
    profile?.dietaryPreferences || ['High Protein']
  );
  const [dailyCalories, setDailyCalories] = useState(
    profile?.macroTargets?.dailyCalories || 2000
  );
  const [proteinGrams, setProteinGrams] = useState(
    profile?.macroTargets?.proteinGrams || 140
  );
  const [carbsGrams, setCarbsGrams] = useState(
    profile?.macroTargets?.carbsGrams || 180
  );
  const [fatGrams, setFatGrams] = useState(
    profile?.macroTargets?.fatGrams || 65
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setDefaultServings(profile.defaultServings || 2);
      setMeasurementSystem(profile.measurementSystem || 'metric');
      setSelectedDiets(profile.dietaryPreferences || []);
      setDailyCalories(profile.macroTargets?.dailyCalories || 2000);
      setProteinGrams(profile.macroTargets?.proteinGrams || 140);
      setCarbsGrams(profile.macroTargets?.carbsGrams || 180);
      setFatGrams(profile.macroTargets?.fatGrams || 65);
    }
  }, [profile]);

  const toggleDiet = (diet: string) => {
    if (selectedDiets.includes(diet)) {
      setSelectedDiets(selectedDiets.filter((d) => d !== diet));
    } else {
      setSelectedDiets([...selectedDiets, diet]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!currentUser || !profile) {
      setFormError('Please sign in to save your profile to the database');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    const updated: UserProfileData = {
      ...profile,
      displayName: displayName.trim() || 'Home Cook',
      defaultServings: Number(defaultServings) || 2,
      measurementSystem,
      dietaryPreferences: selectedDiets,
      macroTargets: {
        dailyCalories: Number(dailyCalories) || 2000,
        proteinGrams: Number(proteinGrams) || 120,
        carbsGrams: Number(carbsGrams) || 150,
        fatGrams: Number(fatGrams) || 60,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserProfile(updated);
      onProfileUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-[#fbfbf9]">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-zinc-900">User Profile & Macro Targets</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Auth State Card */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <span>{profile?.displayName || 'Signed-in user'}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">{currentUser.email}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-bold text-zinc-900">Guest Cooking Mode</div>
                <div className="text-xs text-zinc-500">Sign in to sync your recipes and macros to your account</div>
              </div>
            )}

            {currentUser ? (
              <button
                type="button"
                onClick={async () => {
                  await signOutCurrentUser();
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg transition-colors shadow-2xs"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Chef Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Default Scaling Servings
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={defaultServings}
                  onChange={(e) => setDefaultServings(parseInt(e.target.value, 10) || 2)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Units System
                </label>
                <select
                  value={measurementSystem}
                  onChange={(e: any) => setMeasurementSystem(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700"
                >
                  <option value="metric">Metric (grams, ml, kg)</option>
                  <option value="imperial">Imperial (cups, oz, lbs)</option>
                </select>
              </div>
            </div>

            {/* Dietary Preferences (Functional button tags) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-700">
                  Dietary Preferences & Targets
                </label>
                <span className="text-[11px] text-zinc-400">Select all that apply</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_DIETS.map((diet) => {
                  const isSelected = selectedDiets.includes(diet);
                  return (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => toggleDiet(diet)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                        isSelected
                          ? 'bg-zinc-900 text-white font-medium shadow-2xs'
                          : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {isSelected ? `✓ ${diet}` : `+ ${diet}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Macro Nutrition Targets */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                    Daily Macro Goals
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">Used for recipe filtering</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
                    Daily Energy
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="50"
                      value={dailyCalories}
                      onChange={(e) => setDailyCalories(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-sm font-bold font-mono tabular-nums text-zinc-900 border-none p-0 focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-400 font-mono">kcal</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <label className="text-[10px] font-semibold text-emerald-600 uppercase block mb-1">
                    Protein
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="5"
                      value={proteinGrams}
                      onChange={(e) => setProteinGrams(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-sm font-bold font-mono tabular-nums text-emerald-700 border-none p-0 focus:outline-none"
                    />
                    <span className="text-[10px] text-emerald-600 font-mono">g</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <label className="text-[10px] font-semibold text-amber-600 uppercase block mb-1">
                    Carbohydrates
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="5"
                      value={carbsGrams}
                      onChange={(e) => setCarbsGrams(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-sm font-bold font-mono tabular-nums text-amber-700 border-none p-0 focus:outline-none"
                    />
                    <span className="text-[10px] text-amber-600 font-mono">g</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <label className="text-[10px] font-semibold text-rose-600 uppercase block mb-1">
                    Healthy Fats
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="5"
                      value={fatGrams}
                      onChange={(e) => setFatGrams(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-sm font-bold font-mono tabular-nums text-rose-700 border-none p-0 focus:outline-none"
                    />
                    <span className="text-[10px] text-rose-600 font-mono">g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-400">
                Saved to your account
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving || !currentUser}
                  className="px-5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Profile Saved to Database!</span>
                    </>
                  ) : (
                    <span>{saving ? 'Saving...' : 'Save profile'}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
