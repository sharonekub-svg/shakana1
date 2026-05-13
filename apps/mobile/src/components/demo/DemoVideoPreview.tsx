import { createElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Asset } from 'expo-asset';

import { fontFamily } from '@/theme/fonts';

const demoVideoUri = Asset.fromModule(require('../../../assets/shakana-menu-demo.mp4')).uri;

export function DemoVideoPreview() {
  return (
    <View style={styles.demoStage}>
      <View style={styles.demoHeader}>
        <View style={styles.demoHeaderCopy}>
          <Text style={styles.demoKicker}>Demo video</Text>
          <Text style={styles.demoTitle}>Pick products, pay, timer closes, delivery drops</Text>
        </View>
        <Text style={styles.demoDuration}>00:45</Text>
      </View>

      <View style={styles.videoShell}>
        {Platform.OS === 'web' ? (
          createElement('video', {
            src: demoVideoUri,
            autoPlay: true,
            loop: true,
            muted: true,
            playsInline: true,
            controls: true,
            style: styles.webVideo,
          })
        ) : (
          <View style={styles.nativeVideoFallback}>
            <Text style={styles.nativeVideoTitle}>Pick. Pay. Save.</Text>
            <Text style={styles.nativeVideoBody}>
              The group order closes and delivery gets cheaper.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  demoStage: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E6DCCE',
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  demoHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  demoKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#B86B4B',
  },
  demoTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    color: '#211D19',
  },
  demoDuration: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1ECE4',
    color: '#70675F',
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
  },
  videoShell: {
    width: '100%',
    aspectRatio: 488 / 282,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F1ECE4',
    borderWidth: 1,
    borderColor: '#E6DCCE',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover',
    backgroundColor: '#F8F5EF',
  } as any,
  nativeVideoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F1ECE4',
  },
  nativeVideoTitle: {
    color: '#211D19',
    fontFamily: fontFamily.display,
    fontSize: 24,
    textAlign: 'center',
  },
  nativeVideoBody: {
    marginTop: 8,
    color: '#70675F',
    fontFamily: fontFamily.body,
    fontSize: 14,
    textAlign: 'center',
  },
});
