import {
  useFonts as useRubik,
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_900Black,
} from '@expo-google-fonts/rubik';

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
  display: 'Rubik_900Black',
  body: 'Rubik_400Regular',
  bodyMedium: 'Rubik_500Medium',
  bodySemi: 'Rubik_600SemiBold',
  bodyBold: 'Rubik_700Bold',
} as const;
