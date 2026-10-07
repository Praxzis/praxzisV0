import { Stack, useRouter, useSegments } from 'expo-router';
import { Caveat_400Regular, Caveat_500Medium, Caveat_600SemiBold, Caveat_700Bold } from '@expo-google-fonts/caveat';
import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_600SemiBold,
} from '@expo-google-fonts/eb-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NotebookProvider, useNotebook } from '@/notebook';
import { StoreProvider, useStore } from '@/state/store';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'welcome',
};

function Guard() {
  const { ready, session } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const root = segments[0];
    const onCover = root === 'welcome' || root === 'onboarding' || root === 'sign-in' || root === 'auth' || root === 'terms';
    if (!session && !onCover) router.replace('/welcome');
    if (session && (root === 'welcome' || root === 'onboarding' || root === 'sign-in')) router.replace('/(tabs)');
  }, [ready, router, segments, session]);

  return null;
}

function Notebook() {
  const { m } = useNotebook();
  const { ready } = useStore();
  if (!ready) return <View style={{ flex: 1, backgroundColor: m.desk }} />;
  return (
    <>
      <StatusBar style={m.scheme === 'day' ? 'dark' : 'light'} />
      <Guard />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 220, contentStyle: { backgroundColor: m.desk } }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="book/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="book/new" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="highlight/[id]" />
        <Stack.Screen name="mark" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Caveat_400Regular,
    Caveat_500Medium,
    Caveat_600SemiBold,
    Caveat_700Bold,
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_500Medium,
    EBGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <NotebookProvider>
          <Notebook />
        </NotebookProvider>
      </StoreProvider>
    </GestureHandlerRootView>
  );
}
