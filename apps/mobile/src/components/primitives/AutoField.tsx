import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

type Props = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  onSelect?: (v: string) => void;
  placeholder?: string;
  suggestions?: string[];
  loading?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
};

export function AutoField({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  suggestions = [],
  loading,
  autoFocus,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!focused) setOpen(false);
  }, [focused]);

  const hasSugg = suggestions.length > 0;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View>
        <TextInput
          ref={inputRef}
          value={value}
          editable={!disabled}
          autoFocus={autoFocus}
          onChangeText={(nextValue) => {
            onChange(nextValue);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setFocused(false), 120);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.mu}
          autoCorrect={false}
          autoComplete="off"
          autoCapitalize="none"
          style={[
            styles.input,
            { borderColor: focused ? colors.acc : colors.brBr },
            disabled && { opacity: 0.5 },
          ]}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.acc} style={styles.indicator} />
        ) : value ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              onChange('');
              onSelect?.('');
            }}
            style={styles.clearBtn}
            accessibilityLabel="Clear field"
          >
            <Text style={styles.clearX}>X</Text>
          </Pressable>
        ) : null}
      </View>

      {open && hasSugg ? (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {suggestions.map((s, i) => (
              <Pressable
                key={`${s}-${i}`}
                onPress={() => {
                  onSelect ? onSelect(s) : onChange(s);
                  setOpen(false);
                  inputRef.current?.blur();
                }}
                style={({ pressed }) => [
                  styles.sugg,
                  i < suggestions.length - 1 && styles.suggBorder,
                  pressed && { backgroundColor: colors.s1 },
                ]}
              >
                <Text style={styles.suggText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, position: 'relative' },
  label: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.bodyMedium },
  input: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingVertical: 15,
    paddingStart: 42,
    paddingEnd: 16,
    fontSize: 16,
    color: colors.tx,
    fontFamily: fontFamily.body,
    writingDirection: 'rtl',
    textAlign: 'right',
    minHeight: 52,
  },
  indicator: { position: 'absolute', start: 14, top: 18 },
  clearBtn: { position: 'absolute', start: 12, top: 14, padding: 4 },
  clearX: { fontSize: 18, color: colors.mu, lineHeight: 20, fontFamily: fontFamily.bodySemi },
  dropdown: {
    position: 'absolute',
    top: 78,
    start: 0,
    end: 0,
    zIndex: 50,
    maxHeight: 220,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderColor: colors.brBr,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  sugg: { paddingVertical: 13, paddingHorizontal: 16 },
  suggBorder: { borderBottomWidth: 1, borderBottomColor: colors.br },
  suggText: {
    fontSize: 15,
    color: colors.tx,
    fontFamily: fontFamily.body,
    textAlign: 'right',
  },
});
