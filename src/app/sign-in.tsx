import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { AuthSeals } from '@/components/auth-seals';
import { TermsAgree } from '@/components/terms-agree';
import { isRedirect, signInApple, signInEmail, signInGoogle, signUpEmail } from '@/lib/auth';
import { hasSupabase } from '@/lib/env';
import { isExpoGo } from '@/lib/redirect';
import { getSupabase } from '@/lib/supabase';
import { BackLink, Binding, Hand, InkButton, LinedField, PAGE_MAX, PageStack, Print, Sheet, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignIn() {
  const { m } = useNotebook();
  const { ready, session, establish, beginDevice, books, prefs, setPrefs } = useStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string; sample?: string; intent?: string }>();
  const starting = params.intent === 'start';
  const [mode, setMode] = useState<'in' | 'up'>(starting ? 'up' : 'in');
  const [name, setName] = useState(params.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [agreed, setAgreed] = useState(!!prefs.acceptedTermsAt);
  const sample = params.sample === '1';
  const needsTerms = mode === 'up' || !prefs.acceptedTermsAt;

  useEffect(() => {
    getSupabase();
    if (Platform.OS === 'android') {
      WebBrowser.warmUpAsync().catch(() => {});
      return () => {
        WebBrowser.coolDownAsync().catch(() => {});
      };
    }
  }, []);

  if (ready && session) return <Redirect href="/(tabs)" />;

  const acceptTerms = () => {
    if (agreed && !prefs.acceptedTermsAt) {
      setPrefs({ acceptedTermsAt: new Date().toISOString() });
    }
  };

  const refuseTerms = () => {
    setNote('The terms wait for a signature first.');
  };

  const finish = async (run: () => ReturnType<typeof signInEmail>) => {
    if (needsTerms && !agreed) {
      refuseTerms();
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const result = await run();
      if (isRedirect(result)) {
        setNote('Continuing with the seal…');
        acceptTerms();
        return;
      }
      if (!result.ok) {
        setNote(result.message);
        return;
      }
      await establish(result.session, sample && books.length === 0);
      acceptTerms();
      router.replace('/(tabs)');
    } catch {
      setNote('We couldn\'t sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    looksLikeEmail(email) &&
    password.length >= 6 &&
    (mode === 'in' || (name.trim() && confirm === password)) &&
    (!needsTerms || agreed);

  return (
    <View style={{ flex: 1, backgroundColor: m.desk, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
      <View style={{ width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center', flex: 1 }}>
        <BackLink label="Cover" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <View style={{ flex: 1, marginTop: 8 }}>
          <PageStack seed="flyleaf" />
          <Sheet seed="flyleaf" lift={1} ruled style={{ flexGrow: 1 }} contentStyle={{ paddingLeft: 36, paddingRight: 22, paddingTop: 22, paddingBottom: 28, flexGrow: 1 }}>
            <Binding height={560} seed="flyleaf" />
            <Print variant="label">The flyleaf</Print>
            <Hand seed="si-title" size="title" tone="navy" slant={-1} write style={{ marginTop: 10 }}>
              {mode === 'up' ? 'This notebook will belong to' : 'This notebook belongs to'}
            </Hand>

            {mode === 'up' && (
              <LinedField label="Your name" placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" style={{ marginTop: 22 }} />
            )}
            <LinedField
              label="Email"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              script={false}
              style={{ marginTop: mode === 'up' ? 12 : 22 }}
            />
            <LinedField
              label="Password"
              placeholder="Password, at least six letters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'up' ? 'new-password' : 'password'}
              textContentType={mode === 'up' ? 'newPassword' : 'password'}
              script={false}
              style={{ marginTop: 12 }}
            />
            {mode === 'up' && (
              <LinedField
                label="Confirm password"
                placeholder="Write the password once more"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                script={false}
                style={{ marginTop: 12 }}
              />
            )}

            {needsTerms && (
              <TermsAgree
                agreed={agreed}
                onToggle={() => {
                  setAgreed((v) => !v);
                  if (note.startsWith('The terms')) setNote('');
                }}
                style={{ marginTop: 18 }}
              />
            )}

            {!!note && (
              <Hand seed={note} size="small" tone="turquoise" slant={-0.8} style={{ marginTop: 14 }}>
                {note}
              </Hand>
            )}
            {!note && isExpoGo() && (
              <Hand seed="expo-go-note" size="small" tone="turquoise" slant={-0.8} style={{ marginTop: 14 }}>
                This copy is open inside Expo Go. Continue with Google needs the Praxzis app itself. On your computer run npx expo run:ios --device, then open Praxzis — not Expo Go.
              </Hand>
            )}
            {mode === 'up' && confirm.length > 0 && confirm !== password && (
              <Print variant="meta" tone="pencil" style={{ marginTop: 8 }}>
                The two passwords do not match yet.
              </Print>
            )}

            <View style={{ marginTop: 22 }}>
              <InkButton
                label={busy ? 'Pressing the seal…' : mode === 'up' ? 'Keep this signature' : 'Open with this signature'}
                disabled={!canSubmit || busy}
                onPress={() =>
                  finish(() => (mode === 'up' ? signUpEmail(email, password, name) : signInEmail(email, password, name)))
                }
                seed="sign"
              />
            </View>

            <Print variant="label" style={{ marginTop: 28 }}>
              Or press a house seal
            </Print>
            <AuthSeals
              busy={busy}
              onGoogle={() => finish(() => signInGoogle())}
              onApple={() => finish(() => signInApple())}
            />

            <Hand seed="si-toggle" size="small" tone="graphite" slant={-0.6} style={{ marginTop: 22 }}>
              {mode === 'up' ? 'Already signed this copy?' : 'First time at this desk?'}
            </Hand>
            <InkButton
              label={mode === 'up' ? 'I already have a signature' : 'Start a new copy'}
              kind="quiet"
              onPress={() => {
                setMode(mode === 'up' ? 'in' : 'up');
                setNote('');
              }}
            />

            {!hasSupabase && (
              <Print variant="meta" tone="pencil" style={{ marginTop: 18 }}>
                A cloud signature waits until this build is connected. You can still stay on this desk.
              </Print>
            )}
            {books.length > 0 && (
              <Print variant="meta" tone="pencil" style={{ marginTop: 12 }}>
                Pages already written on this device will still be here.
              </Print>
            )}

            <View style={{ marginTop: 'auto', paddingTop: 24 }}>
              <InkButton
                label="Stay on this desk only"
                kind="secondary"
                onPress={() => {
                  if (needsTerms && !agreed) {
                    refuseTerms();
                    return;
                  }
                  acceptTerms();
                  beginDevice(name.trim() || 'Reader', sample && books.length === 0);
                  router.replace('/(tabs)');
                }}
                seed="local-only"
              />
            </View>
          </Sheet>
        </View>
      </View>
    </View>
  );
}
