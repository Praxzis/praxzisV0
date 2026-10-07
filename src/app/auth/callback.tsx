import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { completeAuthFromLocation } from '@/lib/auth';
import { Hand, PAGE_MAX, Print, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

export default function AuthCallback() {
  const { m } = useNotebook();
  const { establish, session } = useStore();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('Pressing the seal…');

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
      return;
    }
    let live = true;
    completeAuthFromLocation()
      .then(async (result) => {
        if (!live) return;
        if (result.ok && 'session' in result) {
          await establish(result.session);
          router.replace('/(tabs)');
          return;
        }
        setNote(!result.ok ? result.message : 'The seal did not take.');
        setTimeout(() => router.replace('/sign-in'), 1600);
      })
      .catch(() => {
        if (!live) return;
        setNote('The seal did not take.');
        setTimeout(() => router.replace('/sign-in'), 1600);
      });
    return () => {
      live = false;
    };
  }, [establish, session]);

  return (
    <View style={{ flex: 1, backgroundColor: m.desk, paddingTop: insets.top + 40, paddingHorizontal: 28 }}>
      <View style={{ width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center' }}>
        <Print variant="label">The flyleaf</Print>
        <Hand seed="cb-title" size="title" tone="navy" slant={-1} write style={{ marginTop: 10 }}>
          {note}
        </Hand>
      </View>
    </View>
  );
}
