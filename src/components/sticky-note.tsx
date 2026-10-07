import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Sheet, Tape, tilt, type PaperTone } from '@/notebook';

/** A small note placed onto the current page and held with tape. */
export function StickyNote({ seed, children, tone = 'sticky', angle, style }: { seed: string; children: ReactNode; tone?: PaperTone; angle?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingTop: 10 }, style]}>
      <Sheet seed={seed} tone={tone} lift={2} edge="deckle" tilt={angle ?? tilt(seed, 1.8)} enter contentStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 }}>
        {children}
      </Sheet>
      <Tape seed={seed} width={72} style={{ position: 'absolute', top: 0, alignSelf: 'center' }} />
    </View>
  );
}
