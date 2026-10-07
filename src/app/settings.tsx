import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';

import { relativeSaved, todayHeading } from '@/core/ids';
import { hasSupabase } from '@/lib/env';
import { day, night } from '@/notebook/materials';
import {
  BackLink,
  Divider,
  Hand,
  InkButton,
  LinedField,
  NotebookPage,
  Print,
  Sheet,
  useNotebook,
  type Appearance,
  type Handwriting,
} from '@/notebook';
import { useStore } from '@/state/store';
import type { CouncilManner, DateVoice, Prefs, ShelfOrder } from '@/state/types';

function signedHow(kind?: string) {
  if (kind === 'google') return 'Google';
  if (kind === 'apple') return 'Apple';
  if (kind === 'email') return 'email';
  return 'this device';
}

function tap(enabled: boolean) {
  if (enabled && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

/** A printer’s line: the name of the setting, then the words you choose. */
function Spec({
  term,
  value,
  onChange,
  options,
}: {
  term: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const { m, haptics } = useNotebook();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={term}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: m.rule,
      }}
    >
      <Print variant="label" style={{ width: 86, flexShrink: 0 }}>
        {term}
      </Print>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              hitSlop={6}
              onPress={() => {
                tap(haptics);
                onChange(o.value);
              }}
              style={({ pressed }) => ({
                minHeight: 36,
                paddingHorizontal: 4,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Print variant="uiStrong" tone={on ? 'navy' : 'graphite'}>
                {o.label}
              </Print>
              <View style={{ height: 1.5, marginTop: 3, backgroundColor: on ? m.turquoise : 'transparent' }} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Light({ kind, on, onPress }: { kind: Appearance; on: boolean; onPress: () => void }) {
  const { m, haptics } = useNotebook();
  const dayPaper = day.paper.cream;
  const nightPaper = night.paper.ivory;
  const label = kind === 'system' ? 'Room' : kind === 'day' ? 'Day' : 'Night';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={() => {
        tap(haptics);
        onPress();
      }}
      style={({ pressed }) => ({ alignItems: 'center', gap: 8, opacity: pressed ? 0.75 : 1, flex: 1 })}
    >
      <View
        style={{
          width: '100%',
          height: 72,
          borderRadius: 3,
          overflow: 'hidden',
          borderWidth: on ? 1.6 : 1,
          borderColor: on ? m.navy : m.rule,
        }}
      >
        {kind === 'system' ? (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: 1, backgroundColor: dayPaper }} />
            <View style={{ flex: 1, backgroundColor: nightPaper }} />
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: kind === 'day' ? dayPaper : nightPaper }} />
        )}
        <View
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 12,
            height: 1,
            backgroundColor: kind === 'night' ? night.ink : day.navy,
            opacity: 0.35,
          }}
        />
      </View>
      <Print variant="meta" tone={on ? 'navy' : 'pencil'}>
        {label}
      </Print>
    </Pressable>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 32 }}>
      <Print variant="label" accessibilityRole="header">
        {title}
      </Print>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

export default function Settings() {
  const { appearance, setAppearance, handwriting, setHandwriting } = useNotebook();
  const { session, prefs, setPrefs, rename, signOut, exportText, syncedAt, burnCopy, books, highlights, notes } = useStore();
  const [display, setDisplay] = useState(session?.name ?? '');
  const [burn, setBurn] = useState('');
  const [removing, setRemoving] = useState(false);
  const [copied, setCopied] = useState(false);

  const pref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => setPrefs({ [key]: value } as Partial<Prefs>);
  const dirty = !!display.trim() && display.trim() !== session?.name;
  const todayLong = todayHeading(undefined, 'long');
  const todayShort = todayHeading(undefined, 'short');
  const inventory = [
    books.length ? `${books.length} book${books.length === 1 ? '' : 's'}` : null,
    highlights.length ? `${highlights.length} marked line${highlights.length === 1 ? '' : 's'}` : null,
    notes.length ? `${notes.length} note${notes.length === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const keepName = () => {
    const next = display.trim();
    if (!next || next === session?.name) return;
    rename(next);
  };

  const shareOut = async () => {
    try {
      await Share.share({ message: exportText(), title: 'Praxzis' });
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <NotebookPage seed="settings">
      <BackLink label="Today" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

      <Print variant="label" accessibilityRole="header" style={{ marginTop: 8 }}>
        The back of the book
      </Print>
      <Hand seed="settings-title" size="title" tone="navy" slant={-0.8} style={{ marginTop: 6 }}>
        {session?.name || 'This copy'}
      </Hand>
      <Print variant="meta" tone="pencil" style={{ marginTop: 6 }}>
        {[
          `Signed with ${signedHow(session?.kind)}`,
          syncedAt ? `saved ${relativeSaved(syncedAt)}` : null,
          inventory || 'Empty, for now',
        ]
          .filter(Boolean)
          .join(' · ')}
      </Print>

      {session && (
        <View style={{ marginTop: 18 }}>
          <LinedField
            label="Your name on the flyleaf"
            placeholder="Your name"
            value={display}
            onChangeText={setDisplay}
            onBlur={keepName}
            autoCapitalize="words"
          />
          {dirty && <InkButton label="Keep this name" kind="quiet" onPress={keepName} style={{ marginTop: 4 }} />}
        </View>
      )}

      <Block title="The page">
        <View accessibilityRole="radiogroup" accessibilityLabel="Light" style={{ flexDirection: 'row', gap: 10 }}>
          <Light kind="day" on={appearance === 'day'} onPress={() => setAppearance('day')} />
          <Light kind="night" on={appearance === 'night'} onPress={() => setAppearance('night')} />
          <Light kind="system" on={appearance === 'system'} onPress={() => setAppearance('system')} />
        </View>

        <Sheet seed="hand-sample" tone="ivory" lift={1} simple style={{ marginTop: 18 }} contentStyle={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Print variant="label">The hand</Print>
          <Hand key={handwriting} seed={`hand-${handwriting}`} size="large" tone="ink" slant={handwriting === 'natural' ? -1.2 : 0} style={{ marginTop: 8 }}>
            {display.trim() || session?.name || 'A note sits like this'}
          </Hand>
          <View style={{ marginTop: 12 }}>
            <Spec
              term="Hand"
              value={handwriting}
              onChange={(v) => setHandwriting(v as Handwriting)}
              options={[
                { value: 'natural', label: 'Natural' },
                { value: 'steady', label: 'Steady' },
              ]}
            />
            <Spec
              term="Date"
              value={prefs.dateVoice}
              onChange={(v) => pref('dateVoice', v as DateVoice)}
              options={[
                { value: 'long', label: todayLong },
                { value: 'short', label: todayShort },
              ]}
            />
          </View>
        </Sheet>
      </Block>

      <Block title="The work">
        <Spec
          term="Shelf"
          value={prefs.shelfOrder}
          onChange={(v) => pref('shelfOrder', v as ShelfOrder)}
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'title', label: 'Title' },
            { value: 'author', label: 'Author' },
          ]}
        />
        <Spec
          term="Council"
          value={prefs.councilManner}
          onChange={(v) => pref('councilManner', v as CouncilManner)}
          options={[
            { value: 'strict', label: 'Strict' },
            { value: 'warm', label: 'Warm' },
          ]}
        />
        <Print variant="meta" tone="pencil" style={{ marginTop: 8, marginBottom: 4 }}>
          {prefs.councilManner === 'warm' ? 'Closer. Still grounded in the lines you marked.' : 'Spare. Exact. It will not soothe the choice.'}
        </Print>
        <Spec
          term="Counsel"
          value={prefs.useAi ? 'on' : 'off'}
          onChange={(v) => pref('useAi', v === 'on')}
          options={[
            { value: 'on', label: 'Deeper' },
            { value: 'off', label: 'Pages only' },
          ]}
        />
      </Block>

      <Block title="This desk">
        <Spec
          term="Copy"
          value={prefs.syncCloud ? 'on' : 'off'}
          onChange={(v) => pref('syncCloud', v === 'on')}
          options={[
            { value: 'on', label: 'Off this desk' },
            { value: 'off', label: 'This device' },
          ]}
        />
        {!hasSupabase && (
          <Print variant="meta" tone="pencil" style={{ marginTop: 8 }}>
            A second copy waits until this build is connected to your account.
          </Print>
        )}
        <Spec
          term="Flyleaf"
          value={prefs.showEmail ? 'on' : 'off'}
          onChange={(v) => pref('showEmail', v === 'on')}
          options={[
            { value: 'on', label: 'Name and email' },
            { value: 'off', label: 'Name only' },
          ]}
        />
        <Spec
          term="Press"
          value={prefs.haptics ? 'on' : 'off'}
          onChange={(v) => {
            pref('haptics', v === 'on');
            if (v === 'on') tap(true);
          }}
          options={[
            { value: 'on', label: 'A tap you feel' },
            { value: 'off', label: 'Silent' },
          ]}
        />
      </Block>

      <Divider seed="settings-end" style={{ marginTop: 36, marginBottom: 8, opacity: 0.55 }} />

      <Print variant="label" style={{ marginTop: 18 }}>
        The last page
      </Print>
      <Hand seed="last-page" size="note" tone="graphite" slant={-0.6} style={{ marginTop: 8, marginBottom: 16 }}>
        Take a copy with you. Close the cover. Or leave nothing on this desk.
      </Hand>

      <InkButton label="The terms" kind="quiet" onPress={() => router.push('/terms')} />
      <InkButton label={copied ? 'Taken' : 'Take a copy'} kind="secondary" onPress={shareOut} seed="export" style={{ marginTop: 8 }} />
      <InkButton
        label="Close the cover"
        kind="secondary"
        onPress={() => {
          signOut();
          router.replace('/welcome');
        }}
        seed="signout"
        style={{ marginTop: 12 }}
      />

      <View style={{ marginTop: 28 }}>
        <InkButton label={removing ? 'Keep it' : 'Remove from this device'} kind="quiet" onPress={() => setRemoving((v) => !v)} />
        {removing && (
          <View style={{ marginTop: 12 }}>
            <Print variant="ui" tone="graphite">
              The notebook leaves this device. A cloud copy, if you have one, stays.
            </Print>
            <LinedField
              label="Type DELETE to confirm"
              placeholder="Type DELETE"
              value={burn}
              onChangeText={setBurn}
              script={false}
              autoCapitalize="characters"
              style={{ marginTop: 12 }}
            />
            <InkButton
              label="Remove it"
              kind="secondary"
              disabled={burn.trim().toUpperCase() !== 'DELETE'}
              onPress={() => {
                burnCopy();
                router.replace('/welcome');
              }}
              seed="burn"
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </View>
    </NotebookPage>
  );
}
