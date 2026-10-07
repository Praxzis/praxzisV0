import { useState, type ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, type PaperTone } from './materials';
import { Binding, PageStack, Sheet } from './paper';
import { useNotebook } from './theme';
import { Hand, Print } from './type';

export const PAGE_MAX = 620;

/**
 * One notebook page per screen. The desk sits behind it, the binding on its
 * left, the rest of the notebook's pages just under it.
 */
export function NotebookPage({
  seed,
  children,
  pageNumber,
  tone,
  ruled = false,
  binding = true,
  footer,
  scroll = true,
  contentStyle,
  scrollProps,
}: {
  seed: string;
  children: ReactNode;
  pageNumber?: number;
  tone?: PaperTone;
  ruled?: boolean;
  binding?: boolean;
  /** Pinned below the scroll area (e.g. a composer). */
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
}) {
  const { m, pageTone } = useNotebook();
  const insets = useSafeAreaInsets();
  const [h, setH] = useState(0);
  const paper = tone ?? pageTone;

  const page = (
    <View style={{ width: '100%', maxWidth: PAGE_MAX, alignSelf: 'center', flexGrow: 1 }}>
      <PageStack seed={seed} />
      <Sheet
        seed={seed}
        tone={paper}
        lift={1}
        simple
        ruled={ruled ? 32 : false}
        style={{ flexGrow: 1 }}
        contentStyle={[{ paddingLeft: binding ? 34 : 24, paddingRight: 22, paddingTop: 22, paddingBottom: 30, flexGrow: 1 }, contentStyle]}
      >
        <View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ flexGrow: 1 }}>
          {children}
        </View>
        {pageNumber != null && (
          <Print variant="meta" tone="pencil" style={{ alignSelf: 'center', marginTop: 28, fontFamily: fonts.serifItalic, fontSize: 14 }} accessibilityLabel={`Page ${pageNumber}`}>
            — {pageNumber} —
          </Print>
        )}
      </Sheet>
      {binding && h > 0 && <Binding height={h + 40} seed={seed} />}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: m.desk }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 18, paddingLeft: 14, paddingRight: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {page}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: 12, paddingLeft: 14, paddingRight: 16 }}>{page}</View>
      )}
      {footer}
    </View>
  );
}

/** Page heading: a printed label for orientation, a handwritten title for warmth. */
export function PageHeading({ label, title, seed, aside, right }: { label: string; title: string; seed: string; aside?: string; right?: ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <Print variant="label" accessibilityRole="header">{label}</Print>
        {right}
      </View>
      <Hand seed={seed} size="title" tone="navy" slant={-0.8}>{title}</Hand>
      {aside && (
        <Hand seed={`${seed}-aside`} size="small" tone="graphite" style={{ marginTop: 2, marginLeft: 6 }}>
          {aside}
        </Hand>
      )}
    </View>
  );
}

/** A section within a page — no box, just a small printed label and whitespace. */
export function Section({ label, children, style, right }: { label?: string; children: ReactNode; style?: StyleProp<ViewStyle>; right?: ReactNode }) {
  return (
    <View style={[{ marginTop: 26 }, style]}>
      {label && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Print variant="label" accessibilityRole="header">{label}</Print>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}
