import {
  useFonts as useDMSans,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  useFonts as usePlayfair,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';

export function useAppFonts(): boolean {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });
  const [pfLoaded] = usePlayfair({ PlayfairDisplay_700Bold });
  return dmLoaded && pfLoaded;
}

export const fontFamily = {
  display: 'PlayfairDisplay_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
} as const;
