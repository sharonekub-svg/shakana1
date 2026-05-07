import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';

function getMetadataString(metadata: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function FloatingProfileButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  if (!visible) return null;

  const metadata = session?.user.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl = getMetadataString(metadata, ['avatar_url', 'picture']);
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    getMetadataString(metadata, ['full_name', 'name']) ||
    (session ? 'Profile' : 'Sign in');
  const initial = displayName.charAt(0).toUpperCase() || 'S';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={session ? 'Open profile' : 'Sign in'}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{session ? 'Profile' : 'Account'}</Text>
        <Text numberOfLines={1} style={styles.name}>
          {session ? displayName : 'Sign in'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 16,
    bottom: Platform.OS === 'web' ? 22 : 20,
    zIndex: 51,
    minHeight: 58,
    maxWidth: 218,
    borderRadius: radii.pill,
    paddingLeft: 7,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,252,247,0.94)',
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.glass,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.acc,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initial: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
  },
  copy: {
    flexShrink: 1,
  },
  kicker: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    maxWidth: 132,
  },
});
