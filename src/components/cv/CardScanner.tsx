import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import type { GuideRect } from '@/types/cardScan';

export interface CapturedCard {
  uri: string;
  meta: { guideRect: GuideRect; imageWidth: number; imageHeight: number; capturedAt: string };
}

interface Props {
  onCancel: () => void;
  /**
   * Called once the user finishes the native scanner session — may contain
   * 1..N cards. The native ML Kit scanner UI shows a bottom thumbnail strip
   * and a Save button; pressing Save returns all captures here.
   */
  onCaptured: (items: CapturedCard[]) => void;
  /** Max cards a user can capture in one session. Native scanner enforces this. */
  maxNumDocuments?: number;
}

export function CardScanner({ onCancel, onCaptured, maxNumDocuments = 24 }: Props) {
  const [error, setError] = useState<string | null>(null);
  const launchedRef = useRef(false);

  const launch = async () => {
    setError(null);
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        croppedImageQuality: 95,
        maxNumDocuments,
      });

      if (status !== 'success' || !scannedImages?.length) {
        onCancel();
        return;
      }

      const items: CapturedCard[] = [];
      for (const sourceUri of scannedImages) {
        const out = await ImageManipulator.manipulateAsync(
          sourceUri,
          [{ resize: { width: 2200 } }],
          { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG },
        );
        items.push({
          uri: out.uri,
          meta: {
            guideRect: { x: 0, y: 0, w: 1, h: 1 },
            imageWidth: out.width ?? 2200,
            imageHeight: out.height ?? Math.round((2200 * 88) / 63),
            capturedAt: new Date().toISOString(),
          },
        });
      }

      onCaptured(items);
    } catch (e: any) {
      setError(e?.message ?? '카드 스캔에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;
    launch();
  }, []);

  if (error) {
    return (
      <View style={styles.full}>
        <PixelText
          variant="ko"
          size={13}
          color={colors.white}
          style={{ textAlign: 'center', lineHeight: 22, marginBottom: 16, paddingHorizontal: 24 }}
        >
          {error}
        </PixelText>
        <PixelPress
          onPress={() => {
            launchedRef.current = false;
            launch();
          }}
          bg={colors.gold}
        >
          <View style={{ paddingVertical: 12, paddingHorizontal: 18 }}>
            <PixelText variant="ko" size={12}>다시 시도</PixelText>
          </View>
        </PixelPress>
        <View style={{ height: 12 }} />
        <PixelPress onPress={onCancel}>
          <View style={{ paddingVertical: 10, paddingHorizontal: 18 }}>
            <PixelText variant="ko" size={11}>취소</PixelText>
          </View>
        </PixelPress>
      </View>
    );
  }

  return (
    <View style={styles.full}>
      <ActivityIndicator color={colors.gold} size="large" />
      <PixelText variant="ko" size={11} color="rgba(255,255,255,0.7)" style={{ marginTop: 12 }}>
        스캐너 준비 중...
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
});
