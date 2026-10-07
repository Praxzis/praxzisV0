import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { DEV_ACCOUNT, isDevLogin } from './dev-account';
import { hasSupabase } from './env';
import { PRAXZIS_AUTH_CALLBACK, authRedirectUrl, isExpoGo } from './redirect';
import { getSupabase } from './supabase';

if (typeof window !== 'undefined') {
  WebBrowser.maybeCompleteAuthSession();
}

export type AuthKind = 'device' | 'email' | 'google' | 'apple';

export type AuthSession = {
  kind: AuthKind;
  name: string;
  email?: string;
  userId?: string;
};

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: true; redirected: true }
  | { ok: false; message: string };

export function isRedirect(result: AuthResult): result is { ok: true; redirected: true } {
  return result.ok && 'redirected' in result;
}

function displayName(meta: Record<string, unknown> | undefined, email?: string) {
  const full = typeof meta?.full_name === 'string' ? meta.full_name : '';
  const given = typeof meta?.given_name === 'string' ? meta.given_name : '';
  const name = typeof meta?.name === 'string' ? meta.name : '';
  const display = typeof meta?.display_name === 'string' ? meta.display_name : '';
  return (display || full || name || given || email?.split('@')[0] || 'Reader').trim();
}

function kindFromProvider(provider?: string): AuthKind {
  if (provider === 'apple') return 'apple';
  if (provider === 'google') return 'google';
  return 'email';
}

function fromUser(
  user: { id: string; email?: string; app_metadata?: { provider?: string }; user_metadata?: Record<string, unknown> },
  fallback?: string,
  kind?: AuthKind,
): AuthSession {
  return {
    kind: kind ?? kindFromProvider(user.app_metadata?.provider),
    name: fallback?.trim() || displayName(user.user_metadata, user.email),
    email: user.email,
    userId: user.id,
  };
}

const devSession = (): AuthSession => ({
  kind: 'email',
  name: DEV_ACCOUNT.name,
  email: DEV_ACCOUNT.email,
  userId: 'dev-praxzis',
});

function friendlyAuthError(error: { message?: string; code?: string } | null) {
  const raw = error?.message ?? '';
  const m = raw.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || error?.code === 'invalid_credentials') {
    return 'That email and password do not match.';
  }
  if (m.includes('already registered') || m.includes('already been registered') || error?.code === 'user_already_exists') {
    return 'already-registered';
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'Confirm the email we sent, then sign in.';
  }
  if (m.includes('password should') || m.includes('weak password')) {
    return raw;
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'The flyleaf is being asked too often. Wait a moment.';
  }
  return raw || 'We couldn\'t sign you in. Please try again.';
}

function googleFail(kind: 'cancel' | 'network' | 'callback' | 'generic') {
  if (kind === 'cancel') return 'Google sign-in was cancelled.';
  if (kind === 'network') return 'We couldn\'t reach Google. Check your connection and try again.';
  if (kind === 'callback') return 'We couldn\'t finish signing you in with Google. Please try again.';
  return 'We couldn\'t sign you in with Google. Please try again.';
}

function paramsFromUrl(url: string) {
  const qIndex = url.indexOf('?');
  const hIndex = url.indexOf('#');
  const query = qIndex >= 0 ? url.slice(qIndex + 1, hIndex >= 0 && hIndex > qIndex ? hIndex : undefined) : '';
  const hash = hIndex >= 0 ? url.slice(hIndex + 1) : '';
  return {
    search: new URLSearchParams(query),
    hash: new URLSearchParams(hash),
  };
}

export async function sessionFromUrl(url: string): Promise<AuthResult> {
  const db = getSupabase();
  if (!db) return { ok: false, message: 'The desk is not connected yet.' };
  const { search, hash } = paramsFromUrl(url);
  const err = search.get('error_description') || search.get('error') || hash.get('error_description') || hash.get('error');
  if (err) {
    const reason = decodeURIComponent(err.replace(/\+/g, ' ')).toLowerCase();
    if (reason.includes('access_denied') || reason.includes('denied') || reason.includes('cancel')) {
      return { ok: false, message: 'Sign-in was cancelled.' };
    }
    return { ok: false, message: 'We couldn\'t finish signing you in. Please try again.' };
  }

  const code = search.get('code') || hash.get('code');
  if (code) {
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (error || !data.user) return { ok: false, message: 'We couldn\'t finish signing you in. Please try again.' };
    return { ok: true, session: fromUser(data.user) };
  }

  const access = hash.get('access_token') || search.get('access_token');
  const refresh = hash.get('refresh_token') || search.get('refresh_token');
  if (access && refresh) {
    const { data, error } = await db.auth.setSession({ access_token: access, refresh_token: refresh });
    if (error || !data.user) return { ok: false, message: 'We couldn\'t finish signing you in. Please try again.' };
    return { ok: true, session: fromUser(data.user) };
  }

  return { ok: false, message: 'We couldn\'t finish signing you in. Please try again.' };
}

export async function restoreRemoteSession(): Promise<AuthSession | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return fromUser(user);
}

export async function completeAuthFromLocation(): Promise<AuthResult> {
  const existing = await restoreRemoteSession();
  if (existing) return { ok: true, session: existing };

  if (typeof window !== 'undefined' && window.location.href.includes('/auth/callback')) {
    const fromWindow = await sessionFromUrl(window.location.href);
    if (fromWindow.ok && 'session' in fromWindow) return fromWindow;
  }

  const initial = await Linking.getInitialURL().catch(() => null);
  if (initial && (initial.includes('auth/callback') || initial.includes('code='))) {
    const fromLink = await sessionFromUrl(initial);
    if (fromLink.ok && 'session' in fromLink) return fromLink;
  }

  const waited = await waitForRemoteSession(2400);
  if (waited) return { ok: true, session: waited };
  return { ok: false, message: 'The seal did not return a session.' };
}

async function waitForRemoteSession(ms: number): Promise<AuthSession | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const session = await restoreRemoteSession();
    if (session) return session;
    await new Promise((r) => setTimeout(r, 160));
  }
  return null;
}

export async function signInEmail(email: string, password: string, name?: string): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase();
  const db = getSupabase();
  if (isDevLogin(trimmed, password)) {
    if (db) {
      const { data, error } = await db.auth.signInWithPassword({ email: trimmed, password });
      if (!error && data.user) return { ok: true, session: fromUser(data.user, DEV_ACCOUNT.name, 'email') };
    }
    return { ok: true, session: devSession() };
  }
  if (!db) return { ok: false, message: 'Add the Supabase keys, or use the house copy on the flyleaf.' };
  const { data, error } = await db.auth.signInWithPassword({ email: trimmed, password });
  if (error || !data.user) return { ok: false, message: friendlyAuthError(error) };
  return { ok: true, session: fromUser(data.user, name, 'email') };
}

export async function signUpEmail(email: string, password: string, name: string): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase();
  if (isDevLogin(trimmed, password)) return signInEmail(trimmed, password, name);
  const db = getSupabase();
  if (!db) {
    return { ok: true, session: { kind: 'email', name: name.trim() || trimmed.split('@')[0], email: trimmed } };
  }
  const { data, error } = await db.auth.signUp({
    email: trimmed,
    password,
    options: {
      data: { display_name: name.trim(), full_name: name.trim() },
      emailRedirectTo: authRedirectUrl(),
    },
  });
  if (error) {
    if (friendlyAuthError(error) === 'already-registered') {
      return signInEmail(trimmed, password, name);
    }
    return { ok: false, message: friendlyAuthError(error) };
  }
  if (data.user && data.session) return { ok: true, session: fromUser(data.user, name, 'email') };
  const signed = await signInEmail(trimmed, password, name);
  if (signed.ok) return signed;
  return { ok: false, message: 'Confirm the email we sent, then sign in.' };
}

async function oauth(provider: 'google' | 'apple'): Promise<AuthResult> {
  const db = getSupabase();
  if (!db || !hasSupabase) {
    return { ok: false, message: 'The seals need the API keys in .env.local, then a reload.' };
  }
  if (Platform.OS !== 'web' && isExpoGo()) {
    return {
      ok: false,
      message:
        'This is Expo Go, not the Praxzis app. Google cannot return here. Install a Praxzis development build, then open that app instead of Expo Go.',
    };
  }

  const redirectTo = authRedirectUrl();
  const extras = provider === 'google' ? { queryParams: { prompt: 'select_account', access_type: 'offline' } } : {};
  const fail = provider === 'google' ? googleFail : (kind: 'cancel' | 'network' | 'callback' | 'generic') =>
    kind === 'cancel' ? 'Apple sign-in was cancelled.' : 'We couldn\'t sign you in with Apple. Please try again.';

  if (Platform.OS === 'web') {
    const { error } = await db.auth.signInWithOAuth({
      provider,
      options: { redirectTo, ...extras },
    });
    if (error) return { ok: false, message: fail('generic') };
    return { ok: true, redirected: true };
  }

  if (Platform.OS === 'android') {
    await WebBrowser.warmUpAsync().catch(() => {});
  }
  const { data, error } = await db.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true, ...extras },
  });
  if (error || !data.url) {
    if (Platform.OS === 'android') await WebBrowser.coolDownAsync().catch(() => {});
    const network = (error?.message ?? '').toLowerCase().includes('network') || error?.code === 'auth_retryable';
    return { ok: false, message: fail(network ? 'network' : 'generic') };
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, PRAXZIS_AUTH_CALLBACK, {
    preferEphemeralSession: false,
    showInRecents: true,
  });
  if (Platform.OS === 'android') await WebBrowser.coolDownAsync().catch(() => {});
  if (result.type === 'cancel' || result.type === 'dismiss') return { ok: false, message: fail('cancel') };
  if (result.type !== 'success' || !('url' in result) || !result.url) return { ok: false, message: fail('callback') };
  const session = await sessionFromUrl(result.url);
  if (!session.ok && session.message.toLowerCase().includes('cancel')) {
    return { ok: false, message: fail('cancel') };
  }
  if (!session.ok) return { ok: false, message: fail('callback') };
  return session;
}

export async function signInGoogle(): Promise<AuthResult> {
  return oauth('google');
}

export async function signInApple(): Promise<AuthResult> {
  if (Platform.OS === 'ios') {
    const available = await AppleAuthentication.isAvailableAsync();
    if (available) {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) return { ok: false, message: 'Apple did not return a token.' };
        const db = getSupabase();
        if (!db) return { ok: false, message: 'Add the Supabase keys, then press the Apple seal again.' };
        const { data, error } = await db.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error || !data.user) return { ok: false, message: friendlyAuthError(error) || 'Apple did not accept the page.' };
        const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
        if (name) {
          await db.auth.updateUser({
            data: {
              full_name: name,
              given_name: credential.fullName?.givenName,
              family_name: credential.fullName?.familyName,
              display_name: name,
            },
          });
        }
        return { ok: true, session: fromUser(data.user, name || undefined, 'apple') };
      } catch (e) {
        const err = e as { code?: string; message?: string };
        if (err.code === 'ERR_REQUEST_CANCELED') return { ok: false, message: 'You closed the seal.' };
        return oauth('apple');
      }
    }
  }
  if (Platform.OS !== 'web' && isExpoGo()) {
    return {
      ok: false,
      message:
        'This is Expo Go, not the Praxzis app. Install a Praxzis development build, then open that app instead of Expo Go.',
    };
  }
  return oauth('apple');
}

export async function signOutRemote() {
  const db = getSupabase();
  if (db) await db.auth.signOut().catch(() => {});
}

export function listenAuth(onChange: (session: AuthSession | null, event: string) => void) {
  const db = getSupabase();
  if (!db) return () => {};
  const { data } = db.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    onChange(user ? fromUser(user) : null, event);
  });
  return () => data.subscription.unsubscribe();
}
