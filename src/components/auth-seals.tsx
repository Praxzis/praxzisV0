import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Print, useNotebook } from '@/notebook';

function Seal({
  label,
  hint,
  onPress,
  disabled,
  children,
  tilt,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tilt: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 88,
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        transform: [{ rotate: `${tilt}deg` }, { translateY: pressed ? 1 : 0 }],
      })}
    >
      {children}
      <Print variant="meta" tone="pencil" style={{ marginTop: 6, textAlign: 'center' }}>
        {label}
      </Print>
    </Pressable>
  );
}

/** Google’s four-colour G, pressed as a library stamp. */
export function GoogleSeal({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { m } = useNotebook();
  return (
    <Seal label="Continue with Google" hint="Opens Google to sign the flyleaf" onPress={onPress} disabled={disabled} tilt={-1.4}>
      <Svg width={72} height={72} viewBox="0 0 72 72">
        <Circle cx={36} cy={36} r={34} fill={m.paper.ivory} stroke={m.navy} strokeWidth={1.1} strokeOpacity={0.28} />
        <Circle cx={36} cy={36} r={29} fill="none" stroke={m.navy} strokeWidth={0.55} strokeDasharray="2 2.6" strokeOpacity={0.35} />
        <Path d="M49.1 36.2c0-.9-.1-1.8-.2-2.6H36v5h7.4c-.3 1.7-1.3 3.1-2.8 4.1v3.4h4.5c2.6-2.4 4-6 4-10z" fill="#4285F4" />
        <Path d="M36 50c3.8 0 7-1.3 9.3-3.4l-4.5-3.4c-1.3.8-2.9 1.4-4.8 1.4-3.7 0-6.8-2.5-7.9-5.8h-4.6v3.5C26 47.4 30.7 50 36 50z" fill="#34A853" />
        <Path d="M28.1 38.8c-.3-.8-.4-1.7-.4-2.6s.2-1.8.4-2.6v-3.5h-4.6C22.5 32.3 22 34.1 22 36s.5 3.7 1.5 5.3l4.6-3.5z" fill="#FBBC05" />
        <Path d="M36 27.4c2.1 0 3.9.7 5.4 2.1l4-4C43 23.3 39.8 22 36 22c-5.3 0-10 2.6-12.5 6.7l4.6 3.5c1.1-3.3 4.2-5.8 7.9-5.8z" fill="#EA4335" />
      </Svg>
    </Seal>
  );
}

/** Apple’s mark as a wax seal on the flyleaf. */
export function AppleSeal({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { m } = useNotebook();
  const ink = m.scheme === 'night' ? '#F4EFE4' : '#F5F0E6';
  return (
    <Seal label="Continue with Apple" hint="Opens Apple to sign the flyleaf" onPress={onPress} disabled={disabled} tilt={1.6}>
      <Svg width={72} height={72} viewBox="0 0 72 72">
        <Circle cx={36} cy={36} r={34} fill={m.scheme === 'night' ? '#2A241C' : '#1C1C1E'} />
        <Circle cx={36} cy={36} r={29} fill="none" stroke={m.scheme === 'night' ? '#C4B49A' : '#D7CBB6'} strokeWidth={0.7} strokeDasharray="1.6 2.4" />
        <Path
          d="M40.6 25.4c1-1.2 1.7-2.9 1.5-4.6-1.5.1-3.3.9-4.4 2.1-.9 1.1-1.8 2.8-1.5 4.4 1.7.2 3.3-.8 4.4-1.9zM44.6 37.4c0 3.2 2.8 4.3 2.9 4.3-.1.2-1.4 4.8-4.6 6.7-1.1.8-2.4 1.3-3.7 1.3-1.4 0-2-.4-3.7-.4s-2.4.4-3.7.4c-1.4 0-2.7-.7-3.8-1.4-1.6-1.1-4.2-5-4.3-9.7 0-4.5 2.9-6.9 5.8-6.9 1.5 0 2.8.7 3.8.7s2.4-.8 4.1-.8c.7 0 3.1.1 4.6 2-3.8 2.1-3.2 7.6.6 9.4z"
          fill={ink}
        />
      </Svg>
    </Seal>
  );
}

export function AuthSeals({
  onGoogle,
  onApple,
  busy,
}: {
  onGoogle: () => void;
  onApple: () => void;
  busy?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 18, marginTop: 8, paddingHorizontal: 8 }}>
      <GoogleSeal onPress={onGoogle} disabled={busy} />
      <AppleSeal onPress={onApple} disabled={busy} />
    </View>
  );
}
