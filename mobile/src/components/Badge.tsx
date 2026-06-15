import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '../theme';

type Tone = 'green' | 'red' | 'yellow' | 'blue';

interface Props {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'blue' }: Props) {
  const palette = Colors.badge[tone];
  return (
    <View style={[styles.base, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
});
