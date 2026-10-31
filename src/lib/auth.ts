import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function subscribeToAuthChanges(onChange: (user: User | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
