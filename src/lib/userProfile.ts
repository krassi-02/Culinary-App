import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface UserProfileData {
  userId: string;
  email: string;
  displayName: string;
  dietaryPreferences: string[];
  macroTargets: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  defaultServings: number;
  measurementSystem: 'metric' | 'imperial';
  createdAt: string;
  updatedAt: string;
}

function defaultProfileFor(user: User): UserProfileData {
  const now = new Date().toISOString();
  const name = user.user_metadata?.display_name;
  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: typeof name === 'string' && name.trim() ? name : 'Home Cook',
    dietaryPreferences: ['High Protein', 'Gluten Free'],
    macroTargets: { dailyCalories: 2100, proteinGrams: 140, carbsGrams: 190, fatGrams: 65 },
    defaultServings: 2,
    measurementSystem: 'metric',
    createdAt: now,
    updatedAt: now,
  };
}

export async function fetchUserProfile(user: User): Promise<UserProfileData> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('data')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (data?.data) return data.data as UserProfileData;

  const profile = defaultProfileFor(user);
  const { error: insertError } = await supabase
    .from('user_profiles')
    .insert({ id: user.id, data: profile });
  if (insertError) throw insertError;
  return profile;
}

export async function saveUserProfile(profile: UserProfileData): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ data: profile, updated_at: new Date().toISOString() })
    .eq('id', profile.userId);
  if (error) throw error;
}
