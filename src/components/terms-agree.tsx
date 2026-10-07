import { router } from 'expo-router';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Hand, Print, useNotebook } from '@/notebook';

export function TermsAgree({
  agreed,
  onToggle,
  style,
}: {
  agreed: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { m } = useNotebook();
  return (
    <View style={style}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="I have read the terms and I agree"
        onPress={onToggle}
        style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
      >
        <Hand seed={`terms-agree-${agreed ? 'yes' : 'no'}`} size="note" tone={agreed ? 'turquoise' : 'ink'}>
          {agreed ? '✓  I have read the terms and I agree' : '○  I have read the terms and I agree'}
        </Hand>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Read the terms and conditions"
        onPress={() => router.push('/terms')}
        style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}
      >
        <Print variant="meta" tone="navy" style={{ textDecorationLine: 'underline', textDecorationColor: m.turquoise }}>
          Read the terms
        </Print>
      </Pressable>
    </View>
  );
}
