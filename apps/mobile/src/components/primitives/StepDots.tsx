import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              width: i === current ? 20 : 6,
              backgroundColor: i <= current ? colors.acc : colors.mu2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { height: 4, borderRadius: 2 },
});
