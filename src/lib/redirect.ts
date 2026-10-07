import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** Native OAuth return. Never exp:// or a Supabase URL. */
export const PRAXZIS_AUTH_CALLBACK = 'praxzis://auth/callback';

export function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Where Google, Apple, and confirm-email links should land. */
export function authRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return PRAXZIS_AUTH_CALLBACK;
}
