import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { hasSupabase, supabaseKey, supabaseUrl } from './env';

function onNodeWeb() {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

const authStorage = {
  getItem: (key: string) => (onNodeWeb() ? null : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (!onNodeWeb()) return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!onNodeWeb()) return AsyncStorage.removeItem(key);
  },
};

let client: SupabaseClient | null | undefined;

/** Null during Expo Router’s Node render. Created on first real use in the app. */
export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase || onNodeWeb()) return null;
  if (client !== undefined) return client;
  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
  return client;
}
