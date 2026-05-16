import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/i18n/locale';

type Mode = 'create' | 'join';

type StoreId = 'zara' | 'hm' | 'amazon' | 'superpharm' | 'ikea';
const STORES: { id: StoreId; he: string; en: string }[] = [
  { id: 'zara',       he: 'זרה',       en: 'Zara'       },
  { id: 'hm',         he: 'H&M',       en: 'H&M'        },
  { id: 'amazon',     he: 'אמזון',     en: 'Amazon'     },
  { id: 'superpharm', he: 'סופר-פארם', en: 'Super-Pharm'},
  { id: 'ikea',       he: 'איקאה',     en: 'IKEA'       },
];

function extractToken(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/join\/([^/?#\s]+)/);
  return match ? match[1] ?? trimmed : trimmed;
}

export default function NewOrder() {
  const router = useRouter();
  const { language } = useLocale();
  const profile = useAuthStore((st) => st.profile);
  const isHe = language === 'he';

  const [mode, setMode] = useState<Mode>('create');

  // Create fields
  const [myName, setMyName]       = useState(profile ? `${profile.first_name} ${profile.last_name}`.trim() : '');
  const [groupName, setGroupName] = useState('');
  const [store, setStore]         = useState<StoreId | ''>('');

  // Join fields
  const [joinName, setJoinName] = useState(profile ? `${profile.first_name} ${profile.last_name}`.trim() : '');
  const [code, setCode]         = useState('');

  const codeRef = useRef<TextInput>(null);

  const createValid = myName.trim().length >= 2 && groupName.trim().length >= 2 && store !== '';
  const joinValid   = joinName.trim().length >= 2 && code.trim().length >= 3;

  const handleCreate = () => {
    if (!createValid) return;
    router.push(`/user?new=1&store=${store}&group=${encodeURIComponent(groupName.trim())}` as any);
  };

  const handleJoin = () => {
    if (!joinValid) return;
    const token = extractToken(code);
    router.push(`/join/${encodeURIComponent(token)}` as any);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mode toggle */}
        <View style={s.toggle}>
          <Pressable
            onPress={() => setMode('create')}
            style={[s.toggleBtn, mode === 'create' && s.toggleBtnOn]}
          >
            <Text style={[s.toggleTx, mode === 'create' && s.toggleTxOn]}>
              {isHe ? 'פתחו הזמנה' : 'Create order'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('join')}
            style={[s.toggleBtn, mode === 'join' && s.toggleBtnOn]}
          >
            <Text style={[s.toggleTx, mode === 'join' && s.toggleTxOn]}>
              {isHe ? 'הצטרפות דרך חבר' : 'Joining from a friend'}
            </Text>
          </Pressable>
        </View>

        {mode === 'create' ? (
          <CreateForm
            isHe={isHe}
            myName={myName}
            setMyName={setMyName}
            groupName={groupName}
            setGroupName={setGroupName}
            store={store}
            setStore={setStore}
            valid={createValid}
            onSubmit={handleCreate}
          />
        ) : (
          <JoinForm
            isHe={isHe}
            joinName={joinName}
            setJoinName={setJoinName}
            code={code}
            setCode={setCode}
            codeRef={codeRef}
            valid={joinValid}
            onSubmit={handleJoin}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CreateForm({
  isHe, myName, setMyName, groupName, setGroupName, store, setStore, valid, onSubmit,
}: {
  isHe: boolean;
  myName: string; setMyName: (v: string) => void;
  groupName: string; setGroupName: (v: string) => void;
  store: StoreId | ''; setStore: (v: StoreId) => void;
  valid: boolean; onSubmit: () => void;
}) {
  return (
    <View style={s.form}>
      <View style={s.heading}>
        <Text style={s.kicker}>{isHe ? 'שקענה' : 'SHAKANA'}</Text>
        <Text style={s.title}>
          {isHe ? 'פתחו הזמנה קבוצתית' : 'Start a group order'}
        </Text>
        <Text style={s.sub}>
          {isHe
            ? 'רשמו את השם שלכם, שם הקבוצה ובחרו חנות — ואז פותחים קטלוג.'
            : 'Enter your name, a group name, and pick a store — then open the catalog.'}
        </Text>
      </View>

      <View style={s.fields}>
        <View style={s.fieldWrap}>
          <Text style={s.label}>{isHe ? 'השם שלי' : 'My name'}</Text>
          <TextInput
            value={myName}
            onChangeText={setMyName}
            placeholder={isHe ? 'למשל: יוסי' : 'e.g. Yossi'}
            placeholderTextColor={colors.mu2}
            style={[s.input, isHe && s.inputRtl]}
            textAlign={isHe ? 'right' : 'left'}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>{isHe ? 'שם הקבוצה' : 'Group name'}</Text>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder={isHe ? 'למשל: קומה 3 זרה' : 'e.g. Floor 3 Zara run'}
            placeholderTextColor={colors.mu2}
            style={[s.input, isHe && s.inputRtl]}
            textAlign={isHe ? 'right' : 'left'}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>{isHe ? 'חנות' : 'Store'}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.storeRow}
          >
            {STORES.map((st) => {
              const on = store === st.id;
              return (
                <Pressable
                  key={st.id}
                  onPress={() => setStore(st.id)}
                  style={[s.storeChip, on && s.storeChipOn]}
                >
                  <Text style={[s.storeChipTx, on && s.storeChipTxOn]}>
                    {isHe ? st.he : st.en}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={!valid}
        style={[s.cta, !valid && s.ctaOff]}
        accessibilityRole="button"
      >
        <Text style={s.ctaTx}>
          {isHe ? 'פתחו קטלוג ←' : 'Open Catalog →'}
        </Text>
      </Pressable>

      {!valid && (
        <Text style={s.hint}>
          {isHe ? 'יש למלא שם, שם קבוצה ולבחור חנות' : 'Fill in your name, a group name, and pick a store'}
        </Text>
      )}
    </View>
  );
}

function JoinForm({
  isHe, joinName, setJoinName, code, setCode, codeRef, valid, onSubmit,
}: {
  isHe: boolean;
  joinName: string; setJoinName: (v: string) => void;
  code: string; setCode: (v: string) => void;
  codeRef: React.RefObject<TextInput>;
  valid: boolean; onSubmit: () => void;
}) {
  return (
    <View style={s.form}>
      <View style={s.heading}>
        <Text style={s.kicker}>{isHe ? 'שקענה' : 'SHAKANA'}</Text>
        <Text style={s.title}>
          {isHe ? 'הצטרפות דרך חבר' : 'Joining from a friend'}
        </Text>
        <Text style={s.sub}>
          {isHe
            ? 'הדביקו את הקישור שקיבלתם, רשמו את שמכם ולחצו הצטרפות.'
            : 'Paste the link you received, enter your name, and tap Join.'}
        </Text>
      </View>

      <View style={s.fields}>
        <View style={s.fieldWrap}>
          <Text style={s.label}>{isHe ? 'השם שלי' : 'My name'}</Text>
          <TextInput
            value={joinName}
            onChangeText={setJoinName}
            placeholder={isHe ? 'למשל: דנה' : 'e.g. Dana'}
            placeholderTextColor={colors.mu2}
            style={[s.input, isHe && s.inputRtl]}
            textAlign={isHe ? 'right' : 'left'}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
          />
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>{isHe ? 'קוד או קישור הזמנה' : 'Invite code or link'}</Text>
          <TextInput
            ref={codeRef}
            value={code}
            onChangeText={setCode}
            placeholder={isHe ? 'הדביקו כאן את הקישור שקיבלתם' : 'Paste the link or code here'}
            placeholderTextColor={colors.mu2}
            style={[s.input, s.codeInput]}
            textAlign="left"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          {code.trim().length > 0 && (
            <Text style={s.tokenPreview}>
              {isHe ? 'קוד: ' : 'Code: '}
              <Text style={s.tokenPreviewCode}>{extractToken(code)}</Text>
            </Text>
          )}
        </View>
      </View>

      {/* Group order preview card */}
      <View style={s.joinCard}>
        <Text style={s.joinCardLabel}>
          {isHe ? 'מה קורה אחרי ההצטרפות?' : 'What happens after joining?'}
        </Text>
        <View style={s.joinSteps}>
          {(isHe
            ? ['רואים את הקטלוג עם המוצרים שנבחרו', 'בוחרים את הפריטים שלכם', 'משלמים — ושולחים ביחד']
            : ['See the catalog with chosen products', 'Pick your items', 'Pay and ship together']
          ).map((step, i) => (
            <View key={i} style={s.joinStep}>
              <View style={s.joinStepNum}>
                <Text style={s.joinStepNumTx}>{i + 1}</Text>
              </View>
              <Text style={s.joinStepTx}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={!valid}
        style={[s.cta, s.ctaJoin, !valid && s.ctaOff]}
        accessibilityRole="button"
      >
        <Text style={s.ctaTx}>
          {isHe ? 'הצטרפו להזמנה ←' : 'Join the order →'}
        </Text>
      </Pressable>

      {!valid && (
        <Text style={s.hint}>
          {isHe ? 'יש למלא שם ולהדביק קוד / קישור' : 'Enter your name and paste the code or link'}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 24 },

  // Mode toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.s2,
    borderRadius: radii.pill,
    padding: 4,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOn: {
    backgroundColor: colors.acc,
    ...shadow.card,
  },
  toggleTx: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.mu,
    textAlign: 'center',
  },
  toggleTxOn: {
    color: colors.white,
  },

  // Form
  form: { gap: 24 },

  heading: { gap: 6 },
  kicker:  { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.hot, textTransform: 'uppercase' },
  title:   { fontFamily: fontFamily.display, fontSize: 32, color: colors.tx, lineHeight: 38 },
  sub:     { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, lineHeight: 20 },

  fields: { gap: 16 },

  fieldWrap: { gap: 8 },
  label: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
    paddingHorizontal: 16,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  inputRtl: {
    textAlign: 'right',
  },
  codeInput: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    minHeight: 60,
  },
  tokenPreview: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
    paddingHorizontal: 4,
  },
  tokenPreviewCode: {
    fontFamily: fontFamily.bodyBold,
    color: colors.tx,
  },

  // Store chips
  storeRow: { gap: 8, paddingRight: 4 },
  storeChip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.br,
    backgroundColor: colors.s1,
  },
  storeChipOn: {
    borderColor: colors.acc,
    backgroundColor: colors.accLight,
  },
  storeChipTx: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.mu,
  },
  storeChipTxOn: {
    color: colors.acc,
  },

  // CTA
  cta: {
    minHeight: 58,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.acc,
    ...shadow.cta,
  },
  ctaJoin: {
    backgroundColor: colors.hot,
  },
  ctaOff: { opacity: 0.3 },
  ctaTx: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.3,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu2,
    textAlign: 'center',
  },

  // Join info card
  joinCard: {
    backgroundColor: colors.s1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 14,
    ...shadow.card,
  },
  joinCardLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  joinSteps: { gap: 12 },
  joinStep:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  joinStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accLight,
    borderWidth: 1,
    borderColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinStepNumTx: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.acc,
  },
  joinStepTx: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.tx,
    lineHeight: 20,
  },
});
