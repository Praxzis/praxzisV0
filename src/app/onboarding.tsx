import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink, Binding, Hand, InkButton, LinedField, PAGE_MAX, PageStack, Print, Sheet, Underlined, useNotebook } from '@/notebook';
import { useStore } from '@/state/store';

const PAGES = [
  {
    seed: 'on-1',
    label: 'i',
    title: 'Your library, as a mind.',
    body: 'Bring the books you actually read. Mark the lines that stay. Praxzis will not invent a personality for you — it will sit with what you underlined.',
    note: 'the system is digital. the thoughts belong to you.',
  },
  {
    seed: 'on-2',
    label: 'ii',
    title: 'A page, not a dashboard.',
    body: 'Today is a page. The shelf is a shelf. The Council is several pages spread on a desk. If it would not belong in a notebook, it does not belong here.',
    note: 'perfect structure. imperfect ink.',
  },
  {
    seed: 'on-3',
    label: 'iii',
    title: 'One idea a week.',
    body: 'Not a feed of insights. One sentence you can try. The notebook remembers whether you did.',
    note: 'the more you use it, the more it is yours.',
  },
] as const;

export default function Onboarding() {
  const { m, reduceMotion } = useNotebook();
  const { books } = useStore();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [name, setName] = useState('');
  const [sample, setSample] = useState(true);
  const turn = useSharedValue(0);

  const flip = (next: number) => {
    if (reduceMotion) {
      setPage(next);
      return;
    }
    turn.value = 0;
    turn.value = withTiming(1, { duration: 280, easing: Easing.in(Easing.cubic) }, () => {
      turn.value = 0;
    });
    setTimeout(() => setPage(next), 160);
  };

  const pageStyle = useAnimatedStyle(() => ({
    transformOrigin: 'left',
    transform: [{ perspective: 1400 }, { rotateY: `${turn.value * -18}deg` }],
    opacity: 1 - turn.value * 0.35,
  }));

  const last = page === PAGES.length;
  const copy = PAGES[Math.min(page, PAGES.length - 1)];

  return (
    <View style={{ flex: 1, backgroundColor: m.desk, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
      <View style={{ width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center', flex: 1 }}>
        <BackLink label="Cover" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <Animated.View style={[{ flex: 1, marginTop: 8 }, pageStyle]}>
          <PageStack seed={copy.seed} />
          <Sheet
            seed={copy.seed}
            lift={1}
            ruled={last}
            style={{ flexGrow: 1 }}
            contentStyle={{ paddingLeft: 36, paddingRight: 22, paddingTop: 22, paddingBottom: 28, flexGrow: 1 }}
          >
            <Binding height={520} seed={copy.seed} />
            <Print variant="label">Flyleaf {copy.label}</Print>
            {!last ? (
              <>
                <Hand seed={`${copy.seed}-t`} size="title" tone="navy" slant={-1} write style={{ marginTop: 12 }}>
                  {copy.title}
                </Hand>
                <Print variant="body" style={{ marginTop: 18 }}>
                  {copy.body}
                </Print>
                <Underlined seed={`${copy.seed}-u`} color={m.turquoise} style={{ marginTop: 28 }} draw delay={400}>
                  <Hand seed={`${copy.seed}-n`} size="note" tone="turquoise">
                    {copy.note}
                  </Hand>
                </Underlined>
              </>
            ) : (
              <>
                <Hand seed="on-sign" size="title" tone="navy" slant={-1} write style={{ marginTop: 12 }}>
                  Sign the first page
                </Hand>
                <Print variant="ui" tone="graphite" style={{ marginTop: 10 }}>
                  A name for the flyleaf. Next you will sign it — email, Google, or Apple — and agree to the terms.
                </Print>
                <LinedField label="Your name" placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" style={{ marginTop: 22 }} />

                <Print variant="label" style={{ marginTop: 28 }}>The first pages</Print>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sample }}
                  onPress={() => setSample(true)}
                  style={{ minHeight: 44, marginTop: 10, justifyContent: 'center' }}
                >
                  <Hand seed="sample-yes" size="note" tone={sample ? 'turquoise' : 'ink'}>
                    {sample ? '✓  Fill them with a few public-domain books' : '○  Fill them with a few public-domain books'}
                  </Hand>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: !sample }}
                  onPress={() => setSample(false)}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Hand seed="sample-no" size="note" tone={!sample ? 'turquoise' : 'ink'}>
                    {!sample ? '✓  Leave the shelf empty. I will bring my own.' : '○  Leave the shelf empty. I will bring my own.'}
                  </Hand>
                </Pressable>
                {books.length > 0 && (
                  <Print variant="meta" tone="pencil" style={{ marginTop: 8 }}>
                    A notebook already lives on this device. Opening it will keep those pages.
                  </Print>
                )}
              </>
            )}
            <Print variant="meta" tone="pencil" style={{ marginTop: 'auto', alignSelf: 'center', paddingTop: 24 }}>
              — {page + 1} —
            </Print>
          </Sheet>
        </Animated.View>

        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {page > 0 ? (
            <InkButton label="Back" kind="quiet" onPress={() => flip(page - 1)} />
          ) : (
            <View />
          )}
          {last ? (
            <InkButton
              label="Sign the flyleaf"
              disabled={!name.trim()}
              onPress={() => {
                router.push({
                  pathname: '/sign-in',
                  params: { name: name.trim(), sample: sample && books.length === 0 ? '1' : '0', intent: 'start' },
                });
              }}
              seed="open-nb"
            />
          ) : (
            <InkButton label="Turn the page" onPress={() => flip(page + 1)} seed="turn" />
          )}
        </View>
      </View>
    </View>
  );
}
