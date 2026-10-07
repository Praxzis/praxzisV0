import { Image, Pressable, View } from 'react-native';

import type { CatalogBook } from '@/core/catalog';
import { Hand, Print, useNotebook } from '@/notebook';

export function BookSuggest({
  hits,
  loading,
  query,
  onPick,
}: {
  hits: CatalogBook[];
  loading: boolean;
  query: string;
  onPick: (book: CatalogBook) => void;
}) {
  const { m } = useNotebook();
  if (query.trim().length < 2) return null;

  return (
    <View
      style={{
        marginTop: 8,
        borderLeftWidth: 1.5,
        borderLeftColor: m.turquoise,
        paddingLeft: 12,
        paddingVertical: 4,
      }}
    >
      {loading && !hits.length && (
        <Hand seed="cat-wait" size="small" tone="graphite">
          Looking along the world’s shelves…
        </Hand>
      )}
      {!loading && !hits.length && (
        <Hand seed="cat-miss" size="small" tone="graphite">
          Nothing by that title came back. You can still write it in by hand.
        </Hand>
      )}
      {hits.map((b) => (
        <Pressable
          key={b.key}
          accessibilityRole="button"
          accessibilityLabel={`${b.title} by ${b.author}`}
          onPress={() => onPick(b)}
          style={({ pressed }) => ({
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 7,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <View
            style={{
              width: 28,
              height: 40,
              backgroundColor: m.navy,
              borderRadius: 1,
              overflow: 'hidden',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {b.cover ? (
              <Image source={{ uri: b.cover }} style={{ width: 28, height: 40 }} />
            ) : (
              <View style={{ width: 10, height: 28, backgroundColor: m.turquoise, opacity: 0.7 }} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Print variant="heading" style={{ fontSize: 17 }}>
              {b.title}
            </Print>
            <Print variant="meta" tone="pencil">
              {b.author}
              {b.year ? ` · ${b.year}` : ''}
            </Print>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
