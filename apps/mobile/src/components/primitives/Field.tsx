import { forwardRef, useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

type Props = Omit<TextInputProps, 'onChange'> & {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  ltr?: boolean;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  { label, value, onChange, placeholder, keyboardType, ltr = false, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mu}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        autoComplete="off"
        style={[
          styles.input,
          { borderColor: focused ? colors.acc : colors.brBr },
          ltr && { textAlign: 'left', writingDirection: 'ltr' },
          style,
        ]}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 13,
    color: colors.mu,
    fontFamily: fontFamily.bodyMedium,
  },
  input: {
    backgroundColor: colors.s1,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 17,
    color: colors.tx,
    fontFamily: fontFamily.body,
    writingDirection: 'rtl',
    textAlign: 'right',
    minHeight: 52,
  },
});
