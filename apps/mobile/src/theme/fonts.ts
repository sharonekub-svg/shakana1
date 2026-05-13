import {
  useFonts as useRubik,
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_900Black,
} from '@expo-google-fonts/rubik';
import { Platform } from 'react-native';

const webBodyFont = "'Rubik', 'Heebo', system-ui, sans-serif";
const webDisplayFont = "'Newsreader', Georgia, 'Times New Roman', serif";

export function useAppFonts(): boolean {
  const [rubikLoaded] = useRubik({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_900Black,
  });
  return rubikLoaded;
}

export const fontFamily = {
  display: Platform.OS === 'web' ? webDisplayFont : 'Rubik_900Black',
  body: Platform.OS === 'web' ? webBodyFont : 'Rubik_400Regular',
  bodyMedium: Platform.OS === 'web' ? webBodyFont : 'Rubik_500Medium',
  bodySemi: Platform.OS === 'web' ? webBodyFont : 'Rubik_600SemiBold',
  bodyBold: Platform.OS === 'web' ? webBodyFont : 'Rubik_700Bold',
} as const;
