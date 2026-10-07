import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClosedCover } from '@/components/cover';
import { Hand, InkButton, PAGE_MAX, Print, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

export default function Welcome() {
  const { m, reduceMotion } = useNotebook();
  const { ready, session, books, highlights, ownerName, reopen } = useStore();
  const insets = useSafeAreaInsets();
  const [opening, setOpening] = useState(false);
  const hasPages = books.length + highlights.length > 0;

  if (ready && session) return <Redirect href="/(tabs)" />;

  const go = (href: '/onboarding' | '/sign-in' | '/(tabs)', action?: () => void) => {
    setOpening(true);
    const wait = reduceMotion ? 40 : 480;
    setTimeout(() => {
      action?.();
      if (href === '/(tabs)') router.replace(href);
      else router.push(href);
    }, wait);
  };

  return (
    <View style={{ flex: 1, backgroundColor: m.desk, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28, paddingHorizontal: 28 }}>
      <View style={{ width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center', flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <ClosedCover width={200} opening={opening ? 1 : 0} />
          </View>
          <Print variant="label" style={{ textAlign: 'center' }}>
            Praxzis
          </Print>
          <Hand seed="welcome-line" size="title" tone="navy" slant={-1} write align="center" style={{ marginTop: 10 }}>
            a notebook that thinks with you
          </Hand>
          <Print variant="body" tone="graphite" style={{ marginTop: 16, textAlign: 'center', paddingHorizontal: 16 }}>
            {hasPages
              ? ownerName
                ? `${ownerName}’s pages are still here.`
                : 'Your pages are still here.'
              : 'Bring the books you read. Mark the lines that stay. Sit with a choice when it matters.'}
          </Print>
        </View>

        <View>
          {hasPages ? (
            <InkButton
              label="Open this notebook"
              onPress={() => go('/(tabs)', reopen)}
              seed="reopen"
              accessibilityHint="Reopens the notebook already on this device"
            />
          ) : (
            <InkButton
              label="Begin"
              onPress={() => go('/onboarding')}
              seed="begin"
              accessibilityHint="Starts a short introduction, then opens a new notebook"
            />
          )}
          <InkButton
            label="Sign in"
            kind="secondary"
            onPress={() => go('/sign-in')}
            seed="flyleaf"
            style={{ marginTop: 12 }}
            accessibilityHint="Sign in with email, Google, or Apple"
          />
        </View>
      </View>
    </View>
  );
}
