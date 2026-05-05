import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, DemoButton, DemoPage, SectionTitle } from '@/components/demo/DemoPrimitives';
import { LanguageSwitcher } from '@/components/primitives/LanguageSwitcher';
import { detectDemoBrand } from '@/demo/catalog';
import { useLocale } from '@/i18n/locale';
import { initDemoCommerceSync, useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

export default function DemoLoginScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const [linkInput, setLinkInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  useEffect(() => {
    initDemoCommerceSync();
  }, []);

  const continueAsUser = () => {
    setDemoRole('user');
    router.replace('/user');
  };

  const continueAsStore = () => {
    setDemoRole('store');
    router.replace('/store');
  };

  const openProfile = () => {
    router.push('/profile');
  };

  const quickJoin = () => {
    const detected = detectDemoBrand(`${linkInput} ${codeInput}`);
    if (codeInput.trim().length === 4) {
      router.replace(`/user?join=${codeInput.trim()}`);
      return;
    }
    if (detected) {
      setDemoRole('user');
      router.replace('/user');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DemoPage>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.logo}>shakana</Text>
            <LanguageSwitcher />
          </View>
          <Text style={styles.title}>{isHebrew ? 'כניסה נקייה ומהירה' : 'A cleaner way to sign in'}</Text>
          <Text style={styles.subtitle}>
            {isHebrew
              ? 'צבעים חמים, מסך נקי, וכניסה מהירה לאפליקציה בעברית או באנגלית.'
              : 'Warm colors, a clean layout, and fast entry into the app in Hebrew or English.'}
          </Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.quickJoinCard}>
            <SectionTitle title={isHebrew ? 'הצטרפות מהירה' : 'Quick join'} kicker={isHebrew ? 'כניסה מיידית' : 'Zero-friction entry'} />
            <Text style={styles.helper}>
              {isHebrew
                ? 'הדבק קישור של חנות או הזן קוד בן 4 ספרות כדי להיכנס ישר להזמנה המשותפת.'
                : 'Paste a store link or enter the 4-digit invite code to jump straight into the shared order.'}
            </Text>
            <View style={styles.joinInputs}>
              <TextInput
                value={linkInput}
                onChangeText={setLinkInput}
                placeholder={isHebrew ? 'הדבק קישור של מוצר או חנות' : 'Paste store or product link'}
                placeholderTextColor={colors.mu2}
                textAlign={isHebrew ? 'right' : 'left'}
                style={styles.input}
              />
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder={isHebrew ? 'קוד בן 4 ספרות' : '4-digit code'}
                placeholderTextColor={colors.mu2}
                textAlign={isHebrew ? 'right' : 'left'}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.input}
              />
            </View>
            <DemoButton label={isHebrew ? 'הצטרפות מהירה' : 'Quick join'} onPress={quickJoin} tone="accent" />
          </Card>

          <Card style={styles.loginCard}>
            <SectionTitle title={isHebrew ? 'משתמש' : 'User side'} kicker={isHebrew ? 'התחברות דמו' : 'Demo login'} />
            <View style={styles.credentials}>
              <Text style={styles.label}>{isHebrew ? 'אימייל' : 'Email'}</Text>
              <Text style={styles.value}>user@shakana.demo</Text>
              <Text style={styles.label}>{isHebrew ? 'סיסמה' : 'Password'}</Text>
              <Text style={styles.value}>demo123</Text>
            </View>
            <DemoButton label={isHebrew ? 'המשך כמשתמש' : 'Continue as User'} onPress={continueAsUser} tone="accent" />
          </Card>

          <Card style={styles.loginCard}>
            <SectionTitle title={isHebrew ? 'חנות / Agent M' : 'Store / Agent M'} kicker={isHebrew ? 'התחברות סוחר' : 'Merchant login'} />
            <View style={styles.credentials}>
              <Text style={styles.label}>{isHebrew ? 'אימייל' : 'Email'}</Text>
              <Text style={styles.value}>store@shakana.demo</Text>
              <Text style={styles.label}>{isHebrew ? 'סיסמה' : 'Password'}</Text>
              <Text style={styles.value}>demo123</Text>
            </View>
            <DemoButton label={isHebrew ? 'המשך כחנות' : 'Continue as Store / Agent M'} onPress={continueAsStore} />
          </Card>

          <Card style={styles.loginCard}>
            <SectionTitle title={isHebrew ? 'פרופיל' : 'Profile'} kicker={isHebrew ? 'דף חשבון' : 'Open the profile page'} />
            <Text style={styles.helper}>
              {isHebrew
                ? 'אפשר לפתוח כאן את דף הפרופיל, להחליף שפה, ולוודא שהכל עובד.'
                : 'Open the profile page here to change language and verify the account screen.'}
            </Text>
            <Pressable onPress={openProfile} style={({ pressed }) => [styles.profileLink, pressed && { opacity: 0.85 }]}>
              <Text style={styles.profileLinkText}>{isHebrew ? 'פתח פרופיל' : 'Open profile'}</Text>
            </Pressable>
          </Card>
        </View>
      </DemoPage>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8F4EE',
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    minHeight: 280,
    justifyContent: 'center',
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  logo: {
    color: colors.gold,
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 42,
    maxWidth: 760,
  },
  subtitle: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 660,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickJoinCard: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 14,
  },
  helper: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 23,
  },
  joinInputs: {
    gap: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.br,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    backgroundColor: colors.white,
  },
  loginCard: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 18,
  },
  credentials: {
    gap: 6,
    paddingVertical: 4,
  },
  label: {
    color: '#8B6F56',
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  value: {
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    marginBottom: 6,
  },
  profileLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.goldLight,
  },
  profileLinkText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
  },
});
