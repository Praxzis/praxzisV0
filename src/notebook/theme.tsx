import { type ReactNode, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useStore, type Appearance, type Handwriting } from '@/state/store';
import { defaultPrefs, type InkWell, type PaperChoice } from '@/state/types';

import { day, night, type Materials, type PaperTone } from './materials';

export type { Appearance, Handwriting };

type NotebookContext = {
  m: Materials;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  handwriting: Handwriting;
  setHandwriting: (h: Handwriting) => void;
  wobble: number;
  reduceMotion: boolean;
  haptics: boolean;
  pageTone: PaperTone;
};

function withInk(base: Materials, well: InkWell): Materials {
  if (well === 'graphite') return { ...base, navy: base.graphite, turquoise: base.graphiteSoft, focus: base.graphite };
  if (well === 'turquoise') return { ...base, navy: base.turquoiseInk, focus: base.turquoise };
  return base;
}

function paperTone(choice: PaperChoice): PaperTone {
  if (choice === 'bright') return 'bright';
  if (choice === 'foxed') return 'kraft';
  return 'cream';
}

export function NotebookProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useNotebook(): NotebookContext {
  const { appearance, setAppearance, handwriting, setHandwriting, prefs } = useStore();
  const safe = prefs ?? defaultPrefs;
  const system = useColorScheme();
  const reduceMotion = !!useReducedMotion();
  return useMemo(() => {
    const isNight = appearance === 'night' || (appearance === 'system' && system === 'dark');
    const base = isNight ? night : day;
    return {
      m: withInk(base, safe.inkWell),
      appearance: appearance ?? 'system',
      setAppearance,
      handwriting: handwriting ?? 'natural',
      setHandwriting,
      wobble: handwriting === 'steady' ? 0.15 : 1,
      reduceMotion: reduceMotion || !!safe.stillInk,
      haptics: safe.haptics !== false,
      pageTone: paperTone(safe.paper),
    };
  }, [appearance, handwriting, safe.haptics, safe.inkWell, safe.paper, safe.stillInk, reduceMotion, setAppearance, setHandwriting, system]);
}
