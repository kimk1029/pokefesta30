import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { colors, space } from '@/theme/tokens';
import { api, ApiError } from '@/lib/apiClient';
import { useToast } from '@/components/ToastProvider';
import { uploadTradeImages } from '@/lib/uploads';

const MAX_IMAGES = 5;
type TradeType = 'sell' | 'buy';

/**
 * 거래글 작성 — 웹 WriteScreen(trade) 과 동일 구성(유형/제목/가격/카카오/사진/내용).
 * 만남장소는 제거(웹과 동일). 백엔드가 placeId 필수라 첫 장소를 기본값으로 전송.
 */
export default function WriteTrade() {
  const toast = useToast();
  // 내 컬렉션에서 카드 [거래] 로 들어오면 카드명이 title 로 넘어온다 → 제목 기본값.
  const { title: titleParam } = useLocalSearchParams<{ title?: string }>();
  const [ttype, setTtype] = useState<TradeType>('sell');
  const [title, setTitle] = useState(typeof titleParam === 'string' ? titleParam : '');
  const [price, setPrice] = useState('');
  const [kakaoId, setKakaoId] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placeId, setPlaceId] = useState('');

  // 만남장소 UI 없음 — 백엔드 placeId 필수라 첫 장소를 기본값으로.
  useEffect(() => {
    let alive = true;
    api<{ data?: { id: string }[] }>('/api/places')
      .then((r) => {
        if (alive) setPlaceId(r?.data?.[0]?.id ?? '');
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const pickImages = useCallback(async () => {
    if (uploading || images.length >= MAX_IMAGES) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const urls = await uploadTradeImages(result.assets.map((a) => a.uri));
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '사진 업로드 실패');
    } finally {
      setUploading(false);
    }
  }, [uploading, images.length, toast]);

  const removeImage = (url: string) => setImages((prev) => prev.filter((u) => u !== url));

  const submit = useCallback(async () => {
    if (submitting || uploading) return;
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/trades', {
        method: 'POST',
        body: {
          placeId: placeId || undefined,
          type: ttype,
          title: title.trim(),
          body: note.trim(),
          price: price.trim(),
          kakaoId: kakaoId.trim() || undefined,
          images: images.length > 0 ? images : undefined,
        },
      });
      toast.success('거래글이 등록되었습니다');
      router.replace('/trade');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push('/login');
        return;
      }
      toast.error(e instanceof Error ? e.message : '거래글 등록 실패');
      setSubmitting(false);
    }
  }, [submitting, uploading, title, note, price, kakaoId, ttype, placeId, images, toast]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar title="거래 쓰기" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: space.gap, gap: 10, paddingBottom: 110 }}>
        {/* 유형 */}
        <PixelText variant="ko" size={11} weight="bold">
          📦 유형
        </PixelText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <PixelButton bg={ttype === 'sell' ? colors.red : colors.white} padding={12} onPress={() => setTtype('sell')}>
              <PixelText variant="ko" size={11} color={ttype === 'sell' ? colors.white : colors.ink} style={{ textAlign: 'center' }}>
                ❤️ 팝니다
              </PixelText>
            </PixelButton>
          </View>
          <View style={{ flex: 1 }}>
            <PixelButton bg={ttype === 'buy' ? colors.blu : colors.white} padding={12} onPress={() => setTtype('buy')}>
              <PixelText variant="ko" size={11} color={ttype === 'buy' ? colors.white : colors.ink} style={{ textAlign: 'center' }}>
                💙 삽니다
              </PixelText>
            </PixelButton>
          </View>
        </View>

        {/* 제목 */}
        <PixelText variant="ko" size={11} weight="bold">
          📝 제목
        </PixelText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="거래 제목을 입력하세요"
          placeholderTextColor={colors.ink3}
          style={styles.input}
        />

        {/* 가격 */}
        <PixelText variant="ko" size={11} weight="bold">
          💰 가격
        </PixelText>
        <TextInput
          value={price}
          onChangeText={(raw) => {
            const d = raw.replace(/,/g, '');
            if (/^\d+$/.test(d)) setPrice(Number(d).toLocaleString('ko-KR'));
            else setPrice(raw);
          }}
          placeholder="예) 15,000 / 정가 / 협의"
          placeholderTextColor={colors.ink3}
          inputMode="numeric"
          style={styles.input}
        />

        {/* 카카오 */}
        <PixelText variant="ko" size={11} weight="bold">
          💬 카카오톡 ID / 오픈채팅 (선택)
        </PixelText>
        <TextInput
          value={kakaoId}
          onChangeText={setKakaoId}
          placeholder="예) kakao_id 또는 오픈채팅 링크"
          placeholderTextColor={colors.ink3}
          autoCapitalize="none"
          style={styles.input}
        />

        {/* 사진 */}
        <PixelText variant="ko" size={11} weight="bold">
          📷 상품 사진 (선택, 최대 {MAX_IMAGES}장)
        </PixelText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {images.map((url) => (
            <View key={url} style={{ position: 'relative' }}>
              <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
              <Pressable onPress={() => removeImage(url)} hitSlop={8} style={styles.removeBtn}>
                <Text style={{ color: colors.white, fontSize: 13, lineHeight: 14 }}>×</Text>
              </Pressable>
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <Pressable onPress={pickImages} disabled={uploading} style={styles.addPhoto}>
              {uploading ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <PixelText variant="pixel" size={9} color={colors.ink3}>
                  ＋ 사진
                </PixelText>
              )}
            </Pressable>
          )}
        </View>

        {/* 내용 */}
        <PixelText variant="ko" size={11} weight="bold">
          📄 내용
        </PixelText>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="거래 관련 상세 내용"
          placeholderTextColor={colors.ink3}
          style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
        />

        {/* 등록 */}
        <View style={{ marginTop: 4 }}>
          <PixelButton bg={colors.blu} padding={14} onPress={submit} disabled={submitting}>
            <PixelText variant="ko" size={11} color={colors.white} style={{ textAlign: 'center' }}>
              {submitting ? '등록 중…' : '거래글 등록'}
            </PixelText>
          </PixelButton>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    padding: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    fontSize: 14,
    fontFamily: 'Galmuri11',
    color: colors.ink,
  },
  thumb: {
    width: 76,
    height: 76,
    borderColor: colors.ink,
    borderWidth: 2,
    backgroundColor: colors.pap2,
  },
  addPhoto: {
    width: 76,
    height: 76,
    borderColor: colors.ink,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
